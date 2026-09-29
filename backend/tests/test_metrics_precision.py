"""Tests for TRACE Deterministic Analytics and Precision Math."""

import pytest
from backend.app.analytics.metrics import (
    round_currency,
    format_currency,
    calculate_percentage,
    calculate_distance_to_lapse,
    compute_decision_premium_loads,
)


def test_monetary_rounding_precision():
    assert round_currency(1234.567) == 1234.57
    assert round_currency(1234.564) == 1234.56
    assert round_currency(0.004) == 0.00
    assert round_currency(0.005) == 0.01


def test_format_currency():
    assert format_currency(1_200_000.0) == "$1.20M"
    assert format_currency(96_000.0) == "$96.0K"
    assert format_currency(450.75) == "$450.75"
    assert format_currency(-470_000.0) == "$-470.0K"


def test_percentage_calculation():
    assert calculate_percentage(10, 100) == 0.10
    assert calculate_percentage(1, 3) == 0.3333
    # Safe handling of zero denominator
    assert calculate_percentage(10, 0) == 0.0


def test_distance_to_lapse_calculation():
    # Higher is adverse: churn modeled at 3.1%, lapse at 6.2%
    dist, breached = calculate_distance_to_lapse(
        current_value=0.031, lapse_threshold=0.062, higher_is_adverse=True
    )
    assert breached is False
    assert dist == 50.0  # 50% buffer to lapse

    # Higher is adverse: churn exceeds threshold
    dist, breached = calculate_distance_to_lapse(
        current_value=0.07, lapse_threshold=0.062, higher_is_adverse=True
    )
    assert breached is True

    # Lower is adverse: retention modeled at 94%, lapse threshold at 88%
    dist, breached = calculate_distance_to_lapse(
        current_value=0.94, lapse_threshold=0.88, higher_is_adverse=False
    )
    assert breached is False
    assert round(dist, 1) == 6.4


def test_deterministic_premium_loads_calculation():
    weights = {
        "weight_data_quality": 0.10,
        "weight_verification": 0.05,
        "weight_contradiction": 1.00,
        "base_model_uncertainty_weight": 0.05,
    }
    result = compute_decision_premium_loads(
        projected_upside=1_200_000.0,
        expected_loss=96_000.0,
        data_quality_score=0.95,  # 5% penalty
        unverified_figures_count=0,
        unabsorbed_contradictions_amount=0.0,
        model_variance_factor=1.0,
        rate_card_weights=weights,
    )

    assert result["projected_upside"] == 1_200_000.0
    assert result["expected_loss"] == 96_000.0
    # data_quality_load = (1 - 0.95) * 0.10 * 1.2M = 0.05 * 120,000 = 6,000
    assert result["data_quality_load"] == 6_000.0
    assert result["verification_load"] == 0.0
    assert result["contradiction_load"] == 0.0
    # model_uncertainty_load = 1.0 * 0.05 * 1.2M = 60,000
    assert result["model_uncertainty_load"] == 60_000.0
    assert result["total_risk_load"] == 66_000.0
    assert result["total_decision_premium"] == 96_000.0 + 66_000.0  # 162,000
    assert result["expected_net_benefit"] == 1_200_000.0 - 162_000.0
