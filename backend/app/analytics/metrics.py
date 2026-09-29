"""TRACE Deterministic Analytics and Monetary Precision Engine.

Enforces that every numerical output originates from deterministic mathematics.
The LLM may NEVER be the source of numerical truth.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Tuple, Optional


def round_currency(value: float) -> float:
    """Rounds currency to 2 decimal places using standard commercial banker's rounding."""
    d = Decimal(str(value))
    return float(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def format_currency(value: float, currency_symbol: str = "$") -> str:
    """Formats numeric value as currency (e.g. $1,200,000.00 or -$470,000.00)."""
    abs_val = abs(value)
    if abs_val >= 1_000_000:
        val_str = f"{currency_symbol}{value / 1_000_000:.2f}M"
    elif abs_val >= 1_000:
        val_str = f"{currency_symbol}{value / 1_000:.1f}K"
    else:
        val_str = f"{currency_symbol}{value:,.2f}"
    return val_str


def calculate_percentage(numerator: float, denominator: float) -> float:
    """Computes bounded percentage ratio safely handling zero denominators."""
    if denominator == 0.0:
        return 0.0
    return float(Decimal(str(numerator / denominator)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))


def calculate_distance_to_lapse(
    current_value: float,
    lapse_threshold: float,
    higher_is_adverse: bool = True,
) -> Tuple[float, bool]:
    """Computes distance to coverage lapse threshold.

    Returns:
        (distance_percent, is_breached)
    """
    if higher_is_adverse:
        # e.g. churn rate: lapse threshold = 6.2%, current = 3.1%
        gap = lapse_threshold - current_value
        is_breached = current_value >= lapse_threshold
        if lapse_threshold != 0:
            distance_pct = (gap / lapse_threshold) * 100.0
        else:
            distance_pct = 0.0
    else:
        # e.g. retention rate: lapse threshold = 88%, current = 95%
        gap = current_value - lapse_threshold
        is_breached = current_value <= lapse_threshold
        if current_value != 0:
            distance_pct = (gap / current_value) * 100.0
        else:
            distance_pct = 0.0

    return round(distance_pct, 2), is_breached


def compute_decision_premium_loads(
    projected_upside: float,
    expected_loss: float,
    data_quality_score: float,
    unverified_figures_count: int,
    unabsorbed_contradictions_amount: float,
    model_variance_factor: float,
    rate_card_weights: Dict[str, float],
) -> Dict[str, float]:
    """Computes the 4 loads and total Decision Premium deterministically.

    Loads:
    1. Data-Quality Load: (1 - quality_score) * weight_dq * upside
    2. Verification Load: unverified_penalty * weight_verif * upside
    3. Contradiction Load: weight_contra * unabsorbed_contradictions_amount
    4. Model-Uncertainty Load: model_variance_factor * weight_model * upside
    """
    # 1. Data-Quality Load
    dq_weight = rate_card_weights.get("weight_data_quality", 0.10)
    data_quality_load = max(0.0, (1.0 - data_quality_score) * dq_weight * projected_upside)

    # 2. Verification Load
    v_weight = rate_card_weights.get("weight_verification", 0.05)
    # Penalty scales with unverified count
    unverified_penalty = min(1.0, unverified_figures_count * 0.25)
    verification_load = unverified_penalty * v_weight * projected_upside

    # 3. Contradiction Load
    c_weight = rate_card_weights.get("weight_contradiction", 1.00)
    contradiction_load = max(0.0, c_weight * unabsorbed_contradictions_amount)

    # 4. Model-Uncertainty Load
    m_weight = rate_card_weights.get("base_model_uncertainty_weight", 0.05)
    model_uncertainty_load = max(0.0, model_variance_factor * m_weight * projected_upside)

    total_risk_load = data_quality_load + verification_load + contradiction_load + model_uncertainty_load
    total_premium = expected_loss + total_risk_load
    premium_rate = (total_premium / projected_upside) if projected_upside > 0 else 0.0
    expected_net_benefit = projected_upside - total_premium

    return {
        "projected_upside": round_currency(projected_upside),
        "expected_loss": round_currency(expected_loss),
        "data_quality_load": round_currency(data_quality_load),
        "verification_load": round_currency(verification_load),
        "contradiction_load": round_currency(contradiction_load),
        "model_uncertainty_load": round_currency(model_uncertainty_load),
        "total_risk_load": round_currency(total_risk_load),
        "total_decision_premium": round_currency(total_premium),
        "premium_rate": round(premium_rate, 4),
        "expected_net_benefit": round_currency(expected_net_benefit),
    }
