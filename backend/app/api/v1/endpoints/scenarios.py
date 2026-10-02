"""TRACE Scenarios API Endpoints."""

from typing import List
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.underwriting import ScenarioRun
from backend.app.schemas.underwriting import ScenarioRunResponse

router = APIRouter()


@router.get("/decisions/{decision_id}", response_model=List[ScenarioRunResponse])
def list_decision_scenarios(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """List scenario runs (baseline and sandbox what-ifs) for a decision."""
    runs = list(
        db.scalars(
            select(ScenarioRun).where(ScenarioRun.decision_id == decision_id)
        ).all()
    )
    return runs
