"""TRACE Rate Card Service.

Manages underwriting pricing policies and immutable Rate Card versions.
Enforces that policy updates create a new version rather than mutating historical records.
"""

from typing import List, Optional
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from backend.app.core.config import settings
from backend.app.core.errors import EntityNotFoundError, RateCardNotFoundError
from backend.app.models.underwriting import RateCard, RateCardVersion
from backend.app.models.enums import AuditAction
from backend.app.schemas.underwriting import RateCardVersionCreateRequest
from backend.app.services.audit_service import AuditService


class RateCardService:
    @staticmethod
    def get_or_create_default_rate_card(db: Session) -> RateCardVersion:
        """Ensures the default Rate Card policy exists in the database."""
        rate_card = db.scalar(
            select(RateCard).where(RateCard.name == settings.RATE_CARD_DEFAULT_NAME)
        )
        if not rate_card:
            rate_card = RateCard(
                name=settings.RATE_CARD_DEFAULT_NAME,
                description="Default commercial underwriting policy defining loads and verdict bands.",
                is_active=True,
            )
            db.add(rate_card)
            db.flush()

        active_version = db.scalar(
            select(RateCardVersion)
            .where(RateCardVersion.rate_card_id == rate_card.id, RateCardVersion.is_active == True)
            .order_by(desc(RateCardVersion.created_at))
        )
        if not active_version:
            active_version = RateCardVersion(
                rate_card_id=rate_card.id,
                version_str=settings.RATE_CARD_DEFAULT_VERSION,
                weight_data_quality=settings.WEIGHT_DATA_QUALITY_LOAD,
                weight_verification=settings.WEIGHT_VERIFICATION_LOAD,
                weight_contradiction=settings.WEIGHT_CONTRADICTION_LOAD,
                base_model_uncertainty_weight=settings.BASE_MODEL_UNCERTAINTY_WEIGHT,
                band_recommended_max=settings.BAND_RECOMMENDED_MAX_RATE,
                band_recommended_with_conditions_max=settings.BAND_RECOMMENDED_WITH_CONDITIONS_MAX_RATE,
                band_refer_max=settings.BAND_REFER_MAX_RATE,
                tail_percentile=settings.TAIL_PERCENTILE,
                policy_metadata={
                    "tail_definition": "Worst 10% (P10)",
                    "tail_percentile": settings.TAIL_PERCENTILE,
                    "lapse_tolerance": "Expected Net Benefit <= 0 or band shift",
                    "simulation_count": settings.SCENARIO_SIMULATION_COUNT,
                    "recalibration": {
                        "credibility_formula": "Z = n / (n + k)",
                        "k_parameter": settings.LEDGER_CREDIBILITY_K,
                        "neutral_factor_at_n0": 1.0,
                        "max_credibility_z": settings.LEDGER_MAX_CREDIBILITY,
                        "experience_factor_bounds": [
                            settings.LEDGER_EXPERIENCE_FACTOR_MIN,
                            settings.LEDGER_EXPERIENCE_FACTOR_MAX,
                        ],
                    },
                },
                is_active=True,
            )
            db.add(active_version)
            db.commit()
            db.refresh(active_version)
            AuditService.log_event(
                db,
                event_type=AuditAction.RATE_CARD_VERSION_CHANGED,
                entity_type="rate_card_version",
                entity_id=str(active_version.id),
                actor="system_init",
                details={"version": active_version.version_str},
            )
        return active_version

    @staticmethod
    def get_active_policy(db: Session) -> RateCardVersion:
        """Fetch the currently active Rate Card version."""
        version = db.scalar(
            select(RateCardVersion)
            .where(RateCardVersion.is_active == True)
            .order_by(desc(RateCardVersion.created_at))
        )
        if not version:
            return RateCardService.get_or_create_default_rate_card(db)
        return version

    @staticmethod
    def list_rate_cards(db: Session) -> List[RateCard]:
        return list(db.scalars(select(RateCard)).all())

    @staticmethod
    def create_new_version(
        db: Session,
        rate_card_id: uuid.UUID,
        request: RateCardVersionCreateRequest,
        actor: str = "user",
    ) -> RateCardVersion:
        """Create a new Rate Card version without mutating existing versions."""
        rate_card = db.get(RateCard, rate_card_id)
        if not rate_card:
            raise EntityNotFoundError("RateCard", rate_card_id)

        # Deactivate old versions
        existing_versions = db.scalars(
            select(RateCardVersion).where(RateCardVersion.rate_card_id == rate_card_id)
        ).all()
        for v in existing_versions:
            v.is_active = False

        new_version = RateCardVersion(
            rate_card_id=rate_card_id,
            version_str=request.version_str,
            weight_data_quality=request.weight_data_quality,
            weight_verification=request.weight_verification,
            weight_contradiction=request.weight_contradiction,
            base_model_uncertainty_weight=request.base_model_uncertainty_weight,
            band_recommended_max=request.band_recommended_max,
            band_recommended_with_conditions_max=request.band_recommended_with_conditions_max,
            band_refer_max=request.band_refer_max,
            tail_percentile=request.tail_percentile,
            policy_metadata=request.policy_metadata,
            is_active=True,
        )
        db.add(new_version)
        db.commit()
        db.refresh(new_version)

        AuditService.log_event(
            db,
            event_type=AuditAction.RATE_CARD_VERSION_CHANGED,
            entity_type="rate_card_version",
            entity_id=str(new_version.id),
            actor=actor,
            details={"version": new_version.version_str, "previous_versions_count": len(existing_versions)},
        )
        return new_version
