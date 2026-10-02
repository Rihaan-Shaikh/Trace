"""TRACE Demo Management API Endpoints.

Provides endpoints for demo resilience, canonical environment reset, and cached hero underwriting state.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.demo_service import DemoService

router = APIRouter()


@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_demo_state(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Restores canonical, deterministic demo state across all TRACE subsystems.
    
    Ensures:
    - Canonical NovaMart dataset benchmark with confirmed semantic mappings
    - Hero Decision (T1: Should we stop discounts for low-margin customers?) with complete 7-stage run
    - Sample T2 Price Change Decision
    - 48 distinct simulated historical decisions in the actuarial ledger (Z=0.828, experience factor 0.500x)
    - Removal of orphan duplicate test datasets and empty draft decisions
    """
    return DemoService.reset_demo(db)
