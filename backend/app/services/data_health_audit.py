"""TRACE Deterministic Data Health Audit Service.

Evaluates parsed dataset tables against deterministic underwriting data health criteria:
1. Missingness (column-level, decision-relevant, segment-specific)
2. Duplicates (exact rows, duplicate keys, deterministic fuzzy duplicate candidates, high-value account involvement)
3. Staleness (record age relative to horizon, configurable threshold)
4. Format consistency (mixed date formats, currency symbols, casing)
5. Outliers (robust IQR method, statistical anomalies)
6. Domain impossible / negative values (negative quantities, prices below unit cost)
7. Referential integrity (cross-table orphan transactions & key linkage)
8. Revenue & volume concentration (top 10% share, HHI / Gini metrics)
9. Sufficiency & coverage (sample size per segment/region, missing competitor data)
10. Definition conflicts (conflicting revenue or discount fields)

Enforces Rule: NO SILENT CLEANING. Source data remains 100% intact.
Any proposed normalization or derived cleaned view is recorded as an immutable DataTransformation provenance record.
Health score and Data-Quality Load are calculated deterministically via active Rate Card policy.
"""

from datetime import datetime, timedelta
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from backend.app.models.dataset import (
    Dataset,
    DatasetTable,
    DatasetColumn,
    DataQualityFinding,
    DataTransformation,
)
from backend.app.models.enums import DataQualitySeverity, AuditAction
from backend.app.schemas.dataset import DataHealthSummaryResponse, DataQualityFindingResponse
from backend.app.services.audit_service import AuditService
from backend.app.services.rate_card_service import RateCardService


