"""TRACE Human Approval and Decision Record API Endpoints.

Rule: "Human approval remains mandatory for a decision to become an actual Decision Record."
"""

from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.approval import DecisionBrief, DecisionRecord
from backend.app.models.decision import Decision
from backend.app.schemas.approval import (
    DecisionBriefResponse,
    ApprovalActionRequest,
    DecisionRecordResponse,
)
from backend.app.services.approval_service import ApprovalService

router = APIRouter()


@router.get("/decisions/{decision_id}/brief", response_model=Optional[DecisionBriefResponse])
def get_decision_brief(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve the core deliverable Decision Brief."""
    decision = db.get(Decision, decision_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision '{decision_id}' not found.",
        )
    brief = ApprovalService.get_brief(db, decision_id)
    return brief


@router.post("/decisions/{decision_id}/actions", response_model=Optional[DecisionRecordResponse])
def submit_approval_action(
    decision_id: uuid.UUID,
    request: ApprovalActionRequest,
    db: Session = Depends(get_db),
):
    """Submit human sign-off action: Approve, Modify, or Reject."""
    record = ApprovalService.submit_action(db, decision_id, request)
    return record


@router.get("/decisions/{decision_id}/record", response_model=Optional[DecisionRecordResponse])
def get_decision_record(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve immutable Decision Record created upon human approval."""
    record = db.scalar(
        select(DecisionRecord).where(DecisionRecord.decision_id == decision_id)
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No approved Decision Record found for decision '{decision_id}'.",
        )
    return record
