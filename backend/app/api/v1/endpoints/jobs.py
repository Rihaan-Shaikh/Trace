"""TRACE Persistent Jobs API Endpoints."""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.enums import JobStatus, JobType
from backend.app.schemas.common import PaginatedResponse
from backend.app.schemas.job import JobCreateRequest, JobResponse, JobCancellationRequest
from backend.app.services.job_service import JobService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[JobResponse])
def list_jobs(
    status: Optional[JobStatus] = None,
    job_type: Optional[JobType] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List persistent background jobs."""
    items, total = JobService.list_jobs(db, status=status, job_type=job_type, skip=skip, limit=limit)
    return PaginatedResponse(
        items=[JobResponse.model_validate(j) for j in items],
        total=total,
        skip=skip,
        limit=limit,
        has_more=(skip + limit) < total,
    )


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(request: JobCreateRequest, db: Session = Depends(get_db)):
    """Enqueue a persistent asynchronous job."""
    return JobService.create_job(db, request)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieve status and real progress of a job."""
    return JobService.get_job(db, job_id)


@router.post("/{job_id}/cancel", response_model=JobResponse)
def cancel_job(
    job_id: uuid.UUID,
    request: JobCancellationRequest,
    db: Session = Depends(get_db),
):
    """Cancel a running or queued job."""
    return JobService.cancel_job(db, job_id, reason=request.reason)
