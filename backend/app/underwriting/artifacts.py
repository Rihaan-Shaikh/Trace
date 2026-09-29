"""TRACE Numerical Artifact Contracts, Taxonomy, and Typed Domain Structures.

Enforces Project Bible Section 7 & 16:
- Classification taxonomy: FACT, CALCULATION, MODEL, RECOMMENDATION.
- Typed NumericalArtifact containing value, unit, currency, result_type, population/scope,
  provenance, calculation method, and limitations.
- Sourced, typed assumptions (data-derived, judgement, user-supplied).
- Contract restrictions with citations and liquidated damages.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field
from backend.app.models.enums import StatementLevel, AssumptionType, LapseConditionType, UnderwritingVerdictType


class NumericalArtifact(BaseModel):
    """Authoritative numerical artifact with complete audit provenance and classification."""
    result_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    value: Any
    unit: str = ""
    currency: str = "USD"
    result_type: StatementLevel
    metric: str
    population_scope: str = "affected_population"
    dataset_id: Optional[str] = None
    dataset_version: Optional[str] = None
    semantic_version: Optional[str] = "1.0"
    method: str
    calculation_version: str = "4.0.0"
    assumptions: Dict[str, Any] = Field(default_factory=dict)
    provenance: Dict[str, Any] = Field(default_factory=dict)
    limitations: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TypedAssumption(BaseModel):
    """Named parameter assumption with range, source, type, and confidence basis."""
    name: str
    current_value: float
    range_min: float
    range_max: float
    source: str
    assumption_type: AssumptionType
    confidence_basis: str
    unit: str = ""
    baseline_value: Optional[float] = None


class ContractRestriction(BaseModel):
    """Structured contractual restriction extracted from legal agreements."""
    account_id: str
    account_name: str
    restriction_type: str  # e.g., "protected_account", "discount_floor", "penalty_exposure"
    discount_floor: Optional[float] = None
    penalty_exposure: float = 0.0
    citation: str
    is_absorbed: bool = False
    provenance: Dict[str, Any] = Field(default_factory=dict)


class ScenarioDistributionSummary(BaseModel):
    """Full statistical distribution metrics from deterministic simulation."""
    simulation_count: int
    random_seed: int
    correlation_mode: str = "independent"
    correlation_disclosed: bool = True
    mean: float
    expected_case: float
    best_case_p90: float
    worst_case_p10: float
    p10: float
    tail_average_loss: float  # CVaR / worst-10% tail mean
    worst_plausible_case: float
    probability_of_net_loss: float
    loss_scenario_count: int
    expected_loss: float
    quantiles: Dict[str, float]
    std_dev: float
    variance: float
    skewness: float
