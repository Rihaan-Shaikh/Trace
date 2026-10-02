"""TRACE Decision Sandbox API Endpoints.

Implements live what-if re-quoting (Project Bible Section 18):
- Modifying assumptions produces a distinct scenario run without destroying baseline state.
- Executes full deterministic underwriting engine (Scenario Simulator -> Risk Loads -> Exposure -> Lapse -> Verdict).
- Strictly NO LLM calls in the numerical loop.
- Calculates deterministic before / after diffs and exact coverage lapse latching.
"""

from typing import Dict, List, Any, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from backend.app.db.session import get_db
from backend.app.core.config import settings
from backend.app.models.decision import Decision, InvestigationPlan
from backend.app.models.underwriting import (
    ScenarioRun,
    ScenarioAssumption,
    ScenarioResult,
    DecisionPremium,
    ExposureReport,
    CoverageLapseCondition,
    UnderwritingVerdict,
)
from backend.app.models.enums import UnderwritingVerdictType, DataSufficiencyVerdict
from backend.app.schemas.underwriting import (
    ReQuoteRequest,
    SandboxReQuoteResponse,
    SupportedAssumptionInfo,
    SandboxChangedAssumption,
    SandboxComparisonMetric,
    ScenarioRunResponse,
    DecisionPremiumResponse,
    ExposureReportResponse,
    UnderwritingVerdictResponse,
    CoverageLapseConditionResponse,
    ScenarioAssumptionResponse,
)
from backend.app.services.rate_card_service import RateCardService
from backend.app.services.ledger_service import LedgerService
from backend.app.underwriting.outcome_model import T1OutcomeModel
from backend.app.underwriting.scenario_engine import DeterministicScenarioSimulator
from backend.app.underwriting.risk_loads import DeterministicRiskLoadEngine
from backend.app.underwriting.exposure import DeterministicExposureEngine
from backend.app.underwriting.coverage_lapse import DeterministicCoverageLapseEngine
from backend.app.underwriting.verdict import DeterministicVerdictEngine

router = APIRouter()


