"""TRACE Domain Models Registry.

Exports all SQLAlchemy models for Alembic migrations and database operations.
"""

from backend.app.models.base import Base, GUID, TimestampMixin, UUIDPrimaryKeyMixin
from backend.app.models.enums import (
    UnderwritingVerdictType,
    DecisionStatus,
    DataQualitySeverity,
    DataSufficiencyVerdict,
    AssumptionType,
    LapseConditionType,
    StatementLevel,
    ApprovalActionType,
    JobStatus,
    JobType,
    AuditAction,
)

# Dataset & Semantic
from backend.app.models.dataset import (
    Dataset,
    DatasetFile,
    DatasetTable,
    DatasetColumn,
    DataQualityFinding,
    DataTransformation,
    SemanticEntity,
    SemanticRelationship,
    MetricDefinition,
    SegmentDefinition,
    BusinessGlossaryEntry,
)

# Decision
from backend.app.models.decision import (
    Decision,
    DecisionObjective,
    DecisionTemplate,
    InvestigationPlan,
    InvestigationQuestion,
    InvestigationRun,
)

# Evidence & RAG
from backend.app.models.evidence import (
    EvidenceItem,
    Calculation,
    VerificationResult,
    Assumption,
    CounterFinding,
    Document,
    DocumentChunk,
    RetrievalRecord,
)

# Underwriting & Rate Card
from backend.app.models.underwriting import (
    RateCard,
    RateCardVersion,
    ScenarioRun,
    ScenarioAssumption,
    ScenarioResult,
    ExposureReport,
    DecisionPremium,
    CoverageLapseCondition,
    Tripwire,
    UnderwritingVerdict,
)

# Approval
from backend.app.models.approval import (
    DecisionBrief,
    DecisionRecord,
    ApprovalAction,
)

# Ledger
from backend.app.models.ledger import (
    LossHistoryEntry,
    OutcomeRecord,
    RecalibrationResult,
)

# System
from backend.app.models.system import (
    Job,
    AuditEvent,
    ApplicationSetting,
)

# Evaluation
from backend.app.models.evaluation import EvaluationRunRecord

__all__ = [
    "Base",
    "GUID",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "UnderwritingVerdictType",
    "DecisionStatus",
    "DataQualitySeverity",
    "DataSufficiencyVerdict",
    "AssumptionType",
    "LapseConditionType",
    "StatementLevel",
    "ApprovalActionType",
    "JobStatus",
    "JobType",
    "AuditAction",
    # Dataset
    "Dataset",
    "DatasetFile",
    "DatasetTable",
    "DatasetColumn",
    "DataQualityFinding",
    "DataTransformation",
    "SemanticEntity",
    "SemanticRelationship",
    "MetricDefinition",
    "SegmentDefinition",
    "BusinessGlossaryEntry",
    # Decision
    "Decision",
    "DecisionObjective",
    "DecisionTemplate",
    "InvestigationPlan",
    "InvestigationQuestion",
    "InvestigationRun",
    # Evidence
    "EvidenceItem",
    "Calculation",
    "VerificationResult",
    "Assumption",
    "CounterFinding",
    "Document",
    "DocumentChunk",
    "RetrievalRecord",
    # Underwriting
    "RateCard",
    "RateCardVersion",
    "ScenarioRun",
    "ScenarioAssumption",
    "ScenarioResult",
    "ExposureReport",
    "DecisionPremium",
    "CoverageLapseCondition",
    "Tripwire",
    "UnderwritingVerdict",
    # Approval
    "DecisionBrief",
    "DecisionRecord",
    "ApprovalAction",
    # Ledger
    "LossHistoryEntry",
    "OutcomeRecord",
    "RecalibrationResult",
    # System
    "Job",
    "AuditEvent",
    "ApplicationSetting",
    # Evaluation
    "EvaluationRunRecord",
]
