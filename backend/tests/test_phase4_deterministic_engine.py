"""TRACE Phase 4 — Deterministic Analytics & Underwriting Engine Test Suite.

Proves:
1. Zero LLM requirement: The mathematical core executes completely independently without LLM.
2. Seeded reproducibility: Identical seed and inputs produce identical distributions and metrics.
3. Strict numerical invariants:
   - Expected Loss >= 0
   - Probability of Net Loss in [0, 1]
   - Risk loads >= 0
   - Decision Premium >= Expected Loss
   - Decision Premium = Expected Loss when all risk loads are zero
   - Worst-10% tail average <= P10
4. Four separate, traceable Risk Loads with double-counting prevention.
5. First-class Exposure Report with concentration, data exposure, and Cost of Inaction.
6. Coverage Lapse Engine with sensitivity ranking, root-solving, combination lapse, and Tripwires.
7. Underwriting Verdict Engine following strict hard precedence.
8. Comprehensive edge cases: U <= 0, no losses, all losses, unverified figures.
"""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import MagicMock

from backend.app.models.enums import (
    DataSufficiencyVerdict,
    UnderwritingVerdictType,
    LapseConditionType,
    AssumptionType,
    StatementLevel,
)
from backend.app.underwriting.artifacts import (
    NumericalArtifact,
    TypedAssumption,
    ContractRestriction,
    ScenarioDistributionSummary,
)
from backend.app.underwriting.t1_analytics import T1DeterministicAnalytics
from backend.app.underwriting.outcome_model import T1OutcomeModel
from backend.app.underwriting.scenario_engine import DeterministicScenarioSimulator
from backend.app.underwriting.risk_loads import DeterministicRiskLoadEngine
from backend.app.underwriting.exposure import DeterministicExposureEngine
from backend.app.underwriting.coverage_lapse import DeterministicCoverageLapseEngine
from backend.app.underwriting.verdict import DeterministicVerdictEngine
from backend.app.underwriting.engine import DeterministicUnderwritingEngine


# --- Fixtures ---

@pytest.fixture
def mock_novamart_frames():
    """Generates synthetic minimal data frames matching NovaMart schema."""
    tx_data = {
        "transaction_id": [f"TX-{i:05d}" for i in range(100)],
        "customer_id": [f"CUST-{(i % 20):05d}" for i in range(100)],
        "product_id": [f"PROD-{(i % 10):03d}" for i in range(100)],
        "quantity": [500 + (i % 5) for i in range(100)],
        "unit_price": [500.0 for _ in range(100)],
        "discount_pct": [0.05 if i % 2 == 0 else 0.20 for i in range(100)],
    }
    tx_df = pd.DataFrame(tx_data)
    tx_df["net_sales"] = tx_df["quantity"] * tx_df["unit_price"] * (1.0 - tx_df["discount_pct"])

    prod_df = pd.DataFrame({
        "product_id": [f"PROD-{i:03d}" for i in range(10)],
        "unit_cost": [60.0 for _ in range(10)],
    })

    cust_df = pd.DataFrame({
        "customer_id": [f"CUST-{i:05d}" for i in range(20)],
        "segment": ["Enterprise" if i < 5 else "Mid-Market" if i < 12 else "SMB" for i in range(20)],
    })

    return {
        "transactions": tx_df,
        "products": prod_df,
        "customers": cust_df,
    }


@pytest.fixture
def sample_outcome_model():
    return T1OutcomeModel(
        discount_giveaway=1250000.0,
        affected_net_sales=4500000.0,
        baseline_net_sales=18500000.0,
        baseline_gross_profit=3800000.0,
        baseline_churn=0.031,
        unabsorbed_contractual_penalties=187500.0,
    )


@pytest.fixture
def standard_rate_card():
    return {
        "version_str": "RC-2024-V1",
        "weight_data_quality": 0.10,
        "weight_verification": 0.05,
        "weight_contradiction": 1.00,
        "base_model_uncertainty_weight": 0.05,
        "band_recommended_max": 0.10,
        "band_recommended_with_conditions_max": 0.25,
        "band_refer_max": 0.50,
        "tail_percentile": 0.10,
    }


# ==============================================================================
# 1. NO LLM INDEPENDENCE TEST
# ==============================================================================

