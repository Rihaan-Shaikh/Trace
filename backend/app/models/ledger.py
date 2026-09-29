"""TRACE Loss History Ledger and Recalibration Domain Models.

Implements the actuarial memory foundation specified in Project Bible Section 21:
- Every decision, its prediction, and its eventual real outcome is written to the ledger.
- Historical prediction written at approval time is immutable.
- Credibility-weighted experience factors recalibrate future premiums for similar decision classes.
- Prototype honesty: simulated prior decisions are explicitly marked `is_simulated = True`.
"""

from datetime import datetime, timezone
from typing import List, Optional
import uuid
from sqlalchemy import (
    String,
    Text,
    Integer,
    Float,
    Boolean,
    ForeignKey,
    Enum as SAEnum,
    Index,
    JSON,
    DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, GUID, TimestampMixin, UUIDPrimaryKeyMixin


class LossHistoryEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Actuarial ledger entry tracking predicted underwriting vs realised outcome."""
    __tablename__ = "loss_history_entries"

    decision_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    decision_class: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    decision_title: Mapped[str] = mapped_column(String(255), nullable=False)
    underwritten_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    validity_end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Original Predictions (Frozen at approval time)
    projected_upside: Mapped[float] = mapped_column(Float, nullable=False)
    decision_premium: Mapped[float] = mapped_column(Float, nullable=False)
    premium_rate: Mapped[float] = mapped_column(Float, nullable=False)
    p10_tail_exposure: Mapped[float] = mapped_column(Float, nullable=False)
    underwriting_verdict: Mapped[str] = mapped_column(String(64), nullable=False)
    human_action: Mapped[str] = mapped_column(String(32), default="Approved", nullable=False)

    # Realised Outcomes
    actual_realised_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    actual_vs_predicted_variance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fell_inside_predicted_range: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    lapse_event_triggered: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    is_claim: Mapped[Optional[bool]] = mapped_column(
        Boolean, nullable=True, comment="True if outcome fell outside predicted range or lapse was triggered"
    )

    outcomes: Mapped[List["OutcomeRecord"]] = relationship(
        "OutcomeRecord", back_populates="ledger_entry", cascade="all, delete-orphan"
    )


class OutcomeRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Realised business outcome logged against a historical ledger entry."""
    __tablename__ = "outcome_records"

    loss_history_entry_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("loss_history_entries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    logged_by: Mapped[str] = mapped_column(String(128), nullable=False)
    outcome_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    primary_metric_realised: Mapped[float] = mapped_column(Float, nullable=False)
    variance_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    ledger_entry: Mapped["LossHistoryEntry"] = relationship("LossHistoryEntry", back_populates="outcomes")


class RecalibrationResult(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Credibility-weighted calibration factor derived from accumulated class experience."""
    __tablename__ = "recalibration_results"

    decision_class: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    logged_decisions_count: Mapped[int] = mapped_column(Integer, nullable=False)
    claims_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mean_error_ratio: Mapped[float] = mapped_column(Float, nullable=False)
    credibility_z: Mapped[float] = mapped_column(Float, nullable=False)
    experience_factor: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    details: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


from sqlalchemy import event, inspect
from backend.app.core.errors import ImmutableRecordError


@event.listens_for(LossHistoryEntry, "before_update")
def protect_loss_history_entry_predictions(mapper, connection, target):
    """Enforce strict immutability of historical predictions in the Loss History Ledger."""
    state = inspect(target)
    protected_fields = [
        "projected_upside",
        "decision_premium",
        "premium_rate",
        "p10_tail_exposure",
        "underwriting_verdict",
        "human_action",
        "is_simulated",
        "decision_id",
        "decision_class",
        "decision_title",
        "underwritten_date",
        "validity_end_date",
    ]
    for field_name in protected_fields:
        history = state.get_history(field_name, True)
        if history.has_changes():
            raise ImmutableRecordError(
                entity_name="LossHistoryEntry",
                entity_id=getattr(target, "id", "unknown"),
                reason=f"Historical prediction field '{field_name}' in Loss History Ledger is immutable and cannot be modified",
            )


@event.listens_for(LossHistoryEntry, "before_delete")
def block_loss_history_entry_delete(mapper, connection, target):
    """Enforce ledger retention: historical loss history entries can NEVER be deleted."""
    raise ImmutableRecordError(
        entity_name="LossHistoryEntry",
        entity_id=getattr(target, "id", "unknown"),
        reason="the actuarial memory ledger is append-only and entries cannot be deleted",
    )
