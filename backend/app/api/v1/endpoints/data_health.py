"""TRACE Data Health Check API Endpoints."""

import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.dataset import DataHealthSummaryResponse
from backend.app.services.dataset_service import DatasetService

router = APIRouter()


@router.get("/{dataset_id}", response_model=DataHealthSummaryResponse)
def get_data_health(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve audit findings and the deterministic Data-Quality Load score for a dataset."""
    return DatasetService.get_data_health_summary(db, dataset_id)
