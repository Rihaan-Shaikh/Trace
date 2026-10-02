"""TRACE Decisions API Endpoints."""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.common import PaginatedResponse
from backend.app.schemas.decision import (
    DecisionCreateRequest,
    DecisionUpdateRequest,
    DecisionResponse,
    DecisionObjectiveCreateRequest,
    DecisionObjectiveResponse,
    DecisionTemplateResponse,
    InvestigationPlanResponse,
)
from backend.app.services.decision_service import DecisionService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DecisionResponse])
def list_decisions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List decisions undergoing or completed underwriting."""
    items, total = DecisionService.list_decisions(db, skip=skip, limit=limit)
    return PaginatedResponse(
        items=[DecisionResponse.model_validate(d) for d in items],
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + limit) < total,
    )


@router.post("", response_model=DecisionResponse, status_code=status.HTTP_201_CREATED)
def create_decision(request: DecisionCreateRequest, db: Session = Depends(get_db)):
    """Create a new decision to underwrite."""
    return DecisionService.create_decision(db, request)


@router.get("/templates", response_model=List[DecisionTemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    """List standard decision templates (e.g. T1: Stop discounts for low-margin segment)."""
    return DecisionService.list_templates(db)


@router.get("/{decision_id}", response_model=DecisionResponse)
def get_decision(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve decision by ID."""
    return DecisionService.get_decision(db, decision_id)


@router.patch("/{decision_id}", response_model=DecisionResponse)
def update_decision(
    decision_id: uuid.UUID,
    request: DecisionUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update decision metadata."""
    return DecisionService.update_decision(db, decision_id, request)


@router.post("/{decision_id}/objective", response_model=DecisionObjectiveResponse)
def set_decision_objective(
    decision_id: uuid.UUID,
    request: DecisionObjectiveCreateRequest,
    db: Session = Depends(get_db),
):
    """Bind a structured objective to a decision."""
    return DecisionService.set_objective(db, decision_id, request)


@router.post("/{decision_id}/objective/suggest", response_model=DecisionObjectiveResponse)
def suggest_decision_objective(
    decision_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Use the reasoning model to suggest a structured Decision Objective from the decision prompt."""
    from backend.app.services.investigation_service import InvestigationService
    return InvestigationService.structure_decision_objective(db, decision_id, confirmed_by_user=False)


@router.get("/{decision_id}/plan", response_model=Optional[InvestigationPlanResponse])
def get_decision_investigation_plan(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve the structured investigation plan for a decision."""
    decision = DecisionService.get_decision(db, decision_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision '{decision_id}' not found.",
        )
    return DecisionService.get_investigation_plan(db, decision_id)


@router.post("/{decision_id}/plan", response_model=InvestigationPlanResponse)
def generate_decision_investigation_plan(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Generates the structured investigation plan for a decision."""
    from backend.app.services.investigation_service import InvestigationService
    return InvestigationService.generate_investigation_plan(db, decision_id)


@router.post("/{decision_id}/investigate")
def run_investigation(
    decision_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Executes the full end-to-end decision investigation pipeline."""
    from backend.app.services.investigation_service import InvestigationService
    return InvestigationService.execute_investigation(db, decision_id)


@router.get("/{decision_id}/package")
def get_investigation_package(
    decision_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Retrieves the full structured investigation package."""
    from backend.app.services.investigation_service import InvestigationService
    return InvestigationService.get_investigation_package(db, decision_id)


@router.get("/{decision_id}/export")
def export_decision_record(
    decision_id: uuid.UUID,
    record_id: Optional[uuid.UUID] = Query(None, description="Specific DecisionRecord ID to export, defaults to latest approved record"),
    db: Session = Depends(get_db),
):
    """Exports an immutable approved Decision Record with complete provenance payload (Project Bible Section 9)."""
    from backend.app.services.approval_service import ApprovalService
    return ApprovalService.export_decision_record(db, decision_id=decision_id, record_id=record_id)