@router.get("/decisions/{decision_id}/supported-assumptions", response_model=List[SupportedAssumptionInfo])
def get_supported_assumptions(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Retrieves valid adjustable assumptions supported by the decision's template and baseline."""
    decision = db.get(Decision, decision_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision '{decision_id}' not found.",
        )

    # Locate baseline scenario run
    baseline_run = db.scalar(
        select(ScenarioRun).where(
            ScenarioRun.decision_id == decision.id,
            ScenarioRun.is_baseline == True,
        )
    )

    baseline_assumps = {}
    if baseline_run:
        for a in baseline_run.scenario_assumptions:
            baseline_assumps[a.parameter_name] = a

    # T1 Discount Cessation Template assumptions
    t1_specs = [
        {
            "name": "segment_churn",
            "display_name": "Segment Customer Churn Rate",
            "default_baseline": 0.045,
            "unit": "ratio",
            "range_min": 0.010,
            "range_max": 0.120,
            "step": 0.002,
            "description": "Estimated quarterly customer attrition rate resulting from discount cessation.",
        },
        {
            "name": "volume_retention",
            "display_name": "Expected Volume Retention",
            "default_baseline": 0.935,
            "unit": "ratio",
            "range_min": 0.800,
            "range_max": 0.995,
            "step": 0.005,
            "description": "Proportion of pre-policy order volume retained by continuing wholesale accounts.",
        },
        {
            "name": "unabsorbed_penalties",
            "display_name": "Contractual Penalty Liabilities",
            "default_baseline": 0.0,
            "unit": "USD",
            "range_min": 0.0,
            "range_max": 250000.0,
            "step": 5000.0,
            "description": "Contractual liquidated damages enforceable if contracted accounts are terminated unilaterally.",
        },
    ]

    result = []
    for spec in t1_specs:
        b_obj = baseline_assumps.get(spec["name"])
        base_val = b_obj.parameter_value if b_obj else spec["default_baseline"]
        result.append(
            SupportedAssumptionInfo(
                name=spec["name"],
                display_name=spec["display_name"],
                current_value=base_val,
                baseline_value=base_val,
                unit=spec["unit"],
                range_min=spec["range_min"],
                range_max=spec["range_max"],
                step=spec["step"],
                description=spec["description"],
                is_modified=False,
            )
        )

    return result


@router.get("/decisions/{decision_id}/versions", response_model=List[ScenarioRunResponse])
def list_decision_scenario_versions(decision_id: uuid.UUID, db: Session = Depends(get_db)):
    """Lists all scenario run versions (baseline + sandbox what-ifs) for decision lineage tracking."""
    decision = db.get(Decision, decision_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision '{decision_id}' not found.",
        )

    runs = list(
        db.scalars(
            select(ScenarioRun)
            .where(ScenarioRun.decision_id == decision.id)
            .order_by(ScenarioRun.created_at.asc())
        ).all()
    )

    response_items = []
    for r in runs:
        item = ScenarioRunResponse(
            id=r.id,
            decision_id=r.decision_id,
            run_label=r.run_label,
            is_baseline=r.is_baseline,
            is_sandbox=r.is_sandbox,
            parent_run_id=r.parent_run_id,
            simulation_count=r.simulation_count,
            random_seed=r.random_seed,
            created_at=r.created_at,
            premium=DecisionPremiumResponse.model_validate(r.decision_premium) if r.decision_premium else None,
            exposure=ExposureReportResponse.model_validate(r.exposure_report) if r.exposure_report else None,
            verdict=UnderwritingVerdictResponse.model_validate(r.verdict) if r.verdict else None,
            lapse_conditions=[CoverageLapseConditionResponse.model_validate(lc) for lc in r.lapse_conditions],
            assumptions=[ScenarioAssumptionResponse.model_validate(a) for a in r.scenario_assumptions],
        )
        response_items.append(item)

    return response_items


@router.post("/re-quote", response_model=SandboxReQuoteResponse)
def sandbox_requote(request: ReQuoteRequest, db: Session = Depends(get_db)):
    """Executes instant deterministic re-quote with adjusted assumptions.

    Execution Pipeline (Zero LLM):
    1. Reconstructs T1OutcomeModel with adjusted parameters.
    2. Runs Seeded Monte Carlo simulation.
    3. Computes 4 separate Risk Loads calibrated by Loss History experience.
    4. Evaluates tail Exposure and Cost of Inaction.
    5. Computes Coverage Lapse thresholds and breach transitions.
    6. Evaluates Underwriting Verdict.
    7. Persists distinct ScenarioRun linked to parent.
    8. Computes deterministic Before / After diff and comparison.
    """
    decision = db.get(Decision, request.decision_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision '{request.decision_id}' not found.",
        )

    # 1. Retrieve baseline run
    baseline_run = db.scalar(
        select(ScenarioRun).where(
            ScenarioRun.decision_id == decision.id,
            ScenarioRun.is_baseline == True,
        ).order_by(desc(ScenarioRun.created_at))
    )
    if not baseline_run or not baseline_run.decision_premium:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Decision '{decision.id}' has no baseline underwriting premium. "
                "Baseline underwriting must be completed before sandbox re-quoting."
            ),
        )

    baseline_prem = baseline_run.decision_premium
    baseline_exp = baseline_run.exposure_report
    baseline_verd = baseline_run.verdict
    baseline_lapses = baseline_run.lapse_conditions
    baseline_assumps = {a.parameter_name: a for a in baseline_run.scenario_assumptions}

    # Identify parent run
    parent_id = request.parent_run_id or baseline_run.id
    parent_run = db.get(ScenarioRun, parent_id) or baseline_run

    # 2. Extract baseline financial anchors
    horizon_days = max(1, int(decision.horizon_days or 90))
    horizon_scaling = horizon_days / 365.0
    vol_base = getattr(baseline_assumps.get("volume_retention"), "parameter_value", 0.935)
    base_giveaway = baseline_prem.projected_upside / max(0.01, vol_base)

    # 3. Resolve user-supplied adjustments
    vol_val = float(request.assumption_adjustments.get("volume_retention", vol_base))
    churn_val = float(
        request.assumption_adjustments.get(
            "segment_churn",
            request.assumption_adjustments.get(
                "churn_rate", getattr(baseline_assumps.get("segment_churn"), "parameter_value", 0.045)
            ),
        )
    )
    pen_val = float(
        request.assumption_adjustments.get(
            "unabsorbed_penalties",
            getattr(baseline_assumps.get("unabsorbed_penalties"), "parameter_value", 0.0),
        )
    )

    # 4. Construct outcome model
    outcome_model = T1OutcomeModel(
        discount_giveaway=base_giveaway,
        affected_net_sales=4500000.0 * horizon_scaling,
        baseline_net_sales=18500000.0 * horizon_scaling,
        baseline_gross_profit=3800000.0 * horizon_scaling,
        baseline_churn=0.031,
        unabsorbed_contractual_penalties=pen_val,
        horizon_days=horizon_days,
    )
    if "volume_retention" in outcome_model.assumptions:
        outcome_model.assumptions["volume_retention"].current_value = vol_val
    if "segment_churn" in outcome_model.assumptions:
        outcome_model.assumptions["segment_churn"].current_value = churn_val
    if "unabsorbed_penalties" in outcome_model.assumptions:
        outcome_model.assumptions["unabsorbed_penalties"].current_value = pen_val

    # 5. Deterministic Monte Carlo simulation
    scen_summary = DeterministicScenarioSimulator.simulate(
        outcome_model=outcome_model,
        simulation_count=1000,
        random_seed=42,
    )

    # 6. Actuarial Risk Loads with real ledger recalibration
    active_policy = RateCardService.get_active_policy(db)
    weights = {
        "weight_data_quality": active_policy.weight_data_quality,
        "weight_verification": active_policy.weight_verification,
        "weight_contradiction": active_policy.weight_contradiction,
        "base_model_uncertainty_weight": active_policy.base_model_uncertainty_weight,
    }
    decision_class = decision.template.category if decision.template else "pricing"
    recal = LedgerService.calculate_class_recalibration(db, decision_class)

    risk_loads = DeterministicRiskLoadEngine.calculate_loads(
        projected_upside=scen_summary.expected_case,
        expected_loss=scen_summary.expected_loss,
        data_quality_score=0.96,
        verifications=[],
        counter_findings=[],
        scenario_std=scen_summary.std_dev,
        assumptions=[a.model_dump() for a in outcome_model.assumptions.values()],
        rate_card_weights=weights,
        loss_history_count=recal.logged_decisions_count,
        loss_history_credibility_k=settings.LEDGER_CREDIBILITY_K,
        experience_factor=recal.experience_factor,
    )

    # 7. Exposure report
    exposure_data = DeterministicExposureEngine.calculate_exposure_report(
        scenario_summary=scen_summary,
        concentration_data={"top_10_percent_revenue_share": 38.5},
        data_health_results={"overall_score": 0.96},
        counter_findings=[],
        baseline_gross_profit=3800000.0 * horizon_scaling,
        horizon_days=horizon_days,
        evidenced_baseline_drift_rate=0.0,
    )

    # 8. Coverage lapse conditions
    bands = {
        "band_recommended_max": active_policy.band_recommended_max,
        "band_recommended_with_conditions_max": active_policy.band_recommended_with_conditions_max,
        "band_refer_max": active_policy.band_refer_max,
    }
    lapse_conditions = DeterministicCoverageLapseEngine.generate_all_lapse_conditions(
        outcome_model=outcome_model,
        concentration_data={"top_10_percent_revenue_share": 38.5},
        data_health_score=0.96,
        horizon_days=horizon_days,
        unabsorbed_contradictions=pen_val,
    )

    # 9. Underwriting Verdict
    plan = db.scalar(
        select(InvestigationPlan)
        .where(InvestigationPlan.decision_id == decision.id)
        .order_by(desc(InvestigationPlan.created_at))
    )
    sufficiency = plan.sufficiency_verdict if plan else DataSufficiencyVerdict.SUFFICIENT
    verdict_res = DeterministicVerdictEngine.evaluate_verdict(
        data_sufficiency_verdict=sufficiency,
        verifications=[],
        lapse_conditions=lapse_conditions,
        premium_rate=risk_loads.premium_rate,
        projected_upside=scen_summary.expected_case,
        unabsorbed_contradictions_amount=pen_val,
        rate_card_bands=bands,
    )

    # 10. Latching logic: is coverage lapsed?
    is_lapsed = any(lc.is_breached for lc in lapse_conditions) or (
        verdict_res.verdict == UnderwritingVerdictType.DECLINE
    )
    coverage_state = "COVERAGE_LAPSED" if is_lapsed else "COVERED"

    # 11. Persist distinct ScenarioRun
    sandbox_run = ScenarioRun(
        decision_id=decision.id,
        run_label=request.sandbox_label,
        is_baseline=False,
        is_sandbox=True,
        parent_run_id=parent_run.id,
        simulation_count=1000,
        random_seed=42,
    )
    db.add(sandbox_run)
    db.flush()

    # Persist assumptions
    saved_assumptions = []
    for a_name, a_obj in outcome_model.assumptions.items():
        base_a = baseline_assumps.get(a_name)
        base_v = base_a.parameter_value if base_a else a_obj.baseline_value
        is_mod = (
            a_name in request.assumption_adjustments
            or (a_name == "segment_churn" and "churn_rate" in request.assumption_adjustments)
        )
        s_assump = ScenarioAssumption(
            scenario_run_id=sandbox_run.id,
            parameter_name=a_obj.name,
            parameter_value=a_obj.current_value,
            baseline_value=base_v,
            unit=a_obj.unit,
            is_modified_in_sandbox=is_mod,
            assumption_type=a_obj.assumption_type,
            range_min=a_obj.range_min,
            range_max=a_obj.range_max,
            source="user-supplied" if is_mod else a_obj.source,
            confidence_basis=f"User modified in Sandbox: {a_obj.current_value}" if is_mod else a_obj.confidence_basis,
        )
        db.add(s_assump)
        saved_assumptions.append(s_assump)

    # Persist financial results
    scen_res = ScenarioResult(
        scenario_run_id=sandbox_run.id,
        projected_upside=scen_summary.expected_case,
        expected_loss=scen_summary.expected_loss,
        p10_tail_outcome=scen_summary.p10,
        tail_average_loss=scen_summary.tail_average_loss,
        worst_plausible_loss=scen_summary.worst_plausible_case,
        probability_of_net_loss=scen_summary.probability_of_net_loss,
        cost_of_inaction=max(0.0, scen_summary.expected_case),
        distribution_quantiles=scen_summary.quantiles,
    )
    db.add(scen_res)

    prem_rec = DecisionPremium(
        decision_id=decision.id,
        scenario_run_id=sandbox_run.id,
        rate_card_version_id=active_policy.id,
        projected_upside=risk_loads.projected_upside,
        expected_loss=risk_loads.expected_loss,
        data_quality_load=risk_loads.data_quality_load,
        verification_load=risk_loads.verification_load,
        contradiction_load=risk_loads.contradiction_load,
        model_uncertainty_load=risk_loads.model_uncertainty_load,
        total_risk_load=risk_loads.total_risk_load,
        total_decision_premium=risk_loads.total_decision_premium,
        premium_rate=float(risk_loads.premium_rate) if risk_loads.premium_rate is not None else 1.0,
        expected_net_benefit=risk_loads.expected_net_benefit,
    )
    db.add(prem_rec)

    exp_rec = ExposureReport(
        decision_id=decision.id,
        scenario_run_id=sandbox_run.id,
        probability_of_net_loss=exposure_data.probability_of_net_loss,
        downside_at_tail=exposure_data.downside_at_tail,
        worst_plausible_case_loss=exposure_data.worst_plausible_case_loss,
        cost_of_inaction=exposure_data.cost_of_inaction,
        concentration_exposure_amount=exposure_data.concentration_exposure_amount,
        adverse_finding_exposure_total=exposure_data.adverse_finding_exposure_total,
    )
    db.add(exp_rec)

    saved_lapses = []
    for rank_idx, lc in enumerate(lapse_conditions, 1):
        l_rec = CoverageLapseCondition(
            decision_id=decision.id,
            scenario_run_id=sandbox_run.id,
            condition_type=lc.condition_type,
            title=lc.title,
            description=lc.description,
            metric_parameter_name=lc.metric_parameter_name,
            current_modelled_value=lc.current_modelled_value,
            lapse_threshold_value=lc.lapse_threshold_value,
            distance_to_lapse_percent=lc.distance_to_lapse_percent,
            unit=lc.unit,
            is_breached=lc.is_breached,
            priority_rank=rank_idx,
        )
        db.add(l_rec)
        saved_lapses.append(l_rec)


    verd_rec = UnderwritingVerdict(
        decision_id=decision.id,
        scenario_run_id=sandbox_run.id,
        verdict=verdict_res.verdict,
        summary_sentence=verdict_res.summary_sentence,
        conditions_list=verdict_res.conditions_list,
        exclusions_list=verdict_res.exclusions_list,
        is_valid=True,
    )
    db.add(verd_rec)

    db.commit()
    db.refresh(sandbox_run)

    # 12. Compute What Changed (changed assumptions)
    changed_assumptions = []
    for a in saved_assumptions:
        base_v = a.baseline_value or 0.0
        delta = a.parameter_value - base_v
        if abs(delta) > 1e-5:
            pct_chg = round((delta / base_v) * 100.0, 2) if abs(base_v) > 1e-6 else None
            changed_assumptions.append(
                SandboxChangedAssumption(
                    parameter_name=a.parameter_name,
                    baseline_value=round(base_v, 4),
                    new_value=round(a.parameter_value, 4),
                    unit=a.unit,
                    delta=round(delta, 4),
                    pct_change=pct_chg,
                )
            )

    # 13. Before / After comparison
    baseline_coverage = "COVERAGE_LAPSED" if any(lc.is_breached for lc in baseline_lapses) or (
        baseline_verd and baseline_verd.verdict == UnderwritingVerdictType.DECLINE
    ) else "COVERED"

    before_dict = {
        "projected_upside": baseline_prem.projected_upside,
        "expected_loss": baseline_prem.expected_loss,
        "decision_premium": baseline_prem.total_decision_premium,
        "premium_rate": baseline_prem.premium_rate,
        "tail_loss": baseline_exp.downside_at_tail if baseline_exp else 0.0,
        "probability_of_net_loss": baseline_exp.probability_of_net_loss if baseline_exp else 0.0,
        "verdict": baseline_verd.verdict.value if baseline_verd else "UNKNOWN",
        "coverage_state": baseline_coverage,
    }

    after_dict = {
        "projected_upside": prem_rec.projected_upside,
        "expected_loss": prem_rec.expected_loss,
        "decision_premium": prem_rec.total_decision_premium,
        "premium_rate": prem_rec.premium_rate,
        "tail_loss": exp_rec.downside_at_tail,
        "probability_of_net_loss": exp_rec.probability_of_net_loss,
        "verdict": verd_rec.verdict.value,
        "coverage_state": coverage_state,
    }

    comparison_dict = {
        "projected_upside": SandboxComparisonMetric(
            metric_name="Projected Upside",
            baseline_value=before_dict["projected_upside"],
            sandbox_value=after_dict["projected_upside"],
            delta=round(after_dict["projected_upside"] - before_dict["projected_upside"], 2),
            unit="USD",
        ),
        "decision_premium": SandboxComparisonMetric(
            metric_name="Decision Premium",
            baseline_value=before_dict["decision_premium"],
            sandbox_value=after_dict["decision_premium"],
            delta=round(after_dict["decision_premium"] - before_dict["decision_premium"], 2),
            unit="USD",
        ),
        "premium_rate": SandboxComparisonMetric(
            metric_name="Decision Premium Rate",
            baseline_value=before_dict["premium_rate"],
            sandbox_value=after_dict["premium_rate"],
            delta=round(after_dict["premium_rate"] - before_dict["premium_rate"], 4),
            unit="ratio",
        ),
        "probability_of_net_loss": SandboxComparisonMetric(
            metric_name="Probability of Net Loss",
            baseline_value=before_dict["probability_of_net_loss"],
            sandbox_value=after_dict["probability_of_net_loss"],
            delta=round(after_dict["probability_of_net_loss"] - before_dict["probability_of_net_loss"], 4),
            unit="ratio",
        ),
    }

    return SandboxReQuoteResponse(
        sandbox_run_id=sandbox_run.id,
        decision_id=decision.id,
        run_label=sandbox_run.run_label,
        is_baseline=False,
        is_sandbox=True,
        parent_run_id=sandbox_run.parent_run_id,
        rate_card_version=active_policy.version_str,
        scenario_seed=42,
        simulation_count=1000,
        projected_upside=prem_rec.projected_upside,
        expected_loss=prem_rec.expected_loss,
        decision_premium=prem_rec.total_decision_premium,
        premium_rate=prem_rec.premium_rate,
        expected_net_benefit=prem_rec.expected_net_benefit,
        premium=DecisionPremiumResponse.model_validate(prem_rec),
        exposure=ExposureReportResponse.model_validate(exp_rec),
        verdict=UnderwritingVerdictResponse.model_validate(verd_rec),
        lapse_conditions=[CoverageLapseConditionResponse.model_validate(lc) for lc in saved_lapses],
        coverage_state=coverage_state,

        assumptions=[ScenarioAssumptionResponse.model_validate(a) for a in saved_assumptions],
        changed_assumptions=changed_assumptions,
        before=before_dict,
        after=after_dict,
        comparison=comparison_dict,
        provenance={
            "scenario_engine": "deterministic_seeded_monte_carlo_v1",
            "risk_load_engine": "actuarial_decomposition_v1",
            "rate_card_version_id": str(active_policy.id),
            "loss_history_samples": recal.logged_decisions_count,
            "experience_factor": recal.experience_factor,
            "random_seed": 42,
        },
    )
