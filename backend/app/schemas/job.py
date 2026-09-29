"""TRACE Persistent Job Queue Pydantic Schemas.

Enforces asynchronous job creation, status polling, and cancellation contracts.
"""

from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.enums import JobStatus, JobType


class JobCreateRequest(BaseModel):
    job_type: JobType
    target_entity_type: str = Field(..., max_length=64)
    target_entity_id: Optional[uuid.UUID] = None
    metadata_json: dict = Field(default_factory=dict)


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_type: JobType
    status: JobStatus
    target_entity_type: str
    target_entity_id: Optional[uuid.UUID] = None
    progress_stage: str
    progress_percent: int
    metadata_json: dict
    error_message: Optional[str] = None
    retry_count: int
    cancellation_reason: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class JobCancellationRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=255)
