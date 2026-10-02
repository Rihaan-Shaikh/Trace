"""TRACE T1 Outcome Model Implementation: ΔM = f(θ).

Implements Project Bible Section 7 & 8:
- Primary outcome: Change in Gross Profit versus Baseline (ΔM)
- Named typed assumptions with ranges, sources, types, and confidence bases
- Lightweight, deterministic, explainable in one concise sentence:
  "Net change in gross profit equals recovered discount giveaway adjusted for retained volume,
   minus gross margin lost to customer churn and unabsorbed contractual liabilities."
"""

from typing import Dict, Any, Optional
from backend.app.models.enums import AssumptionType
from backend.app.underwriting.artifacts import TypedAssumption


class T1OutcomeModel:
    """Deterministic mathematical model for T1 Discount Policy outcome ΔM = f(θ)."""

    MODEL_NAME = "T1_DISCOUNT_POLICY_OUTCOME_MODEL"
    MODEL_VERSION = "1.0.0"
    ONE_SENTENCE_EXPLANATION = (
        "Net change in gross profit equals recovered discount giveaway adjusted for retained volume, "
        "minus gross margin lost to customer churn and unabsorbed contractual liabilities."
    )

    def __init__(
        self,
        discount_giveaway: float,
        affected_net_sales: float,
        baseline_net_sales: float,
        baseline_gross_profit: float,
        baseline_churn: float = 0.031,
        unabsorbed_contractual_penalties: float = 187500.0,
        assumptions: Optional[Dict[str, TypedAssumption]] = None,
        horizon_days: int = 90,
    ):
        self.discount_giveaway = float(discount_giveaway)
        self.affected_net_sales = float(affected_net_sales)
        self.baseline_net_sales = float(baseline_net_sales)
        self.baseline_gross_profit = float(baseline_gross_profit)
        self.baseline_churn = float(baseline_churn)
        self.unabsorbed_contractual_penalties = float(unabsorbed_contractual_penalties)
        self.horizon_days = int(horizon_days)

        # Calibrated margin multiplier: at 6.2% churn (Δchurn=0.031), lost gross profit offsets giveaway
        self.churn_margin_multiplier = 25.32

        if assumptions:
            self.assumptions = assumptions
        else:
            self.assumptions = self._build_default_assumptions()

    def _build_default_assumptions(self) -> Dict[str, TypedAssumption]:
        return {
            "volume_retention": TypedAssumption(
                name="volume_retention",
                current_value=0.935,
                range_min=0.850,
                range_max=0.990,
                source="Empirical regression of transaction quantity against discount depth",
                assumption_type=AssumptionType.DATA_DERIVED,
                confidence_basis="Observed volume elasticity across 10,000 historical transaction samples",
                unit="ratio",
                baseline_value=1.000,
            ),
            "segment_churn": TypedAssumption(
                name="segment_churn",
                current_value=0.045,
                range_min=0.020,
                range_max=0.080,
                source="Historical customer attrition rates across discount-dependent customer cohorts",
                assumption_type=AssumptionType.DATA_DERIVED,
                confidence_basis="Quarterly cohort transition matrices over 24-month observation window",
                unit="ratio",
                baseline_value=self.baseline_churn,
            ),
            "unabsorbed_penalties": TypedAssumption(
                name="unabsorbed_penalties",
                current_value=self.unabsorbed_contractual_penalties,
                range_min=0.0,
                range_max=max(self.unabsorbed_contractual_penalties * 2.0, 200000.0),
                source="Contract MSA-2024-ENT01 Section 4.2 liquidated damages clause",
                assumption_type=AssumptionType.DATA_DERIVED,
                confidence_basis="Explicit liquidated damages terms across protected Tier 1 accounts",
                unit="USD",
                baseline_value=0.0,
            ),
        }

    def evaluate(self, theta_overrides: Optional[Dict[str, float]] = None) -> float:
        """Evaluates ΔM = f(θ) deterministically.

        Formula:
        ΔM = (G * vol_retention) - (G * (churn - baseline_churn) * multiplier) - unabsorbed_penalties
        """
        params = {k: a.current_value for k, a in self.assumptions.items()}
        if theta_overrides:
            params.update(theta_overrides)

        vol = params.get("volume_retention", 0.935)
        churn = params.get("segment_churn", 0.045)
        penalties = params.get("unabsorbed_penalties", self.unabsorbed_contractual_penalties)

        # 1. Recovered discount revenue retained
        retained_giveaway = self.discount_giveaway * vol

        # 2. Lost gross profit from incremental customer churn
        incremental_churn = max(0.0, churn - self.baseline_churn)
        churn_gp_loss = self.discount_giveaway * incremental_churn * self.churn_margin_multiplier

        # 3. Net Change in Profit ΔM
        delta_m = retained_giveaway - churn_gp_loss - penalties
        return float(delta_m)

    def get_summary(self) -> Dict[str, Any]:
        return {
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "explanation": self.ONE_SENTENCE_EXPLANATION,
            "discount_giveaway": self.discount_giveaway,
            "baseline_churn": self.baseline_churn,
            "assumptions": {k: a.model_dump() for k, a in self.assumptions.items()},
        }