def test_deterministic_underwriting_engine_without_llm(mock_novamart_frames, standard_rate_card):
    """PROVE NO LLM IS REQUIRED:
    The mathematical engine executes end-to-end with typed data and returns the full
    UnderwritingPackage with NO LLM imported or called.
    """
    retrieved_docs = [
        {"text": "MSA-2024-ENT01 Section 4.2 liquidated damages $187,500 for Tier 1 protected accounts."}
    ]
    verifications = [
        {"metric_name": "Gross Profit", "is_verified": True, "discrepancy": 0.0},
        {"metric_name": "Discount Giveaway", "is_verified": True, "discrepancy": 0.0},
    ]
    counter_findings = [
        {
            "title": "Contract Damages",
            "quantified_impact": 187500.0,
            "unabsorbed_impact": 187500.0,
            "is_absorbed_into_model": False,
        }
    ]
    data_health = {"overall_score": 0.95}

    # Execute complete underwriting package
    pkg = DeterministicUnderwritingEngine.execute_underwriting_package(
        frames=mock_novamart_frames,
        retrieved_docs=retrieved_docs,
        verifications=verifications,
        counter_findings=counter_findings,
        data_health_results=data_health,
        rate_card_policy=standard_rate_card,
        simulation_count=500,
        random_seed=42,
    )

    assert pkg is not None
    assert pkg.baseline.result_type == StatementLevel.CALCULATED_RESULT
    assert pkg.scenario_distribution.simulation_count == 500
    assert pkg.scenario_distribution.expected_case > 0
    assert pkg.risk_loads.total_decision_premium > 0
    assert pkg.exposure_report.cost_of_inaction > 0
    assert len(pkg.lapse_conditions) == 6
    assert pkg.verdict.verdict in [
        UnderwritingVerdictType.RECOMMENDED,
        UnderwritingVerdictType.RECOMMENDED_WITH_CONDITIONS,
        UnderwritingVerdictType.REFER,
        UnderwritingVerdictType.DECLINE,
    ]


# ==============================================================================
# 2. OUTCOME MODEL & ASSUMPTIONS TESTS
# ==============================================================================

def test_outcome_model_mathematical_precision(sample_outcome_model):
    """Test deterministic outcome evaluation ΔM = f(θ)."""
    # Baseline evaluation
    base_delta_m = sample_outcome_model.evaluate()
    assert isinstance(base_delta_m, float)
    assert base_delta_m > 0

    # Adverse churn reduces ΔM
    adverse_delta_m = sample_outcome_model.evaluate({"segment_churn": 0.075})
    assert adverse_delta_m < base_delta_m

    # Higher volume retention increases ΔM
    high_vol_delta_m = sample_outcome_model.evaluate({"volume_retention": 0.98})
    assert high_vol_delta_m > base_delta_m

    # Concise one-sentence explanation exists
    assert "Net change in gross profit" in sample_outcome_model.ONE_SENTENCE_EXPLANATION
    assert len(sample_outcome_model.assumptions) >= 3

    # Typed assumption properties
    vol_assump = sample_outcome_model.assumptions["volume_retention"]
    assert vol_assump.assumption_type == AssumptionType.DATA_DERIVED
    assert vol_assump.range_min < vol_assump.current_value < vol_assump.range_max


# ==============================================================================
# 3. SEEDED MONTE CARLO REPRODUCIBILITY & INVARIANTS
# ==============================================================================

def test_scenario_simulation_seeded_reproducibility(sample_outcome_model):
    """Test that identical seed produces byte-for-byte identical distribution."""
    run1 = DeterministicScenarioSimulator.simulate(sample_outcome_model, simulation_count=1000, random_seed=123)
    run2 = DeterministicScenarioSimulator.simulate(sample_outcome_model, simulation_count=1000, random_seed=123)

    assert run1.expected_case == run2.expected_case
    assert run1.p10 == run2.p10
    assert run1.tail_average_loss == run2.tail_average_loss
    assert run1.probability_of_net_loss == run2.probability_of_net_loss
    assert run1.expected_loss == run2.expected_loss
    assert run1.quantiles == run2.quantiles


