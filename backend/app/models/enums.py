"""TRACE Locked Vocabulary and Domain Enums.

Strictly preserves the locked nomenclature specified in Project Bible Section 7 & 16:
- Underwriting Verdicts: Recommended, Recommended with Conditions, Refer, Decline
- Signature terms: Decision Premium, Exposure Report, Coverage Lapse Conditions,
  Counter-Decision Underwriter, Loss History Ledger.
- Statement Levels: Observed Fact, Calculated Result, Modelled Scenario, Recommendation.
"""

from enum import Enum


class UnderwritingVerdictType(str, Enum):
    RECOMMENDED = "Recommended"
    RECOMMENDED_WITH_CONDITIONS = "Recommended with Conditions"
    REFER = "Refer"
    DECLINE = "Decline"


class DecisionStatus(str, Enum):
    DRAFT = "draft"
    INGESTING = "ingesting"
    AUDITING = "auditing"
    INVESTIGATING = "investigating"
    UNDERWRITTEN = "underwritten"
    APPROVED = "approved"
    MODIFIED = "modified"
    REJECTED = "rejected"


class DataQualitySeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DataSufficiencyVerdict(str, Enum):
    SUFFICIENT = "sufficient"
    LIMITED = "limited"
    INSUFFICIENT = "insufficient"


class AssumptionType(str, Enum):
    DATA_DERIVED = "data_derived"
    JUDGEMENT = "judgement"
    USER_SUPPLIED = "user_supplied"


class LapseConditionType(str, Enum):
    THRESHOLD = "threshold"
    CONCENTRATION = "concentration"
    DATA = "data"
    DEFINITION = "definition"
    TIME = "time"
    COMBINATION = "combination"


class StatementLevel(str, Enum):
    OBSERVED_FACT = "observed_fact"
    CALCULATED_RESULT = "calculated_result"
    MODELLED_SCENARIO = "modelled_scenario"
    RECOMMENDATION = "recommendation"


class ApprovalActionType(str, Enum):
    APPROVE = "Approve"
    MODIFY = "Modify"
    REJECT = "Reject"


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(str, Enum):
    DATA_INGEST = "data_ingest"
    DATA_HEALTH_CHECK = "data_health_check"
    SEMANTIC_INFERENCE = "semantic_inference"
    INVESTIGATION_RUN = "investigation_run"
    VERIFICATION_RUN = "verification_run"
    SCENARIO_SIMULATION = "scenario_simulation"
    COUNTER_DECISION_RUN = "counter_decision_run"
    UNDERWRITING_EVALUATION = "underwriting_evaluation"
    LEDGER_RECALIBRATION = "ledger_recalibration"


class AuditAction(str, Enum):
    DATASET_UPLOADED = "dataset_uploaded"
    DATASET_PARSED = "dataset_parsed"
    DATA_HEALTH_CHECK_COMPLETED = "data_health_check_completed"
    SCHEMA_MAPPED = "schema_mapped"
    DECISION_CREATED = "decision_created"
    INVESTIGATION_STARTED = "investigation_started"
    CALCULATION_PRODUCED = "calculation_produced"
    VERIFICATION_COMPLETED = "verification_completed"
    COUNTER_FINDING_RECORDED = "counter_finding_recorded"
    SCENARIO_CHANGED = "scenario_changed"
    SANDBOX_MODIFIED = "sandbox_modified"
    BRIEF_GENERATED = "brief_generated"
    APPROVAL_SUBMITTED = "approval_submitted"
    DECISION_RECORD_CREATED = "decision_record_created"
    DECISION_REJECTED = "decision_rejected"
    LEDGER_OUTCOME_LOGGED = "ledger_outcome_logged"
    RATE_CARD_VERSION_CHANGED = "rate_card_version_changed"
