"""TRACE Decision Brief, Human Approval, and Decision Record Schemas.

Enforces human sign-off contracts and immutable DecisionRecord schemas.
"""

from datetime import datetime
from typing import Optional, Any
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.app.models.enums import ApprovalActionType


class DecisionBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    scenario_run_id: uuid.UUID
    brief_title: str
    executive_summary: str
    sections_json: dict
    is_locked: bool
    created_at: datetime


class ApprovalActionRequest(BaseModel):
    action: ApprovalActionType = Field(..., description="Approve, Modify, or Reject")
    approver_name: str = Field(..., min_length=2, max_length=128)
    approver_role: str = Field(default="Decision Maker", max_length=128)
    notes: Optional[str] = None
    sandbox_modifications: dict = Field(default_factory=dict)

    @field_validator("action", mode="before")
    @classmethod
    def normalize_action(cls, v: Any) -> Any:
        if isinstance(v, str):
            mapping = {
                "approve": ApprovalActionType.APPROVE,
                "modify": ApprovalActionType.MODIFY,
                "reject": ApprovalActionType.REJECT,
            }
            clean = v.strip().lower()
            if clean in mapping:
                return mapping[clean]
        return v


class DecisionRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    decision_brief_id: uuid.UUID
    approver_name: str
    approver_role: str
    action_type: ApprovalActionType
    approval_notes: Optional[str] = None
    is_immutable: bool
    brief_snapshot: dict
    evidence_chain_snapshot: dict
    rate_card_snapshot: dict
    modifications_made: Optional[dict] = None
    snapshot_integrity_hash: Optional[str] = None
    created_at: datetime

