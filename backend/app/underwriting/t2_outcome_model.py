"""TRACE T2 Outcome Model Implementation: ΔM = f(θ).

Implements Project Bible Section 7, 8, 14, 21:
- Primary outcome: Incremental Change in Gross Profit from Unit Price Adjustment (ΔM)
- Named typed assumptions:
  1. Price Increase Percentage (user-supplied / decision policy)
  2. Observed Price Sensitivity / Elasticity (data-derived, observational, non-causal)
  3. Volume Retention Rate (data-derived / sensitivity bounded)
  4. Unabsorbed Adverse Findings / Account Risk
- Vectorized sampling for Monte Carlo scenario simulation
"""

from typing import Dict, Any, Optional
import numpy as np
from backend.app.models.enums import AssumptionType
from backend.app.underwriting.artifacts import TypedAssumption


class T2OutcomeModel:
    """Deterministic mathematical model for T2 Price Change outcome ΔM = f(θ)."""

    MODEL_NAME = "T2_PRICE_CHANGE_OUTCOME_MODEL"
    MODEL_VERSION = "1.0.0"
    ONE_SENTENCE_EXPLANATION = (
        "Net change in gross profit equals incremental revenue from price increase on retained unit demand, "
        "minus gross margin lost to price-elastic volume drop-off and unabsorbed counter-findings."
    )

    def __init__(
        self,
        baseline_units: int,
        baseline_price: Optional[float] = None,
        unit_cost: float = 0.0,
        price_increase_pct: float = 0.05,
        observed_elasticity: float = -1.20,
        unabsorbed_penalties: float = 0.0,
        assumptions: Optional[Dict[str, TypedAssumption]] = None,
        horizon_days: int = 90,
        unit_list_price: Optional[float] = None,
    ):
        p = baseline_price if baseline_price is not None else (unit_list_price or 65.0)
        self.baseline_units = max(1, int(baseline_units))
        self.baseline_price = float(p)
        self.unit_cost = float(unit_cost)
        self.price_increase_pct = float(price_increase_pct)
        self.observed_elasticity = float(observed_elasticity)
        self.unabsorbed_penalties = float(unabsorbed_penalties)
        self.horizon_days = int(horizon_days)

        self.baseline_revenue = float(self.baseline_units * self.baseline_price)
        self.baseline_cogs = float(self.baseline_units * self.unit_cost)
        self.baseline_gross_profit = float(self.baseline_revenue - self.baseline_cogs)

        if assumptions:
            self.assumptions = assumptions
        else:
            self.assumptions = self._build_default_assumptions()

    def _build_default_assumptions(self) -> Dict[str, TypedAssumption]:
        return {
            "price_increase_pct": TypedAssumption(
                name="price_increase_pct",
                current_value=self.price_increase_pct,
                range_min=0.01,
                range_max=0.20,
                source="Executive commercial proposal: Unit price adjustment for Product A",
                assumption_type=AssumptionType.USER_SUPPLIED,
                confidence_basis="Proposed pricing schedule for upcoming fiscal quarter",
                unit="ratio",
                baseline_value=0.00,
            ),
            "observed_elasticity": TypedAssumption(
                name="observed_elasticity",
                current_value=self.observed_elasticity,
                range_min=-2.50,
                range_max=-0.40,
                source="Historical price-quantity log-covariance across 100,000 NovaMart transactions",
                assumption_type=AssumptionType.DATA_DERIVED,
                confidence_basis="OBSERVATIONAL: Empirical sensitivity across discount bands (non-causal)",
                unit="elasticity",
                baseline_value=-1.00,
            ),
            "volume_retention": TypedAssumption(
                name="volume_retention",
                current_value=max(0.70, min(1.0, 1.0 + self.observed_elasticity * self.price_increase_pct)),
                range_min=0.75,
                range_max=0.99,
                source="Simulated volume retention derived from observational elasticity",
                assumption_type=AssumptionType.DATA_DERIVED,
                confidence_basis="Bounded retention curve subject to customer concentration limits",
                unit="ratio",
                baseline_value=1.00,
            ),
            "unabsorbed_penalties": TypedAssumption(
                name="unabsorbed_penalties",
                current_value=self.unabsorbed_penalties,
                range_min=0.0,
                range_max=max(self.unabsorbed_penalties * 2.0, 50000.0),
                source="Counter-Decision Underwriter adverse findings and account risk reserves",
                assumption_type=AssumptionType.JUDGEMENT,
                confidence_basis="Risk provision for top concentrated account renegotiation",
                unit="USD",
                baseline_value=0.0,
            ),
        }

    def evaluate(self, theta_overrides: Optional[Dict[str, float]] = None) -> float:
        """Evaluates ΔM = f(θ) deterministically."""
        params = {k: a.current_value for k, a in self.assumptions.items()}
        if theta_overrides:
            params.update(theta_overrides)

        dp = float(params.get("price_increase_pct", self.price_increase_pct))
        elast = float(params.get("observed_elasticity", self.observed_elasticity))
        pen = float(params.get("unabsorbed_penalties", self.unabsorbed_penalties))

        # New unit price
        p_new = self.baseline_price * (1.0 + dp)
        # Volume response
        vol_change = elast * dp
        retained_ratio = max(0.10, 1.0 + vol_change)
        q_new = self.baseline_units * retained_ratio

        # Margin comparison
        new_rev = q_new * p_new
        new_cogs = q_new * self.unit_cost
        new_gp = new_rev - new_cogs

        delta_m = new_gp - self.baseline_gross_profit - pen
        return float(delta_m)

    def sample_delta_m(
        self,
        rng: np.random.RandomState,
        simulation_count: int = 1000,
        user_adjusted_params: Optional[Dict[str, float]] = None,
    ) -> np.ndarray:
        """Vectorized simulation of ΔM over stochastic elasticity and volume parameters."""
        dp = float(self.assumptions["price_increase_pct"].current_value)
        base_elast = float(self.assumptions["observed_elasticity"].current_value)
        pen = float(self.assumptions["unabsorbed_penalties"].current_value)

        if user_adjusted_params:
            if "price_increase_pct" in user_adjusted_params:
                dp = float(user_adjusted_params["price_increase_pct"])
            if "observed_elasticity" in user_adjusted_params:
                base_elast = float(user_adjusted_params["observed_elasticity"])

        # Elasticity distribution: normal centered around observational elasticity
        # e.g. std = 0.25
        elast_samples = rng.normal(base_elast, 0.25, simulation_count)
        elast_samples = np.clip(elast_samples, -3.0, -0.2)

        # Vectorized outcome calculation
        p_new = self.baseline_price * (1.0 + dp)
        retained_ratios = np.maximum(0.20, 1.0 + (elast_samples * dp))
        q_new = self.baseline_units * retained_ratios

        new_gp = (q_new * p_new) - (q_new * self.unit_cost)
        delta_m = new_gp - self.baseline_gross_profit - pen
        return delta_m

    def get_summary(self) -> Dict[str, Any]:
        return {
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "explanation": self.ONE_SENTENCE_EXPLANATION,
            "baseline_units": self.baseline_units,
            "baseline_price": self.baseline_price,
            "unit_cost": self.unit_cost,
            "baseline_gross_profit": self.baseline_gross_profit,
            "assumptions": {k: a.model_dump() for k, a in self.assumptions.items()},
        }
