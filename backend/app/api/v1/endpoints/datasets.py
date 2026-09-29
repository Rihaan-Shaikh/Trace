"""TRACE Dataset Management API Endpoints.

Provides endpoints for:
- Dataset registration and retrieval
- Multi-format file ingestion (CSV, XLSX)
- Structured table & column profiling
- Semantic layer mapping and confirmation
- Transformation & provenance retrieval
- Canonical NovaMart benchmark seeding
"""

import os
from typing import Any, Dict, List
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.db.session import get_db
from backend.app.models.dataset import DataTransformation
from backend.app.schemas.common import PaginatedResponse
from backend.app.schemas.dataset import (
    DatasetCreateRequest,
    DatasetResponse,
    DatasetTableResponse,
    DatasetFileResponse,
    DatasetFileUploadResponse,
    DataTransformationResponse,
    SemanticMappingResponse,
    SemanticMappingUpdateRequest,
)
from backend.app.services.dataset_service import DatasetService
from backend.app.services.ingestion_service import IngestionService
from backend.app.services.semantic_service import SemanticLayerService
from backend.app.analytics.novamart_generator import NovaMartGenerator

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DatasetResponse])
def list_datasets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List business datasets with pagination."""
    items, total = DatasetService.list_datasets(db, skip=skip, limit=limit)
    return PaginatedResponse(
        items=[DatasetResponse.model_validate(d) for d in items],
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + limit) < total,
    )


@router.post("", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
def create_dataset(request: DatasetCreateRequest, db: Session = Depends(get_db)):
    """Register a new business dataset."""
    return DatasetService.create_dataset(db, request)


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve dataset metadata by ID."""
    return DatasetService.get_dataset(db, dataset_id)


@router.get("/{dataset_id}/tables", response_model=List[DatasetTableResponse])
def list_dataset_tables(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """List structured tables and profile schemas belonging to a dataset."""
    return DatasetService.list_tables(db, dataset_id)


@router.get("/{dataset_id}/files", response_model=List[DatasetFileResponse])
def list_dataset_files(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """List source files uploaded to this dataset."""
    return DatasetService.list_files(db, dataset_id)


@router.get("/{dataset_id}/transformations", response_model=List[DataTransformationResponse])
def list_dataset_transformations(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """List recorded data transformation provenance records for this dataset."""
    DatasetService.get_dataset(db, dataset_id)
    transformations = db.scalars(
        select(DataTransformation).where(DataTransformation.dataset_id == dataset_id).order_by(DataTransformation.created_at)
    ).all()
    return [DataTransformationResponse.model_validate(t) for t in transformations]


@router.post("/{dataset_id}/upload", response_model=DatasetFileUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_and_ingest_file(
    dataset_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Uploads a CSV or XLSX source file and executes deterministic ingestion, profiling, and health audit."""
    try:
        # 1. Save file safely with checksum and duplicate detection
        dataset_file = IngestionService.save_uploaded_file(db, dataset_id, file)
        # 2. Run deterministic pipeline
        result = IngestionService.process_file_pipeline(db, dataset_file.id)
        return DatasetFileUploadResponse(
            dataset_file_id=uuid.UUID(result["dataset_file_id"]),
            status=result["status"],
            tables_created=result["tables_created"],
            rows_ingested=result["rows_ingested"],
            health_score=result["health_score"],
            total_findings=result["total_findings"],
            semantic_mappings_count=result["semantic_mappings_count"],
            readiness_status=result["readiness_status"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ingestion failed: {str(e)}")


@router.get("/{dataset_id}/semantic-mappings", response_model=List[SemanticMappingResponse])
def list_semantic_mappings(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve column-level business semantic concept mappings."""
    DatasetService.get_dataset(db, dataset_id)
    mappings = SemanticLayerService.list_mappings(db, dataset_id)
    return [SemanticMappingResponse(**m) for m in mappings]


@router.post("/{dataset_id}/semantic-mappings/confirm-all", response_model=List[SemanticMappingResponse])
def confirm_all_semantic_mappings(dataset_id: uuid.UUID, db: Session = Depends(get_db)):
    """Batch-confirms all suggested semantic mappings and evaluates analysis readiness."""
    DatasetService.get_dataset(db, dataset_id)
    confirmed = SemanticLayerService.confirm_all_mappings(db, dataset_id)
    return [SemanticMappingResponse(**m) for m in confirmed]


@router.post("/{dataset_id}/semantic-mappings/{column_id}", response_model=SemanticMappingResponse)
def update_semantic_mapping(
    dataset_id: uuid.UUID,
    column_id: uuid.UUID,
    request: SemanticMappingUpdateRequest,
    db: Session = Depends(get_db),
):
    """Confirms or reclassifies the business semantic mapping for a specific column."""
    try:
        updated = SemanticLayerService.confirm_or_update_mapping(
            db,
            dataset_id=dataset_id,
            column_id=column_id,
            concept_key=request.concept_key,
            business_role=request.business_role,
            aggregation=request.aggregation,
        )
        return SemanticMappingResponse(**updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/seed-novamart", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
def seed_novamart_benchmark(db: Session = Depends(get_db)):
    """Seeds the canonical NovaMart commercial benchmark dataset (locked ~25k customers, ~100k transactions, 500 products)."""
    dataset_req = DatasetCreateRequest(
        name="NovaMart Commercial Operations Benchmark (Locked ~25k/~100k/500)",
        description="Canonical benchmark: ~25,000 customers, ~100,000 transactions, 500 products, 6 regions, 5 business CSVs with planted data health findings.",
        source_type="benchmark_seed",
        metadata_json={"is_benchmark": True, "seed": 42},
    )
    dataset = DatasetService.create_dataset(db, dataset_req)

    fixture_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../data/novamart"))
    eval_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../evaluation"))
    paths = NovaMartGenerator.export_benchmark_suite(output_dir=fixture_dir, eval_dir=eval_dir, seed=42)

    # Ingest the 5 business CSVs (ground_truth.json is in eval_dir and is strictly skipped)
    for name in ["customers", "products", "transactions", "regions", "discounts"]:
        path = paths[name]
        with open(path, "rb") as f:
            upload = UploadFile(filename=f"{name}.csv", file=f)
            saved_file = IngestionService.save_uploaded_file(db, dataset.id, upload)
            IngestionService.process_file_pipeline(db, saved_file.id)

    db.refresh(dataset)
    return dataset
