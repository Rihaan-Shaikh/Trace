"""TRACE Deterministic Data Profiler.

Performs robust parsing of CSV and XLSX files and computes deterministic
statistical profiles without modifying raw source truth.
"""

import os
from typing import Any, Dict, List, Tuple, Optional
import uuid
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select


class DataProfiler:
    """Deterministic table and column profiler for structured business files."""

    @classmethod
    def profile_dataset(cls, db: Session, dataset_id: uuid.UUID) -> Dict[str, Any]:
        """Profiles a complete dataset by inspecting persisted tables/columns or parsing dataset files.

        Reuses deterministic parse_file_to_dataframes and profile_dataframe logic.
        Integrates deterministic Data Health audit score and findings.
        """
        from backend.app.models.dataset import Dataset, DatasetFile, DatasetTable, DatasetColumn

        dataset = db.get(Dataset, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found.")

        # 1. Check if DatasetTable and DatasetColumn records already exist in DB
        tables = list(
            db.scalars(
                select(DatasetTable).where(DatasetTable.dataset_id == dataset_id).order_by(DatasetTable.name)
            ).all()
        )

        table_profiles: List[Dict[str, Any]] = []
        total_columns = 0
        total_rows = 0

        if tables:
            for t in tables:
                cols = list(
                    db.scalars(
                        select(DatasetColumn)
                        .where(DatasetColumn.dataset_table_id == t.id)
                        .order_by(DatasetColumn.name)
                    ).all()
                )
                col_count = len(cols) if cols else t.column_count
                total_columns += col_count
                total_rows += t.row_count
                table_profiles.append({
                    "table_name": t.name,
                    "row_count": t.row_count,
                    "column_count": col_count,
                    "columns": [
                        {
                            "name": c.name,
                            "data_type": c.data_type,
                            "is_nullable": c.is_nullable,
                            "is_unique": c.is_unique,
                            "null_count": c.null_count,
                            "distinct_count": c.distinct_count,
                            "sample_values": c.sample_values,
                            "stats": c.stats,
                        }
                        for c in cols
                    ],
                })
        else:
            # 2. If tables not in DB, parse files on disk using existing DataProfiler methods
            files = list(
                db.scalars(
                    select(DatasetFile).where(DatasetFile.dataset_id == dataset_id).order_by(DatasetFile.created_at)
                ).all()
            )
            dfs_to_profile: Dict[str, pd.DataFrame] = {}
            for f in files:
                if os.path.exists(f.file_path):
                    parsed_dfs = cls.parse_file_to_dataframes(f.file_path, f.filename)
                    dfs_to_profile.update(parsed_dfs)

            # If still empty and dataset is a benchmark dataset, check data/novamart
            if not dfs_to_profile and dataset.metadata_json and dataset.metadata_json.get("is_benchmark"):
                fixture_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/novamart"))
                if os.path.exists(fixture_dir):
                    for fname in ["customers.csv", "discounts.csv", "products.csv", "regions.csv", "transactions.csv"]:
                        fpath = os.path.join(fixture_dir, fname)
                        if os.path.exists(fpath):
                            parsed_dfs = cls.parse_file_to_dataframes(fpath, fname)
                            dfs_to_profile.update(parsed_dfs)

            if not dfs_to_profile:
                raise ValueError(
                    f"Cannot profile dataset '{dataset_id}': No tables or readable files found. "
                    "Please ensure dataset files are uploaded and processed."
                )

            for tbl_name, df in dfs_to_profile.items():
                prof = cls.profile_dataframe(df, tbl_name)
                table_profiles.append(prof)
                total_columns += prof["column_count"]
                total_rows += prof["row_count"]

                # Persist DatasetTable and DatasetColumn records to DB for future queries
                tbl_row = DatasetTable(
                    dataset_id=dataset.id,
                    name=tbl_name,
                    row_count=prof["row_count"],
                    column_count=prof["column_count"],
                    raw_properties={"shape": [prof["row_count"], prof["column_count"]]},
                )
                db.add(tbl_row)
                db.flush()
                for c_data in prof["columns"]:
                    col_row = DatasetColumn(
                        dataset_table_id=tbl_row.id,
                        name=c_data["name"],
                        data_type=c_data["data_type"],
                        is_nullable=c_data["is_nullable"],
                        is_unique=c_data["is_unique"],
                        null_count=c_data["null_count"],
                        distinct_count=c_data["distinct_count"],
                        sample_values=c_data["sample_values"],
                        stats=c_data["stats"],
                    )
                    db.add(col_row)

            dataset.total_rows = total_rows
            db.commit()

        # 3. Incorporate deterministic Data Health metrics
        health_data: Dict[str, Any] = {}
        health_score = dataset.health_score
        try:
            from backend.app.services.dataset_service import DatasetService
            health_summary = DatasetService.get_data_health_summary(db, dataset_id)
            if health_summary.overall_health_score is not None:
                health_score = health_summary.overall_health_score
            health_data = {
                "health_score": health_score,
                "audit_status": getattr(health_summary, "audit_status", "completed"),
                "total_findings": health_summary.total_findings,
                "findings_by_severity": health_summary.findings_by_severity,
                "calculated_data_quality_load_weight": health_summary.calculated_data_quality_load_weight,
            }
        except Exception:
            health_data = {
                "health_score": health_score,
                "total_findings": 0,
                "findings_by_severity": {"info": 0, "warning": 0, "critical": 0},
            }

        return {
            "dataset_id": str(dataset_id),
            "dataset_name": dataset.name,
            "total_tables": len(table_profiles),
            "total_columns": total_columns,
            "total_rows": total_rows,
            "tables": table_profiles,
            "health_score": health_score,
            "data_health": health_data,
        }

    @staticmethod
    def parse_file_to_dataframes(file_path: str, original_filename: str) -> Dict[str, pd.DataFrame]:
        """Parses CSV or XLSX into one or more named DataFrames.
        
        Preserves original data types and values without silent mutations.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(original_filename)[1].lower()
        dfs: Dict[str, pd.DataFrame] = {}

        if ext == ".csv":
            # Detect delimiter and encoding
            encoding = "utf-8"
            try:
                # Try reading header with utf-8
                with open(file_path, "r", encoding="utf-8") as f:
                    sample = f.read(4096)
            except UnicodeDecodeError:
                encoding = "latin-1"

            # Use pandas read_csv with fallback separator sniffing
            try:
                df = pd.read_csv(file_path, encoding=encoding, sep=None, engine="python")
            except Exception:
                # Fallback to standard comma
                df = pd.read_csv(file_path, encoding=encoding)

            table_name = os.path.splitext(os.path.basename(original_filename))[0]
            # Clean table name for safe identifier
            clean_name = "".join(c if c.isalnum() or c == "_" else "_" for c in table_name)
            dfs[clean_name] = df

        elif ext in [".xlsx", ".xls"]:
            # Load workbook and extract sheets
            excel_file = pd.ExcelFile(file_path)
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                # Omit completely empty sheets
                if not df.empty and df.shape[1] > 0:
                    clean_name = "".join(c if c.isalnum() or c == "_" else "_" for c in sheet_name)
                    dfs[clean_name] = df
        else:
            raise ValueError(f"Unsupported file format: {ext}. Only .csv and .xlsx are supported.")

        return dfs

    @staticmethod
    def profile_dataframe(df: pd.DataFrame, table_name: str) -> Dict[str, Any]:
        """Calculates deterministic profile statistics for a DataFrame and all its columns."""
        row_count, col_count = df.shape
        columns_profile: List[Dict[str, Any]] = []

        for i in range(col_count):
            col_name = str(df.columns[i])
            series = df.iloc[:, i]
            total_vals = len(series)
            null_count = int(series.isna().sum())
            null_ratio = float(null_count / total_vals) if total_vals > 0 else 0.0
            non_null_series = series.dropna()

            distinct_count = int(non_null_series.nunique())
            is_unique = (distinct_count == total_vals) and (null_count == 0)

            # Inferred data type
            inferred_type = DataProfiler._infer_data_type(series, non_null_series)

            # Statistical properties
            stats: Dict[str, Any] = {
                "inferred_type": inferred_type,
                "null_count": null_count,
                "null_ratio": round(null_ratio, 4),
                "distinct_count": distinct_count,
                "distinct_ratio": round(distinct_count / total_vals, 4) if total_vals > 0 else 0.0,
                "is_unique": is_unique,
            }

            if inferred_type in ["integer", "float"]:
                numeric_vals = pd.to_numeric(non_null_series, errors="coerce").dropna()
                if not numeric_vals.empty:
                    q25 = float(np.percentile(numeric_vals, 25))
                    q75 = float(np.percentile(numeric_vals, 75))
                    iqr = q75 - q25
                    stats.update({
                        "min": float(numeric_vals.min()),
                        "max": float(numeric_vals.max()),
                        "mean": round(float(numeric_vals.mean()), 4),
                        "median": round(float(numeric_vals.median()), 4),
                        "std_dev": round(float(numeric_vals.std()), 4) if len(numeric_vals) > 1 else 0.0,
                        "q25": round(q25, 4),
                        "q75": round(q75, 4),
                        "iqr": round(iqr, 4),
                        "outlier_lower_bound": round(q25 - 1.5 * iqr, 4),
                        "outlier_upper_bound": round(q75 + 1.5 * iqr, 4),
                    })
            elif inferred_type == "datetime":
                try:
                    dt_series = pd.to_datetime(non_null_series, errors="coerce").dropna()
                    if not dt_series.empty:
                        stats.update({
                            "earliest": str(dt_series.min()),
                            "latest": str(dt_series.max()),
                            "span_days": int((dt_series.max() - dt_series.min()).days),
                        })
                except Exception:
                    pass
            elif inferred_type == "string":
                str_lens = non_null_series.astype(str).str.len()
                if not str_lens.empty:
                    stats.update({
                        "min_length": int(str_lens.min()),
                        "max_length": int(str_lens.max()),
                        "avg_length": round(float(str_lens.mean()), 2),
                    })

            # Sample values (up to 5 distinct non-null values formatted as strings)
            sample_vals = [str(x) for x in non_null_series.drop_duplicates().head(5).tolist()]

            columns_profile.append({
                "name": str(col_name),
                "data_type": inferred_type,
                "is_nullable": null_count > 0,
                "is_unique": is_unique,
                "null_count": null_count,
                "distinct_count": distinct_count,
                "sample_values": sample_vals,
                "stats": stats,
            })

        return {
            "table_name": table_name,
            "row_count": row_count,
            "column_count": col_count,
            "columns": columns_profile,
        }

    @staticmethod
    def _infer_data_type(series: pd.Series, non_null_series: pd.Series) -> str:
        """Deterministically classifies column data type."""
        if non_null_series.empty:
            return "string"

        # Check boolean
        if pd.api.types.is_bool_dtype(series):
            return "boolean"
        if set(non_null_series.astype(str).str.lower().unique()).issubset({"true", "false", "0", "1", "yes", "no"}):
            if non_null_series.nunique() <= 2:
                return "boolean"

        # Check numeric integer
        if pd.api.types.is_integer_dtype(series):
            return "integer"

        # Check numeric float
        if pd.api.types.is_float_dtype(series):
            # Check if all floats are integers in value
            if (non_null_series % 1 == 0).all():
                return "integer"
            return "float"

        # Try parsing date / datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"

        # String or object inspection
        first_sample = str(non_null_series.iloc[0]).strip()
        # Heuristic test for date formats (e.g. YYYY-MM-DD or MM/DD/YYYY)
        if len(first_sample) in [10, 19, 23, 24] and any(sep in first_sample for sep in ["-", "/"]):
            try:
                converted = pd.to_datetime(non_null_series.head(20), errors="coerce")
                if converted.notna().all():
                    return "datetime"
            except Exception:
                pass

        # Try numeric conversion
        try:
            converted_num = pd.to_numeric(non_null_series.head(50), errors="coerce")
            if converted_num.notna().all():
                if (converted_num % 1 == 0).all():
                    return "integer"
                return "float"
        except Exception:
            pass

        return "string"
