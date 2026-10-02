"""TRACE Loss History Ledger and Recalibration Service.

Implements the actuarial memory and credibility recalibration engine (Project Bible Section 21):
- Immutable recording of historical predictions.
- Logging of realised outcomes.
- Real variance calculation and claim flags.
- Credibility-weighted experience factors: Z = n / (n + k).
- Recalibrates Model-Uncertainty Load for future decisions of the same class.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from backend.app.core.config import settings
from backend.app.core.errors import EntityNotFoundError
from backend.app.models.ledger import LossHistoryEntry, OutcomeRecord, RecalibrationResult
from backend.app.models.enums import AuditAction
from backend.app.schemas.ledger import OutcomeLogRequest
from backend.app.services.audit_service import AuditService


class LedgerService:
    @classmethod
    def seed_simulated_history(cls, db: Session, force: bool = False, count: int = 12) -> List[LossHistoryEntry]:
        """Seeds synthetic historical underwriting decisions for NovaMart calibration testing.

        Disclaimer: SIMULATED HISTORY — NOVAMART TEST DATA ONLY.
        These are deterministic benchmark records for experience factor recalibration.
        """
        existing_count = db.scalar(select(func.count(LossHistoryEntry.id)).where(LossHistoryEntry.is_simulated == True)) or 0
        if existing_count > 0 and not force:
            return list(db.scalars(select(LossHistoryEntry).where(LossHistoryEntry.is_simulated == True).order_by(desc(LossHistoryEntry.underwritten_date))).all())

        if force:
            db.query(LossHistoryEntry).filter(LossHistoryEntry.is_simulated == True).delete()
            db.commit()

        now = datetime.now(timezone.utc)
        # Deterministic generation of 48 distinct quarterly/monthly synthetic historical observations
        # Spanning 4 years (1,440 days down to 30 days) across diverse product lines, customer tiers, and regions.
        categories = [
            ("Northeast Regional Discretionary Discount Cessation", 320000.0, 28800.0, 0.090, 45000.0, "RECOMMENDED", 312000.0, False),
            ("Tier 2 Mid-Market Account Volume Rebate Rationalization", 480000.0, 57600.0, 0.120, 72000.0, "RECOMMENDED_WITH_CONDITIONS", 495000.0, False),
            ("Commodity Fasteners & Fittings Margin Floor Enforcement 12%", 250000.0, 42500.0, 0.170, 55000.0, "RECOMMENDED_WITH_CONDITIONS", -68000.0, True),
            ("Direct B2B Channel Freight Surcharge Implementation", 180000.0, 14400.0, 0.080, 25000.0, "RECOMMENDED", 188000.0, False),
            ("Mid-Atlantic Early Payment Terms Restriction (Net 30)", 390000.0, 42900.0, 0.110, 52000.0, "RECOMMENDED_WITH_CONDITIONS", 374000.0, False),
            ("Region X High-Churn Competitor Price Realignment", 290000.0, 58000.0, 0.200, 60000.0, "REFER", -74000.0, True),
            ("National Retail Chain Fixed Catalog Rebate Standardization", 510000.0, 45900.0, 0.090, 65000.0, "RECOMMENDED", 522000.0, False),
            ("Private Label Supply Chain Discount Cessation", 340000.0, 37400.0, 0.110, 48000.0, "RECOMMENDED_WITH_CONDITIONS", 328000.0, False),
            ("Industrial Tooling Discretionary Margin Cap 15%", 410000.0, 49200.0, 0.120, 55000.0, "RECOMMENDED_WITH_CONDITIONS", 419000.0, False),
            ("Q2 Seasonal Summer Promotional Allowance Elimination", 220000.0, 39600.0, 0.180, 35000.0, "RECOMMENDED_WITH_CONDITIONS", -42000.0, True),
            ("Key Wholesale Distribution Schedule Standardisation", 450000.0, 40500.0, 0.090, 58000.0, "RECOMMENDED", 441000.0, False),
            ("Vendor Funded Promo Clawback Policy Enforcement", 370000.0, 44400.0, 0.120, 48000.0, "RECOMMENDED_WITH_CONDITIONS", 366000.0, False),
            ("Southwest Territory Agricultural Equipment Rebate Cap", 330000.0, 29700.0, 0.090, 42000.0, "RECOMMENDED", 338000.0, False),
            ("Commercial Refrigeration Spares Contract Re-Pricing", 460000.0, 55200.0, 0.120, 68000.0, "RECOMMENDED_WITH_CONDITIONS", 471000.0, False),
            ("Bulk Industrial Lubricants Off-Invoice Discount Termination", 275000.0, 44000.0, 0.160, 50000.0, "RECOMMENDED_WITH_CONDITIONS", -51000.0, True),
            ("Northwest Regional Logistics Fuel Surcharge Floor", 195000.0, 15600.0, 0.080, 26000.0, "RECOMMENDED", 201000.0, False),
            ("Enterprise Fleet Maintenance Tier 1 Discount Cap", 520000.0, 52000.0, 0.100, 64000.0, "RECOMMENDED", 515000.0, False),
            ("Low-Volume Specialty Chemicals Discretionary Concession Halt", 310000.0, 49600.0, 0.160, 48000.0, "RECOMMENDED_WITH_CONDITIONS", -38000.0, True),
            ("Great Lakes Automotive Supply Schedule Harmonization", 490000.0, 44100.0, 0.090, 60000.0, "RECOMMENDED", 502000.0, False),
            ("Foodservice Paper Goods Contract Price Increase 4.5%", 360000.0, 39600.0, 0.110, 46000.0, "RECOMMENDED_WITH_CONDITIONS", 352000.0, False),
            ("Heavy Electrical Switchgear Discount Gate 8%", 430000.0, 51600.0, 0.120, 56000.0, "RECOMMENDED_WITH_CONDITIONS", 442000.0, False),
            ("Q4 Holiday Promotional Mark-Down Restriction", 240000.0, 40800.0, 0.170, 38000.0, "RECOMMENDED_WITH_CONDITIONS", -35000.0, True),
            ("Pacific Northwest Packaging Materials Tariff Pass-Through", 380000.0, 34200.0, 0.090, 49000.0, "RECOMMENDED", 389000.0, False),
            ("Hospitality Linen Consumables Promotional Ceiling", 280000.0, 33600.0, 0.120, 39000.0, "RECOMMENDED_WITH_CONDITIONS", 274000.0, False),
            ("Central Plains Grain Handling Parts Discount Phase-Out", 350000.0, 31500.0, 0.090, 44000.0, "RECOMMENDED", 356000.0, False),
            ("Commercial HVAC Service Spares Margin Guarantee", 470000.0, 56400.0, 0.120, 70000.0, "RECOMMENDED_WITH_CONDITIONS", 482000.0, False),
            ("Bulk Industrial Solvents Exception-Pricing Cap", 260000.0, 44200.0, 0.170, 48000.0, "RECOMMENDED_WITH_CONDITIONS", -49000.0, True),
            ("Intermodal Rail Freight Cost Allocation Adjustment", 175000.0, 14000.0, 0.080, 24000.0, "RECOMMENDED", 179000.0, False),
            ("Healthcare Facility Group Purchasing Rebate Alignment", 530000.0, 47700.0, 0.090, 66000.0, "RECOMMENDED", 538000.0, False),
            ("Municipal Fleet Tyres Discretionary Concession Lock", 315000.0, 50400.0, 0.160, 47000.0, "RECOMMENDED_WITH_CONDITIONS", -41000.0, True),
            ("Midwest Construction Equipment Parts Schedule Realignment", 495000.0, 44550.0, 0.090, 62000.0, "RECOMMENDED", 508000.0, False),
            ("Janitorial Chemical Concentrates Net Pricing Enforcement", 345000.0, 37950.0, 0.110, 45000.0, "RECOMMENDED_WITH_CONDITIONS", 339000.0, False),
            ("Hydraulic Valve Assemblies Minimum Margin Floor 14%", 420000.0, 50400.0, 0.120, 54000.0, "RECOMMENDED_WITH_CONDITIONS", 429000.0, False),
            ("Q1 Spring Pre-Season Stocking Allowance Sunset", 230000.0, 39100.0, 0.170, 36000.0, "RECOMMENDED_WITH_CONDITIONS", -32000.0, True),
            ("Southeast Regional Beverage Bottling Spares Uplift", 400000.0, 36000.0, 0.090, 51000.0, "RECOMMENDED", 411000.0, False),
            ("Safety Eyewear & PPE Volume Discount Threshold Adjustment", 290000.0, 34800.0, 0.120, 40000.0, "RECOMMENDED_WITH_CONDITIONS", 285000.0, False),
            ("Mountain West Mining Machinery Wear-Parts Discount Reform", 365000.0, 32850.0, 0.090, 46000.0, "RECOMMENDED", 372000.0, False),
            ("Commercial Laundry Detergent Formulation Price Floor", 455000.0, 54600.0, 0.120, 67000.0, "RECOMMENDED_WITH_CONDITIONS", 464000.0, False),
            ("Specialty Polyethylene Resins Off-Contract Allowance Cut", 285000.0, 45600.0, 0.160, 52000.0, "RECOMMENDED_WITH_CONDITIONS", -44000.0, True),
            ("Cold-Storage Distribution Energy Surcharge Pass-Through", 190000.0, 15200.0, 0.080, 25000.0, "RECOMMENDED", 196000.0, False),
            ("Enterprise Telecommunications Hardware Consignment Ceiling", 540000.0, 48600.0, 0.090, 68000.0, "RECOMMENDED", 549000.0, False),
            ("Semiconductor Cleanroom Consumables Concession Freeze", 325000.0, 52000.0, 0.160, 49000.0, "RECOMMENDED_WITH_CONDITIONS", -39000.0, True),
            ("Mid-South Textile Mill Spares Contract Standardization", 485000.0, 43650.0, 0.090, 59000.0, "RECOMMENDED", 494000.0, False),
            ("Sanitation Supplies Institutional Net Price Lock", 355000.0, 39050.0, 0.110, 47000.0, "RECOMMENDED_WITH_CONDITIONS", 348000.0, False),
            ("High-Pressure Pneumatics Custom Parts Margin Threshold", 415000.0, 49800.0, 0.120, 53000.0, "RECOMMENDED_WITH_CONDITIONS", 423000.0, False),
            ("Late Autumn Clearance Special Discount Expiration", 215000.0, 38700.0, 0.180, 34000.0, "RECOMMENDED_WITH_CONDITIONS", -28000.0, True),
            ("Coastal Marine Propulsion Component Rebate Alignment", 440000.0, 39600.0, 0.090, 57000.0, "RECOMMENDED", 448000.0, False),
            ("Precision Bearings Tier 3 Account Pricing Consolidation", 375000.0, 45000.0, 0.120, 49000.0, "RECOMMENDED_WITH_CONDITIONS", 369000.0, False),
        ]

        if count is not None and count > 0:
            selected_categories = categories[:count]
        else:
            selected_categories = categories

        records_data = []
        for idx, item in enumerate(selected_categories):
            title, proj, prem, rate, p10, verd, real, lapse = item
            days_ago = 1440 - (idx * 30)  # 48 months: 1440 days down to 30 days
            records_data.append({
                "decision_class": "pricing",
                "decision_title": title,
                "days_ago": days_ago,
                "projected_upside": proj,
                "decision_premium": prem,
                "premium_rate": rate,
                "p10_tail_exposure": p10,
                "underwriting_verdict": verd,
                "human_action": "Approved",
                "actual_realised_value": real,
                "lapse_event_triggered": lapse,
            })

        seeded = []
        for d in records_data:
            dt = now - timedelta(days=d["days_ago"])
            val_end = dt + timedelta(days=60)
            realised = d["actual_realised_value"]
            pred = d["projected_upside"]
            var = realised - pred
            p10 = d["p10_tail_exposure"]
            fell_inside = (realised >= -abs(p10))
            is_claim = not fell_inside or d["lapse_event_triggered"]

            entry = LossHistoryEntry(
                decision_id=None,
                decision_class=d["decision_class"],
                decision_title=d["decision_title"],
                underwritten_date=dt,
                validity_end_date=val_end,
                is_simulated=True,
                projected_upside=pred,
                decision_premium=d["decision_premium"],
                premium_rate=d["premium_rate"],
                p10_tail_exposure=p10,
                underwriting_verdict=d["underwriting_verdict"],
                human_action=d["human_action"],
                actual_realised_value=realised,
                actual_vs_predicted_variance=var,
                fell_inside_predicted_range=fell_inside,
                lapse_event_triggered=d["lapse_event_triggered"],
                is_claim=is_claim,
            )
            db.add(entry)
            seeded.append(entry)

        db.commit()
        return seeded

    @staticmethod
    def list_entries(
        db: Session,
        decision_class: Optional[str] = None,
        is_simulated: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[LossHistoryEntry], int]:
        total_in_db = db.scalar(select(func.count(LossHistoryEntry.id))) or 0
        if total_in_db == 0:
            LedgerService.seed_simulated_history(db)

        query = select(LossHistoryEntry)
        if decision_class:
            query = query.where(LossHistoryEntry.decision_class == decision_class)
        if is_simulated is not None:
            query = query.where(LossHistoryEntry.is_simulated == is_simulated)

        total = len(list(db.scalars(query).all()))
        items = list(
            db.scalars(query.order_by(desc(LossHistoryEntry.underwritten_date)).offset(skip).limit(limit)).all()
        )
        return items, total

    @staticmethod
    def get_entry_by_decision(db: Session, decision_id: uuid.UUID) -> Optional[LossHistoryEntry]:
        return db.scalar(
            select(LossHistoryEntry)
            .where(LossHistoryEntry.decision_id == decision_id)
            .order_by(desc(LossHistoryEntry.underwritten_date))
        )

    @staticmethod
    def get_entry(db: Session, entry_id: uuid.UUID) -> LossHistoryEntry:
        entry = db.get(LossHistoryEntry, entry_id)
        if not entry:
            raise EntityNotFoundError("LossHistoryEntry", entry_id)
        return entry

    @staticmethod
    def log_outcome(
        db: Session,
        entry_id: uuid.UUID,
        request: OutcomeLogRequest,
    ) -> OutcomeRecord:
        entry = LedgerService.get_entry(db, entry_id)

        outcome = OutcomeRecord(
            loss_history_entry_id=entry_id,
            logged_by=request.logged_by,
            outcome_date=request.outcome_date,
            primary_metric_realised=request.primary_metric_realised,
            variance_notes=request.variance_notes,
            source_reference=request.source_reference,
        )
        db.add(outcome)

        # Update historical entry realised metrics
        entry.actual_realised_value = request.primary_metric_realised
        # Variance: Realised - Projected
        variance = request.primary_metric_realised - entry.projected_upside
        entry.actual_vs_predicted_variance = variance

        # Claim check: did outcome fall below the tail exposure threshold?
        # e.g., if downside exceeded P10 tail
        fell_inside = request.primary_metric_realised >= (-abs(entry.p10_tail_exposure))
        entry.fell_inside_predicted_range = fell_inside
        entry.is_claim = not fell_inside

        db.commit()
        db.refresh(outcome)

        AuditService.log_event(
            db,
            event_type=AuditAction.LEDGER_OUTCOME_LOGGED,
            entity_type="loss_history_entry",
            entity_id=str(entry_id),
            actor=request.logged_by,
            details={
                "realised": request.primary_metric_realised,
                "projected": entry.projected_upside,
                "is_claim": entry.is_claim,
            },
        )
        return outcome

    @staticmethod
    def calculate_class_recalibration(
        db: Session,
        decision_class: str,
        tuning_k: Optional[float] = None,
        max_credibility: Optional[float] = None,
        experience_factor_min: Optional[float] = None,
        experience_factor_max: Optional[float] = None,
    ) -> RecalibrationResult:
        """Computes actuarial credibility and experience factor Z = n / (n + k).
        
        Per Project Bible Section 21.4 [DEFAULT method]:
        - Z = n / (n + k), where k is a tuning constant (not a locked business rule)
        - Z is capped (default: settings.LEDGER_MAX_CREDIBILITY)
        - With no history (n = 0), the factor is strictly neutral (1.0)
        - Experience factor bounds are configurable policy values
        """
        k = float(tuning_k if tuning_k is not None else settings.LEDGER_CREDIBILITY_K)
        z_cap = float(max_credibility if max_credibility is not None else settings.LEDGER_MAX_CREDIBILITY)
        factor_min = float(experience_factor_min if experience_factor_min is not None else settings.LEDGER_EXPERIENCE_FACTOR_MIN)
        factor_max = float(experience_factor_max if experience_factor_max is not None else settings.LEDGER_EXPERIENCE_FACTOR_MAX)

        entries = list(
            db.scalars(
                select(LossHistoryEntry).where(LossHistoryEntry.decision_class == decision_class)
            ).all()
        )
        n = len(entries)
        if n == 0:
            return RecalibrationResult(
                decision_class=decision_class,
                logged_decisions_count=0,
                claims_count=0,
                mean_error_ratio=1.0,
                credibility_z=0.0,
                experience_factor=1.0,
                details={
                    "formula": "Neutral experience factor: 1.0 (no history)",
                    "tuning_constant_k": k,
                    "credibility_cap_z": z_cap,
                    "experience_factor_bounds": [factor_min, factor_max],
                },
            )

        # Credibility weighting Z = n / (n + k), capped at z_cap
        raw_z = float(n) / (n + k) if (n + k) > 0 else 0.0
        credibility_z = min(z_cap, raw_z)

        # Realised to predicted error calculation
        claims = [e for e in entries if e.is_claim is True]
        claims_count = len(claims)

        # Calculate error ratios where actuals are logged
        logged_actuals = [e for e in entries if e.actual_realised_value is not None]
        if logged_actuals:
            error_ratios = []
            for e in logged_actuals:
                pred = e.projected_upside if e.projected_upside != 0 else 1.0
                actual = e.actual_realised_value or 0.0
                ratio = max(0.0, (pred - actual) / abs(pred))
                error_ratios.append(ratio)
            mean_error = sum(error_ratios) / len(error_ratios)
        else:
            mean_error = 1.0

        # Experience factor scales Model-Uncertainty Load
        # Clamped within configurable policy bounds
        experience_factor = max(factor_min, min(factor_max, 1.0 + credibility_z * (mean_error - 1.0)))

        recal = RecalibrationResult(
            decision_class=decision_class,
            logged_decisions_count=n,
            claims_count=claims_count,
            mean_error_ratio=round(mean_error, 4),
            credibility_z=round(credibility_z, 4),
            experience_factor=round(experience_factor, 4),
            details={
                "credibility_formula": f"Z = n / (n + k) = {n} / ({n} + {k}) = {credibility_z:.3f}",
                "tuning_constant_k": k,
                "credibility_cap_z": z_cap,
                "experience_factor_bounds": [factor_min, factor_max],
                "class_samples": n,
                "claims_observed": claims_count,
            },
        )
        db.add(recal)
        db.commit()
        db.refresh(recal)
        return recal
