"""TRACE Loss History Ledger and Recalibration Schemas.

Enforces ledger logging, outcome tracking, and credibility recalibration contracts.
"""

from datetime import datetime, timezone
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class OutcomeLogRequest(BaseModel):
    logged_by: str = Field(..., min_length=2, max_length=128)
    outcome_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    primary_metric_realised: float
    variance_notes: Optional[str] = None
    source_reference: Optional[str] = None


class OutcomeRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    loss_history_entry_id: uuid.UUID
    logged_by: str
    outcome_date: datetime
    primary_metric_realised: float
    variance_notes: Optional[str] = None
    source_reference: Optional[str] = None
    created_at: datetime


class LossHistoryEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: Optional[uuid.UUID] = None
    decision_class: str
    decision_title: str
    underwritten_date: datetime
    validity_end_date: datetime
    is_simulated: bool
    projected_upside: float
    decision_premium: float
    premium_rate: float
    p10_tail_exposure: float
    underwriting_verdict: str
    human_action: str
    actual_realised_value: Optional[float] = None
    actual_vs_predicted_variance: Optional[float] = None
    fell_inside_predicted_range: Optional[bool] = None
    lapse_event_triggered: Optional[bool] = None
    is_claim: Optional[bool] = None
    created_at: datetime
    outcomes: Optional[List[OutcomeRecordResponse]] = None


class RecalibrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_class: str
    logged_decisions_count: int
    claims_count: int
    mean_error_ratio: float
    credibility_z: float
    experience_factor: float
    details: dict
    created_at: datetime
