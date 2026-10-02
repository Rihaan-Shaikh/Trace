"""TRACE Dataset and Semantic Layer Pydantic Schemas.

Enforces typed API contracts for data ingest, profiling, data health findings, transformations, and semantic mappings.
"""

from datetime import datetime
from typing import Any, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.enums import DataQualitySeverity


class DatasetCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Dataset title")
    description: Optional[str] = Field(default=None, description="Dataset context")
    source_type: str = Field(default="file_upload", max_length=64)
    metadata_json: dict = Field(default_factory=dict)


class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    source_type: str
    file_count: int
    total_rows: int
    health_score: Optional[float] = None
    metadata_json: dict
    created_at: datetime
    updated_at: datetime


class DatasetColumnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    data_type: str
    is_nullable: bool
    is_unique: bool
    null_count: int
    distinct_count: int
    sample_values: list
    stats: dict


class DatasetTableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    name: str
    description: Optional[str] = None
    row_count: int
    column_count: int
    raw_properties: dict
    columns: Optional[List[DatasetColumnResponse]] = None


class DataQualityFindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    finding_type: str
    severity: DataQualitySeverity
    issue_description: str
    affected_rows_count: int
    affected_ratio: float
    proposed_treatment: Optional[str] = None
    effect_on_premium_load: Optional[float] = None
    is_resolved: bool


class DataHealthSummaryResponse(BaseModel):
    dataset_id: uuid.UUID
    overall_health_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    audit_status: str = Field(default="completed", description="awaiting_data | completed | not_calculated")
    total_findings: int
    findings_by_severity: dict
    findings: List[DataQualityFindingResponse]
    calculated_data_quality_load_weight: float


class DataTransformationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    name: str
    transformation_type: str
    code_definition: str
    applied_by: str
    audit_provenance: dict
    created_at: datetime


class SemanticEntityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    entity_name: str
    description: Optional[str] = None
    primary_table_id: Optional[uuid.UUID] = None
    identifier_column: Optional[str] = None
    attributes: dict
    is_confirmed: bool


class SemanticRelationshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    source_entity_id: uuid.UUID
    target_entity_id: uuid.UUID
    relationship_type: str
    foreign_key_column: Optional[str] = None
    cardinality: str
    is_confirmed: bool


class MetricDefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    name: str
    label: str
    formula_expression: str
    unit: str
    description: Optional[str] = None
    calculation_grain: str
    is_confirmed: bool


class SegmentDefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    name: str
    description: Optional[str] = None
    filter_criteria: dict
    record_count: int
    share_of_volume: Optional[float] = None
    is_confirmed: bool


class DatasetFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    filename: str
    file_size_bytes: int
    mime_type: str
    status: str
    parse_metadata: dict
    created_at: datetime


class DatasetFileUploadResponse(BaseModel):
    dataset_file_id: uuid.UUID
    status: str
    tables_created: List[str]
    rows_ingested: int
    health_score: Optional[float] = None
    total_findings: int
    semantic_mappings_count: int
    readiness_status: str


class SemanticMappingResponse(BaseModel):
    table_id: str
    table_name: str
    column_id: str
    column_name: str
    concept_key: Optional[str] = None
    concept_name: str
    domain: str
    business_role: str
    data_type: str
    unit: Optional[str] = None
    aggregation: str
    status: str
    provenance_method: str


class SemanticMappingUpdateRequest(BaseModel):
    concept_key: Optional[str] = None
    business_role: Optional[str] = None
    aggregation: Optional[str] = None
