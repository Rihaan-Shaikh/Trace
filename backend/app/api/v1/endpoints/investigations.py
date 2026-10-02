"""TRACE Investigation API Endpoints."""

from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.decision import InvestigationPlanResponse
from backend.app.services.decision_service import DecisionService

router = APIRouter()


@router.get("/decisions/{decision_id}/plan", response_model=Optional[InvestigationPlanResponse])
def get_investigation_plan(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve the structured investigation plan and sufficiency status for a decision."""
    decision = DecisionService.get_decision(db, decision_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision '{decision_id}' not found.",
        )
    return DecisionService.get_investigation_plan(db, decision_id)


@router.post("/decisions/{decision_id}/plan", response_model=InvestigationPlanResponse)
def generate_investigation_plan(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Generates the structured mini-investigation plan and sufficiency verdict for a decision."""
    from backend.app.services.investigation_service import InvestigationService
    return InvestigationService.generate_investigation_plan(db, decision_id)