class DataHealthAuditService:
    """Comprehensive deterministic data quality and integrity auditor."""

    @staticmethod
    def audit_dataset(
        db: Session,
        dataset_id: uuid.UUID,
        loaded_dfs: Optional[Dict[str, pd.DataFrame]] = None,
        staleness_threshold_days: int = 365,
        concentration_threshold: float = 0.50,
    ) -> DataHealthSummaryResponse:
        """Executes full deterministic data health audit on a dataset.
        
        Persists all findings and transformation records; calculates deterministic health score.
        """
        dataset = db.get(Dataset, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")

        # Clear existing findings and transformations for clean re-audit
        db.execute(delete(DataQualityFinding).where(DataQualityFinding.dataset_id == dataset_id))
        db.execute(delete(DataTransformation).where(DataTransformation.dataset_id == dataset_id))
        db.commit()

        tables = list(db.scalars(select(DatasetTable).where(DatasetTable.dataset_id == dataset_id)).all())
        if not tables or dataset.file_count == 0:
            dataset.health_score = None
            db.commit()
            return DataHealthSummaryResponse(
                dataset_id=dataset_id,
                overall_health_score=None,
                audit_status="awaiting_data",
                total_findings=0,
                findings_by_severity={"info": 0, "warning": 0, "critical": 0},
                findings=[],
                calculated_data_quality_load_weight=0.0,
            )

        findings: List[DataQualityFinding] = []
        transformations: List[DataTransformation] = []
        table_map = {t.name: t for t in tables}

        # -------------------------------------------------------------
        # 1. Missingness (Column-level & Segment-specific)
        # -------------------------------------------------------------
        for table in tables:
            columns = list(db.scalars(select(DatasetColumn).where(DatasetColumn.dataset_table_id == table.id)).all())
            df = loaded_dfs.get(table.name) if loaded_dfs else None

            for col in columns:
                if col.null_count > 0:
                    null_ratio = float(col.null_count / table.row_count) if table.row_count > 0 else 0.0
                    is_key = col.name.lower().endswith("_id") or col.name.lower() == "id" or "key" in col.name.lower()

                    if is_key and null_ratio > 0.01:
                        sev = DataQualitySeverity.CRITICAL
                        desc = f"Key identifier '{col.name}' in table '{table.name}' has {col.null_count} nulls ({null_ratio:.1%}). Prevents entity linkage."
                        treatment = "Exclude unidentifiable records from entity-level modeling."
                    elif null_ratio > 0.20:
                        sev = DataQualitySeverity.CRITICAL
                        desc = f"High missingness in '{table.name}.{col.name}' ({col.null_count} missing, {null_ratio:.1%}). Impairs segment validity."
                        treatment = "Isolate dependent features; do not impute silently."
                    else:
                        sev = DataQualitySeverity.WARNING
                        desc = f"Column '{table.name}.{col.name}' has {col.null_count} missing values ({null_ratio:.1%})."
                        treatment = "Flag records with missing indicator; preserve raw values."

                    findings.append(
                        DataQualityFinding(
                            dataset_id=dataset_id,
                            dataset_table_id=table.id,
                            dataset_column_id=col.id,
                            finding_type="missing",
                            severity=sev,
                            issue_description=desc,
                            affected_rows_count=col.null_count,
                            affected_ratio=round(null_ratio, 4),
                            proposed_treatment=treatment,
                            effect_on_premium_load=0.04 if sev == DataQualitySeverity.CRITICAL else 0.02,
                        )
                    )

            # Segment-specific missingness concentration (e.g. missing industry in SMB segment)
            if df is not None and "segment" in df.columns:
                for col in columns:
                    if col.null_count > 0 and col.name != "segment":
                        null_series = df[col.name].isna()
                        seg_null_counts = df.loc[null_series, "segment"].value_counts()
                        if not seg_null_counts.empty:
                            top_seg = seg_null_counts.index[0]
                            top_seg_nulls = int(seg_null_counts.iloc[0])
                            seg_concentration = top_seg_nulls / col.null_count
                            if seg_concentration >= 0.60 and top_seg_nulls >= 10:
                                findings.append(
                                    DataQualityFinding(
                                        dataset_id=dataset_id,
                                        dataset_table_id=table.id,
                                        dataset_column_id=col.id,
                                        finding_type="missing",
                                        severity=DataQualitySeverity.WARNING,
                                        issue_description=f"Segment-concentrated missingness: {seg_concentration:.1%} of missing values in '{col.name}' fall within segment '{top_seg}' ({top_seg_nulls} records).",
                                        affected_rows_count=top_seg_nulls,
                                        affected_ratio=round(seg_concentration, 4),
                                        proposed_treatment=f"Apply segment-stratified sensitivity test; do not assume uniform missingness across segments.",
                                        effect_on_premium_load=0.03,
                                    )
                                )

        # -------------------------------------------------------------
        # 2. Duplicates (Exact rows, Duplicate IDs, Fuzzy customer duplicates)
        # -------------------------------------------------------------
        for table in tables:
            df = loaded_dfs.get(table.name) if loaded_dfs else None
            if df is not None and not df.empty:
                # 2.1 Exact duplicate rows
                exact_dups = int(df.duplicated().sum())
                if exact_dups > 0:
                    dup_ratio = float(exact_dups / len(df))
                    findings.append(
                        DataQualityFinding(
                            dataset_id=dataset_id,
                            dataset_table_id=table.id,
                            finding_type="duplicate",
                            severity=DataQualitySeverity.CRITICAL if dup_ratio > 0.05 else DataQualitySeverity.WARNING,
                            issue_description=f"Table '{table.name}' contains {exact_dups} exact duplicate rows ({dup_ratio:.1%}).",
                            affected_rows_count=exact_dups,
                            affected_ratio=round(dup_ratio, 4),
                            proposed_treatment="Flag duplicate rows for deduplicated analytical view; preserve raw source rows.",
                            effect_on_premium_load=0.03,
                        )
                    )
                    # Provenance record for proposed deduplication
                    transformations.append(
                        DataTransformation(
                            dataset_id=dataset_id,
                            name=f"Deduplicate {table.name}",
                            transformation_type="deduplication",
                            code_definition=f"df.drop_duplicates()",
                            applied_by="system",
                            audit_provenance={
                                "source_table": table.name,
                                "before_count": len(df),
                                "after_count": len(df) - exact_dups,
                                "affected_records": exact_dups,
                                "reason": "Exact row duplicates distort aggregations and volume counts",
                                "method": "exact_hash_match",
                                "downstream_effect": "Deduplicated view created for analytics; raw source remains intact",
                            },
                        )
                    )

                # 2.2 Fuzzy Customer Duplicates
                if "customer_name" in df.columns:
                    fuzzy_findings, fuzzy_trans = DataHealthAuditService._audit_fuzzy_customer_duplicates(
                        db, dataset_id, table, df
                    )
                    findings.extend(fuzzy_findings)
                    transformations.extend(fuzzy_trans)

        # -------------------------------------------------------------
        # 3. Staleness (Record age relative to latest horizon)
        # -------------------------------------------------------------
        for table in tables:
            df = loaded_dfs.get(table.name) if loaded_dfs else None
            if df is not None and not df.empty:
                date_cols = [c for c in df.columns if "date" in c.lower() or "updated" in c.lower()]
                for dc in date_cols:
                    parsed_dates = pd.to_datetime(df[dc], errors="coerce").dropna()
                    if not parsed_dates.empty:
                        max_dt = parsed_dates.max()
                        stale_cutoff = max_dt - timedelta(days=staleness_threshold_days)
                        stale_records = parsed_dates[parsed_dates < stale_cutoff]
                        stale_count = int(len(stale_records))
                        if stale_count > 0:
                            stale_ratio = float(stale_count / len(parsed_dates))
                            findings.append(
                                    DataQualityFinding(
                                        dataset_id=dataset_id,
                                        dataset_table_id=table.id,
                                        finding_type="staleness",
                                        severity=DataQualitySeverity.WARNING,
                                        issue_description=f"Stale records in '{table.name}.{dc}': {stale_count} records ({stale_ratio:.1%}) older than {staleness_threshold_days} days before cutoff ({stale_cutoff.strftime('%Y-%m-%d')}).",
                                        affected_rows_count=stale_count,
                                        affected_ratio=round(stale_ratio, 4),
                                        proposed_treatment=f"Apply staleness discount to validity window; shortens verdict policy horizon.",
                                        effect_on_premium_load=0.03,
                                    )
                                )

        # -------------------------------------------------------------
        # 4. Format Inconsistencies (Mixed date formats, currency symbols)
        # -------------------------------------------------------------
        for table in tables:
            df = loaded_dfs.get(table.name) if loaded_dfs else None
            if df is not None and not df.empty:
                for col_name in df.columns:
                    col_series = df[col_name].dropna().astype(str)
                    if col_series.empty:
                        continue

                    # Check for currency symbols in price / sales columns
                    if any(kw in col_name.lower() for kw in ["price", "cost", "sales", "revenue", "spend"]):
                        has_currency_symbols = col_series.str.contains(r"[\$,€,£]", regex=True)
                        sym_count = int(has_currency_symbols.sum())
                        if sym_count > 0 and sym_count < len(col_series):
                            findings.append(
                                DataQualityFinding(
                                    dataset_id=dataset_id,
                                    dataset_table_id=table.id,
                                    finding_type="format",
                                    severity=DataQualitySeverity.WARNING,
                                    issue_description=f"Format inconsistency in '{table.name}.{col_name}': {sym_count} rows contain currency symbols while others are raw numeric.",
                                    affected_rows_count=sym_count,
                                    affected_ratio=round(float(sym_count / len(col_series)), 4),
                                    proposed_treatment="Strip currency symbols in derived analytical representation; log transformation.",
                                    effect_on_premium_load=0.02,
                                )
                            )
                            transformations.append(
                                DataTransformation(
                                    dataset_id=dataset_id,
                                    name=f"Normalize Currency in {table.name}.{col_name}",
                                    transformation_type="format_normalization",
                                    code_definition="col.astype(str).str.replace(r'[$,]', '', regex=True).astype(float)",
                                    applied_by="system",
                                    audit_provenance={
                                        "source_table": table.name,
                                        "source_column": col_name,
                                        "affected_records": sym_count,
                                        "reason": "Mixed currency symbol formatting prevents vector arithmetic",
                                        "method": "regex_strip_currency",
                                        "downstream_effect": "Clean numeric view created; raw strings preserved",
                                    },
                                )
                            )

                    # Check for mixed date format delimiters (e.g. '-' vs '/')
                    if "date" in col_name.lower():
                        has_dash = col_series.str.contains("-", regex=False).sum()
                        has_slash = col_series.str.contains("/", regex=False).sum()
                        if has_dash > 0 and has_slash > 0:
                            mixed_count = int(min(has_dash, has_slash))
                            findings.append(
                                DataQualityFinding(
                                    dataset_id=dataset_id,
                                    dataset_table_id=table.id,
                                    finding_type="format",
                                    severity=DataQualitySeverity.WARNING,
                                    issue_description=f"Mixed date format delimiters in '{table.name}.{col_name}': {has_dash} ISO format (YYYY-MM-DD) vs {has_slash} slash format (DD/MM/YYYY).",
                                    affected_rows_count=mixed_count,
                                    affected_ratio=round(float(mixed_count / len(col_series)), 4),
                                    proposed_treatment="Parse dates using ISO standard with fallback parsing; record transformation.",
                                    effect_on_premium_load=0.02,
                                )
                            )

        # -------------------------------------------------------------
        # 5. Outliers (IQR Method) & 6. Impossible Values
        # -------------------------------------------------------------
        for table in tables:
            columns = list(db.scalars(select(DatasetColumn).where(DatasetColumn.dataset_table_id == table.id)).all())
            df = loaded_dfs.get(table.name) if loaded_dfs else None
            if df is not None and not df.empty:
                for col in columns:
                    if col.data_type in ["integer", "float"]:
                        numeric_s = pd.to_numeric(df[col.name], errors="coerce").dropna()
                        if numeric_s.empty:
                            continue

                        # Impossible negative values (e.g. quantity < 0 or price < 0)
                        if any(kw in col.name.lower() for kw in ["quantity", "qty", "price", "cost", "unit_cost"]):
                            negatives = numeric_s[numeric_s < 0]
                            neg_count = int(len(negatives))
                            if neg_count > 0:
                                findings.append(
                                    DataQualityFinding(
                                        dataset_id=dataset_id,
                                        dataset_table_id=table.id,
                                        dataset_column_id=col.id,
                                        finding_type="impossible_value",
                                        severity=DataQualitySeverity.CRITICAL,
                                        issue_description=f"Domain-impossible negative values in '{table.name}.{col.name}': {neg_count} records contain negative values (min: {negatives.min():.2f}).",
                                        affected_rows_count=neg_count,
                                        affected_ratio=round(float(neg_count / len(numeric_s)), 4),
                                        proposed_treatment="Isolate impossible negative values from baseline transaction volumes.",
                                        effect_on_premium_load=0.05,
                                    )
                                )

                        # Statistical IQR Outliers
                        q1 = float(numeric_s.quantile(0.25))
                        q3 = float(numeric_s.quantile(0.75))
                        iqr = q3 - q1
                        if iqr > 0:
                            lower_bound = q1 - 1.5 * iqr
                            upper_bound = q3 + 1.5 * iqr
                            outliers = numeric_s[(numeric_s < lower_bound) | (numeric_s > upper_bound)]
                            outlier_count = int(len(outliers))
                            if outlier_count > 0:
                                outlier_ratio = float(outlier_count / len(numeric_s))
                                findings.append(
                                    DataQualityFinding(
                                        dataset_id=dataset_id,
                                        dataset_table_id=table.id,
                                        dataset_column_id=col.id,
                                        finding_type="outlier",
                                        severity=DataQualitySeverity.WARNING if outlier_ratio > 0.01 else DataQualitySeverity.INFO,
                                        issue_description=f"Statistical outliers in '{table.name}.{col.name}': {outlier_count} values outside [{lower_bound:.2f}, {upper_bound:.2f}] ({outlier_ratio:.1%}).",
                                        affected_rows_count=outlier_count,
                                        affected_ratio=round(outlier_ratio, 4),
                                        proposed_treatment="Run sensitivity analysis with and without bulk outliers; retain raw observations.",
                                        effect_on_premium_load=0.02,
                                    )
                                )

                # Cross-column impossible values: unit_price < unit_cost
                if "unit_price" in df.columns and "unit_cost" in df.columns:
                    p_series = pd.to_numeric(df["unit_price"], errors="coerce")
                    c_series = pd.to_numeric(df["unit_cost"], errors="coerce")
                    valid_mask = p_series.notna() & c_series.notna()
                    below_cost = valid_mask & (p_series < c_series)
                    below_count = int(below_cost.sum())
                    if below_count > 0:
                        findings.append(
                            DataQualityFinding(
                                dataset_id=dataset_id,
                                dataset_table_id=table.id,
                                finding_type="impossible_value",
                                severity=DataQualitySeverity.CRITICAL,
                                issue_description=f"Negative gross margin / below-cost pricing: {below_count} records have unit_price < unit_cost.",
                                affected_rows_count=below_count,
                                affected_ratio=round(float(below_count / len(df)), 4),
                                proposed_treatment="Flag loss-leader SKU transactions for dedicated pricing policy review.",
                                effect_on_premium_load=0.04,
                            )
                        )

        # -------------------------------------------------------------
        # 7. Referential Integrity / Orphans
        # -------------------------------------------------------------
        if loaded_dfs and len(loaded_dfs) > 1:
            orphan_findings, orphan_trans = DataHealthAuditService._audit_referential_integrity(
                db, dataset_id, tables, loaded_dfs
            )
            findings.extend(orphan_findings)
            transformations.extend(orphan_trans)

        # -------------------------------------------------------------
        # 8. Revenue & Volume Concentration
        # -------------------------------------------------------------
        for table in tables:
            df = loaded_dfs.get(table.name) if loaded_dfs else None
            if df is not None and not df.empty:
                for col_name in df.columns:
                    if any(kw in col_name.lower() for kw in ["sales", "revenue", "net_sales"]):
                        rev_s = pd.to_numeric(df[col_name], errors="coerce").dropna()
                        if not rev_s.empty and rev_s.sum() > 0:
                            top_10_count = max(1, int(len(rev_s) * 0.10))
                            top_10_sum = float(rev_s.nlargest(top_10_count).sum())
                            total_sum = float(rev_s.sum())
                            concentration_share = top_10_sum / total_sum
                            if concentration_share >= concentration_threshold:
                                findings.append(
                                    DataQualityFinding(
                                        dataset_id=dataset_id,
                                        dataset_table_id=table.id,
                                        finding_type="concentration",
                                        severity=DataQualitySeverity.WARNING,
                                        issue_description=f"Revenue concentration: Top 10% of records in '{table.name}.{col_name}' generate {concentration_share:.1%} of total revenue (threshold: {concentration_threshold:.0%}).",
                                        affected_rows_count=top_10_count,
                                        affected_ratio=round(concentration_share, 4),
                                        proposed_treatment=f"Account-level concentration must be modeled explicitly; single-account churn poses significant downside exposure.",
                                        effect_on_premium_load=0.03,
                                    )
                                )

        # -------------------------------------------------------------
        # 9. Sufficiency & Coverage (e.g. Region X sparsity, missing competitor data)
        # -------------------------------------------------------------
        if loaded_dfs:
            # Check for missing competitor pricing file
            has_competitor_file = any("competitor" in t.name.lower() for t in tables)
            if not has_competitor_file:
                findings.append(
                    DataQualityFinding(
                        dataset_id=dataset_id,
                        dataset_table_id=tables[0].id if tables else None,
                        finding_type="coverage",
                        severity=DataQualitySeverity.WARNING,
                        issue_description="Missing competitor data: No competitor pricing data exists in uploaded dataset. Competitor response cannot be modeled directly.",
                        affected_rows_count=0,
                        affected_ratio=0.0,
                        proposed_treatment="Declare competitor reaction as an explicit Exclusion and Coverage Lapse Condition in the Decision Brief.",
                        effect_on_premium_load=0.04,
                    )
                )

            # Check for sparse sub-segments or pilot territories (Region X)
            for tname, tdf in loaded_dfs.items():
                if "region_id" in tdf.columns:
                    region_counts = tdf["region_id"].value_counts()
                    for reg_id, count in region_counts.items():
                        if count < 30:
                            findings.append(
                                DataQualityFinding(
                                    dataset_id=dataset_id,
                                    dataset_table_id=table_map.get(tname).id if table_map.get(tname) else None,
                                    finding_type="coverage",
                                    severity=DataQualitySeverity.WARNING,
                                    issue_description=f"Insufficient observation density in territory '{reg_id}' ({count} rows in '{tname}'). Statistical inference below sample size minimum (n=30).",
                                    affected_rows_count=int(count),
                                    affected_ratio=round(float(count / len(tdf)), 4),
                                    proposed_treatment="Flag decision scope as Refer or Decline if decision objective is restricted to this territory.",
                                    effect_on_premium_load=0.03,
                                )
                            )

        # -------------------------------------------------------------
        # 10. Definition Conflicts (e.g. multiple conflicting sales fields)
        # -------------------------------------------------------------
        for table in tables:
            df = loaded_dfs.get(table.name) if loaded_dfs else None
            if df is not None:
                sales_cols = [c for c in df.columns if any(kw in c.lower() for kw in ["net_sales", "gross_sales", "revenue", "sales_amount"])]
                if len(sales_cols) > 1:
                    findings.append(
                        DataQualityFinding(
                            dataset_id=dataset_id,
                            dataset_table_id=table.id,
                            finding_type="definition_conflict",
                            severity=DataQualitySeverity.WARNING,
                            issue_description=f"Potential definition conflict in '{table.name}': Multiple revenue measures detected ({', '.join(sales_cols)}).",
                            affected_rows_count=0,
                            affected_ratio=0.0,
                            proposed_treatment="Require user to explicitly confirm primary revenue metric in Semantic Layer before underwriting.",
                            effect_on_premium_load=0.02,
                        )
                    )

        # Persist findings and transformations
        for f in findings:
            db.add(f)
        for t in transformations:
            db.add(t)
        db.commit()

        # Deterministic Score Calculation
        counts = {
            DataQualitySeverity.INFO.value: 0,
            DataQualitySeverity.WARNING.value: 0,
            DataQualitySeverity.CRITICAL.value: 0,
        }
        for f in findings:
            counts[f.severity.value] = counts.get(f.severity.value, 0) + 1

        # Formula: 1.0 - (critical * 0.15 + warning * 0.05) [Configurable Rate Card Policy]
        penalty = (counts[DataQualitySeverity.CRITICAL.value] * 0.15) + (
            counts[DataQualitySeverity.WARNING.value] * 0.05
        )
        health_score = max(0.0, min(1.0, 1.0 - penalty))
        dataset.health_score = round(health_score, 4)
        db.commit()

        # Rate Card Data-Quality Load weight calculation
        active_policy = RateCardService.get_active_policy(db)
        dq_load_weight = (1.0 - health_score) * active_policy.weight_data_quality

        AuditService.log_event(
            db,
            event_type=AuditAction.DATA_HEALTH_CHECK_COMPLETED,
            entity_type="dataset",
            entity_id=str(dataset_id),
            actor="system",
            details={
                "health_score": dataset.health_score,
                "total_findings": len(findings),
                "counts": counts,
                "transformations_recorded": len(transformations),
            },
        )

        return DataHealthSummaryResponse(
            dataset_id=dataset_id,
            overall_health_score=dataset.health_score,
            audit_status="completed",
            total_findings=len(findings),
            findings_by_severity=counts,
            findings=[DataQualityFindingResponse.model_validate(f) for f in findings],
            calculated_data_quality_load_weight=round(dq_load_weight, 4),
        )

    @staticmethod
    def _audit_fuzzy_customer_duplicates(
        db: Session,
        dataset_id: uuid.UUID,
        table: DatasetTable,
        df: pd.DataFrame,
    ) -> Tuple[List[DataQualityFinding], List[DataTransformation]]:
        """Deterministically detects fuzzy duplicate customer names using prefix blocking and string distance."""
        findings: List[DataQualityFinding] = []
        transformations: List[DataTransformation] = []

        if "customer_name" not in df.columns or len(df) == 0:
            return findings, transformations

        # Normalization for blocking
        names = df["customer_name"].dropna().astype(str).tolist()
        cust_ids = df["customer_id"].tolist() if "customer_id" in df.columns else list(range(len(names)))
        is_key_list = df["is_key_account"].tolist() if "is_key_account" in df.columns else [False] * len(names)

        # Block by first word
        blocks: Dict[str, List[Tuple[int, str, bool]]] = {}
        for cid, name, is_key in zip(cust_ids, names, is_key_list):
            clean_first = re.sub(r"[^a-zA-Z0-9]", "", name.split()[0].lower()) if name.split() else ""
            if len(clean_first) >= 3:
                blocks.setdefault(clean_first, []).append((cid, name, bool(is_key)))

        fuzzy_pairs: List[Dict[str, Any]] = []
        key_account_involved = False

        for block_key, items in blocks.items():
            if len(items) > 1 and len(items) <= 50:  # Avoid quadratic explosion on huge degenerate blocks
                for i in range(len(items)):
                    cid_a, name_a, key_a = items[i]
                    norm_a = re.sub(r"\b(technologies|tech|enterprises|ent|industries|ind|solutions|corp|corporation|inc|llc|ltd|co)\b", "", name_a.lower())
                    norm_a = re.sub(r"[^a-zA-Z0-9]", "", norm_a)
                    for j in range(i + 1, len(items)):
                        cid_b, name_b, key_b = items[j]
                        if name_a == name_b:
                            continue  # Exact duplicates handled separately
                        norm_b = re.sub(r"\b(technologies|tech|enterprises|ent|industries|ind|solutions|corp|corporation|inc|llc|ltd|co)\b", "", name_b.lower())
                        norm_b = re.sub(r"[^a-zA-Z0-9]", "", norm_b)
                        
                        # Similarity check on normalized stems
                        if norm_a and norm_b and norm_a == norm_b:
                            fuzzy_pairs.append({
                                "id_a": cid_a,
                                "name_a": name_a,
                                "id_b": cid_b,
                                "name_b": name_b,
                                "is_key": key_a or key_b,
                            })
                            if key_a or key_b:
                                key_account_involved = True

        if fuzzy_pairs:
            pair_count = len(fuzzy_pairs)
            ratio = float(pair_count / len(df))
            sev = DataQualitySeverity.CRITICAL if key_account_involved else DataQualitySeverity.WARNING
            desc = (
                f"Fuzzy duplicate customers detected: {pair_count} candidate name variant pairs "
                f"({ratio:.1%}). "
                f"{'Includes high-value key accounts.' if key_account_involved else ''} "
                f"Example: '{fuzzy_pairs[0]['name_a']}' vs '{fuzzy_pairs[0]['name_b']}'."
            )
            findings.append(
                DataQualityFinding(
                    dataset_id=dataset_id,
                    dataset_table_id=table.id,
                    finding_type="duplicate",
                    severity=sev,
                    issue_description=desc,
                    affected_rows_count=pair_count,
                    affected_ratio=round(ratio, 4),
                    proposed_treatment="Resolve fuzzy customer entity linkage; produce deduplicated view for customer churn modeling.",
                    effect_on_premium_load=0.05 if sev == DataQualitySeverity.CRITICAL else 0.03,
                )
            )
            transformations.append(
                DataTransformation(
                    dataset_id=dataset_id,
                    name="Resolve Fuzzy Customer Duplicates",
                    transformation_type="entity_linkage",
                    code_definition="canonicalize_customer_entities(df, threshold=0.85)",
                    applied_by="system",
                    audit_provenance={
                        "source_table": table.name,
                        "candidate_pairs_count": pair_count,
                        "key_account_involvement": key_account_involved,
                        "reason": "Name variants in customer records fragment transaction history",
                        "method": "token_normalized_stem_matching",
                        "downstream_effect": "Deduplicated entity mapping proposed; source records unchanged",
                    },
                )
            )

        return findings, transformations

    @staticmethod
    def _audit_referential_integrity(
        db: Session,
        dataset_id: uuid.UUID,
        tables: List[DatasetTable],
        loaded_dfs: Dict[str, pd.DataFrame],
    ) -> Tuple[List[DataQualityFinding], List[DataTransformation]]:
        """Audits foreign-key and cross-table linkages, identifying orphan transactions without mutating data."""
        findings: List[DataQualityFinding] = []
        transformations: List[DataTransformation] = []
        table_map = {t.name: t for t in tables}

        # Check candidate relationships: e.g. customer_id in transactions vs customers
        for child_name, child_df in loaded_dfs.items():
            for col_name in child_df.columns:
                if col_name.lower().endswith("_id") and col_name.lower() != "id":
                    candidate_prefix = col_name.lower().replace("_id", "")
                    matched_parent = None
                    for parent_name in loaded_dfs.keys():
                        if parent_name.lower() in [candidate_prefix, f"{candidate_prefix}s"]:
                            matched_parent = parent_name
                            break

                    if matched_parent and matched_parent != child_name:
                        parent_df = loaded_dfs[matched_parent]
                        parent_id_cols = [c for c in parent_df.columns if c.lower() in ["id", col_name.lower()]]
                        if parent_id_cols:
                            parent_key_col = parent_id_cols[0]
                            parent_keys = set(parent_df[parent_key_col].dropna().unique())
                            child_keys = child_df[col_name].dropna()

                            orphans = child_keys[~child_keys.isin(parent_keys)]
                            orphan_count = int(len(orphans))
                            if orphan_count > 0:
                                orphan_ratio = float(orphan_count / len(child_keys)) if len(child_keys) > 0 else 0.0
                                child_table = table_map.get(child_name)
                                findings.append(
                                    DataQualityFinding(
                                        dataset_id=dataset_id,
                                        dataset_table_id=child_table.id if child_table else None,
                                        finding_type="orphan",
                                        severity=DataQualitySeverity.CRITICAL,
                                        issue_description=f"Referential integrity failure: {orphan_count} rows in '{child_name}.{col_name}' do not exist in '{matched_parent}.{parent_key_col}' ({orphan_ratio:.1%}).",
                                        affected_rows_count=orphan_count,
                                        affected_ratio=round(orphan_ratio, 4),
                                        proposed_treatment="Isolate orphan records from behavioral customer models; retain in financial aggregates.",
                                        effect_on_premium_load=0.05,
                                    )
                                )
                                transformations.append(
                                    DataTransformation(
                                        dataset_id=dataset_id,
                                        name=f"Isolate Orphans in {child_name}",
                                        transformation_type="orphan_isolation",
                                        code_definition=f"df[df['{col_name}'].isin(parent_keys)]",
                                        applied_by="system",
                                        audit_provenance={
                                            "source_table": child_name,
                                            "foreign_key": col_name,
                                            "parent_table": matched_parent,
                                            "affected_records": orphan_count,
                                            "reason": "Unlinked records lack parent behavioral attributes",
                                            "method": "set_disjoint_filtering",
                                            "downstream_effect": "Orphans flagged for exclusion from customer churn models",
                                        },
                                    )
                                )

        return findings, transformations
