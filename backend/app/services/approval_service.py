"""TRACE Approval and Decision Record Service.

Enforces human sign-off, immutability of Decision Records, and automatic ledger entry creation upon approval.
Project Bible Section 20:
- "TRACE recommends and prices; a person binds."
- Action Approve: creates signed immutable Decision Record, writes prediction to Loss History Ledger.
- Action Modify: captures sandbox adjustments, allows re-quoting while preserving both states.
- Action Reject: records rejection reason and writes to ledger as learnable data.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from backend.app.core.errors import EntityNotFoundError, ImmutableRecordError
from backend.app.models.approval import DecisionBrief, DecisionRecord, ApprovalAction
from backend.app.models.decision import Decision
from backend.app.models.ledger import LossHistoryEntry
from backend.app.models.underwriting import ScenarioRun, DecisionPremium, ExposureReport, UnderwritingVerdict
from backend.app.models.enums import ApprovalActionType, DecisionStatus, AuditAction
from backend.app.schemas.approval import ApprovalActionRequest
from backend.app.services.audit_service import AuditService
from backend.app.services.rate_card_service import RateCardService


class ApprovalService:
    @staticmethod
    def get_brief(db: Session, decision_id: uuid.UUID) -> Optional[DecisionBrief]:
        return db.scalar(
            select(DecisionBrief).where(DecisionBrief.decision_id == decision_id)
        )

    @staticmethod
    def submit_action(
        db: Session,
        decision_id: uuid.UUID,
        request: ApprovalActionRequest,
    ) -> Optional[DecisionRecord]:
        """Submits human sign-off action: APPROVE, MODIFY, or REJECT.

        Explicit Human Actor Identity (Limitation Disclosure):
        - `request.approver_name` and `request.approver_role` are explicit human actor fields
          supplied directly by the human operator in the request payload.
        - These are NOT authenticated SSO or enterprise IAM principal identities; they represent
          the self-attested identity entered by the operator.
        - The LLM is strictly prohibited from generating, guessing, or substituting these fields.
        - The exact identity string supplied by the human operator is recorded immutably
          in the DecisionRecord and approval audit log.
        """
        decision = db.get(Decision, decision_id)
        if not decision:
            raise EntityNotFoundError("Decision", decision_id)

        brief = db.scalar(
            select(DecisionBrief).where(DecisionBrief.decision_id == decision_id)
        )
        if not brief:
            raise EntityNotFoundError("DecisionBrief", decision_id)

        # Record the explicit human action in approval audit trail
        action_log = ApprovalAction(
            decision_id=decision_id,
            action=request.action,
            performed_by=request.approver_name,
            reason_or_notes=request.notes,
            sandbox_modifications=request.sandbox_modifications,
        )
        db.add(action_log)

        if request.action == ApprovalActionType.APPROVE:
            # Check if already approved
            existing_record = db.scalar(
                select(DecisionRecord).where(DecisionRecord.decision_id == decision_id)
            )
            if existing_record:
                raise ImmutableRecordError("DecisionRecord", existing_record.id, "Decision has already been approved and bound.")

            active_policy = RateCardService.get_active_policy(db)
            target_run_id = None
            if request.sandbox_modifications and "scenario_run_id" in request.sandbox_modifications:
                try:
                    target_run_id = uuid.UUID(str(request.sandbox_modifications["scenario_run_id"]))
                except (ValueError, TypeError):
                    target_run_id = None
            scenario_run = db.get(ScenarioRun, target_run_id) if target_run_id else db.get(ScenarioRun, brief.scenario_run_id)
            if not scenario_run:
                scenario_run = db.get(ScenarioRun, brief.scenario_run_id)

            # Freeze complete snapshots
            brief_snapshot = {
                "title": brief.brief_title,
                "summary": brief.executive_summary,
                "sections": brief.sections_json,
            }
            rate_card_snapshot = {
                "version": active_policy.version_str,
                "weights": {
                    "data_quality": active_policy.weight_data_quality,
                    "verification": active_policy.weight_verification,
                    "contradiction": active_policy.weight_contradiction,
                    "model_uncertainty": active_policy.base_model_uncertainty_weight,
                },
                "bands": {
                    "recommended_max": active_policy.band_recommended_max,
                    "recommended_with_conditions_max": active_policy.band_recommended_with_conditions_max,
                    "refer_max": active_policy.band_refer_max,
                },
            }
            evidence_snapshot = {
                "evidence_count": len(decision.evidence_items),
                "calculations_count": len(decision.calculations),
                "assumptions_count": len(decision.assumptions),
            }

            # Create IMMUTABLE Decision Record bound to the human approver
            record = DecisionRecord(
                decision_id=decision_id,
                decision_brief_id=brief.id,
                approver_name=request.approver_name,
                approver_role=request.approver_role,
                action_type=ApprovalActionType.APPROVE,
                approval_notes=request.notes,
                is_immutable=True,
                brief_snapshot=brief_snapshot,
                evidence_chain_snapshot=evidence_snapshot,
                rate_card_snapshot=rate_card_snapshot,
                modifications_made=request.sandbox_modifications,
            )
            db.add(record)
            brief.is_locked = True
            decision.status = DecisionStatus.APPROVED

            # Extract scenario numbers if available
            upside = 0.0
            premium = 0.0
            prem_rate = 0.0
            tail_exp = 0.0
            verdict_str = "Recommended"
            if scenario_run:
                if scenario_run.decision_premium:
                    upside = scenario_run.decision_premium.projected_upside
                    premium = scenario_run.decision_premium.total_decision_premium
                    prem_rate = scenario_run.decision_premium.premium_rate
                if scenario_run.exposure_report:
                    tail_exp = scenario_run.exposure_report.downside_at_tail
                if scenario_run.verdict:
                    verdict_str = scenario_run.verdict.verdict.value

            # Write historical prediction to Loss History Ledger
            now = datetime.now(timezone.utc)
            validity_end = now + timedelta(days=decision.validity_window_days)
            decision_class = (decision.template.category if (decision.template and decision.template.category) else "pricing").lower()

            ledger_entry = LossHistoryEntry(
                decision_id=decision_id,
                decision_class=decision_class,
                decision_title=decision.title,
                underwritten_date=now,
                validity_end_date=validity_end,
                is_simulated=False,
                projected_upside=upside,
                decision_premium=premium,
                premium_rate=prem_rate,
                p10_tail_exposure=tail_exp,
                underwriting_verdict=verdict_str,
                human_action="Approved",
            )
            db.add(ledger_entry)
            db.commit()
            db.refresh(record)

            AuditService.log_event(
                db,
                event_type=AuditAction.DECISION_RECORD_CREATED,
                entity_type="decision_record",
                entity_id=str(record.id),
                actor=request.approver_name,
                details={"decision_id": str(decision_id), "approver_role": request.approver_role},
            )
            return record

        elif request.action == ApprovalActionType.REJECT:
            decision.status = DecisionStatus.REJECTED
            brief.is_locked = True

            # Record human rejection in Loss History Ledger per Section 20.1
            now = datetime.now(timezone.utc)
            validity_end = now + timedelta(days=decision.validity_window_days)
            decision_class = (decision.template.category if (decision.template and decision.template.category) else "pricing").lower()

            ledger_entry = LossHistoryEntry(
                decision_id=decision_id,
                decision_class=decision_class,
                decision_title=decision.title,
                underwritten_date=now,
                validity_end_date=validity_end,
                is_simulated=False,
                projected_upside=0.0,
                decision_premium=0.0,
                premium_rate=0.0,
                p10_tail_exposure=0.0,
                underwriting_verdict="Rejected by Human",
                human_action="Rejected",
            )
            db.add(ledger_entry)
            # Per Section 9: REJECT records rejection and writes to ledger, but NO approval DecisionRecord is created!
            db.commit()

            AuditService.log_event(
                db,
                event_type=AuditAction.DECISION_REJECTED,
                entity_type="decision",
                entity_id=str(decision_id),
                actor=request.approver_name,
                details={"reason": request.notes},
            )
            return None

        else:
            # Action: MODIFY
            decision.status = DecisionStatus.MODIFIED

            # Per Section 9: Fork a distinct sandbox scenario run preserving the original baseline intact
            baseline_run = db.scalar(select(ScenarioRun).where(ScenarioRun.decision_id == decision.id, ScenarioRun.is_baseline == True))
            parent_id = None
            if request.sandbox_modifications and "parent_run_id" in request.sandbox_modifications:
                try:
                    parent_id = uuid.UUID(str(request.sandbox_modifications["parent_run_id"]))
                except Exception:
                    parent_id = baseline_run.id if baseline_run else None
            elif baseline_run:
                parent_id = baseline_run.id

            sandbox_label = f"Sandbox Fork - {request.approver_name}"
            sandbox_run = ScenarioRun(
                decision_id=decision.id,
                parent_run_id=parent_id,
                run_label=sandbox_label,
                is_baseline=False,
                is_sandbox=True,
                simulation_count=1000,
                random_seed=42,
            )
            db.add(sandbox_run)
            db.commit()

            AuditService.log_event(
                db,
                event_type=AuditAction.SANDBOX_MODIFIED,
                entity_type="decision",
                entity_id=str(decision_id),
                actor=request.approver_name,
                details={"sandbox_run_id": str(sandbox_run.id), "sandbox_modifications": request.sandbox_modifications},
            )
            # Distinct new version created; original remains intact; no approved DecisionRecord bound
            return None

    @classmethod
    def export_decision_record(
        cls,
        db: Session,
        decision_id: uuid.UUID,
        record_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """Exports an immutable approved Decision Record (Project Bible Section 9).

        Reflects strictly the immutable Decision Record generated upon approval.
        Never silently reflects newer sandbox modifications.
        """
        decision = db.get(Decision, decision_id)
        if not decision:
            raise EntityNotFoundError("Decision", decision_id)

        if record_id:
            record = db.get(DecisionRecord, record_id)
            if not record or record.decision_id != decision_id:
                raise EntityNotFoundError("DecisionRecord", record_id)
        else:
            record = db.scalar(
                select(DecisionRecord)
                .where(DecisionRecord.decision_id == decision_id)
                .order_by(desc(DecisionRecord.created_at))
            )

        if not record:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail=f"Decision '{decision_id}' has not been approved into an immutable Decision Record yet. Only approved decisions can be exported.",
            )

        brief_snap = record.brief_snapshot or {}
        sections = brief_snap.get("sections", {})
        sec1 = sections.get("decision_and_verdict") or sections.get("verdict", {})
        sec2 = sections.get("decision_premium") or sections.get("premium", {})
        sec3 = sections.get("exposure_report") or sections.get("exposure", {})
        sec4 = sections.get("coverage_lapse") or sections.get("lapse_conditions", {})
        sec5 = sections.get("conditions_and_exclusions", {})
        sec6 = sections.get("scenarios_and_cost_of_inaction") or sections.get("scenarios", {})
        sec7 = sections.get("what_survived_scrutiny") or sections.get("scrutiny", {})
        sec8 = sections.get("data_health", {})
        sec9 = sections.get("verification", {})
        sec10 = sections.get("evidence_chain", {})
        sec11 = sections.get("approval_controls", {})

        return {
            "header": {
                "system": "TRACE AI Decision Underwriting Engine",
                "export_format_version": "1.0.0",
                "decision_id": str(decision.id),
                "decision_record_id": str(record.id),
                "decision_brief_id": str(record.decision_brief_id),
                "decision_class": decision.template.category if decision.template else "pricing",
                "template_code": decision.template.template_code if decision.template else "T1_DISCOUNT_POLICY",
                "decision_title": decision.title,
                "decision_question": decision.question_text,
                "dataset_id": str(decision.dataset_id) if decision.dataset_id else None,
                "created_at": record.created_at.isoformat() if record.created_at else None,
                "horizon_days": decision.horizon_days,
                "validity_window_days": decision.validity_window_days,
                "snapshot_integrity_hash": record.snapshot_integrity_hash,
            },
            "underwriting_verdict": {
                "verdict": sec1.get("verdict", "UNKNOWN"),
                "actionable_sentence": sec1.get("actionable_sentence", ""),
                "is_conditional": sec1.get("is_conditional", False),
            },
            "decision_premium": {
                "total_decision_premium": sec2.get("total_decision_premium", 0.0),
                "premium_rate": sec2.get("premium_rate", 0.0),
                "projected_upside": sec2.get("projected_upside", 0.0),
                "expected_loss": sec2.get("expected_loss", 0.0),
                "expected_net_benefit": sec2.get("expected_net_benefit", 0.0),
                "loads": sec2.get("loads", {}),
                "rate_card_version": sec2.get("rate_card_version", "1.0.0"),
                "provenance": sec2.get("provenance", {}),
            },
            "exposure_report": {
                "probability_of_net_loss": sec3.get("probability_of_net_loss", 0.0),
                "downside_at_tail_p10": sec3.get("downside_at_tail_p10", 0.0),
                "worst_plausible_case_loss": sec3.get("worst_plausible_case_loss", 0.0),
                "concentration_exposure": sec3.get("concentration_exposure", 0.0),
                "data_exposure_min": sec3.get("data_exposure_min", 0.0),
                "data_exposure_max": sec3.get("data_exposure_max", 0.0),
                "adverse_finding_exposure_total": sec3.get("adverse_finding_exposure_total", 0.0),
                "cost_of_inaction": sec3.get("cost_of_inaction", 0.0),
                "provenance": sec3.get("provenance", {}),
            },
            "coverage_lapse_conditions": sec4.get("conditions", []),
            "conditions_and_exclusions": {
                "conditions": sec5.get("conditions", []),
                "exclusions": sec5.get("exclusions", []),
            },
            "modelled_scenarios": {
                "best_case_p90": sec6.get("best_case_p90", 0.0),
                "expected_case": sec6.get("expected_case", 0.0),
                "worst_case_p10": sec6.get("worst_case_p10", 0.0),
                "tail_average_loss": sec6.get("tail_average_loss", 0.0),
                "worst_plausible_case": sec6.get("worst_plausible_case", 0.0),
                "cost_of_inaction": sec6.get("cost_of_inaction", 0.0),
                "simulation_count": sec6.get("simulation_count", 1000),
                "random_seed": sec6.get("random_seed", 42),
                "quantiles": sec6.get("quantiles", {}),
            },
            "counter_decision_audit": {
                "recommendation_evolution": {
                    "initial_recommendation": sec7.get("initial_recommendation", ""),
                    "initial_basis": sec7.get("initial_basis", ""),
                    "counter_evidence_summary": sec7.get("counter_evidence_summary", ""),
                    "quantified_challenge_amount": sec7.get("quantified_challenge_amount", 0.0),
                    "resulting_change": sec7.get("resulting_change", ""),
                    "final_recommendation": sec7.get("final_recommendation", ""),
                },
                "adverse_findings": sec7.get("adverse_findings", []),
            },
            "data_health_summary": {
                "dataset_name": sec8.get("dataset_name", ""),
                "overall_health_score": sec8.get("overall_health_score", 0.0),
                "relevant_findings": sec8.get("relevant_findings", []),
            },
            "verification_summary": sec9.get("verifications", []),
            "evidence_chain": record.evidence_chain_snapshot or sec10.get("nodes", []),
            "rate_card_snapshot": record.rate_card_snapshot,
            "human_approval": {
                "approver_name": record.approver_name,
                "approver_role": record.approver_role,
                "action": record.action_type.value if hasattr(record.action_type, "value") else str(record.action_type),
                "approval_timestamp": record.created_at.isoformat() if record.created_at else None,
                "approval_notes": record.approval_notes,
                "is_immutable": record.is_immutable,
                "modifications_made": record.modifications_made,
            },
        }

