"""TRACE Underwriting, Rate Card, Scenario, Exposure, and Premium Domain Models.

Implements the actuarial underwriting foundation specified in Project Bible Section 16 & 18:
- RateCard and immutable RateCardVersion (pricing policy is inspectable, never hidden)
- Scenario runs (baseline vs sandbox what-if re-quotes)
- Decision Premium (Expected Loss + 4 Loads: Data-Quality, Verification, Contradiction, Model-Uncertainty)
- Exposure Report (P10 tail loss, concentration exposure, data exposure, adverse finding exposure)
- Coverage Lapse Conditions & Tripwires (root-solved sensitivity thresholds and distance-to-lapse)
- Underwriting Verdict (Recommended, Recommended with Conditions, Refer, Decline)
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
from backend.app.models.enums import UnderwritingVerdictType, LapseConditionType, AssumptionType


class RateCard(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The visible underwriting pricing policy governing loads and verdict bands."""
    __tablename__ = "rate_cards"

    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    versions: Mapped[List["RateCardVersion"]] = relationship(
        "RateCardVersion", back_populates="rate_card", cascade="all, delete-orphan"
    )


class RateCardVersion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable snapshot version of a Rate Card policy."""
    __tablename__ = "rate_card_versions"

    rate_card_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("rate_cards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_str: Mapped[str] = mapped_column(String(32), nullable=False)
    weight_data_quality: Mapped[float] = mapped_column(Float, default=0.10, nullable=False)
    weight_verification: Mapped[float] = mapped_column(Float, default=0.05, nullable=False)
    weight_contradiction: Mapped[float] = mapped_column(Float, default=1.00, nullable=False)
    base_model_uncertainty_weight: Mapped[float] = mapped_column(Float, default=0.05, nullable=False)
    band_recommended_max: Mapped[float] = mapped_column(Float, default=0.10, nullable=False)
    band_recommended_with_conditions_max: Mapped[float] = mapped_column(Float, default=0.25, nullable=False)
    band_refer_max: Mapped[float] = mapped_column(Float, default=0.50, nullable=False)
    tail_percentile: Mapped[float] = mapped_column(Float, default=0.10, nullable=False)
    policy_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    rate_card: Mapped["RateCard"] = relationship("RateCard", back_populates="versions")


class ScenarioRun(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A deterministic scenario simulation run (baseline or sandbox what-if)."""
    __tablename__ = "scenario_runs"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    run_label: Mapped[str] = mapped_column(String(128), default="baseline", nullable=False)
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_sandbox: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    simulation_count: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    random_seed: Mapped[int] = mapped_column(Integer, default=42, nullable=False)
    parent_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("scenario_runs.id", ondelete="SET NULL"), nullable=True, index=True
    )

    decision: Mapped["Decision"] = relationship("Decision", back_populates="scenario_runs")
    scenario_assumptions: Mapped[List["ScenarioAssumption"]] = relationship(
        "ScenarioAssumption", back_populates="scenario_run", cascade="all, delete-orphan"
    )
    scenario_result: Mapped[Optional["ScenarioResult"]] = relationship(
        "ScenarioResult", back_populates="scenario_run", uselist=False, cascade="all, delete-orphan"
    )
    exposure_report: Mapped[Optional["ExposureReport"]] = relationship(
        "ExposureReport", back_populates="scenario_run", uselist=False, cascade="all, delete-orphan"
    )
    decision_premium: Mapped[Optional["DecisionPremium"]] = relationship(
        "DecisionPremium", back_populates="scenario_run", uselist=False, cascade="all, delete-orphan"
    )
    lapse_conditions: Mapped[List["CoverageLapseCondition"]] = relationship(
        "CoverageLapseCondition", back_populates="scenario_run", cascade="all, delete-orphan"
    )
    verdict: Mapped[Optional["UnderwritingVerdict"]] = relationship(
        "UnderwritingVerdict", back_populates="scenario_run", uselist=False, cascade="all, delete-orphan"
    )


