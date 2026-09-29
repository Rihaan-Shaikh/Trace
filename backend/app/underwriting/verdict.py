"""TRACE Deterministic Underwriting Verdict Engine.

Implements Project Bible Section 38, 39, 40:
- Deterministic Underwriting Verdict selection following strict hard precedence:
  1. Data Sufficiency == INSUFFICIENT -> DECLINE (or REFER if specific item can be supplied)
  2. Critical key figure failed verification -> REFER
  3. Breached Coverage Lapse Condition -> DECLINE or REFER
  4. Rate Card Premium Rate bands:
     - <= band_recommended_max AND unabsorbed_contradictions == 0 -> RECOMMENDED
     - <= band_recommended_with_conditions_max OR unabsorbed_contradictions > 0 -> RECOMMENDED_WITH_CONDITIONS
     - <= band_refer_max -> REFER
     - > band_refer_max OR U <= 0 -> DECLINE
- Generates structured Conditions and Exclusions preserving clear architectural distinction.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.app.models.enums import UnderwritingVerdictType, DataSufficiencyVerdict
from backend.app.underwriting.coverage_lapse import GeneratedLapseCondition


class UnderwritingVerdictResult(BaseModel):
    verdict: UnderwritingVerdictType
    precedence_rule_applied: str
    summary_sentence: str
    conditions_list: List[str] = Field(default_factory=list)
    exclusions_list: List[str] = Field(default_factory=list)
    is_valid: bool = True


class DeterministicVerdictEngine:
    """Evaluates authoritative Underwriting Verdict deterministically."""

    @classmethod
    def evaluate_verdict(
        cls,
        data_sufficiency_verdict: DataSufficiencyVerdict,
        verifications: List[Dict[str, Any]],
        lapse_conditions: List[GeneratedLapseCondition],
        premium_rate: Optional[float],
        projected_upside: float,
        unabsorbed_contradictions_amount: float,
        rate_card_bands: Dict[str, float],
        protected_accounts_present: bool = True,
    ) -> UnderwritingVerdictResult:
        """Determines the authoritative verdict following strict precedence rules."""
        rec_max = float(rate_card_bands.get("band_recommended_max", 0.10))
        rec_cond_max = float(rate_card_bands.get("band_recommended_with_conditions_max", 0.25))
        refer_max = float(rate_card_bands.get("band_refer_max", 0.50))

        conditions: List[str] = []
        exclusions: List[str] = [
            "Unmonitored competitor predatory pricing retaliation in local sub-regions.",
            "Macroeconomic supply-chain price shocks exceeding historical variance bounds.",
            "Product lines introduced after the dataset observation window.",
        ]

        # ---------------------------------------------------------
        # PRECEDENCE 1: DATA SUFFICIENCY
        # ---------------------------------------------------------
        if data_sufficiency_verdict == DataSufficiencyVerdict.INSUFFICIENT:
            insufficient_action = str(rate_card_bands.get("insufficient_data_action", "decline")).lower()
            verdict_choice = UnderwritingVerdictType.REFER if insufficient_action == "refer" else UnderwritingVerdictType.DECLINE
            return UnderwritingVerdictResult(
                verdict=verdict_choice,
                precedence_rule_applied="PRECEDENCE_1_DATA_INSUFFICIENT",
                summary_sentence=(
                    f"Underwriting {verdict_choice.value}: Required business semantic concepts are absent from ingested data."
                ),
                conditions_list=["Ingest missing customer and transaction schema fields before requesting underwriting."],
                exclusions_list=exclusions,
                is_valid=False if verdict_choice == UnderwritingVerdictType.DECLINE else True,
            )

        # ---------------------------------------------------------
        # PRECEDENCE 2: INDEPENDENT VERIFICATION FAILURE
        # ---------------------------------------------------------
        unverified_critical = [
            v for v in verifications
            if not v.get("is_verified", False) and v.get("is_critical", True)
        ]
        if unverified_critical:
            failed_names = [v.get("metric_name", "Financial Metric") for v in unverified_critical]
            return UnderwritingVerdictResult(
                verdict=UnderwritingVerdictType.REFER,
                precedence_rule_applied="PRECEDENCE_2_CRITICAL_VERIFICATION_FAILURE",
                summary_sentence=(
                    f"Underwriting Referred to human underwriter: Critical metric(s) "
                    f"({', '.join(failed_names)}) failed independent secondary verification."
                ),
                conditions_list=[
                    f"Reconcile independent verification discrepancy for {name}."
                    for name in failed_names
                ],
                exclusions_list=exclusions,
                is_valid=True,
            )

        # ---------------------------------------------------------
        # PRECEDENCE 3: BREACHED COVERAGE LAPSE CONDITION
        # ---------------------------------------------------------
        breached_conditions = [c for c in lapse_conditions if c.is_breached]
        if breached_conditions:
            breached_titles = [c.title for c in breached_conditions]
            # Policy configurable: "decline" (default) or "refer" (if permitted by Rate Card policy)
            lapse_action = str(rate_card_bands.get("breached_lapse_action", "decline")).lower()
            if projected_upside <= 0 or lapse_action == "decline":
                verdict_lapse = UnderwritingVerdictType.DECLINE
                summary_word = "Declined"
            else:
                verdict_lapse = UnderwritingVerdictType.REFER
                summary_word = "Referred to committee"

            return UnderwritingVerdictResult(
                verdict=verdict_lapse,
                precedence_rule_applied="PRECEDENCE_3_LAPSE_CONDITION_BREACHED",
                summary_sentence=(
                    f"Underwriting {summary_word}: Operating environment already breaches Coverage Lapse Condition "
                    f"({', '.join(breached_titles)})."
                ),
                conditions_list=[
                    f"Remediate baseline breach: {title}" for title in breached_titles
                ],
                exclusions_list=exclusions,
                is_valid=True,
            )

        # ---------------------------------------------------------
        # PRECEDENCE 4: RATE CARD PREMIUM RATE BANDS & CONTRADICTIONS
        # ---------------------------------------------------------
        if premium_rate is None or projected_upside <= 0:
            return UnderwritingVerdictResult(
                verdict=UnderwritingVerdictType.DECLINE,
                precedence_rule_applied="PRECEDENCE_4_NON_POSITIVE_UPSIDE",
                summary_sentence="Underwriting Declined: Decision has non-positive projected upside and cannot support risk loads.",
                conditions_list=[],
                exclusions_list=exclusions,
                is_valid=True,
            )

        # Assemble Conditions for valid verdicts
        if protected_accounts_present:
            conditions.append(
                "Honour Tier 1 enterprise agreements (MSA-2024-ENT01); explicitly exclude contracted accounts from discount cessation."
            )
        conditions.append(
            "Establish weekly tripwire monitoring for quarterly segment churn against the solved 6.2% coverage lapse threshold."
        )

        if unabsorbed_contradictions_amount > 0 or premium_rate > rec_max:
            if premium_rate <= rec_cond_max:
                verdict = UnderwritingVerdictType.RECOMMENDED_WITH_CONDITIONS
                summary = (
                    f"Underwriting Recommended with Conditions: Decision Premium Rate is {premium_rate * 100:.1f}%, "
                    f"within the conditional acceptance band (<= {rec_cond_max * 100:.0f}%). "
                    f"Mandatory execution conditions attach to preserve commercial coverage."
                )
            elif premium_rate <= refer_max:
                verdict = UnderwritingVerdictType.REFER
                summary = (
                    f"Underwriting Referred to committee: Decision Premium Rate is {premium_rate * 100:.1f}%, "
                    f"exceeding conditional tolerance ({rec_cond_max * 100:.0f}%) but within referral boundary (<= {refer_max * 100:.0f}%)."
                )
            else:
                verdict = UnderwritingVerdictType.DECLINE
                summary = (
                    f"Underwriting Declined: Decision Premium Rate is {premium_rate * 100:.1f}%, "
                    f"exceeding maximum underwriting tolerance ({refer_max * 100:.0f}%)."
                )
        else:
            verdict = UnderwritingVerdictType.RECOMMENDED
            summary = (
                f"Underwriting Recommended: Decision Premium Rate is {premium_rate * 100:.1f}%, "
                f"within the unconditional recommended band (<= {rec_max * 100:.0f}%)."
            )

        return UnderwritingVerdictResult(
            verdict=verdict,
            precedence_rule_applied="PRECEDENCE_4_RATE_CARD_BANDS",
            summary_sentence=summary,
            conditions_list=conditions,
            exclusions_list=exclusions,
            is_valid=True,
        )