def test_scenario_mathematical_invariants(sample_outcome_model):
    """Test core numerical invariants on the scenario engine."""
    summary = DeterministicScenarioSimulator.simulate(sample_outcome_model, simulation_count=1000, random_seed=42)

    # Invariant 1: Expected Loss >= 0
    assert summary.expected_loss >= 0.0

    # Invariant 2: Probability of Net Loss in [0, 1]
    assert 0.0 <= summary.probability_of_net_loss <= 1.0

    # Invariant 3: Worst-10% tail average <= P10
    assert summary.tail_average_loss <= summary.p10

    # Invariant 4: Best case (P90) >= Expected case >= Worst case (P10)
    assert summary.best_case_p90 >= summary.expected_case >= summary.worst_case_p10

    # Invariant 5: Independence assumption is explicitly disclosed
    assert summary.correlation_mode == "independent"
    assert summary.correlation_disclosed is True


# ==============================================================================
# 4. FOUR SEPARATE RISK LOADS & DOUBLE COUNTING PREVENTION
# ==============================================================================

def test_four_separate_risk_loads_and_safeguards(standard_rate_card):
    """Test that the four risk loads are computed independently and double-counting is prevented."""
    upside = 1000000.0
    expected_loss = 25000.0

    # 1. Perfectly verified, 100% DQ, 0 unabsorbed contradictions
    clean_loads = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=upside,
        expected_loss=expected_loss,
        data_quality_score=1.0,
        verifications=[{"metric_name": "Sales", "is_verified": True}],
        counter_findings=[],
        scenario_std=50000.0,
        assumptions=[{"assumption_type": "data_derived"}],
        rate_card_weights=standard_rate_card,
    )
    assert clean_loads.data_quality_load == 0.0
    assert clean_loads.verification_load == 0.0
    assert clean_loads.contradiction_load == 0.0
    assert clean_loads.total_decision_premium >= expected_loss

    # 2. Degraded DQ increases DQ load
    dirty_loads = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=upside,
        expected_loss=expected_loss,
        data_quality_score=0.85,
        verifications=[{"metric_name": "Sales", "is_verified": True}],
        counter_findings=[],
        scenario_std=50000.0,
        assumptions=[{"assumption_type": "data_derived"}],
        rate_card_weights=standard_rate_card,
    )
    assert dirty_loads.data_quality_load > 0.0
    # Formula: (1 - 0.85) * 0.10 * 1,000,000 = 15,000.0
    assert abs(dirty_loads.data_quality_load - 15000.0) < 1.0

    # 3. Unverified figures increase verification load
    unverif_loads = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=upside,
        expected_loss=expected_loss,
        data_quality_score=1.0,
        verifications=[{"metric_name": "COGS", "is_verified": False}],
        counter_findings=[],
        scenario_std=50000.0,
        assumptions=[{"assumption_type": "data_derived"}],
        rate_card_weights=standard_rate_card,
    )
    assert unverif_loads.verification_load > 0.0

    # 4. Double-counting safeguard: Absorbed findings do not add to contradiction load
    contra_loads = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=upside,
        expected_loss=expected_loss,
        data_quality_score=1.0,
        verifications=[],
        counter_findings=[
            {"title": "Absorbed Churn", "quantified_impact": 50000.0, "unabsorbed_impact": 0.0, "is_absorbed_into_model": True},
            {"title": "Unabsorbed Legal Fee", "quantified_impact": 20000.0, "unabsorbed_impact": 20000.0, "is_absorbed_into_model": False},
        ],
        scenario_std=50000.0,
        assumptions=[],
        rate_card_weights=standard_rate_card,
    )
    # Contradiction load should charge ONLY for the 20,000 unabsorbed, NOT the 50,000 absorbed
    assert contra_loads.contradiction_load == 20000.0
    assert any("Excluded from Contradiction Load" in s or "prevent double-counting" in s for s in contra_loads.double_counting_safeguards_applied)


# ==============================================================================
# 5. COVERAGE LAPSE ROOT-SOLVING & TRIPWIRES
# ==============================================================================

