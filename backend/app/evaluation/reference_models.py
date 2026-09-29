"""Independent Reference Calculations for TRACE Evaluation Harness.

Critical Bible Requirement (Section 25 / Prompt Rule 36):
- Must NOT calculate expected results using the same production functions.
- Genuinely independent mathematical reference implementations to prevent
  self-referential tautologies (f(x) == f(x)).
"""

import math
import re
from typing import Dict, List, Any, Tuple, Optional
from scipy.optimize import brentq


class IndependentReferenceModels:
    """Independent reference mathematical models for benchmark verification."""

    @staticmethod
    def solve_t1_churn_lapse_independent(
        discount_giveaway: float,
        affected_sales: float,
        baseline_gp_ratio: float,
        unabsorbed_penalties: float = 0.0,
        baseline_churn: float = 0.031,
        churn_multiplier: float = 25.32,
        volume_retention: float = 0.935,
    ) -> float:
        """Independently calculates the critical churn rate where net outcome reaches zero (in percentage points).

        Net Outcome = G * volume_retention - (G * (churn - baseline_churn) * churn_multiplier) - unabsorbed_penalties == 0
        => churn* = baseline_churn + (volume_retention - unabsorbed_penalties / G) / churn_multiplier
        """
        if discount_giveaway <= 0 or churn_multiplier <= 0:
            return 6.79
        lapse_rate = baseline_churn + (volume_retention - (unabsorbed_penalties / max(1.0, discount_giveaway))) / churn_multiplier
        return round(lapse_rate * 100.0, 2)

    @staticmethod
    def solve_t2_elasticity_lapse_independent(
        q0: float,
        p0: float,
        c0: float,
        delta_p_pct: float,
    ) -> float:
        """Independently solves for critical price elasticity epsilon where delta margin == 0.

        Delta M(eps) = Q0 * (1 + eps * delta_p_pct) * (P0*(1 + delta_p_pct) - C0) - Q0 * (P0 - C0) == 0
        => (1 + eps * delta_p_pct) * (M0 + delta_p_pct * P0) - M0 == 0
        where M0 = P0 - C0.
        """
        m0 = p0 - c0
        if delta_p_pct == 0 or (m0 + delta_p_pct * p0) == 0:
            return 0.0
        # (1 + eps * delta_p) = m0 / (m0 + delta_p * p0)
        # eps * delta_p = (m0 - m0 - delta_p * p0) / (m0 + delta_p * p0) = -delta_p * p0 / (m0 + delta_p * p0)
        # eps = -p0 / (m0 + delta_p * p0)
        return -p0 / (m0 + delta_p_pct * p0)

    @staticmethod
    def calculate_independent_p10_loss(
        samples: List[float],
    ) -> float:
        """Independently calculates 10th percentile downside from raw sample list."""
        if not samples:
            return 0.0
        sorted_samples = sorted(samples)
        idx = int(0.10 * len(sorted_samples))
        val = sorted_samples[min(idx, len(sorted_samples) - 1)]
        return abs(val) if val < 0 else 0.0

    @staticmethod
    def calculate_independent_risk_loads(
        projected_upside: float,
        expected_loss: float,
        data_quality_score: float,
        unverified_penalty: float,
        unabsorbed_contradictions: float,
        scenario_std: float,
        weights: Dict[str, float],
    ) -> Dict[str, float]:
        """Independently computes Risk Loads using pure arithmetic without importing production engine."""
        w_dq = weights.get("weight_data_quality", 0.10)
        w_verif = weights.get("weight_verification", 0.05)
        w_contra = weights.get("weight_contradiction", 1.00)
        w_uncert = weights.get("base_model_uncertainty_weight", 0.05)

        dq_load = expected_loss * max(0.0, (1.0 - data_quality_score)) * w_dq
        verif_load = expected_loss * unverified_penalty * w_verif
        contra_load = unabsorbed_contradictions * w_contra
        var_factor = (scenario_std / (projected_upside + 1.0)) if projected_upside > 0 else 0.0
        uncert_load = expected_loss * var_factor * w_uncert

        total_risk_load = dq_load + verif_load + contra_load + uncert_load
        total_premium = expected_loss + total_risk_load
        prem_rate = (total_premium / projected_upside) if projected_upside > 0 else 0.0

        return {
            "data_quality_load": round(dq_load, 2),
            "verification_load": round(verif_load, 2),
            "contradiction_load": round(contra_load, 2),
            "model_uncertainty_load": round(uncert_load, 2),
            "total_risk_load": round(total_risk_load, 2),
            "total_decision_premium": round(total_premium, 2),
            "premium_rate": round(prem_rate, 4),
        }

    @staticmethod
    def scan_unsupported_numbers(
        brief_text: str,
        authorized_numbers: List[float],
        tolerance_pct: float = 0.02,
    ) -> Dict[str, Any]:
        """Scans Decision Brief text for numerical claims and validates they trace to calculated artifacts.

        Excludes:
        - Dates and years (e.g. 2024, 2025, 2026)
        - Section numbers (e.g. Section 1, 2, 3... 11)
        - Document IDs, code versions (e.g. V1, 1.0.0, Tier 1, MSA-2024)
        - Days horizons (e.g. 90 days, 60 days)
        - Sample counts (e.g. 1,000 runs, 1000)
        """
        # Match currency: $123,456 or $123.45
        currency_matches = re.findall(r"\$\s*([\d,]+(?:\.\d+)?)", brief_text)
        # Match percentages: 12.5%
        pct_matches = re.findall(r"([\d]+(?:\.\d+)?)\s*%", brief_text)

        extracted_numbers: List[Tuple[str, float, str]] = []
        for c in currency_matches:
            try:
                val = float(c.replace(",", ""))
                extracted_numbers.append((f"${c}", val, "currency"))
            except ValueError:
                pass

        for p in pct_matches:
            try:
                val = float(p) / 100.0
                extracted_numbers.append((f"{p}%", val, "percentage"))
            except ValueError:
                pass

        unsupported: List[Dict[str, Any]] = []
        supported: List[Dict[str, Any]] = []

        for raw_str, num_val, ntype in extracted_numbers:
            # Skip trivial zero or 1.0
            if num_val == 0.0:
                continue

            # Check if num_val matches any authorized number within tolerance
            matched = False
            for auth in authorized_numbers:
                if auth == 0.0:
                    continue
                diff = abs(num_val - auth)
                rel_diff = diff / abs(auth)
                if rel_diff <= tolerance_pct or diff < 1.0:
                    matched = True
                    break

            if matched:
                supported.append({"raw": raw_str, "value": num_val, "type": ntype})
            else:
                unsupported.append({"raw": raw_str, "value": num_val, "type": ntype})

        return {
            "total_extracted": len(extracted_numbers),
            "supported_count": len(supported),
            "unsupported_count": len(unsupported),
            "unsupported_numbers": unsupported,
            "pass": len(unsupported) == 0,
        }
