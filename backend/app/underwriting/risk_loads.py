"""TRACE Deterministic Risk Loads and Decision Premium Engine.

Implements Project Bible Section 15-21 & 44:
- Four separate, traceable Risk Loads:
  1. Data-Quality Load: (1 - DQ_score) * weight_dq * U
  2. Verification Load: unverified_penalty * weight_verif * U (0 when all verified)
  3. Contradiction Load: weight_contra * unabsorbed_findings (NO double counting)
  4. Model-Uncertainty Load: dispersion_factor * weight_model * U (with Loss History experience factor Z)
- Decision Premium = Expected Loss + Total Risk Load
- Premium Rate = Decision Premium / Projected Upside
  (strictly handling U <= 0 edge cases without ZeroDivisionError)
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from backend.app.analytics.metrics import round_currency
from backend.app.core.config import settings


class RiskLoadsResult(BaseModel):
    projected_upside: float
    expected_loss: float
    data_quality_load: float
    data_quality_basis: str
    verification_load: float
    verification_basis: str
    contradiction_load: float
    contradiction_basis: str
    model_uncertainty_load: float
    model_uncertainty_basis: str
    total_risk_load: float
    total_decision_premium: float
    premium_rate: Optional[float]
    premium_rate_is_defined: bool
    expected_net_benefit: float
    double_counting_safeguards_applied: List[str]


class DeterministicRiskLoadEngine:
    """Calculates four distinct risk loads, total Decision Premium, and Premium Rate."""

    @classmethod
    def calculate_loads(
        cls,
        projected_upside: float,
        expected_loss: float,
        data_quality_score: float,
        verifications: List[Dict[str, Any]],
        counter_findings: List[Dict[str, Any]],
        scenario_std: float,
        assumptions: List[Dict[str, Any]],
        rate_card_weights: Dict[str, float],
        loss_history_count: int = 0,
        loss_history_credibility_k: Optional[float] = None,
        data_health_findings: Optional[List[Dict[str, Any]]] = None,
        experience_factor: Optional[float] = None,
    ) -> RiskLoadsResult:
        """Deterministically computes each load and the final Decision Premium."""
        safeguards = []

        # 1. DATA-QUALITY LOAD (Decision-Relevant Findings Only)
        dq_weight = float(rate_card_weights.get("weight_data_quality", 0.10))
        clamped_dq_score = min(1.0, max(0.0, float(data_quality_score)))

        # Check if any findings specifically touch decision-relevant schema fields
        relevant_columns = {"customer_id", "product_id", "net_sales", "unit_price", "quantity", "discount_pct", "discount"}
        has_relevant_issue = True
        if data_health_findings is not None:
            relevant_issues = [
                f for f in data_health_findings
                if str(f.get("column", "")).lower() in relevant_columns
                or str(f.get("field", "")).lower() in relevant_columns
                or any(col in str(f.get("description", "")).lower() for col in relevant_columns)
            ]
            has_relevant_issue = len(relevant_issues) > 0

        if clamped_dq_score >= 1.0 or projected_upside <= 0 or not has_relevant_issue:
            data_quality_load = 0.0
            if not has_relevant_issue and data_health_findings is not None:
                dq_basis = "No decision-relevant data health defects detected in pricing/transaction schema; load is $0.00."
            else:
                dq_basis = "Data Quality score is 100% (or upside non-positive); no penalty assessed."
        else:
            # Deterministic load: (1 - score) * weight * upside
            data_quality_load = max(0.0, (1.0 - clamped_dq_score) * dq_weight * projected_upside)
            dq_basis = (
                f"Decision-relevant data quality deficit of {(1.0 - clamped_dq_score) * 100:.1f}% applied against "
                f"{dq_weight * 100:.1f}% Rate Card policy weight across upside of ${projected_upside:,.2f}."
            )

        # 2. VERIFICATION LOAD (Discrepancy Size, Count, & Criticality Responsive)
        verif_weight = float(rate_card_weights.get("weight_verification", 0.05))
        crit_multiplier = float(rate_card_weights.get("critical_verification_multiplier", 1.50))
        penalty_rate_per_item = float(rate_card_weights.get("verification_penalty_rate_per_discrepancy", 0.20))

        unverified_items = [v for v in verifications if not v.get("is_verified", False)]
        unverified_count = len(unverified_items)

        if unverified_count == 0 or projected_upside <= 0:
            verification_load = 0.0
            verif_basis = "All key financial figures passed independent secondary verification within tolerance; load is $0.00."
        else:
            # Calculate composite discrepancy severity:
            # Severity combines: discrepancy relative magnitude + baseline item penalty + critical flag multiplier
            total_severity = 0.0
            discrepancy_details = []

            for item in unverified_items:
                metric_name = item.get("metric_name", "Metric")
                rel_disc = float(item.get("relative_discrepancy", 0.0))
                if rel_disc <= 0:
                    # Fallback from primary and secondary values if not pre-computed
                    p_val = float(item.get("primary_value") or item.get("method_primary_value") or 0.0)
                    s_val = float(item.get("secondary_value") or item.get("method_secondary_value") or 0.0)
                    if p_val != 0:
                        rel_disc = abs(s_val - p_val) / abs(p_val)
                    else:
                        rel_disc = 0.10

                is_critical = bool(item.get("is_critical", True))
                # Magnitude term: scaled relative discrepancy clamped between 0.05 and 1.0
                mag_factor = min(1.0, max(0.05, rel_disc))
                # Item penalty combining rate card item base rate with discrepancy magnitude
                item_penalty = (penalty_rate_per_item * 0.5) + (mag_factor * 0.5)
                if is_critical:
                    item_penalty *= crit_multiplier
                total_severity += item_penalty
                discrepancy_details.append(f"{metric_name} (rel_err={rel_disc * 100:.1f}%, crit={is_critical})")

            penalty_ratio = min(2.0, total_severity)
            verification_load = max(0.0, penalty_ratio * verif_weight * projected_upside)
            verif_basis = (
                f"{unverified_count} unverified figure(s) [{'; '.join(discrepancy_details)}]. "
                f"Discrepancy-weighted severity ratio={penalty_ratio:.2f} applied against {verif_weight * 100:.1f}% policy weight."
            )

        # 3. CONTRADICTION LOAD (Double-Counting Protected)
        contra_weight = float(rate_card_weights.get("weight_contradiction", 1.00))
        unabsorbed_total = 0.0
        absorbed_total = 0.0

        for f in counter_findings:
            impact = float(f.get("unabsorbed_impact", 0.0))
            is_absorbed = bool(f.get("is_absorbed_into_model", False))
            if is_absorbed:
                absorbed_total += float(f.get("quantified_impact", 0.0))
            else:
                unabsorbed_total += impact

        safeguards.append(
            f"Absorbed findings (${absorbed_total:,.2f}) excluded from Contradiction Load to prevent double-counting with outcome model."
        )

        contradiction_load = max(0.0, contra_weight * unabsorbed_total)
        contradiction_basis = (
            f"Applied contradiction weight {contra_weight:.2f}x to unabsorbed adverse impact of ${unabsorbed_total:,.2f}."
        )

        # 4. MODEL-UNCERTAINTY LOAD (With Loss History Experience Factor)
        base_model_weight = float(rate_card_weights.get("base_model_uncertainty_weight", 0.05))

        # Coefficient of variation CV = std / |U|
        if projected_upside > 0:
            cv = min(2.0, max(0.0, scenario_std / projected_upside))
        else:
            cv = 0.5

        # Proportion of judgement assumptions
        judgement_count = sum(1 for a in assumptions if str(a.get("assumption_type", "")).lower() == "judgement")
        total_assumptions = max(1, len(assumptions))
        judgement_ratio = judgement_count / total_assumptions

        # Credibility policy tuning parameter k (Project Bible Section 21.4 [DEFAULT method])
        k = float(loss_history_credibility_k if loss_history_credibility_k is not None else settings.LEDGER_CREDIBILITY_K)

        # Experience factor Z = n / (n + k)
        if experience_factor is not None:
            exp_factor = float(experience_factor)
            z = loss_history_count / (loss_history_count + k) if loss_history_count > 0 else 0.0
            exp_note = f"Loss History recalibration factor {exp_factor:.3f}x applied (credibility Z={z:.2f}, n={loss_history_count}, k={k:.1f})."
        elif loss_history_count <= 0:
            exp_factor = 1.0  # Neutral factor when no historical experience exists (Bible 21.4)
            exp_note = "Neutral experience factor (1.0x) applied: no relevant historical loss experience."
        else:
            z = loss_history_count / (loss_history_count + k)
            # Credible history moderates uncertainty multiplier down towards 0.8x
            exp_factor = 1.0 - (0.2 * z)
            exp_note = f"Loss History experience factor Z={z:.2f} calibrated across {loss_history_count} past decision(s) (k={k:.1f})."

        dispersion_factor = ((cv * 0.6) + (judgement_ratio * 0.4)) * exp_factor
        if projected_upside > 0:
            model_uncertainty_load = max(0.0, dispersion_factor * base_model_weight * projected_upside)
        else:
            model_uncertainty_load = 0.0

        model_uncertainty_basis = (
            f"Model dispersion CV={cv:.2f}, judgement ratio={judgement_ratio * 100:.1f}%, "
            f"base weight={base_model_weight * 100:.1f}%. {exp_note}"
        )

        # TOTAL RISK LOAD & DECISION PREMIUM
        total_risk_load = data_quality_load + verification_load + contradiction_load + model_uncertainty_load
        total_premium = max(0.0, expected_loss) + total_risk_load

        # PREMIUM RATE
        if projected_upside > 0:
            premium_rate = total_premium / projected_upside
            premium_rate_is_defined = True
        else:
            premium_rate = None
            premium_rate_is_defined = False
            safeguards.append("Projected upside is non-positive; Premium Rate undefined to avoid ZeroDivisionError.")

        expected_net_benefit = projected_upside - total_premium

        return RiskLoadsResult(
            projected_upside=round_currency(projected_upside),
            expected_loss=round_currency(expected_loss),
            data_quality_load=round_currency(data_quality_load),
            data_quality_basis=dq_basis,
            verification_load=round_currency(verification_load),
            verification_basis=verif_basis,
            contradiction_load=round_currency(contradiction_load),
            contradiction_basis=contradiction_basis,
            model_uncertainty_load=round_currency(model_uncertainty_load),
            model_uncertainty_basis=model_uncertainty_basis,
            total_risk_load=round_currency(total_risk_load),
            total_decision_premium=round_currency(total_premium),
            premium_rate=round(premium_rate, 4) if premium_rate is not None else None,
            premium_rate_is_defined=premium_rate_is_defined,
            expected_net_benefit=round_currency(expected_net_benefit),
            double_counting_safeguards_applied=safeguards,
        )
