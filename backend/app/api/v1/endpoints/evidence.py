"""TRACE Evidence Chain API Endpoints."""

from typing import List
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.evidence import EvidenceItem, Calculation, VerificationResult, Assumption, CounterFinding
from backend.app.schemas.evidence import (
    EvidenceItemResponse,
    CalculationResponse,
    VerificationResultResponse,
    AssumptionResponse,
    CounterFindingResponse,
)

router = APIRouter()


@router.get("/decisions/{decision_id}", response_model=List[EvidenceItemResponse])
def get_decision_evidence_chain(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve the Evidence Chain linking decision statements to calculations and data."""
    items = list(
        db.scalars(
            select(EvidenceItem).where(EvidenceItem.decision_id == decision_id)
        ).all()
    )
    return items


@router.get("/decisions/{decision_id}/calculations", response_model=List[CalculationResponse])
def get_decision_calculations(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve deterministic calculations with formula provenance."""
    return list(
        db.scalars(
            select(Calculation).where(Calculation.decision_id == decision_id)
        ).all()
    )


@router.get("/calculations/{calculation_id}/verifications", response_model=List[VerificationResultResponse])
def get_calculation_verifications(calculation_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve independent secondary verification results for a calculation."""
    return list(
        db.scalars(
            select(VerificationResult).where(VerificationResult.calculation_id == calculation_id)
        ).all()
    )


@router.get("/decisions/{decision_id}/assumptions", response_model=List[AssumptionResponse])
def get_decision_assumptions(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve assumptions used in the decision model."""
    return list(
        db.scalars(
            select(Assumption).where(Assumption.decision_id == decision_id)
        ).all()
    )


@router.get("/decisions/{decision_id}/counter-findings", response_model=List[CounterFindingResponse])
def get_counter_findings(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve adverse findings produced by the Counter-Decision Underwriter."""
    return list(
        db.scalars(
            select(CounterFinding).where(CounterFinding.decision_id == decision_id)
        ).all()
    )
