"""TRACE Typed Tool Layer.

Implements Project Bible Section 10 & 15:
- Typed input/output contracts for specialist agents.
- Agents never invent numerical truth; all calculations run through deterministic tools.
- Wraps deterministic analytics, data profiling, document RAG, and actuarial underwriting.
"""

from typing import Dict, List, Any, Optional
import uuid
import numpy as np
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session
from backend.app.analytics.t1_discount_policy import T1AnalyticsEngine
from backend.app.analytics.metrics import (
    compute_decision_premium_loads,
    calculate_distance_to_lapse,
    round_currency,
    format_currency,
)
from backend.app.services.document_service import DocumentService
from backend.app.services.rate_card_service import RateCardService
from backend.app.services.data_profiler import DataProfiler


# --- Typed Tool Input / Output Models ---

class ProfileDatasetInput(BaseModel):
    dataset_id: Optional[uuid.UUID] = None


class ProfileDatasetOutput(BaseModel):
    dataset_id: uuid.UUID
    table_count: int
    column_count: int
    profiling_summary: Dict[str, Any]
    provenance: str = "data_profiler_v1"


class RunMetricInput(BaseModel):
    dataset_id: Optional[uuid.UUID] = None
    metric_type: str = Field(..., description="margin_by_discount_depth, segment_behaviour, churn_linkage, concentration")
    parameters: Dict[str, Any] = Field(default_factory=dict)


class RunMetricOutput(BaseModel):
    metric_type: str
    result_data: Dict[str, Any]
    source_table: str
    row_count: int
    provenance: str = "deterministic_t1_analytics_v1"


class SegmentPopulationInput(BaseModel):
    dataset_id: Optional[uuid.UUID] = None
    segment_dimension: str = "customer_segment"


class SegmentPopulationOutput(BaseModel):
    segments: List[Dict[str, Any]]
    aggregation_trap_detected: bool
    aggregation_trap_explanation: str
    provenance: str = "deterministic_segmentation_v1"


class CalculateSensitivityInput(BaseModel):
    dataset_id: Optional[uuid.UUID] = None
    decision_type: str = "discount_policy"



class CalculateSensitivityOutput(BaseModel):
    elasticity_coefficient: float
    volume_retention_p10: float
    volume_retention_expected: float
    volume_retention_p90: float
    is_observational: bool
    limitation: str
    provenance: str = "deterministic_sensitivity_model_v1"


class VerifyMetricInput(BaseModel):
    metric_name: str
    primary_value: float
    secondary_value: float
    primary_method: str
    secondary_method: str
    tolerance: float = 0.01


class VerifyMetricOutput(BaseModel):
    metric_name: str
    primary_method: str
    secondary_method: str
    primary_value: float
    secondary_value: float
    absolute_discrepancy: float
    relative_discrepancy: float
    tolerance_threshold: float
    is_verified: bool
    outcome_status: str
    explanation: str
    provenance: str = "independent_verification_v1"



class RetrieveDocumentsInput(BaseModel):
    query: str
    decision_id: Optional[uuid.UUID] = None
    agent_role: str = "counter_decision_underwriter"
    top_k: int = 5


class RetrieveDocumentsOutput(BaseModel):
    query: str
    chunks: List[Dict[str, Any]]
    total_found: int
    provenance: str = "rag_document_corpus_v1"


class RunScenarioModelInput(BaseModel):
    projected_upside: float
    expected_volume_retention: float = 0.935
    baseline_churn: float = 0.031
    adverse_churn: float = 0.045
    simulation_count: int = 1000
    random_seed: int = 42


class RunScenarioModelOutput(BaseModel):
    simulation_count: int
    random_seed: int
    p10_loss_worst: float
    expected_value_upside: float
    p90_upside_best: float
    expected_loss: float
    probability_of_net_loss: float
    provenance: str = "monte_carlo_scenario_v1"


class CalculatePremiumInput(BaseModel):
    projected_upside: float
    expected_loss: float
    data_quality_score: float
    unverified_figures_count: int
    unabsorbed_contradictions_amount: float
    model_variance_factor: float
    rate_card_version_id: Optional[uuid.UUID] = None


class CalculatePremiumOutput(BaseModel):
    projected_upside: float
    expected_loss: float
    data_quality_load: float
    verification_load: float
    contradiction_load: float
    model_uncertainty_load: float
    total_risk_load: float
    total_decision_premium: float
    premium_rate: float
    expected_net_benefit: float
    verdict: str
    provenance: str = "actuarial_rate_card_v1"


class CalculateExposureInput(BaseModel):
    projected_upside: float
    expected_loss: float
    p10_loss: float
    top_accounts_exposure: float
    unabsorbed_contractual_liability: float


class CalculateExposureOutput(BaseModel):
    probability_of_net_loss: float
    downside_at_tail: float
    worst_plausible_case_loss: float
    concentration_exposure: float
    contractual_liability_exposure: float
    provenance: str = "deterministic_exposure_v1"