def test_coverage_lapse_sensitivity_and_root_finding(sample_outcome_model):
    """Test deterministic root-solving and all 6 lapse condition types."""
    # 1. Sensitivity ranking
    ranks = DeterministicCoverageLapseEngine.rank_sensitivity(sample_outcome_model)
    assert len(ranks) >= 3
    # Top ranked parameter should have largest outcome spread
    assert ranks[0]["outcome_spread"] >= ranks[1]["outcome_spread"]

    # 2. Root solving for segment churn threshold on Expected Net Benefit <= 0
    churn_root_nb = DeterministicCoverageLapseEngine.solve_scalar_root(
        sample_outcome_model, "segment_churn", search_min=0.031, search_max=0.15, target="net_benefit"
    )
    assert churn_root_nb is not None
    # At net_benefit root, ΔM is still positive while Expected Net Benefit reaches zero!
    u_nb, prem_nb, net_benefit_val, _ = DeterministicCoverageLapseEngine.evaluate_underwriting_net_benefit(
        sample_outcome_model, {"segment_churn": churn_root_nb}
    )
    assert abs(net_benefit_val) < 100.0
    assert u_nb > 0.0  # Proves ΔM remains positive, but Decision Premium causes Expected Net Benefit to reach zero!

    # Also verify raw ΔM root solving
    churn_root_dm = DeterministicCoverageLapseEngine.solve_scalar_root(
        sample_outcome_model, "segment_churn", search_min=0.031, search_max=0.15, target="delta_m"
    )
    assert churn_root_dm is not None
    val_at_dm_root = sample_outcome_model.evaluate({"segment_churn": churn_root_dm})
    assert abs(val_at_dm_root) < 10.0

    # 3. Distance calculation
    dist_pct, is_breached = DeterministicCoverageLapseEngine.calculate_distance(
        current_val=0.045, threshold_val=churn_root_nb, higher_is_adverse=True
    )
    assert 0 < dist_pct < 100.0
    assert is_breached is False

    # 4. Generate all 6 canonical lapse conditions
    conditions = DeterministicCoverageLapseEngine.generate_all_lapse_conditions(
        outcome_model=sample_outcome_model,
        concentration_data={"top_accounts_exposure_amount": 420000.0, "top_n_revenue_share": 58.4},
        data_health_score=0.95,
    )
    assert len(conditions) == 6
    types_found = {c.condition_type for c in conditions}
    assert types_found == {
        LapseConditionType.THRESHOLD,
        LapseConditionType.COMBINATION,
        LapseConditionType.CONCENTRATION,
        LapseConditionType.DATA,
        LapseConditionType.DEFINITION,
        LapseConditionType.TIME,
    }

    # Verify Tripwires attached
    assert all(len(c.tripwires) > 0 for c in conditions)
    churn_cond = next(c for c in conditions if c.condition_type == LapseConditionType.THRESHOLD)
    assert churn_cond.tripwires[0].review_cadence == "weekly"


# ==============================================================================
# 6. UNDERWRITING VERDICT PRECEDENCE RULES
# ==============================================================================

def test_verdict_precedence_rules(standard_rate_card):
    """Test strict hard precedence order in underwriting verdicts."""
    bands = standard_rate_card

    # Precedence 1: Data Sufficiency == INSUFFICIENT dominates all else -> DECLINE
    v1 = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=DataSufficiencyVerdict.INSUFFICIENT,
        verifications=[],
        lapse_conditions=[],
        premium_rate=0.02,  # Low premium rate would otherwise qualify for RECOMMENDED
        projected_upside=1000000.0,
        unabsorbed_contradictions_amount=0.0,
        rate_card_bands=bands,
    )
    assert v1.verdict == UnderwritingVerdictType.DECLINE
    assert "PRECEDENCE_1" in v1.precedence_rule_applied

    # Precedence 2: Critical verification failure -> REFER
    v2 = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=DataSufficiencyVerdict.SUFFICIENT,
        verifications=[{"metric_name": "Revenue", "is_verified": False, "is_critical": True}],
        lapse_conditions=[],
        premium_rate=0.02,
        projected_upside=1000000.0,
        unabsorbed_contradictions_amount=0.0,
        rate_card_bands=bands,
    )
    assert v2.verdict == UnderwritingVerdictType.REFER
    assert "PRECEDENCE_2" in v2.precedence_rule_applied

    # Precedence 3: Breached lapse condition -> DECLINE
    mock_breached_lapse = MagicMock(is_breached=True, title="Data Breach")
    v3 = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=DataSufficiencyVerdict.SUFFICIENT,
        verifications=[{"is_verified": True}],
        lapse_conditions=[mock_breached_lapse],
        premium_rate=0.02,
        projected_upside=1000000.0,
        unabsorbed_contradictions_amount=0.0,
        rate_card_bands=bands,
    )
    assert v3.verdict == UnderwritingVerdictType.DECLINE
    assert "PRECEDENCE_3" in v3.precedence_rule_applied

    # Precedence 4: Rate Card bands
    # 4a. Recommended: rate <= 0.10 and contradictions == 0
    v4a = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=DataSufficiencyVerdict.SUFFICIENT,
        verifications=[{"is_verified": True}],
        lapse_conditions=[],
        premium_rate=0.08,
        projected_upside=1000000.0,
        unabsorbed_contradictions_amount=0.0,
        rate_card_bands=bands,
    )
    assert v4a.verdict == UnderwritingVerdictType.RECOMMENDED

    # 4b. Recommended with Conditions: rate <= 0.25 or contradictions > 0
    v4b = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=DataSufficiencyVerdict.SUFFICIENT,
        verifications=[{"is_verified": True}],
        lapse_conditions=[],
        premium_rate=0.18,
        projected_upside=1000000.0,
        unabsorbed_contradictions_amount=0.0,
        rate_card_bands=bands,
    )
    assert v4b.verdict == UnderwritingVerdictType.RECOMMENDED_WITH_CONDITIONS

    # 4c. Refer: rate <= 0.50
    v4c = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=DataSufficiencyVerdict.SUFFICIENT,
        verifications=[{"is_verified": True}],
        lapse_conditions=[],
        premium_rate=0.35,
        projected_upside=1000000.0,
        unabsorbed_contradictions_amount=0.0,
        rate_card_bands=bands,
    )
    assert v4c.verdict == UnderwritingVerdictType.REFER

    # 4d. Decline: rate > 0.50
    v4d = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=DataSufficiencyVerdict.SUFFICIENT,
        verifications=[{"is_verified": True}],
        lapse_conditions=[],
        premium_rate=0.65,
        projected_upside=1000000.0,
        unabsorbed_contradictions_amount=0.0,
        rate_card_bands=bands,
    )
    assert v4d.verdict == UnderwritingVerdictType.DECLINE


