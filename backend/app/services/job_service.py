"""TRACE Persistent Asynchronous Job Service.

Implements persistent job queue management without artificial progress faking.
Job states: queued, running, completed, failed, cancelled.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from backend.app.core.errors import EntityNotFoundError, InvalidStateTransitionError
from backend.app.models.system import Job
from backend.app.models.enums import JobStatus, JobType
from backend.app.schemas.job import JobCreateRequest


class JobService:
    @staticmethod
    def create_job(db: Session, request: JobCreateRequest) -> Job:
        job = Job(
            job_type=request.job_type,
            status=JobStatus.QUEUED,
            target_entity_type=request.target_entity_type,
            target_entity_id=request.target_entity_id,
            progress_stage="queued",
            progress_percent=0,
            metadata_json=request.metadata_json,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def get_job(db: Session, job_id: uuid.UUID) -> Job:
        job = db.get(Job, job_id)
        if not job:
            raise EntityNotFoundError("Job", job_id)
        return job

    @staticmethod
    def list_jobs(
        db: Session,
        status: Optional[JobStatus] = None,
        job_type: Optional[JobType] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Job], int]:
        query = select(Job)
        if status:
            query = query.where(Job.status == status)
        if job_type:
            query = query.where(Job.job_type == job_type)

        total = len(list(db.scalars(query).all()))
        items = list(
            db.scalars(query.order_by(desc(Job.created_at)).offset(skip).limit(limit)).all()
        )
        return items, total

    @staticmethod
    def start_job(db: Session, job_id: uuid.UUID, stage: str = "running") -> Job:
        job = JobService.get_job(db, job_id)
        if job.status != JobStatus.QUEUED:
            raise InvalidStateTransitionError(job.status.value, JobStatus.RUNNING.value, [JobStatus.QUEUED.value])

        job.status = JobStatus.RUNNING
        job.progress_stage = stage
        job.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def update_progress(db: Session, job_id: uuid.UUID, stage: str, percent: int) -> Job:
        job = JobService.get_job(db, job_id)
        if job.status != JobStatus.RUNNING:
            raise InvalidStateTransitionError(job.status.value, "progress_update", [JobStatus.RUNNING.value])

        job.progress_stage = stage
        job.progress_percent = max(0, min(100, percent))
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def complete_job(db: Session, job_id: uuid.UUID, metadata_update: Optional[dict] = None) -> Job:
        job = JobService.get_job(db, job_id)
        if job.status not in (JobStatus.RUNNING, JobStatus.QUEUED):
            raise InvalidStateTransitionError(job.status.value, JobStatus.COMPLETED.value, [JobStatus.RUNNING.value])

        job.status = JobStatus.COMPLETED
        job.progress_stage = "completed"
        job.progress_percent = 100
        job.finished_at = datetime.now(timezone.utc)
        if metadata_update:
            job.metadata_json = {**job.metadata_json, **metadata_update}
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def fail_job(db: Session, job_id: uuid.UUID, error_message: str) -> Job:
        job = JobService.get_job(db, job_id)
        job.status = JobStatus.FAILED
        job.progress_stage = "failed"
        job.error_message = error_message
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def cancel_job(db: Session, job_id: uuid.UUID, reason: str) -> Job:
        job = JobService.get_job(db, job_id)
        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
            raise InvalidStateTransitionError(
                job.status.value, JobStatus.CANCELLED.value, ["Cannot cancel already finished job"]
            )

        job.status = JobStatus.CANCELLED
        job.progress_stage = "cancelled"
        job.cancellation_reason = reason
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(job)
        return job
