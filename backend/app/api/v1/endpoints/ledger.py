"""TRACE Loss History Ledger API Endpoints."""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.common import PaginatedResponse
from backend.app.schemas.ledger import (
    LossHistoryEntryResponse,
    OutcomeLogRequest,
    OutcomeRecordResponse,
    RecalibrationResponse,
)
from backend.app.services.ledger_service import LedgerService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[LossHistoryEntryResponse])
def list_ledger_entries(
    decision_class: Optional[str] = None,
    is_simulated: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List historical underwriting predictions and realised outcomes."""
    items, total = LedgerService.list_entries(
        db, decision_class=decision_class, is_simulated=is_simulated, skip=skip, limit=limit
    )
    return PaginatedResponse(
        items=[LossHistoryEntryResponse.model_validate(e) for e in items],
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + limit) < total,
    )


@router.get("/{entry_id}", response_model=LossHistoryEntryResponse)
def get_ledger_entry(entry_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve an individual ledger entry."""
    return LedgerService.get_entry(db, entry_id)


@router.post(
    "/{entry_id}/outcomes",
    response_model=OutcomeRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_realised_outcome(
    entry_id: uuid.UUID,
    request: OutcomeLogRequest,
    db: Session = Depends(get_db),
):
    """Log an actual realised outcome against a historical prediction, closing the learning loop."""
    return LedgerService.log_outcome(db, entry_id, request)


@router.post("/seed-simulated", response_model=List[LossHistoryEntryResponse])
def seed_simulated_ledger_history(force: bool = False, db: Session = Depends(get_db)):
    """Seed synthetic historical decisions for NovaMart calibration testing."""
    seeded = LedgerService.seed_simulated_history(db, force=force)
    return [LossHistoryEntryResponse.model_validate(e) for e in seeded]


@router.get("/decisions/{decision_id}/entry", response_model=Optional[LossHistoryEntryResponse])
def get_decision_ledger_entry(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve the ledger entry corresponding to a specific decision."""
    entry = LedgerService.get_entry_by_decision(db, decision_id)
    return LossHistoryEntryResponse.model_validate(entry) if entry else None


@router.get("/recalibration/{decision_class}", response_model=RecalibrationResponse)
def get_class_recalibration(decision_class: str, db: Session = Depends(get_db)):
    """Retrieve credibility-weighted experience factor Z = n / (n + k) for a decision class."""
    return LedgerService.calculate_class_recalibration(db, decision_class)
