"""TRACE System, Job, Audit, and Application Settings Models.

Implements the persistent Job queue and Audit foundation specified in Project Bible Section 10 & 20:
- Persistent asynchronous jobs with realistic lifecycle states (queued, running, completed, failed, cancelled)
- AuditEvent logs for compliance, traceability, and tamper-evident history
- ApplicationSetting for runtime configuration overrides
"""

from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import (
    String,
    Text,
    Integer,
    Boolean,
    Enum as SAEnum,
    Index,
    JSON,
    DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base, GUID, TimestampMixin, UUIDPrimaryKeyMixin
from backend.app.models.enums import JobStatus, JobType, AuditAction


class Job(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Persistent asynchronous job tracking long-running tasks."""
    __tablename__ = "jobs"

    job_type: Mapped[JobType] = mapped_column(
        SAEnum(JobType, native_enum=False), nullable=False, index=True
    )
    status: Mapped[JobStatus] = mapped_column(
        SAEnum(JobStatus, native_enum=False), default=JobStatus.QUEUED, nullable=False, index=True
    )
    target_entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), nullable=True, index=True)
    progress_stage: Mapped[str] = mapped_column(String(128), default="queued", nullable=False)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditEvent(Base, UUIDPrimaryKeyMixin):
    """Tamper-evident log of significant business and underwriting actions."""
    __tablename__ = "audit_events"

    event_type: Mapped[AuditAction] = mapped_column(
        SAEnum(AuditAction, native_enum=False), nullable=False, index=True
    )
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(128), default="system", nullable=False)
    details_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )


class ApplicationSetting(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Key-value application settings stored in the database."""
    __tablename__ = "application_settings"

    key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    value_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
