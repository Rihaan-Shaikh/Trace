"""TRACE Evidence, Verification, and RAG Pydantic Schemas.

Enforces provenance contracts linking brief statements to deterministic calculations,
verification results, assumptions, counter-findings, and document chunks.
"""

from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.enums import StatementLevel, AssumptionType


class CalculationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    metric_name: str
    formula_used: str
    result_numeric: float
    result_formatted: str
    input_parameters: dict
    input_row_count: int
    code_provenance: str
    created_at: datetime


class VerificationResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    calculation_id: uuid.UUID
    method_primary_name: str
    method_secondary_name: str
    method_primary_value: float
    method_secondary_value: float
    absolute_discrepancy: float
    relative_discrepancy: float
    tolerance_threshold: float
    is_verified: bool
    explanation: str


class AssumptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    name: str
    assumption_type: AssumptionType
    base_value: float
    min_value: float
    max_value: float
    unit: str
    rationale: str
    sensitivity_rank: int


class CounterFindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    title: str
    finding_text: str
    quantified_impact: float
    affected_segment: Optional[str] = None
    evidence_reference: Optional[str] = None
    is_absorbed_into_model: bool
    unabsorbed_impact: float


class EvidenceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    title: str
    statement_text: str
    statement_level: StatementLevel
    metric_name: Optional[str] = None
    calculation_id: Optional[uuid.UUID] = None
    source_table_name: Optional[str] = None
    row_count_sample: Optional[int] = None
    is_contradiction: bool
    provenance_metadata: dict
    created_at: datetime


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    chunk_text: str
    token_count: int
    metadata_json: dict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    filename: str
    document_type: str
    content_summary: Optional[str] = None
    metadata_json: dict
    created_at: datetime
    chunks: Optional[List[DocumentChunkResponse]] = None
