"""TRACE Schemas Registry.

Exports all Pydantic v2 schemas for API contracts.
"""

from backend.app.schemas.common import (
    PaginationParams,
    PaginatedResponse,
    SystemHealthResponse,
    DatabaseHealth,
    AuditLogEntryResponse,
)

from backend.app.schemas.dataset import (
    DatasetCreateRequest,
    DatasetResponse,
    DatasetTableResponse,
    DatasetColumnResponse,
    DataQualityFindingResponse,
    DataHealthSummaryResponse,
    SemanticEntityResponse,
    SemanticRelationshipResponse,
    MetricDefinitionResponse,
    SegmentDefinitionResponse,
)

from backend.app.schemas.decision import (
    DecisionCreateRequest,
    DecisionUpdateRequest,
    DecisionResponse,
    DecisionObjectiveCreateRequest,
    DecisionObjectiveResponse,
    DecisionTemplateResponse,
    InvestigationPlanResponse,
    InvestigationQuestionResponse,
)

from backend.app.schemas.evidence import (
    CalculationResponse,
    VerificationResultResponse,
    AssumptionResponse,
    CounterFindingResponse,
    EvidenceItemResponse,
    DocumentResponse,
    DocumentChunkResponse,
)

from backend.app.schemas.underwriting import (
    RateCardResponse,
    RateCardVersionResponse,
    RateCardVersionCreateRequest,
    PremiumLoadsBreakdown,
    DecisionPremiumResponse,
    ExposureReportResponse,
    TripwireResponse,
    CoverageLapseConditionResponse,
    UnderwritingVerdictResponse,
    ScenarioAssumptionResponse,
    ScenarioRunResponse,
    ReQuoteRequest,
)

from backend.app.schemas.approval import (
    DecisionBriefResponse,
    ApprovalActionRequest,
    DecisionRecordResponse,
)

from backend.app.schemas.ledger import (
    OutcomeLogRequest,
    OutcomeRecordResponse,
    LossHistoryEntryResponse,
    RecalibrationResponse,
)

from backend.app.schemas.job import (
    JobCreateRequest,
    JobResponse,
    JobCancellationRequest,
)

__all__ = [
    "PaginationParams",
    "PaginatedResponse",
    "SystemHealthResponse",
    "DatabaseHealth",
    "AuditLogEntryResponse",
    "DatasetCreateRequest",
    "DatasetResponse",
    "DatasetTableResponse",
    "DatasetColumnResponse",
    "DataQualityFindingResponse",
    "DataHealthSummaryResponse",
    "SemanticEntityResponse",
    "SemanticRelationshipResponse",
    "MetricDefinitionResponse",
    "SegmentDefinitionResponse",
    "DecisionCreateRequest",
    "DecisionUpdateRequest",
    "DecisionResponse",
    "DecisionObjectiveCreateRequest",
    "DecisionObjectiveResponse",
    "DecisionTemplateResponse",
    "InvestigationPlanResponse",
    "InvestigationQuestionResponse",
    "CalculationResponse",
    "VerificationResultResponse",
    "AssumptionResponse",
    "CounterFindingResponse",
    "EvidenceItemResponse",
    "DocumentResponse",
    "DocumentChunkResponse",
    "RateCardResponse",
    "RateCardVersionResponse",
    "RateCardVersionCreateRequest",
    "PremiumLoadsBreakdown",
    "DecisionPremiumResponse",
    "ExposureReportResponse",
    "TripwireResponse",
    "CoverageLapseConditionResponse",
    "UnderwritingVerdictResponse",
    "ScenarioAssumptionResponse",
    "ScenarioRunResponse",
    "ReQuoteRequest",
    "DecisionBriefResponse",
    "ApprovalActionRequest",
    "DecisionRecordResponse",
    "OutcomeLogRequest",
    "OutcomeRecordResponse",
    "LossHistoryEntryResponse",
    "RecalibrationResponse",
    "JobCreateRequest",
    "JobResponse",
    "JobCancellationRequest",
]