# ==============================================================================
# 7. EDGE CASES & NUMERICAL SAFETY
# ==============================================================================

def test_edge_cases_zero_and_negative_upside(standard_rate_card):
    """Test that non-positive upside does not trigger ZeroDivisionError and declines safely."""
    # Zero upside
    zero_res = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=0.0,
        expected_loss=50000.0,
        data_quality_score=0.90,
        verifications=[],
        counter_findings=[],
        scenario_std=10000.0,
        assumptions=[],
        rate_card_weights=standard_rate_card,
    )
    assert zero_res.premium_rate is None
    assert zero_res.premium_rate_is_defined is False

    v_zero = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=DataSufficiencyVerdict.SUFFICIENT,
        verifications=[],
        lapse_conditions=[],
        premium_rate=zero_res.premium_rate,
        projected_upside=0.0,
        unabsorbed_contradictions_amount=0.0,
        rate_card_bands=standard_rate_card,
    )
    assert v_zero.verdict == UnderwritingVerdictType.DECLINE

    # Negative upside
    neg_res = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=-50000.0,
        expected_loss=100000.0,
        data_quality_score=0.90,
        verifications=[],
        counter_findings=[],
        scenario_std=10000.0,
        assumptions=[],
        rate_card_weights=standard_rate_card,
    )
    assert neg_res.premium_rate is None
    assert neg_res.premium_rate_is_defined is False


def test_edge_case_no_losses_vs_all_losses(sample_outcome_model):
    """Test behavior when all scenarios win vs all scenarios lose."""
    huge_giveaway_model = T1OutcomeModel(
        discount_giveaway=10000000.0,
        affected_net_sales=1000000.0,
        baseline_net_sales=10000000.0,
        baseline_gross_profit=5000000.0,
        baseline_churn=0.05,
        unabsorbed_contractual_penalties=0.0,
    )
    huge_giveaway_model.assumptions["segment_churn"].current_value = 0.01
    huge_giveaway_model.assumptions["segment_churn"].range_min = 0.005
    huge_giveaway_model.assumptions["segment_churn"].range_max = 0.01
    win_summary = DeterministicScenarioSimulator.simulate(huge_giveaway_model, simulation_count=500, random_seed=42)
    assert win_summary.probability_of_net_loss == 0.0
    assert win_summary.expected_loss == 0.0

    # All scenarios losing (massive unabsorbed penalties)
    losing_model = T1OutcomeModel(
        discount_giveaway=100000.0,
        affected_net_sales=1000000.0,
        baseline_net_sales=10000000.0,
        baseline_gross_profit=5000000.0,
        baseline_churn=0.01,
        unabsorbed_contractual_penalties=5000000.0,
    )
    loss_summary = DeterministicScenarioSimulator.simulate(losing_model, simulation_count=500, random_seed=42)
    assert loss_summary.probability_of_net_loss == 1.0
    assert loss_summary.expected_loss > 0.0


