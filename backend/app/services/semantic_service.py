"""TRACE Semantic Layer Service.

Maps physical dataset columns to structured commercial business concepts:
- Controlled Business Concepts Catalog
- Deterministic heuristic classification & type compatibility validation
- Business roles (identifier, dimension, measure, attribute, temporal)
- Semantic Entities, Relationships, Metrics, and Segment definitions persistence
- Semantic Versioning on confirmation
- HARD READINESS BOUNDARY: Suggested != Confirmed. Required concepts must be explicitly confirmed.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from backend.app.models.dataset import (
    Dataset,
    DatasetTable,
    DatasetColumn,
    SemanticEntity,
    SemanticRelationship,
    MetricDefinition,
    SegmentDefinition,
)
from backend.app.models.enums import AuditAction
from backend.app.services.audit_service import AuditService


# Controlled Business Concepts Catalog
CONCEPT_CATALOG = {
    # Customer Domain
    "customer_id": {
        "concept": "Customer Identifier",
        "domain": "customer",
        "role": "identifier",
        "expected_type": ["integer", "string"],
        "default_aggregation": "distinct_count",
        "is_required_core": True,
        "patterns": ["cust_id", "customer_id", "client_id", "account_id"],
    },
    "customer_name": {
        "concept": "Customer Name",
        "domain": "customer",
        "role": "attribute",
        "expected_type": ["string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["cust_name", "customer_name", "client_name", "account_name", "company_name"],
    },
    "customer_segment": {
        "concept": "Customer Segment / Tier",
        "domain": "customer",
        "role": "dimension",
        "expected_type": ["string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["segment", "customer_segment", "tier", "account_tier", "classification"],
    },
    "industry": {
        "concept": "Industry Vertical",
        "domain": "customer",
        "role": "dimension",
        "expected_type": ["string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["industry", "sector", "vertical", "sic_code"],
    },
    "is_key_account": {
        "concept": "Key Account Indicator",
        "domain": "customer",
        "role": "attribute",
        "expected_type": ["boolean", "integer", "string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["is_key_account", "key_account", "strategic_account", "is_strategic"],
    },
    "signup_date": {
        "concept": "Customer Acquisition Date",
        "domain": "customer",
        "role": "temporal",
        "expected_type": ["datetime", "string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["signup_date", "acquisition_date", "created_date", "onboarding_date"],
    },
    "last_updated": {
        "concept": "Record Last Updated Date",
        "domain": "customer",
        "role": "temporal",
        "expected_type": ["datetime", "string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["last_updated", "updated_at", "update_date", "modified_date"],
    },
    # Product Domain
    "product_id": {
        "concept": "Product Identifier",
        "domain": "product",
        "role": "identifier",
        "expected_type": ["integer", "string"],
        "default_aggregation": "distinct_count",
        "is_required_core": True,
        "patterns": ["product_id", "sku", "item_id", "item_code", "prod_id"],
    },
    "product_name": {
        "concept": "Product Name",
        "domain": "product",
        "role": "attribute",
        "expected_type": ["string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["product_name", "item_name", "sku_name", "description"],
    },
    "category": {
        "concept": "Product Category",
        "domain": "product",
        "role": "dimension",
        "expected_type": ["string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["category", "prod_cat", "product_category", "dept", "department"],
    },
    "unit_cost": {
        "concept": "Unit Cost",
        "domain": "product",
        "role": "measure",
        "expected_type": ["float", "integer"],
        "default_aggregation": "avg",
        "unit": "USD",
        "is_required_core": False,
        "patterns": ["unit_cost", "cost_price", "cog", "standard_cost"],
    },
    "list_price": {
        "concept": "List Price / Base Price",
        "domain": "product",
        "role": "measure",
        "expected_type": ["float", "integer"],
        "default_aggregation": "avg",
        "unit": "USD",
        "is_required_core": False,
        "patterns": ["list_price", "base_price", "msrp"],
    },
    # Transaction Domain
    "transaction_id": {
        "concept": "Transaction Identifier",
        "domain": "transaction",
        "role": "identifier",
        "expected_type": ["integer", "string"],
        "default_aggregation": "count",
        "is_required_core": True,
        "patterns": ["transaction_id", "txn_id", "order_id", "invoice_id"],
    },
    "transaction_date": {
        "concept": "Transaction Date",
        "domain": "transaction",
        "role": "temporal",
        "expected_type": ["datetime", "string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["transaction_date", "txn_date", "order_date", "invoice_date"],
    },
    "quantity": {
        "concept": "Order Quantity",
        "domain": "transaction",
        "role": "measure",
        "expected_type": ["integer", "float"],
        "default_aggregation": "sum",
        "is_required_core": False,
        "patterns": ["quantity", "qty", "volume", "units", "units_sold"],
    },
    "unit_price": {
        "concept": "Transaction Unit Price",
        "domain": "transaction",
        "role": "measure",
        "expected_type": ["float", "integer"],
        "default_aggregation": "avg",
        "unit": "USD",
        "is_required_core": False,
        "patterns": ["unit_price", "selling_price", "realized_price", "price"],
    },
    "discount_pct": {
        "concept": "Discount Percentage",
        "domain": "pricing",
        "role": "measure",
        "expected_type": ["float"],
        "default_aggregation": "avg",
        "unit": "ratio",
        "is_required_core": False,
        "patterns": ["discount", "discount_rate", "discount_pct", "disc_rate", "discretionary_discount"],
    },
    "net_sales": {
        "concept": "Net Sales / Revenue",
        "domain": "financial",
        "role": "measure",
        "expected_type": ["float", "integer"],
        "default_aggregation": "sum",
        "unit": "USD",
        "is_required_core": True,
        "patterns": ["net_sales", "revenue", "sales", "sales_amount", "net_amount", "amount"],
    },
    "gross_margin": {
        "concept": "Gross Margin / Profit",
        "domain": "financial",
        "role": "measure",
        "expected_type": ["float", "integer"],
        "default_aggregation": "sum",
        "unit": "USD",
        "is_required_core": False,
        "patterns": ["margin", "gross_margin", "profit", "gross_profit", "contribution_margin"],
    },
    # Geographic & Regional Domain
    "region_id": {
        "concept": "Region Identifier",
        "domain": "geographic",
        "role": "identifier",
        "expected_type": ["string", "integer"],
        "default_aggregation": "distinct_count",
        "is_required_core": False,
        "patterns": ["region_id", "region_code", "territory_id"],
    },
    "region_name": {
        "concept": "Region Name",
        "domain": "geographic",
        "role": "dimension",
        "expected_type": ["string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["region", "region_name", "territory", "geography", "zone"],
    },
    "launch_date": {
        "concept": "Regional / Territory Launch Date",
        "domain": "geographic",
        "role": "temporal",
        "expected_type": ["datetime", "string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["launch_date", "territory_launch_date", "market_launch_date"],
    },
    "quarterly_spend": {
        "concept": "Regional Investment / Quarterly Spend",
        "domain": "financial",
        "role": "measure",
        "expected_type": ["float", "integer"],
        "default_aggregation": "sum",
        "unit": "USD",
        "is_required_core": False,
        "patterns": ["quarterly_spend", "regional_spend", "investment_budget"],
    },
    # Discount Contract Domain
    "discount_id": {
        "concept": "Discount Contract Identifier",
        "domain": "pricing",
        "role": "identifier",
        "expected_type": ["integer", "string"],
        "default_aggregation": "count",
        "is_required_core": False,
        "patterns": ["discount_id", "contract_id", "policy_id"],
    },
    "start_date": {
        "concept": "Contract / Discount Start Date",
        "domain": "pricing",
        "role": "temporal",
        "expected_type": ["datetime", "string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["start_date", "contract_start", "effective_date"],
    },
    "end_date": {
        "concept": "Contract / Discount End Date",
        "domain": "pricing",
        "role": "temporal",
        "expected_type": ["datetime", "string"],
        "default_aggregation": "none",
        "is_required_core": False,
        "patterns": ["end_date", "contract_end", "expiry_date", "expiration_date"],
    },
}

REQUIRED_CORE_CONCEPTS = [
    k for k, v in CONCEPT_CATALOG.items() if v.get("is_required_core", False)
]


class SemanticLayerService:
    """Inference and management service for the TRACE Semantic Layer."""

    @staticmethod
    def infer_and_apply_mappings(db: Session, dataset_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Scans dataset tables and columns to infer semantic concepts deterministically.
        
        Leaves inferred concepts in 'suggested' status so user confirmation is required.
        """
        dataset = db.get(Dataset, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")

        tables = list(db.scalars(select(DatasetTable).where(DatasetTable.dataset_id == dataset_id)).all())
        all_mappings: List[Dict[str, Any]] = []

        for table in tables:
            columns = list(db.scalars(select(DatasetColumn).where(DatasetColumn.dataset_table_id == table.id)).all())
            for col in columns:
                matched_key, matched_spec = SemanticLayerService._match_column_to_concept(col.name, col.data_type, table.name)
                if matched_spec:
                    mapping = {
                        "table_id": str(table.id),
                        "table_name": table.name,
                        "column_id": str(col.id),
                        "column_name": col.name,
                        "concept_key": matched_key,
                        "concept_name": matched_spec["concept"],
                        "domain": matched_spec["domain"],
                        "business_role": matched_spec["role"],
                        "data_type": col.data_type,
                        "unit": matched_spec.get("unit"),
                        "aggregation": matched_spec["default_aggregation"],
                        "status": "suggested",
                        "provenance_method": "deterministic_heuristic_catalog",
                    }
                    col_stats = dict(col.stats) if col.stats else {}
                    col_stats["semantic_mapping"] = mapping
                    col.stats = col_stats
                    all_mappings.append(mapping)

        # Populate business models (Entities, Relationships, Metrics, Segments)
        SemanticLayerService._populate_semantic_models(db, dataset_id, tables, all_mappings)

        # Check and update dataset readiness (enforces suggested != confirmed)
        SemanticLayerService._evaluate_dataset_readiness(db, dataset, all_mappings)
        db.commit()

        AuditService.log_event(
            db,
            event_type=AuditAction.SCHEMA_MAPPED,
            entity_type="dataset",
            entity_id=str(dataset_id),
            actor="system",
            details={"mappings_count": len(all_mappings)},
        )

        return all_mappings

    @staticmethod
    def list_mappings(db: Session, dataset_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Retrieves active semantic mappings for all columns in the dataset."""
        tables = list(db.scalars(select(DatasetTable).where(DatasetTable.dataset_id == dataset_id)).all())
        mappings = []
        for table in tables:
            columns = list(db.scalars(select(DatasetColumn).where(DatasetColumn.dataset_table_id == table.id)).all())
            for col in columns:
                if col.stats and "semantic_mapping" in col.stats:
                    mappings.append(col.stats["semantic_mapping"])
                else:
                    mappings.append({
                        "table_id": str(table.id),
                        "table_name": table.name,
                        "column_id": str(col.id),
                        "column_name": col.name,
                        "concept_key": None,
                        "concept_name": "Unmapped",
                        "domain": "general",
                        "business_role": "attribute",
                        "data_type": col.data_type,
                        "unit": None,
                        "aggregation": "none",
                        "status": "unmapped",
                        "provenance_method": "none",
                    })
        return mappings

    @staticmethod
    def confirm_or_update_mapping(
        db: Session,
        dataset_id: uuid.UUID,
        column_id: uuid.UUID,
        concept_key: Optional[str] = None,
        business_role: Optional[str] = None,
        aggregation: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Validates and updates user-confirmed semantic mapping for a column."""
        col = db.get(DatasetColumn, column_id)
        if not col:
            raise ValueError(f"Column {column_id} not found")

        col_stats = dict(col.stats) if col.stats else {}
        current_mapping = col_stats.get("semantic_mapping", {})

        target_concept_key = concept_key or current_mapping.get("concept_key")
        if target_concept_key and target_concept_key in CONCEPT_CATALOG:
            spec = CONCEPT_CATALOG[target_concept_key]
            # Validate strict type compatibility
            if col.data_type not in spec["expected_type"]:
                raise ValueError(
                    f"Type mismatch: Concept '{spec['concept']}' expects types {spec['expected_type']}, but column has type '{col.data_type}'"
                )
            concept_name = spec["concept"]
            role = business_role or spec["role"]
            agg = aggregation or spec["default_aggregation"]
            unit = spec.get("unit")
            domain = spec["domain"]
        else:
            concept_name = current_mapping.get("concept_name", "Unmapped")
            role = business_role or current_mapping.get("business_role", "attribute")
            agg = aggregation or current_mapping.get("aggregation", "none")
            unit = current_mapping.get("unit")
            domain = current_mapping.get("domain", "general")

        table = db.get(DatasetTable, col.dataset_table_id)
        table_name = table.name if table else "unknown"

        updated_mapping = {
            "table_id": str(col.dataset_table_id),
            "table_name": table_name,
            "column_id": str(col.id),
            "column_name": col.name,
            "concept_key": target_concept_key,
            "concept_name": concept_name,
            "domain": domain,
            "business_role": role,
            "data_type": col.data_type,
            "unit": unit,
            "aggregation": agg,
            "status": "confirmed",
            "provenance_method": "user_confirmed",
        }
        col_stats["semantic_mapping"] = updated_mapping
        col.stats = col_stats
        db.commit()

        # Re-evaluate readiness and versioning
        dataset = db.get(Dataset, dataset_id)
        if dataset:
            all_mappings = SemanticLayerService.list_mappings(db, dataset_id)
            SemanticLayerService._evaluate_dataset_readiness(db, dataset, all_mappings)
            SemanticLayerService._snapshot_semantic_version(db, dataset, all_mappings)
            db.commit()

        return updated_mapping

    @staticmethod
    def confirm_all_mappings(db: Session, dataset_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Batch-confirms all currently suggested semantic mappings.
        
        Transitions confirmed concepts to 'confirmed' status and triggers readiness evaluation.
        """
        dataset = db.get(Dataset, dataset_id)
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")

        tables = list(db.scalars(select(DatasetTable).where(DatasetTable.dataset_id == dataset_id)).all())
        confirmed_list: List[Dict[str, Any]] = []

        for table in tables:
            columns = list(db.scalars(select(DatasetColumn).where(DatasetColumn.dataset_table_id == table.id)).all())
            for col in columns:
                if col.stats and "semantic_mapping" in col.stats:
                    m = dict(col.stats["semantic_mapping"])
                    if m.get("concept_key") and m.get("status") == "suggested":
                        m["status"] = "confirmed"
                        m["provenance_method"] = "user_batch_confirmed"
                        col_stats = dict(col.stats)
                        col_stats["semantic_mapping"] = m
                        col.stats = col_stats
                        confirmed_list.append(m)

        db.commit()

        # Re-evaluate readiness and versioning
        all_mappings = SemanticLayerService.list_mappings(db, dataset_id)
        SemanticLayerService._evaluate_dataset_readiness(db, dataset, all_mappings)
        SemanticLayerService._snapshot_semantic_version(db, dataset, all_mappings)
        db.commit()

        return confirmed_list

    @staticmethod
    def _match_column_to_concept(column_name: str, data_type: str, table_name: Optional[str] = None) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """Matches a physical column name to the concept catalog using deterministic rules."""
        norm_name = column_name.lower().replace("-", "_").replace(" ", "_")
        tbl_norm = table_name.lower() if table_name else ""

        # Pass 1: Exact pattern match (highest precedence)
        for key, spec in CONCEPT_CATALOG.items():
            for pattern in spec["patterns"]:
                if norm_name == pattern:
                    if data_type in spec["expected_type"] or data_type == "string":
                        return key, spec

        # Pass 2: Exact 'id' in specific tables
        if norm_name == "id":
            if "transaction" in tbl_norm or "order" in tbl_norm:
                return "transaction_id", CONCEPT_CATALOG["transaction_id"]
            if "customer" in tbl_norm or "client" in tbl_norm:
                return "customer_id", CONCEPT_CATALOG["customer_id"]
            if "product" in tbl_norm or "item" in tbl_norm or "sku" in tbl_norm:
                return "product_id", CONCEPT_CATALOG["product_id"]
            if "region" in tbl_norm or "territory" in tbl_norm:
                return "region_id", CONCEPT_CATALOG["region_id"]
            if "discount" in tbl_norm:
                return "discount_id", CONCEPT_CATALOG["discount_id"]

        # Pass 3: Suffix matching for specific multi-token identifiers (length > 4 to prevent collisions with 'id' or 'date')
        for key, spec in CONCEPT_CATALOG.items():
            for pattern in spec["patterns"]:
                if len(pattern) > 4 and norm_name.endswith(f"_{pattern}"):
                    if data_type in spec["expected_type"] or data_type == "string":
                        return key, spec

        return None, None

    @staticmethod
    def _populate_semantic_models(
        db: Session,
        dataset_id: uuid.UUID,
        tables: List[DatasetTable],
        mappings: List[Dict[str, Any]],
    ) -> None:
        """Populates database SemanticEntity, SemanticRelationship, MetricDefinition, and SegmentDefinition records."""
        # Clear existing models for this dataset
        db.execute(delete(SemanticRelationship).where(SemanticRelationship.dataset_id == dataset_id))
        db.execute(delete(SemanticEntity).where(SemanticEntity.dataset_id == dataset_id))
        db.execute(delete(MetricDefinition).where(MetricDefinition.dataset_id == dataset_id))
        db.execute(delete(SegmentDefinition).where(SegmentDefinition.dataset_id == dataset_id))
        db.commit()

        table_by_name = {t.name: t for t in tables}

        # 1. Semantic Entities
        entity_map = {}
        entity_specs = [
            ("Customer", "Commercial buyer or account", "customers", "customer_id"),
            ("Product", "SKU or commercial product offering", "products", "product_id"),
            ("Transaction", "Commercial sales transaction record", "transactions", "transaction_id"),
            ("Region", "Geographic sales territory", "regions", "region_id"),
            ("Discount", "Contractual or promotional discount rule", "discounts", "discount_id"),
        ]
        for name, desc, tbl_key, id_col in entity_specs:
            tbl = next((t for t in tables if tbl_key in t.name.lower()), None)
            if tbl:
                entity = SemanticEntity(
                    dataset_id=dataset_id,
                    entity_name=name,
                    description=desc,
                    primary_table_id=tbl.id,
                    identifier_column=id_col,
                    attributes={"table_name": tbl.name},
                    is_confirmed=False,
                )
                db.add(entity)
                db.flush()
                entity_map[name] = entity

        # 2. Semantic Relationships
        if "Customer" in entity_map and "Transaction" in entity_map:
            db.add(
                SemanticRelationship(
                    dataset_id=dataset_id,
                    source_entity_id=entity_map["Customer"].id,
                    target_entity_id=entity_map["Transaction"].id,
                    relationship_type="one_to_many",
                    foreign_key_column="customer_id",
                    cardinality="1:N",
                    is_confirmed=False,
                )
            )
        if "Product" in entity_map and "Transaction" in entity_map:
            db.add(
                SemanticRelationship(
                    dataset_id=dataset_id,
                    source_entity_id=entity_map["Product"].id,
                    target_entity_id=entity_map["Transaction"].id,
                    relationship_type="one_to_many",
                    foreign_key_column="product_id",
                    cardinality="1:N",
                    is_confirmed=False,
                )
            )
        if "Region" in entity_map and "Customer" in entity_map:
            db.add(
                SemanticRelationship(
                    dataset_id=dataset_id,
                    source_entity_id=entity_map["Region"].id,
                    target_entity_id=entity_map["Customer"].id,
                    relationship_type="one_to_many",
                    foreign_key_column="region_id",
                    cardinality="1:N",
                    is_confirmed=False,
                )
            )

        # 3. Metric Definitions
        metrics = [
            ("revenue", "Net Sales / Revenue", "quantity * unit_price * (1 - discount_pct)", "USD", "Realized sales revenue after discretionary discount"),
            ("gross_margin", "Gross Margin", "net_sales - (quantity * unit_cost)", "USD", "Dollar gross profit realized over product unit cost"),
            ("margin_pct", "Gross Margin %", "gross_margin / net_sales", "ratio", "Gross margin percentage per transaction or account"),
            ("discount_depth", "Discount Depth", "discount_pct", "ratio", "Discretionary price concession percentage"),
            ("account_concentration", "Account Concentration", "sum(top_10_percent_revenue) / sum(total_revenue)", "ratio", "Top 10% customer revenue share"),
        ]
        for m_name, m_label, m_formula, m_unit, m_desc in metrics:
            db.add(
                MetricDefinition(
                    dataset_id=dataset_id,
                    name=m_name,
                    label=m_label,
                    formula_expression=m_formula,
                    unit=m_unit,
                    description=m_desc,
                    calculation_grain="transaction",
                    is_confirmed=False,
                )
            )

        # 4. Segment Definitions
        segments = [
            ("low_margin_accounts", "Accounts with average realized margin below 15%", {"margin_pct_max": 0.15}),
            ("key_accounts", "Designated strategic or high-volume enterprise accounts", {"is_key_account": True}),
        ]
        for s_name, s_desc, s_criteria in segments:
            db.add(
                SegmentDefinition(
                    dataset_id=dataset_id,
                    name=s_name,
                    description=s_desc,
                    filter_criteria=s_criteria,
                    record_count=0,
                    is_confirmed=False,
                )
            )

        db.commit()

    @staticmethod
    def _evaluate_dataset_readiness(db: Session, dataset: Dataset, mappings: List[Dict[str, Any]]) -> str:
        """Evaluates whether dataset meets all requirements for downstream decision underwriting.
        
        CRITICAL HARD GATE:
        - If file_count == 0 -> 'awaiting_data'
        - If health_score is None -> 'audit_pending'
        - If required core concepts are still in 'suggested' status -> 'semantic_confirmation_required'
        - Only when ALL required core concepts are 'confirmed' -> 'ready_for_analysis'
        """
        meta = dict(dataset.metadata_json) if dataset.metadata_json else {}

        has_files = dataset.file_count > 0
        has_health = dataset.health_score is not None

        # Check confirmation status of required core concepts
        # Required core concepts: customer_id, product_id, transaction_id, net_sales (or revenue)
        confirmed_concept_keys = {
            m.get("concept_key")
            for m in mappings
            if m.get("status") == "confirmed" and m.get("concept_key")
        }

        # Check if all required concepts are confirmed
        all_required_confirmed = all(
            req_key in confirmed_concept_keys for req_key in REQUIRED_CORE_CONCEPTS
        )

        total_confirmed = sum(1 for m in mappings if m.get("status") == "confirmed")
        total_mappings = len(mappings)

        if not has_files:
            readiness = "awaiting_data"
        elif not has_health:
            readiness = "audit_pending"
        elif not all_required_confirmed:
            readiness = "semantic_confirmation_required"
        else:
            readiness = "ready_for_analysis"

        meta["readiness_status"] = readiness
        meta["confirmed_mappings_count"] = total_confirmed
        meta["total_mappings_count"] = total_mappings
        meta["required_core_confirmed"] = all_required_confirmed
        dataset.metadata_json = meta
        return readiness

    @staticmethod
    def _snapshot_semantic_version(db: Session, dataset: Dataset, mappings: List[Dict[str, Any]]) -> None:
        """Creates an immutable versioned snapshot of the confirmed semantic layer."""
        meta = dict(dataset.metadata_json) if dataset.metadata_json else {}
        confirmed_mappings = [m for m in mappings if m.get("status") == "confirmed"]

        current_ver = meta.get("semantic_model_version", "0.0.0")
        if current_ver == "0.0.0":
            new_ver = "0.1.0"
        else:
            major, minor, patch = [int(p) for p in current_ver.split(".")]
            new_ver = f"{major}.{minor}.{patch + 1}"

        snapshot = {
            "version": new_ver,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "confirmed_definitions_count": len(confirmed_mappings),
            "confirmed_concepts": [
                {
                    "concept": m.get("concept_name"),
                    "column": f"{m.get('table_name')}.{m.get('column_name')}",
                    "role": m.get("business_role"),
                    "type": m.get("data_type"),
                    "aggregation": m.get("aggregation"),
                }
                for m in confirmed_mappings
            ],
            "provenance_method": "user_explicit_confirmation",
        }
        meta["semantic_model_version"] = new_ver
        meta["semantic_snapshot"] = snapshot
        dataset.metadata_json = meta

    @staticmethod
    def get_confirmed_mappings(db: Session, dataset_id: uuid.UUID) -> Dict[str, str]:
        """Returns a dictionary of confirmed {concept_key: column_name} mappings."""
        mappings = SemanticLayerService.list_mappings(db, dataset_id)
        confirmed = {}
        for m in mappings:
            if m.get("status") == "confirmed" and m.get("concept_key"):
                confirmed[m["concept_key"]] = m.get("column_name", "")
        return confirmed


SemanticService = SemanticLayerService

