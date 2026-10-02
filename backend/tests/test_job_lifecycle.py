"""Tests for Persistent Job Lifecycle and State Transitions."""

import pytest
from backend.app.core.errors import InvalidStateTransitionError
from backend.app.models.enums import JobStatus, JobType
from backend.app.schemas.job import JobCreateRequest
from backend.app.services.job_service import JobService


def test_job_standard_lifecycle(db_session):
    req = JobCreateRequest(
        job_type=JobType.INVESTIGATION_RUN,
        target_entity_type="decision",
        metadata_json={"priority": "high"},
    )
    job = JobService.create_job(db_session, req)
    assert job.status == JobStatus.QUEUED
    assert job.progress_percent == 0

    # Start job
    started_job = JobService.start_job(db_session, job.id, stage="segmentation_analysis")
    assert started_job.status == JobStatus.RUNNING
    assert started_job.progress_stage == "segmentation_analysis"
    assert started_job.started_at is not None

    # Update progress
    progress_job = JobService.update_progress(db_session, job.id, stage="scenario_simulation", percent=45)
    assert progress_job.progress_percent == 45
    assert progress_job.progress_stage == "scenario_simulation"

    # Complete job
    completed_job = JobService.complete_job(db_session, job.id, metadata_update={"rows_analyzed": 100000})
    assert completed_job.status == JobStatus.COMPLETED
    assert completed_job.progress_percent == 100
    assert completed_job.finished_at is not None
    assert completed_job.metadata_json["rows_analyzed"] == 100000


def test_job_cancellation(db_session):
    req = JobCreateRequest(
        job_type=JobType.SCENARIO_SIMULATION,
        target_entity_type="decision",
    )
    job = JobService.create_job(db_session, req)
    JobService.start_job(db_session, job.id)

    # Cancel job
    cancelled_job = JobService.cancel_job(db_session, job.id, reason="User interrupted analysis")
    assert cancelled_job.status == JobStatus.CANCELLED
    assert cancelled_job.cancellation_reason == "User interrupted analysis"
    assert cancelled_job.finished_at is not None


def test_job_invalid_state_transition(db_session):
    req = JobCreateRequest(
        job_type=JobType.DATA_HEALTH_CHECK,
        target_entity_type="dataset",
    )
    job = JobService.create_job(db_session, req)

    # Cannot update progress while still queued
    with pytest.raises(InvalidStateTransitionError):
        JobService.update_progress(db_session, job.id, stage="running", percent=50)

    # Complete job
    JobService.start_job(db_session, job.id)
    JobService.complete_job(db_session, job.id)

    # Cannot cancel already completed job
    with pytest.raises(InvalidStateTransitionError):
        JobService.cancel_job(db_session, job.id, reason="Too late")
