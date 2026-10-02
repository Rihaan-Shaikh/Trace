"""TRACE Rate Card API Endpoints.

Provides public inspection of the underwriting pricing policy, weights, and verdict bands.
"""

from typing import List
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.underwriting import (
    RateCardResponse,
    RateCardVersionResponse,
    RateCardVersionCreateRequest,
)
from backend.app.services.rate_card_service import RateCardService

router = APIRouter()


@router.get("/rate-card", response_model=RateCardVersionResponse)
def get_active_rate_card(db: Session = Depends(get_db)):
    """Fetch the currently active underwriting Rate Card policy."""
    return RateCardService.get_active_policy(db)


@router.get("/rate-cards", response_model=List[RateCardResponse])
def list_rate_cards(db: Session = Depends(get_db)):
    """List all Rate Card policies."""
    return RateCardService.list_rate_cards(db)


@router.post(
    "/rate-cards/{rate_card_id}/versions",
    response_model=RateCardVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_rate_card_version(
    rate_card_id: uuid.UUID,
    request: RateCardVersionCreateRequest,
    db: Session = Depends(get_db),
):
    """Publish a new Rate Card version without mutating historical versions."""
    return RateCardService.create_new_version(db, rate_card_id, request)
