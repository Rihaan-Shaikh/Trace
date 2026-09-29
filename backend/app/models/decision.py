"""TRACE Decision, Objective, Template, and Investigation Domain Models.

Implements the decision framework specified in Project Bible Section 13 & 14:
- Decision lifecycle and typed objectives
- Standardized Decision Templates (e.g. T1 Discount Policy, T2 Price Change)
- Investigation Plans, mini-investigations, and sufficiency verdicts
"""

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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, GUID, TimestampMixin, UUIDPrimaryKeyMixin
from backend.app.models.enums import DecisionStatus, DataSufficiencyVerdict


class DecisionTemplate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Pre-configured decision template (e.g. T1: Stop discounts for low-margin accounts)."""
    __tablename__ = "decision_templates"

    template_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="pricing", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    required_entities: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    required_metrics: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    default_assumptions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    decisions: Mapped[List["Decision"]] = relationship("Decision", back_populates="template")


class Decision(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Core decision entity undergoing underwriting."""
    __tablename__ = "decisions"

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[DecisionStatus] = mapped_column(
        SAEnum(DecisionStatus, native_enum=False),
        default=DecisionStatus.DRAFT,
        nullable=False,
        index=True,
    )
    dataset_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True, index=True
    )
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("decision_templates.id", ondelete="SET NULL"), nullable=True, index=True
    )
    primary_metric_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    horizon_days: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    validity_window_days: Mapped[int] = mapped_column(Integer, default=60, nullable=False)

    # Relationships
    template: Mapped[Optional["DecisionTemplate"]] = relationship("DecisionTemplate", back_populates="decisions")
    objective: Mapped[Optional["DecisionObjective"]] = relationship(
        "DecisionObjective", back_populates="decision", uselist=False, cascade="all, delete-orphan"
    )
    investigation_plans: Mapped[List["InvestigationPlan"]] = relationship(
        "InvestigationPlan", back_populates="decision", cascade="all, delete-orphan"
    )
    investigation_runs: Mapped[List["InvestigationRun"]] = relationship(
        "InvestigationRun", back_populates="decision", cascade="all, delete-orphan"
    )
    evidence_items: Mapped[List["EvidenceItem"]] = relationship(
        "EvidenceItem", back_populates="decision", cascade="all, delete-orphan"
    )
    calculations: Mapped[List["Calculation"]] = relationship(
        "Calculation", back_populates="decision", cascade="all, delete-orphan"
    )
    assumptions: Mapped[List["Assumption"]] = relationship(
        "Assumption", back_populates="decision", cascade="all, delete-orphan"
    )
    counter_findings: Mapped[List["CounterFinding"]] = relationship(
        "CounterFinding", back_populates="decision", cascade="all, delete-orphan"
    )
    scenario_runs: Mapped[List["ScenarioRun"]] = relationship(
        "ScenarioRun", back_populates="decision", cascade="all, delete-orphan"
    )
    brief: Mapped[Optional["DecisionBrief"]] = relationship(
        "DecisionBrief", back_populates="decision", uselist=False, cascade="all, delete-orphan"
    )
    records: Mapped[List["DecisionRecord"]] = relationship(
        "DecisionRecord", back_populates="decision"
    )


class DecisionObjective(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Structured objective derived from plain-language decision input."""
    __tablename__ = "decision_objectives"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    primary_goal: Mapped[str] = mapped_column(Text, nullable=False)
    target_metric: Mapped[str] = mapped_column(String(128), nullable=False)
    constraint_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    baseline_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    target_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="objective")


class InvestigationPlan(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The structured mini-investigation plan and sufficiency assessment."""
    __tablename__ = "investigation_plans"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_summary: Mapped[str] = mapped_column(Text, nullable=False)
    sufficiency_verdict: Mapped[DataSufficiencyVerdict] = mapped_column(
        SAEnum(DataSufficiencyVerdict, native_enum=False),
        default=DataSufficiencyVerdict.SUFFICIENT,
        nullable=False,
    )
    missing_information_rankings: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    stages_definition: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="investigation_plans")
    questions: Mapped[List["InvestigationQuestion"]] = relationship(
        "InvestigationQuestion", back_populates="plan", cascade="all, delete-orphan"
    )


class InvestigationQuestion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Individual analytical question within the investigation plan."""
    __tablename__ = "investigation_questions"

    investigation_plan_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("investigation_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    target_agent: Mapped[str] = mapped_column(String(64), default="analytics", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)

    plan: Mapped["InvestigationPlan"] = relationship("InvestigationPlan", back_populates="questions")


class InvestigationRun(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracks an execution run of an investigation."""
    __tablename__ = "investigation_runs"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="running", nullable=False)
    started_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    completed_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    execution_summary: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="investigation_runs")


from sqlalchemy import event, inspect
from backend.app.core.errors import ImmutableRecordError
from backend.app.models.enums import DecisionStatus


@event.listens_for(Decision, "before_update")
def check_approved_decision_immutability(mapper, connection, target):
    """Enforce that once a decision is APPROVED and bound, its status cannot be changed."""
    state = inspect(target)
    status_history = state.get_history("status", True)
    if status_history.deleted and DecisionStatus.APPROVED in status_history.deleted:
        if target.status != DecisionStatus.APPROVED:
            raise ImmutableRecordError(
                entity_name="Decision",
                entity_id=getattr(target, "id", "unknown"),
                reason="Decision is approved and bound into a DecisionRecord; its status cannot be altered",
            )
