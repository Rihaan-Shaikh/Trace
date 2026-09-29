"""TRACE Human Approval, Decision Brief, and Decision Record Domain Models.

Implements the Human Sign-Off and Immutability foundation specified in Project Bible Section 19 & 20:
- TRACE recommends and prices; a human binds.
- Once approved, the Decision Record is strictly IMMUTABLE.
- Preserves full snapshot of the brief, Evidence Chain, and Rate Card at approval time.
"""

from typing import List, Optional
import uuid
from sqlalchemy import (
    String,
    Text,
    Boolean,
    ForeignKey,
    Enum as SAEnum,
    Index,
    JSON,
    DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, GUID, TimestampMixin, UUIDPrimaryKeyMixin
from backend.app.models.enums import ApprovalActionType


class DecisionBrief(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The complete deliverable underwriting brief presented to the decision-maker."""
    __tablename__ = "decision_briefs"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    scenario_run_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("scenario_runs.id", ondelete="CASCADE"), nullable=False
    )
    brief_title: Mapped[str] = mapped_column(String(255), nullable=False)
    executive_summary: Mapped[str] = mapped_column(Text, nullable=False)
    sections_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="brief")
    records: Mapped[List["DecisionRecord"]] = relationship("DecisionRecord", back_populates="brief")


class DecisionRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The IMMUTABLE signed record produced upon human approval."""
    __tablename__ = "decision_records"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    decision_brief_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decision_briefs.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    approver_name: Mapped[str] = mapped_column(String(128), nullable=False)
    approver_role: Mapped[str] = mapped_column(String(128), default="Decision Maker", nullable=False)
    action_type: Mapped[ApprovalActionType] = mapped_column(
        SAEnum(ApprovalActionType, native_enum=False), default=ApprovalActionType.APPROVE, nullable=False
    )
    approval_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_immutable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Complete frozen audit snapshots
    brief_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    evidence_chain_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    rate_card_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    modifications_made: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=True)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="records")
    brief: Mapped["DecisionBrief"] = relationship("DecisionBrief", back_populates="records")

    @property
    def snapshot_integrity_hash(self) -> str:
        """Computes deterministic SHA-256 integrity hash of frozen decision snapshots."""
        import hashlib
        import json
        payload = {
            "record_id": str(self.id),
            "decision_id": str(self.decision_id),
            "approver_name": self.approver_name,
            "brief_snapshot": self.brief_snapshot,
            "rate_card_snapshot": self.rate_card_snapshot,
            "evidence_chain_snapshot": self.evidence_chain_snapshot,
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


class ApprovalAction(Base, UUIDPrimaryKeyMixin, TimestampMixin):

    """Audit log of human approval actions (Approve, Modify, Reject)."""
    __tablename__ = "approval_actions"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    action: Mapped[ApprovalActionType] = mapped_column(
        SAEnum(ApprovalActionType, native_enum=False), nullable=False
    )
    performed_by: Mapped[str] = mapped_column(String(128), nullable=False)
    reason_or_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sandbox_modifications: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


from sqlalchemy import event
from backend.app.core.errors import ImmutableRecordError


@event.listens_for(DecisionRecord, "before_update")
def block_decision_record_update(mapper, connection, target):
    """Enforce strict immutability: DecisionRecord instances can NEVER be updated."""
    raise ImmutableRecordError(
        entity_name="DecisionRecord",
        entity_id=getattr(target, "id", "unknown"),
        reason="DecisionRecord is strictly immutable and cannot be updated once bound",
    )


@event.listens_for(DecisionRecord, "before_delete")
def block_decision_record_delete(mapper, connection, target):
    """Enforce strict immutability: DecisionRecord instances can NEVER be deleted."""
    raise ImmutableRecordError(
        entity_name="DecisionRecord",
        entity_id=getattr(target, "id", "unknown"),
        reason="DecisionRecord is strictly immutable and cannot be deleted from the audit ledger",
    )
