"""TRACE Deterministic Seeded Scenario Simulation Engine.

Implements Project Bible Section 9-14:
- Deterministic seeded Monte Carlo simulation
- Explicit correlation policy (joint sampling only when data-supported; independence assumption disclosed)
- 9 Required statistical outputs:
  1. Best case (P90)
  2. Expected case (E[ΔM] = Projected Upside U)
  3. Worst case (P10)
  4. Full distribution summary (quantiles, std, variance, skew)
  5. Probability of net loss P(ΔM < 0)
  6. P10
  7. Worst-10% tail average (CVaR / Expected Shortfall)
  8. Worst plausible case
  9. User-adjusted case
- Projected Upside: U = E[ΔM]
- Expected Loss: EL = E[max(0, -ΔM)]
"""

from typing import Dict, Any, Optional, Union
import numpy as np
from scipy import stats
from backend.app.analytics.metrics import round_currency
from backend.app.underwriting.artifacts import ScenarioDistributionSummary
from backend.app.underwriting.outcome_model import T1OutcomeModel


class DeterministicScenarioSimulator:
    """Executes deterministic seeded Monte Carlo simulations of the outcome model."""

    @classmethod
    def simulate(
        cls,
        outcome_model: Union[T1OutcomeModel, Any],
        simulation_count: int = 1000,
        random_seed: int = 42,
        user_adjusted_params: Optional[Dict[str, float]] = None,
        correlation_matrix: Optional[np.ndarray] = None,
    ) -> ScenarioDistributionSummary:
        """Runs deterministic seeded Monte Carlo simulation."""
        rng = np.random.RandomState(random_seed)
        correlation_mode = "independent"

        if hasattr(outcome_model, "sample_delta_m"):
            delta_m = outcome_model.sample_delta_m(rng, simulation_count, user_adjusted_params)
            adverse_params = {}
            if hasattr(outcome_model, "assumptions"):
                for a_k, a_v in outcome_model.assumptions.items():
                    if a_k == "observed_elasticity":
                        adverse_params[a_k] = a_v.range_min
                    elif a_k == "unabsorbed_penalties":
                        adverse_params[a_k] = a_v.range_max
            worst_plausible = outcome_model.evaluate(adverse_params) if hasattr(outcome_model, "evaluate") else float(np.percentile(delta_m, 1))
        else:
            # Assumptions
            vol_assump = outcome_model.assumptions.get("volume_retention")
            churn_assump = outcome_model.assumptions.get("segment_churn")
            pen_assump = outcome_model.assumptions.get("unabsorbed_penalties")

            vol_mean = vol_assump.current_value if vol_assump else 0.935
            vol_min = vol_assump.range_min if vol_assump else 0.850
            vol_max = vol_assump.range_max if vol_assump else 0.990

            churn_mean = churn_assump.current_value if churn_assump else 0.045
            churn_min = churn_assump.range_min if churn_assump else 0.020
            churn_max = churn_assump.range_max if churn_assump else 0.080

            pen_val = pen_assump.current_value if pen_assump else getattr(outcome_model, "unabsorbed_contractual_penalties", 0.0)

            # Sampling: Check if empirical correlation matrix supplied
            if correlation_matrix is not None and correlation_matrix.shape == (2, 2):
                correlation_mode = "empirical_joint_distribution"
                std_vol = (vol_max - vol_min) / 4.0
                std_churn = (churn_max - churn_min) / 4.0
                cov = np.array([
                    [std_vol**2, correlation_matrix[0, 1] * std_vol * std_churn],
                    [correlation_matrix[1, 0] * std_vol * std_churn, std_churn**2],
                ])
                samples = rng.multivariate_normal([vol_mean, churn_mean], cov, simulation_count)
                vol_samples = np.clip(samples[:, 0], vol_min, vol_max)
                churn_samples = np.clip(samples[:, 1], churn_min, churn_max)
            else:
                correlation_mode = "independent"
                std_vol = max(0.001, (vol_max - vol_min) / 6.0)
                std_churn = max(0.001, (churn_max - churn_min) / 6.0)
                vol_samples = rng.normal(vol_mean, std_vol, simulation_count)
                vol_samples = np.clip(vol_samples, vol_min, vol_max)
                churn_samples = rng.normal(churn_mean, std_churn, simulation_count)
                churn_samples = np.clip(churn_samples, churn_min, churn_max)

            # Vectorized evaluation of outcome model
            # ΔM = (G * vol) - (G * max(0, churn - baseline_churn) * multiplier) - penalties
            g = getattr(outcome_model, "discount_giveaway", 0.0)
            base_churn = getattr(outcome_model, "baseline_churn", 0.031)
            mult = getattr(outcome_model, "churn_margin_multiplier", 25.32)

            incremental_churn = np.maximum(0.0, churn_samples - base_churn)
            churn_loss = g * incremental_churn * mult
            delta_m = (g * vol_samples) - churn_loss - pen_val

            # Worst plausible case: at adverse bounds
            worst_plausible = outcome_model.evaluate({
                "volume_retention": vol_min,
                "segment_churn": churn_max,
                "unabsorbed_penalties": pen_val,
            })

        # 1. Statistical distributions
        mean_val = float(np.mean(delta_m))
        p10 = float(np.percentile(delta_m, 10))
        p90 = float(np.percentile(delta_m, 90))

        # Worst-10% tail average (CVaR)
        tail_samples = delta_m[delta_m <= p10]
        tail_avg = float(np.mean(tail_samples)) if len(tail_samples) > 0 else p10

        # Shortfalls and Expected Loss: EL = E[max(0, -ΔM)]
        shortfalls = np.maximum(0.0, -delta_m)
        expected_loss = float(np.mean(shortfalls))

        # Probability of net loss P(ΔM < 0)
        loss_count = int(np.sum(delta_m < 0))
        prob_loss = float(loss_count / simulation_count) if simulation_count > 0 else 0.0

        # User-adjusted case if provided, else expected case
        if user_adjusted_params:
            user_case = outcome_model.evaluate(user_adjusted_params)
        else:
            user_case = mean_val

        # Quantiles summary
        quantiles = {
            "p1": round_currency(float(np.percentile(delta_m, 1))),
            "p5": round_currency(float(np.percentile(delta_m, 5))),
            "p10": round_currency(p10),
            "p25": round_currency(float(np.percentile(delta_m, 25))),
            "p50": round_currency(float(np.percentile(delta_m, 50))),
            "p75": round_currency(float(np.percentile(delta_m, 75))),
            "p90": round_currency(p90),
            "p95": round_currency(float(np.percentile(delta_m, 95))),
            "p99": round_currency(float(np.percentile(delta_m, 99))),
            "min": round_currency(float(np.min(delta_m))),
            "max": round_currency(float(np.max(delta_m))),
        }

        std_dev = float(np.std(delta_m))
        var = float(np.var(delta_m))
        skew = float(stats.skew(delta_m)) if len(delta_m) > 2 else 0.0

        return ScenarioDistributionSummary(
            simulation_count=simulation_count,
            random_seed=random_seed,
            correlation_mode=correlation_mode,
            correlation_disclosed=True,
            mean=round_currency(mean_val),
            expected_case=round_currency(mean_val),
            best_case_p90=round_currency(p90),
            worst_case_p10=round_currency(p10),
            p10=round_currency(p10),
            tail_average_loss=round_currency(tail_avg),
            worst_plausible_case=round_currency(worst_plausible),
            probability_of_net_loss=round(prob_loss, 4),
            loss_scenario_count=loss_count,
            expected_loss=round_currency(expected_loss),
            quantiles=quantiles,
            std_dev=round_currency(std_dev),
            variance=round(var, 2),
            skewness=round(skew, 4),
        )
