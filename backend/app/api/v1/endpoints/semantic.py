"""TRACE Business Semantic Layer API Endpoints."""

from typing import List
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.dataset import (
    SemanticEntityResponse,
    MetricDefinitionResponse,
)
from backend.app.services.dataset_service import DatasetService

router = APIRouter()


@router.get("/{dataset_id}/entities", response_model=List[SemanticEntityResponse])
def list_semantic_entities(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """List business entities (e.g. Customer, Order) mapped for a dataset."""
    return DatasetService.list_semantic_entities(db, dataset_id)


@router.get("/{dataset_id}/metrics", response_model=List[MetricDefinitionResponse])
def list_metric_definitions(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """List confirmed business metrics (e.g. Gross Profit, Churn Rate) for a dataset."""
    return DatasetService.list_metrics(db, dataset_id)
