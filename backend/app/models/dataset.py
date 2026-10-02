"""TRACE Dataset, Ingestion, Quality, and Semantic Layer Domain Models.

Implements the data foundation specified in Project Bible Section 11 & 12:
- File & Table profiles
- Data Health Check audit findings (missing values, duplicates, outliers, stale records)
- Business semantic layer (inferred entities, relationships, metrics, segments)
"""

from typing import List, Optional
import uuid
from sqlalchemy import (
    String,
    Text,
    Integer,
    Float,
    Boolean,
    ForeignKey,
    Enum as SAEnum,
    Index,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, GUID, TimestampMixin, UUIDPrimaryKeyMixin
from backend.app.models.enums import DataQualitySeverity


class Dataset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a business dataset collection (e.g. CRM exports, ERP sheets)."""
    __tablename__ = "datasets"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String(64), default="file_upload", nullable=False)
    file_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    health_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    files: Mapped[List["DatasetFile"]] = relationship("DatasetFile", back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True)
    tables: Mapped[List["DatasetTable"]] = relationship("DatasetTable", back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True)
    quality_findings: Mapped[List["DataQualityFinding"]] = relationship("DataQualityFinding", back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True)
    transformations: Mapped[List["DataTransformation"]] = relationship("DataTransformation", back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True)
    semantic_entities: Mapped[List["SemanticEntity"]] = relationship("SemanticEntity", back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True)
    semantic_relationships: Mapped[List["SemanticRelationship"]] = relationship("SemanticRelationship", back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True)
    metrics: Mapped[List["MetricDefinition"]] = relationship("MetricDefinition", back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True)
    segments: Mapped[List["SegmentDefinition"]] = relationship("SegmentDefinition", back_populates="dataset", cascade="all, delete-orphan", passive_deletes=True)


class DatasetFile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Uploaded physical or uploaded file metadata."""
    __tablename__ = "dataset_files"

    dataset_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), default="application/octet-stream", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="uploaded", nullable=False)
    parse_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="files")
    tables: Mapped[List["DatasetTable"]] = relationship("DatasetTable", back_populates="file", cascade="all, delete-orphan")


class DatasetTable(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Relational table or structured sheet extracted from a dataset file."""
    __tablename__ = "dataset_tables"

    dataset_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_file_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("dataset_files.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    column_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    raw_properties: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="tables")
    file: Mapped[Optional["DatasetFile"]] = relationship("DatasetFile", back_populates="tables")
    columns: Mapped[List["DatasetColumn"]] = relationship("DatasetColumn", back_populates="table", cascade="all, delete-orphan")


class DatasetColumn(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Column schema, profile statistics, and sample values."""
    __tablename__ = "dataset_columns"

    dataset_table_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("dataset_tables.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    data_type: Mapped[str] = mapped_column(String(64), nullable=False)
    is_nullable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_unique: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    null_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    distinct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sample_values: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    stats: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    table: Mapped["DatasetTable"] = relationship("DatasetTable", back_populates="columns")


class DataQualityFinding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Specific finding from the Data Health Check audit."""
    __tablename__ = "data_quality_findings"

    dataset_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_table_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("dataset_tables.id", ondelete="SET NULL"), nullable=True)
    dataset_column_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("dataset_columns.id", ondelete="SET NULL"), nullable=True)
    finding_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # missing, duplicate, stale, outlier, format
    severity: Mapped[DataQualitySeverity] = mapped_column(SAEnum(DataQualitySeverity, native_enum=False), nullable=False)
    issue_description: Mapped[str] = mapped_column(Text, nullable=False)
    affected_rows_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    affected_ratio: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    proposed_treatment: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    effect_on_premium_load: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="quality_findings")


class DataTransformation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Deterministic data cleaning or transformation with explicit provenance."""
    __tablename__ = "data_transformations"

    dataset_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    transformation_type: Mapped[str] = mapped_column(String(64), nullable=False)
    code_definition: Mapped[str] = mapped_column(Text, nullable=False)
    applied_by: Mapped[str] = mapped_column(String(128), default="system", nullable=False)
    audit_provenance: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="transformations")


class SemanticEntity(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Inferred or confirmed business entity (e.g. Customer, Order, Product)."""
    __tablename__ = "semantic_entities"

    dataset_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_table_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("dataset_tables.id", ondelete="SET NULL"), nullable=True)
    identifier_column: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="semantic_entities")


class SemanticRelationship(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Relationship between semantic entities (e.g. Customer -> Order)."""
    __tablename__ = "semantic_relationships"

    dataset_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    source_entity_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("semantic_entities.id", ondelete="CASCADE"), nullable=False)
    target_entity_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("semantic_entities.id", ondelete="CASCADE"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(64), default="one_to_many", nullable=False)
    foreign_key_column: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    cardinality: Mapped[str] = mapped_column(String(32), default="1:N", nullable=False)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="semantic_relationships")


class MetricDefinition(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Semantic metric definition (e.g. Gross Profit, Churn Rate)."""
    __tablename__ = "metric_definitions"

    dataset_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    formula_expression: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), default="USD", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    calculation_grain: Mapped[str] = mapped_column(String(64), default="transaction", nullable=False)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="metrics")


class SegmentDefinition(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Business customer or product segment (e.g. Low-Margin Accounts)."""
    __tablename__ = "segment_definitions"

    dataset_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    filter_criteria: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    record_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    share_of_volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="segments")


class BusinessGlossaryEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Domain business terms mapped to metrics or entities."""
    __tablename__ = "business_glossary_entries"

    term: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    definition: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(64), default="commercial", nullable=False)
    synonym_list: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    mapped_metric_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("metric_definitions.id", ondelete="SET NULL"), nullable=True)