class ScenarioAssumption(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Specific parameter value applied within a scenario simulation."""
    __tablename__ = "scenario_assumptions"

    scenario_run_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("scenario_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parameter_name: Mapped[str] = mapped_column(String(128), nullable=False)
    parameter_value: Mapped[float] = mapped_column(Float, nullable=False)
    baseline_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    is_modified_in_sandbox: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    assumption_type: Mapped[Optional[AssumptionType]] = mapped_column(
        SAEnum(AssumptionType, native_enum=False), nullable=True
    )
    range_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    range_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence_basis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    scenario_run: Mapped["ScenarioRun"] = relationship("ScenarioRun", back_populates="scenario_assumptions")



class ScenarioResult(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Statistical outcome metrics resulting from deterministic simulation."""
    __tablename__ = "scenario_results"

    scenario_run_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("scenario_runs.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    projected_upside: Mapped[float] = mapped_column(Float, nullable=False)
    expected_loss: Mapped[float] = mapped_column(Float, nullable=False)
    p10_tail_outcome: Mapped[float] = mapped_column(Float, nullable=False)
    tail_average_loss: Mapped[float] = mapped_column(Float, nullable=False)
    worst_plausible_loss: Mapped[float] = mapped_column(Float, nullable=False)
    probability_of_net_loss: Mapped[float] = mapped_column(Float, nullable=False)
    cost_of_inaction: Mapped[float] = mapped_column(Float, nullable=False)
    distribution_quantiles: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    scenario_run: Mapped["ScenarioRun"] = relationship("ScenarioRun", back_populates="scenario_result")


class ExposureReport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The Exposure Report: dollar-value downside if recommendation is wrong."""
    __tablename__ = "exposure_reports"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scenario_run_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("scenario_runs.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    probability_of_net_loss: Mapped[float] = mapped_column(Float, nullable=False)
    downside_at_tail: Mapped[float] = mapped_column(Float, nullable=False)
    worst_plausible_case_loss: Mapped[float] = mapped_column(Float, nullable=False)
    worst_plausible_assumptions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    concentration_exposure_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    concentration_account_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    concentration_volume_share: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    data_exposure_min: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    data_exposure_max: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    adverse_finding_exposure_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cost_of_inaction: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    scenario_run: Mapped["ScenarioRun"] = relationship("ScenarioRun", back_populates="exposure_report")


class DecisionPremium(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The Decision Premium: calculated risk cost (Expected Loss + 4 Loads)."""
    __tablename__ = "decision_premiums"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scenario_run_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("scenario_runs.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    rate_card_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("rate_card_versions.id", ondelete="SET NULL"), nullable=True
    )
    projected_upside: Mapped[float] = mapped_column(Float, nullable=False)
    expected_loss: Mapped[float] = mapped_column(Float, nullable=False)
    data_quality_load: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    verification_load: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    contradiction_load: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    model_uncertainty_load: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_risk_load: Mapped[float] = mapped_column(Float, nullable=False)
    total_decision_premium: Mapped[float] = mapped_column(Float, nullable=False)
    premium_rate: Mapped[float] = mapped_column(Float, nullable=False)
    expected_net_benefit: Mapped[float] = mapped_column(Float, nullable=False)

    scenario_run: Mapped["ScenarioRun"] = relationship("ScenarioRun", back_populates="decision_premium")


class CoverageLapseCondition(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The exact boundary conditions under which recommendation coverage lapses."""
    __tablename__ = "coverage_lapse_conditions"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scenario_run_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("scenario_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    condition_type: Mapped[LapseConditionType] = mapped_column(
        SAEnum(LapseConditionType, native_enum=False), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    metric_parameter_name: Mapped[str] = mapped_column(String(128), nullable=False)
    current_modelled_value: Mapped[float] = mapped_column(Float, nullable=False)
    lapse_threshold_value: Mapped[float] = mapped_column(Float, nullable=False)
    distance_to_lapse_percent: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    is_breached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority_rank: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    scenario_run: Mapped["ScenarioRun"] = relationship("ScenarioRun", back_populates="lapse_conditions")
    tripwires: Mapped[List["Tripwire"]] = relationship(
        "Tripwire", back_populates="lapse_condition", cascade="all, delete-orphan"
    )


class Tripwire(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Post-decision watch metric and review threshold derived from a lapse condition."""
    __tablename__ = "tripwires"

    coverage_lapse_condition_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("coverage_lapse_conditions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric_name: Mapped[str] = mapped_column(String(128), nullable=False)
    alert_threshold: Mapped[float] = mapped_column(Float, nullable=False)
    current_value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    review_cadence: Mapped[str] = mapped_column(String(64), default="weekly", nullable=False)
    is_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    lapse_condition: Mapped["CoverageLapseCondition"] = relationship("CoverageLapseCondition", back_populates="tripwires")


class UnderwritingVerdict(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Categorical verdict: Recommended, Recommended with Conditions, Refer, Decline."""
    __tablename__ = "underwriting_verdicts"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scenario_run_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("scenario_runs.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    verdict: Mapped[UnderwritingVerdictType] = mapped_column(
        SAEnum(UnderwritingVerdictType, native_enum=False), nullable=False
    )
    summary_sentence: Mapped[str] = mapped_column(Text, nullable=False)
    conditions_list: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    exclusions_list: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    scenario_run: Mapped["ScenarioRun"] = relationship("ScenarioRun", back_populates="verdict")


from sqlalchemy import event, inspect
from backend.app.core.errors import ImmutableRecordError


@event.listens_for(RateCardVersion, "before_update")
def protect_rate_card_version_weights(mapper, connection, target):
    """Enforce pricing policy immutability: weights and bands on a RateCardVersion cannot be modified in place."""
    state = inspect(target)
    protected_fields = [
        "weight_data_quality",
        "weight_verification",
        "weight_contradiction",
        "base_model_uncertainty_weight",
        "band_recommended_max",
        "band_recommended_with_conditions_max",
        "band_refer_max",
        "tail_percentile",
        "version_str",
    ]
    for field_name in protected_fields:
        history = state.get_history(field_name, True)
        if history.has_changes():
            raise ImmutableRecordError(
                entity_name="RateCardVersion",
                entity_id=getattr(target, "id", "unknown"),
                reason=f"RateCardVersion parameter '{field_name}' is immutable once issued. Issue a new version instead.",
            )


@event.listens_for(RateCardVersion, "before_delete")
def block_rate_card_version_delete(mapper, connection, target):
    """Prevent deletion of RateCardVersion instances to preserve historical pricing provenance."""
    raise ImmutableRecordError(
        entity_name="RateCardVersion",
        entity_id=getattr(target, "id", "unknown"),
        reason="RateCardVersion cannot be deleted; pricing policies must be preserved for audit provenance.",
    )
