"""TRACE Decision and Investigation Service.

Manages decisions, typed objectives, decision templates, and investigation plans.
"""

from typing import List, Optional, Tuple
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from backend.app.core.errors import EntityNotFoundError, InvalidStateTransitionError
from backend.app.models.decision import (
    Decision,
    DecisionObjective,
    DecisionTemplate,
    InvestigationPlan,
    InvestigationQuestion,
)
from backend.app.models.enums import DecisionStatus, AuditAction, DataSufficiencyVerdict
from backend.app.schemas.decision import (
    DecisionCreateRequest,
    DecisionUpdateRequest,
    DecisionObjectiveCreateRequest,
)
from backend.app.services.audit_service import AuditService


class DecisionService:
    @staticmethod
    def seed_default_templates(db: Session) -> List[DecisionTemplate]:
        """Seeds the standard decision templates specified in Project Bible Section 13."""
        templates_data = [
            {
                "template_code": "T1_DISCOUNT_CESSATION",
                "title": "Stop Discounts for Low-Margin Segment",
                "category": "pricing",
                "description": "Evaluate the commercial impact, margin upside, and churn exposure of terminating discretionary discounts for low-margin customer segments.",
                "required_entities": ["Customer", "Order", "Product"],
                "required_metrics": ["Gross Profit", "Discount Rate", "Segment Churn Rate", "Volume Retention"],
                "default_assumptions": {
                    "churn_rate_baseline": 0.031,
                    "churn_rate_adverse": 0.062,
                    "volume_retention_min": 0.90,
                    "volume_retention_max": 0.96,
                },
            },
            {
                "template_code": "T2_PRICE_CHANGE",
                "title": "Unit Price Adjustment",
                "category": "pricing",
                "description": "Model customer price elasticity, volume drop-off, and net revenue impact across tiered product catalogs.",
                "required_entities": ["Product", "Transaction", "CompetitorBenchmark"],
                "required_metrics": ["Price Elasticity", "Contribution Margin", "Market Share"],
                "default_assumptions": {
                    "price_increase_pct": 0.05,
                    "elasticity_estimate": -1.2,
                },
            },
            {
                "template_code": "T3_REGIONAL_INVESTMENT",
                "title": "Regional Expansion Capital Allocation",
                "category": "investment",
                "description": "Underwrite capital expenditure and operational risk for territorial retail footprint expansion.",
                "required_entities": ["Store", "RegionalDemographics", "OperatingCost"],
                "required_metrics": ["Payback Period", "IRR", "Breakeven Footfall"],
                "default_assumptions": {
                    "capex_budget": 500000.0,
                    "breakeven_months": 18,
                },
            },
        ]

        created = []
        for t_data in templates_data:
            existing = db.scalar(
                select(DecisionTemplate).where(DecisionTemplate.template_code == t_data["template_code"])
            )
            if not existing:
                template = DecisionTemplate(**t_data, is_active=True)
                db.add(template)
                created.append(template)
        if created:
            db.commit()
        return list(db.scalars(select(DecisionTemplate)).all())

    @staticmethod
    def list_templates(db: Session) -> List[DecisionTemplate]:
        templates = list(db.scalars(select(DecisionTemplate)).all())
        if not templates:
            return DecisionService.seed_default_templates(db)
        return templates

    @staticmethod
    def create_decision(db: Session, request: DecisionCreateRequest, actor: str = "user") -> Decision:
        decision = Decision(
            title=request.title,
            question_text=request.question_text,
            status=DecisionStatus.DRAFT,
            dataset_id=request.dataset_id,
            template_id=request.template_id,
            primary_metric_name=request.primary_metric_name,
            horizon_days=request.horizon_days,
            validity_window_days=request.validity_window_days,
        )
        db.add(decision)
        db.commit()
        db.refresh(decision)

        AuditService.log_event(
            db,
            event_type=AuditAction.DECISION_CREATED,
            entity_type="decision",
            entity_id=str(decision.id),
            actor=actor,
            details={"title": decision.title, "horizon_days": decision.horizon_days},
        )
        return decision

    @staticmethod
    def get_decision(db: Session, decision_id: uuid.UUID) -> Decision:
        decision = db.get(Decision, decision_id)
        if not decision:
            raise EntityNotFoundError("Decision", decision_id)
        return decision

    @staticmethod
    def list_decisions(db: Session, skip: int = 0, limit: int = 50) -> Tuple[List[Decision], int]:
        total = db.scalar(select(func.count()).select_from(Decision)) or 0
        items = list(
            db.scalars(
                select(Decision).order_by(desc(Decision.created_at)).offset(skip).limit(limit)
            ).all()
        )
        return items, total

    @staticmethod
    def update_decision(
        db: Session, decision_id: uuid.UUID, request: DecisionUpdateRequest, actor: str = "user"
    ) -> Decision:
        decision = DecisionService.get_decision(db, decision_id)
        if decision.status == DecisionStatus.APPROVED:
            raise InvalidStateTransitionError(
                current_state=decision.status.value,
                attempted_state="modified",
                allowed_states=["Record is immutable once approved"],
            )

        update_data = request.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(decision, key, val)
        db.commit()
        db.refresh(decision)
        return decision

    @staticmethod
    def set_objective(
        db: Session, decision_id: uuid.UUID, request: DecisionObjectiveCreateRequest
    ) -> DecisionObjective:
        decision = DecisionService.get_decision(db, decision_id)
        existing_obj = db.scalar(
            select(DecisionObjective).where(DecisionObjective.decision_id == decision_id)
        )
        if existing_obj:
            existing_obj.primary_goal = request.primary_goal
            existing_obj.target_metric = request.target_metric
            existing_obj.constraint_description = request.constraint_description
            existing_obj.baseline_value = request.baseline_value
            existing_obj.target_value = request.target_value
            existing_obj.parameters = request.parameters
            db.commit()
            db.refresh(existing_obj)
            return existing_obj

        obj = DecisionObjective(
            decision_id=decision_id,
            primary_goal=request.primary_goal,
            target_metric=request.target_metric,
            constraint_description=request.constraint_description,
            baseline_value=request.baseline_value,
            target_value=request.target_value,
            parameters=request.parameters,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    @staticmethod
    def get_investigation_plan(db: Session, decision_id: uuid.UUID) -> Optional[InvestigationPlan]:
        DecisionService.get_decision(db, decision_id)
        return db.scalar(
            select(InvestigationPlan)
            .where(InvestigationPlan.decision_id == decision_id)
            .order_by(desc(InvestigationPlan.created_at))
        )
