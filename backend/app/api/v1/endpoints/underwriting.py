"""TRACE Underwriting Outputs API Endpoints.

Provides inspection of:
- Decision Premium and 4 load decomposition
- Exposure Report
- Coverage Lapse Conditions & Tripwires
- Underwriting Verdict
"""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from backend.app.db.session import get_db
from backend.app.models.underwriting import (
    DecisionPremium,
    ExposureReport,
    CoverageLapseCondition,
    UnderwritingVerdict,
    ScenarioRun,
)
from backend.app.schemas.underwriting import (
    DecisionPremiumResponse,
    ExposureReportResponse,
    CoverageLapseConditionResponse,
    UnderwritingVerdictResponse,
)

router = APIRouter()


@router.get("/decisions/{decision_id}/premium", response_model=Optional[DecisionPremiumResponse])
def get_decision_premium(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve calculated Decision Premium and the breakdown of its 4 risk loads."""
    premium = db.scalar(
        select(DecisionPremium)
        .where(DecisionPremium.decision_id == decision_id)
        .order_by(desc(DecisionPremium.created_at))
    )
    return premium


@router.get("/decisions/{decision_id}/exposure", response_model=Optional[ExposureReportResponse])
def get_exposure_report(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve Exposure Report (P10 tail loss, concentration exposure, data exposure)."""
    report = db.scalar(
        select(ExposureReport)
        .where(ExposureReport.decision_id == decision_id)
        .order_by(desc(ExposureReport.created_at))
    )
    return report


@router.get("/decisions/{decision_id}/lapse-conditions", response_model=List[CoverageLapseConditionResponse])
def get_coverage_lapse_conditions(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve ranked Coverage Lapse Conditions and Tripwires."""
    conditions = list(
        db.scalars(
            select(CoverageLapseCondition)
            .where(CoverageLapseCondition.decision_id == decision_id)
            .order_by(CoverageLapseCondition.priority_rank)
        ).all()
    )
    return conditions


@router.get("/decisions/{decision_id}/verdict", response_model=Optional[UnderwritingVerdictResponse])
def get_underwriting_verdict(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve categorical Underwriting Verdict (Recommended, Recommended with Conditions, Refer, Decline)."""
    verdict = db.scalar(
        select(UnderwritingVerdict)
        .where(UnderwritingVerdict.decision_id == decision_id)
        .order_by(desc(UnderwritingVerdict.created_at))
    )
    return verdict