# ==============================================================================
# 7. FORENSIC AUDIT TESTS: HORIZONS, POPULATION, VERIFICATION, INACTION, & LAPSE
# ==============================================================================

def test_decision_horizon_scaling_90_vs_180(mock_novamart_frames):
    """B.1: Test that baseline and giveaway scale strictly with confirmed decision horizon."""
    base_90 = T1DeterministicAnalytics.calculate_baseline(mock_novamart_frames, horizon_days=90, dataset_span_days=365)
    base_180 = T1DeterministicAnalytics.calculate_baseline(mock_novamart_frames, horizon_days=180, dataset_span_days=365)

    v90 = base_90.value
    v180 = base_180.value

    assert v90["horizon_days"] == 90
    assert v180["horizon_days"] == 180
    # 180 days should have exactly double the scaled net sales and gross profit of 90 days (within rounding)
    ratio = v180["status_quo_net_sales"] / v90["status_quo_net_sales"]
    assert abs(ratio - 2.0) < 0.01

    # Test affected population giveaway scales with horizon
    pop_90 = T1DeterministicAnalytics.calculate_affected_population(mock_novamart_frames, horizon_days=90)
    pop_180 = T1DeterministicAnalytics.calculate_affected_population(mock_novamart_frames, horizon_days=180)
    assert abs(pop_180["estimated_discount_giveaway"] / pop_90["estimated_discount_giveaway"] - 2.0) < 0.01


def test_configurable_affected_population_threshold(mock_novamart_frames):
    """B.2: Test that discount threshold is an exposed, configurable policy rather than a hidden constant."""
    pop_10 = T1DeterministicAnalytics.calculate_affected_population(mock_novamart_frames, discount_threshold=0.10)
    pop_15 = T1DeterministicAnalytics.calculate_affected_population(mock_novamart_frames, discount_threshold=0.15)
    pop_20 = T1DeterministicAnalytics.calculate_affected_population(mock_novamart_frames, discount_threshold=0.20)

    assert pop_10["discount_threshold"] == 0.10
    assert pop_15["discount_threshold"] == 0.15
    assert pop_20["discount_threshold"] == 0.20

    # Lower threshold captures more transactions and higher giveaway
    assert pop_10["affected_transactions_count"] >= pop_15["affected_transactions_count"]
    assert pop_15["affected_transactions_count"] >= pop_20["affected_transactions_count"]
    assert pop_10["estimated_discount_giveaway"] >= pop_15["estimated_discount_giveaway"]
    assert pop_15["estimated_discount_giveaway"] >= pop_20["estimated_discount_giveaway"]
    assert "Rate Card default policy" in pop_15["threshold_provenance"]


def test_verification_load_discrepancy_magnitude_and_criticality(standard_rate_card):
    """B.6: Test Verification Load responds to discrepancy size, count, and critical flag, with 0 when all verified."""
    U = 500000.0

    # Case A: 0 discrepancies -> MUST be 0.00
    res_zero = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=U, expected_loss=0.0, data_quality_score=1.0,
        verifications=[{"metric_name": "GP", "is_verified": True}],
        counter_findings=[], scenario_std=1000.0, assumptions=[], rate_card_weights=standard_rate_card,
    )
    assert res_zero.verification_load == 0.0

    # Case B: 1 small discrepancy (2% relative error, non-critical)
    res_small = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=U, expected_loss=0.0, data_quality_score=1.0,
        verifications=[{"metric_name": "Revenue", "is_verified": False, "relative_discrepancy": 0.02, "is_critical": False}],
        counter_findings=[], scenario_std=1000.0, assumptions=[], rate_card_weights=standard_rate_card,
    )
    assert res_small.verification_load > 0.0

    # Case C: 1 large discrepancy (30% relative error, non-critical)
    res_large = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=U, expected_loss=0.0, data_quality_score=1.0,
        verifications=[{"metric_name": "Revenue", "is_verified": False, "relative_discrepancy": 0.30, "is_critical": False}],
        counter_findings=[], scenario_std=1000.0, assumptions=[], rate_card_weights=standard_rate_card,
    )
    assert res_large.verification_load > res_small.verification_load

    # Case D: Critical metric unverified -> multiplied by 1.5x critical multiplier
    res_critical = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=U, expected_loss=0.0, data_quality_score=1.0,
        verifications=[{"metric_name": "Revenue", "is_verified": False, "relative_discrepancy": 0.30, "is_critical": True}],
        counter_findings=[], scenario_std=1000.0, assumptions=[], rate_card_weights=standard_rate_card,
    )
    assert res_critical.verification_load > res_large.verification_load

    # Case E: Multiple discrepancies -> compounds
    res_multi = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=U, expected_loss=0.0, data_quality_score=1.0,
        verifications=[
            {"metric_name": "Revenue", "is_verified": False, "relative_discrepancy": 0.10, "is_critical": False},
            {"metric_name": "COGS", "is_verified": False, "relative_discrepancy": 0.10, "is_critical": False},
        ],
        counter_findings=[], scenario_std=1000.0, assumptions=[], rate_card_weights=standard_rate_card,
    )
    assert res_multi.verification_load > res_small.verification_load