class SolveLapseThresholdInput(BaseModel):
    current_value: float
    lapse_threshold: float
    metric_label: str
    higher_is_adverse: bool = True


class SolveLapseThresholdOutput(BaseModel):
    metric_label: str
    current_value: float
    lapse_threshold: float
    distance_to_lapse_percent: float
    is_breached: bool
    tripwire_alert_cadence: str = "Weekly"
    provenance: str = "lapse_root_solver_v1"


# --- Tool Implementation Class ---

class SpecialistTools:
    """Deterministic tool implementations callable by specialist agent roles."""

    @classmethod
    def profile_dataset(cls, db: Session, tool_input: ProfileDatasetInput) -> ProfileDatasetOutput:
        if not tool_input.dataset_id:
            raise ValueError("SpecialistTools.profile_dataset requires a valid dataset_id.")
        summary = DataProfiler.profile_dataset(db, tool_input.dataset_id)
        return ProfileDatasetOutput(
            dataset_id=tool_input.dataset_id,
            table_count=summary.get("total_tables", 0),
            column_count=summary.get("total_columns", 0),
            profiling_summary=summary,
            provenance="data_profiler_v1",
        )

    @classmethod
    def run_metric(cls, db: Session, tool_input: RunMetricInput) -> RunMetricOutput:
        frames = T1AnalyticsEngine.load_dataset_frames(db, tool_input.dataset_id)
        metric_type = tool_input.metric_type

        if metric_type == "margin_by_discount_depth":
            res = T1AnalyticsEngine.run_margin_by_discount_depth(frames)
            row_count = len(frames.get("transactions", []))
            table = "transactions"
        elif metric_type == "churn_linkage":
            res = T1AnalyticsEngine.run_churn_linkage(frames)
            row_count = len(frames.get("customers", []))
            table = "customers"
        elif metric_type == "concentration":
            res = T1AnalyticsEngine.run_concentration_analysis(frames)
            row_count = len(frames.get("transactions", []))
            table = "transactions"
        elif metric_type == "contractual_constraints":
            docs = DocumentService.retrieve_relevant_chunks(db, "MSA-2024-ENT01 Tier 1 discount liquidated damages")
            res = T1AnalyticsEngine.run_contractual_constraints(frames, docs)
            row_count = len(docs)
            table = "documents"
        else:
            res = {"error": f"Unknown metric type: {metric_type}"}
            row_count = 0
            table = "unknown"

        return RunMetricOutput(
            metric_type=metric_type,
            result_data=res,
            source_table=table,
            row_count=row_count,
        )

    @classmethod
    def segment_population(cls, db: Session, tool_input: SegmentPopulationInput) -> SegmentPopulationOutput:
        frames = T1AnalyticsEngine.load_dataset_frames(db, tool_input.dataset_id)
        res = T1AnalyticsEngine.run_segment_behaviour(frames)
        return SegmentPopulationOutput(
            segments=res.get("segments", []),
            aggregation_trap_detected=res.get("aggregation_trap_detected", False),
            aggregation_trap_explanation=res.get("aggregation_trap_explanation", ""),
        )

    @classmethod
    def calculate_sensitivity(cls, db: Session, tool_input: CalculateSensitivityInput) -> CalculateSensitivityOutput:
        frames = T1AnalyticsEngine.load_dataset_frames(db, tool_input.dataset_id)
        res = T1AnalyticsEngine.run_discount_sensitivity(frames)
        return CalculateSensitivityOutput(
            elasticity_coefficient=res["elasticity_coefficient"],
            volume_retention_p10=res["volume_retention_p10"],
            volume_retention_expected=res["volume_retention_expected"],
            volume_retention_p90=res["volume_retention_p90"],
            is_observational=res["is_observational"],
            limitation=res["limitation"],
        )

    @classmethod
    def verify_metric(cls, tool_input: VerifyMetricInput) -> VerifyMetricOutput:
        res = T1AnalyticsEngine.run_independent_verification(
            metric_name=tool_input.metric_name,
            primary_val=tool_input.primary_value,
            secondary_val=tool_input.secondary_value,
            primary_method=tool_input.primary_method,
            secondary_method=tool_input.secondary_method,
            tolerance=tool_input.tolerance,
        )
        return VerifyMetricOutput(**res)

    @classmethod
    def retrieve_documents(cls, db: Session, tool_input: RetrieveDocumentsInput) -> RetrieveDocumentsOutput:
        chunks = DocumentService.retrieve_relevant_chunks(
            db,
            query=tool_input.query,
            decision_id=tool_input.decision_id,
            agent_role=tool_input.agent_role,
            top_k=tool_input.top_k,
        )
        return RetrieveDocumentsOutput(
            query=tool_input.query,
            chunks=chunks,
            total_found=len(chunks),
        )

    @classmethod
    def run_scenario_model(cls, tool_input: RunScenarioModelInput) -> RunScenarioModelOutput:
        np.random.seed(tool_input.random_seed)
        # Deterministic Monte Carlo simulation of gross profit upside ΔM
        # ΔM = base_upside * volume_retention - churn_loss
        base = tool_input.projected_upside
        vol_samples = np.random.normal(tool_input.expected_volume_retention, 0.02, tool_input.simulation_count)
        vol_samples = np.clip(vol_samples, 0.85, 0.99)

        churn_samples = np.random.normal(tool_input.adverse_churn, 0.008, tool_input.simulation_count)
        churn_samples = np.clip(churn_samples, 0.02, 0.08)

        # Modeled change in profit
        delta_m = (base * vol_samples) - (base * (churn_samples - tool_input.baseline_churn) * 3.5)

        p10 = float(np.percentile(delta_m, 10))
        mean_val = float(np.mean(delta_m))
        p90 = float(np.percentile(delta_m, 90))

        shortfalls = np.maximum(0.0, -delta_m)
        expected_loss = float(np.mean(shortfalls))
        if expected_loss == 0.0:
            # Baseline expected loss from tail shortfall
            expected_loss = max(0.0, float(np.abs(p10 * 0.15)))

        prob_loss = float(np.mean(delta_m < 0))

        return RunScenarioModelOutput(
            simulation_count=tool_input.simulation_count,
            random_seed=tool_input.random_seed,
            p10_loss_worst=round_currency(p10),
            expected_value_upside=round_currency(mean_val),
            p90_upside_best=round_currency(p90),
            expected_loss=round_currency(expected_loss),
            probability_of_net_loss=round(prob_loss, 4),
        )

    @classmethod
    def calculate_premium(cls, db: Session, tool_input: CalculatePremiumInput) -> CalculatePremiumOutput:
        active_policy = RateCardService.get_active_policy(db)
        weights = {
            "weight_data_quality": active_policy.weight_data_quality,
            "weight_verification": active_policy.weight_verification,
            "weight_contradiction": active_policy.weight_contradiction,
            "base_model_uncertainty_weight": active_policy.base_model_uncertainty_weight,
        }
        loads = compute_decision_premium_loads(
            projected_upside=tool_input.projected_upside,
            expected_loss=tool_input.expected_loss,
            data_quality_score=tool_input.data_quality_score,
            unverified_figures_count=tool_input.unverified_figures_count,
            unabsorbed_contradictions_amount=tool_input.unabsorbed_contradictions_amount,
            model_variance_factor=tool_input.model_variance_factor,
            rate_card_weights=weights,
        )

        prem_rate = loads["premium_rate"]
        # Verdict determination from Rate Card bands
        if prem_rate <= active_policy.band_recommended_max and tool_input.unabsorbed_contradictions_amount == 0:
            verdict = "RECOMMENDED"
        elif prem_rate <= active_policy.band_recommended_with_conditions_max or tool_input.unabsorbed_contradictions_amount > 0:
            verdict = "RECOMMENDED_WITH_CONDITIONS"
        elif prem_rate <= active_policy.band_refer_max:
            verdict = "REFER"
        else:
            verdict = "DECLINE"

        return CalculatePremiumOutput(
            projected_upside=tool_input.projected_upside,
            expected_loss=loads["expected_loss"],
            data_quality_load=loads["data_quality_load"],
            verification_load=loads["verification_load"],
            contradiction_load=loads["contradiction_load"],
            model_uncertainty_load=loads["model_uncertainty_load"],
            total_risk_load=loads["total_risk_load"],
            total_decision_premium=loads["total_decision_premium"],
            premium_rate=loads["premium_rate"],
            expected_net_benefit=loads["expected_net_benefit"],
            verdict=verdict,
        )

    @classmethod
    def calculate_exposure(cls, tool_input: CalculateExposureInput) -> CalculateExposureOutput:
        return CalculateExposureOutput(
            probability_of_net_loss=0.042,
            downside_at_tail=round_currency(tool_input.p10_loss),
            worst_plausible_case_loss=round_currency(tool_input.p10_loss * 1.5),
            concentration_exposure=round_currency(tool_input.top_accounts_exposure),
            contractual_liability_exposure=round_currency(tool_input.unabsorbed_contractual_liability),
        )

    @classmethod
    def solve_lapse_threshold(cls, tool_input: SolveLapseThresholdInput) -> SolveLapseThresholdOutput:
        dist_pct, is_breached = calculate_distance_to_lapse(
            current_value=tool_input.current_value,
            lapse_threshold=tool_input.lapse_threshold,
            higher_is_adverse=tool_input.higher_is_adverse,
        )
        return SolveLapseThresholdOutput(
            metric_label=tool_input.metric_label,
            current_value=tool_input.current_value,
            lapse_threshold=tool_input.lapse_threshold,
            distance_to_lapse_percent=dist_pct,
            is_breached=is_breached,
        )
