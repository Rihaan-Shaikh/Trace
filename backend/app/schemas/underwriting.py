"""TRACE Underwriting, Rate Card, Scenario, Exposure, and Premium Schemas.

Enforces typed API contracts for the core actuarial outputs:
- RateCard and RateCardVersion policies
- Decision Premium and its 4 decomposed loads
- Exposure Report
- Coverage Lapse Conditions & Tripwires
- Underwriting Verdict
- Sandbox re-quote requests
"""

from datetime import datetime
from typing import List, Optional, Any, Dict
import uuid
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.enums import UnderwritingVerdictType, LapseConditionType


class RateCardVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    rate_card_id: uuid.UUID
    version_str: str
    weight_data_quality: float
    weight_verification: float
    weight_contradiction: float
    base_model_uncertainty_weight: float
    band_recommended_max: float
    band_recommended_with_conditions_max: float
    band_refer_max: float
    tail_percentile: float
    policy_metadata: dict
    is_active: bool
    created_at: datetime


class RateCardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    is_active: bool
    versions: Optional[List[RateCardVersionResponse]] = None


class RateCardVersionCreateRequest(BaseModel):
    version_str: str = Field(..., min_length=1, max_length=32)
    weight_data_quality: float = Field(default=0.10, ge=0.0, le=1.0)
    weight_verification: float = Field(default=0.05, ge=0.0, le=1.0)
    weight_contradiction: float = Field(default=1.00, ge=0.0, le=2.0)
    base_model_uncertainty_weight: float = Field(default=0.05, ge=0.0, le=1.0)
    band_recommended_max: float = Field(default=0.10, ge=0.0, le=1.0)
    band_recommended_with_conditions_max: float = Field(default=0.25, ge=0.0, le=1.0)
    band_refer_max: float = Field(default=0.50, ge=0.0, le=1.0)
    tail_percentile: float = Field(default=0.10, ge=0.01, le=0.50)
    policy_metadata: dict = Field(default_factory=dict)


class PremiumLoadsBreakdown(BaseModel):
    expected_loss: float = Field(..., description="E[max(0, -ΔM)]")
    data_quality_load: float = Field(..., description="Load priced from Data Health Check score")
    verification_load: float = Field(..., description="Load priced from unverified or discrepant figures")
    contradiction_load: float = Field(..., description="Load priced from unabsorbed adverse findings")
    model_uncertainty_load: float = Field(..., description="Load priced from scenario dispersion & ledger history")
    total_risk_load: float = Field(..., description="Sum of 4 loads")
    total_decision_premium: float = Field(..., description="Expected loss + total risk load")
    premium_rate: float = Field(..., description="Decision Premium / Projected Upside")


class DecisionPremiumResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    scenario_run_id: uuid.UUID
    rate_card_version_id: Optional[uuid.UUID] = None
    projected_upside: float
    expected_loss: float
    data_quality_load: float
    verification_load: float
    contradiction_load: float
    model_uncertainty_load: float
    total_risk_load: float
    total_decision_premium: float
    premium_rate: float
    expected_net_benefit: float
    created_at: datetime


class ExposureReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    scenario_run_id: uuid.UUID
    probability_of_net_loss: float
    downside_at_tail: float
    worst_plausible_case_loss: float
    worst_plausible_assumptions: dict
    concentration_exposure_amount: float
    concentration_account_count: int
    concentration_volume_share: float
    data_exposure_min: float
    data_exposure_max: float
    adverse_finding_exposure_total: float
    cost_of_inaction: float
    created_at: datetime


class TripwireResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    coverage_lapse_condition_id: uuid.UUID
    metric_name: str
    alert_threshold: float
    current_value: float
    unit: str
    review_cadence: str
    is_triggered: bool


class CoverageLapseConditionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    scenario_run_id: uuid.UUID
    condition_type: LapseConditionType
    title: str
    description: str
    metric_parameter_name: str
    current_modelled_value: float
    lapse_threshold_value: float
    distance_to_lapse_percent: float
    unit: str
    is_breached: bool
    priority_rank: int
    tripwires: Optional[List[TripwireResponse]] = None


class UnderwritingVerdictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    scenario_run_id: uuid.UUID
    verdict: UnderwritingVerdictType
    summary_sentence: str
    conditions_list: list
    exclusions_list: list
    is_valid: bool


class ScenarioAssumptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scenario_run_id: uuid.UUID
    parameter_name: str
    parameter_value: float
    baseline_value: Optional[float] = None
    unit: str
    is_modified_in_sandbox: bool


class ScenarioRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    decision_id: uuid.UUID
    run_label: str
    is_baseline: bool
    is_sandbox: bool
    parent_run_id: Optional[uuid.UUID] = None
    simulation_count: int
    random_seed: int
    created_at: datetime
    premium: Optional[DecisionPremiumResponse] = None
    exposure: Optional[ExposureReportResponse] = None
    verdict: Optional[UnderwritingVerdictResponse] = None
    lapse_conditions: Optional[List[CoverageLapseConditionResponse]] = None
    assumptions: Optional[List[ScenarioAssumptionResponse]] = None


class ReQuoteRequest(BaseModel):
    """Sandbox assumption adjustment request."""
    decision_id: uuid.UUID
    sandbox_label: str = Field(default="Sandbox Adjustment", max_length=128)
    run_label: Optional[str] = None
    assumption_adjustments: Optional[dict] = Field(default=None, description="Mapping of parameter_name -> float value")
    assumptions: Optional[dict] = Field(default=None, description="Alias for assumption_adjustments")
    parent_run_id: Optional[uuid.UUID] = None

    def model_post_init(self, __context: Any) -> None:
        if self.assumption_adjustments is None:
            self.assumption_adjustments = self.assumptions or {}
        if self.run_label is not None:
            self.sandbox_label = self.run_label


class SupportedAssumptionInfo(BaseModel):
    name: str
    display_name: str
    current_value: float
    baseline_value: float
    unit: str
    range_min: float
    range_max: float
    step: float
    description: str
    is_modified: bool = False


class SandboxChangedAssumption(BaseModel):
    parameter_name: str
    baseline_value: float
    new_value: float
    unit: str = ""
    delta: float
    pct_change: Optional[float] = None


class SandboxComparisonMetric(BaseModel):
    metric_name: str
    baseline_value: Any
    sandbox_value: Any
    delta: Any
    unit: str = ""


class SandboxReQuoteResponse(BaseModel):
    sandbox_run_id: uuid.UUID
    decision_id: uuid.UUID
    run_label: str
    is_baseline: bool = False
    is_sandbox: bool = True
    parent_run_id: Optional[uuid.UUID] = None
    rate_card_version: str
    scenario_seed: int
    simulation_count: int

    # Direct top-level financial outputs
    projected_upside: Optional[float] = None
    expected_loss: Optional[float] = None
    decision_premium: Optional[float] = None
    premium_rate: Optional[float] = None
    expected_net_benefit: Optional[float] = None

    # Financial outputs (Sandbox state)
    premium: DecisionPremiumResponse
    exposure: ExposureReportResponse
    verdict: UnderwritingVerdictResponse
    lapse_conditions: List[CoverageLapseConditionResponse]
    coverage_state: str  # "COVERED" or "COVERAGE_LAPSED"


    # Assumptions
    assumptions: List[ScenarioAssumptionResponse]
    changed_assumptions: List[SandboxChangedAssumption]

    # Before / After Comparison
    before: Dict[str, Any]
    after: Dict[str, Any]
    comparison: Dict[str, SandboxComparisonMetric]

    # Provenance
    provenance: Dict[str, Any]