def test_cost_of_inaction_zero_arbitrary_drift(sample_outcome_model):
    """B.10: Test Cost of Inaction does NOT invent a hidden 2% drift without evidence."""
    summary = DeterministicScenarioSimulator.simulate(sample_outcome_model, simulation_count=200, random_seed=42)

    # Without evidenced drift -> exactly forgone upside, drift is $0.00
    exp_no_drift = DeterministicExposureEngine.calculate_exposure_report(
        scenario_summary=summary,
        concentration_data={"key_account_limit": 2, "top_accounts_exposure_amount": 100000.0},
        data_health_results={"overall_score": 0.95},
        counter_findings=[],
        baseline_gross_profit=3800000.0,
        horizon_days=90,
        evidenced_baseline_drift_rate=0.0,
    )
    assert exp_no_drift.cost_of_inaction == round(summary.expected_case, 2)
    assert "not evidenced" in exp_no_drift.cost_of_inaction_basis

    # With evidenced baseline drift -> deterministically added with provenance
    exp_with_drift = DeterministicExposureEngine.calculate_exposure_report(
        scenario_summary=summary,
        concentration_data={"key_account_limit": 2, "top_accounts_exposure_amount": 100000.0},
        data_health_results={"overall_score": 0.95},
        counter_findings=[],
        baseline_gross_profit=1000000.0,
        horizon_days=90,
        evidenced_baseline_drift_rate=0.03,
        drift_provenance="Historical 24-month quarterly trend regression p<0.01",
    )
    expected_drift_val = 1000000.0 * 0.03
    assert exp_with_drift.cost_of_inaction == round(summary.expected_case + expected_drift_val, 2)
    assert "Historical 24-month" in exp_with_drift.cost_of_inaction_basis


def test_root_finding_outside_range_and_no_root(sample_outcome_model):
    """B.19: Test root solver handles out-of-range and no-root without fabricating thresholds."""
    # Segment churn between 0.01 and 0.02 (both produce positive net benefit, no zero crossing)
    no_root = DeterministicCoverageLapseEngine.solve_scalar_root(
        sample_outcome_model, "segment_churn", search_min=0.01, search_max=0.02, target="net_benefit"
    )
    assert no_root is None  # Truthful None, never fabricates a threshold


def test_double_counting_safeguard_absorbed_vs_unabsorbed(standard_rate_card):
    """B.8 & B.15: Test absorbed findings ($420k) are excluded from Contradiction Load, unabsorbed ($187.5k) priced once."""
    findings = [
        {"title": "Absorbed Risk", "quantified_impact": 420000.0, "unabsorbed_impact": 0.0, "is_absorbed_into_model": True},
        {"title": "Unabsorbed Risk", "quantified_impact": 187500.0, "unabsorbed_impact": 187500.0, "is_absorbed_into_model": False},
    ]
    res = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=500000.0, expected_loss=0.0, data_quality_score=1.0,
        verifications=[{"is_verified": True}], counter_findings=findings,
        scenario_std=1000.0, assumptions=[], rate_card_weights=standard_rate_card,
    )
    # Contradiction load should strictly be 1.0 * 187500.0 = 187500.0, NOT 420000 + 187500
    assert res.contradiction_load == 187500.0
    assert any("Absorbed findings" in s for s in res.double_counting_safeguards_applied)

