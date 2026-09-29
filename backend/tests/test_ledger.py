"""Tests for Loss History Ledger, Outcomes Logging, and Recalibration."""

from datetime import datetime, timezone, timedelta
import uuid
import pytest
from backend.app.models.ledger import LossHistoryEntry
from backend.app.schemas.ledger import OutcomeLogRequest
from backend.app.services.ledger_service import LedgerService


def test_ledger_outcome_logging_and_claim_detection(db_session):
    now = datetime.now(timezone.utc)
    entry = LossHistoryEntry(
        decision_class="T1_DISCOUNT_CESSATION",
        decision_title="Test Discount Cessation",
        underwritten_date=now,
        validity_end_date=now + timedelta(days=60),
        is_simulated=False,
        projected_upside=1200000.0,
        decision_premium=96000.0,
        premium_rate=0.08,
        p10_tail_exposure=470000.0,
        underwriting_verdict="Recommended with Conditions",
        human_action="Approved",
    )
    db_session.add(entry)
    db_session.commit()

    # Log an outcome where realised upside is positive and within acceptable range
    req_success = OutcomeLogRequest(
        logged_by="Rihaan Shaikh",
        outcome_date=now + timedelta(days=60),
        primary_metric_realised=1150000.0,  # $1.15M
        variance_notes="Slight volume loss in region 2, but overall gross margin target met.",
    )
    outcome = LedgerService.log_outcome(db_session, entry.id, req_success)
    assert outcome.primary_metric_realised == 1150000.0

    # Refetch entry
    updated_entry = LedgerService.get_entry(db_session, entry.id)
    assert updated_entry.actual_realised_value == 1150000.0
    assert updated_entry.actual_vs_predicted_variance == 1150000.0 - 1200000.0  # -50,000
    assert updated_entry.fell_inside_predicted_range is True
    assert updated_entry.is_claim is False


def test_credibility_recalibration(db_session):
    now = datetime.now(timezone.utc)
    # Seed 3 historical entries
    for i in range(3):
        entry = LossHistoryEntry(
            decision_class="T2_PRICE_CHANGE",
            decision_title=f"Historical Price Change {i+1}",
            underwritten_date=now - timedelta(days=30 * (i + 1)),
            validity_end_date=now,
            is_simulated=True,
            projected_upside=500000.0,
            decision_premium=45000.0,
            premium_rate=0.09,
            p10_tail_exposure=150000.0,
            underwriting_verdict="Recommended",
            human_action="Approved",
            actual_realised_value=480000.0,
            is_claim=False,
        )
        db_session.add(entry)
    db_session.commit()

    recal = LedgerService.calculate_class_recalibration(db_session, "T2_PRICE_CHANGE")
    assert recal.logged_decisions_count == 3
    assert recal.credibility_z > 0.0
    assert 0.5 <= recal.experience_factor <= 2.5


def test_recalibration_neutral_starting_state_when_n_zero(db_session):
    """Bible Section 21: n = 0 must produce neutral credibility (Z = 0.0, Experience Factor = 1.0)."""
    empty_class = f"EMPTY_CLASS_{uuid.uuid4().hex[:6]}"
    recal = LedgerService.calculate_class_recalibration(db_session, empty_class)
    assert recal.logged_decisions_count == 0
    assert recal.claims_count == 0
    assert recal.credibility_z == 0.0
    assert recal.experience_factor == 1.0


def test_novamart_simulated_history_seeding_and_consistency(db_session):
    """Bible Section 20/21: Verify synthetic history generation quality, internally consistent variance, and claim detection."""
    entries = LedgerService.seed_simulated_history(db_session, force=True)
    assert len(entries) == 12

    for e in entries:
        assert e.is_simulated is True
        assert e.decision_class in ("pricing", "discount")
        # Consistency check: variance = realised - projected
        expected_var = e.actual_realised_value - e.projected_upside
        assert abs(e.actual_vs_predicted_variance - expected_var) < 1e-4

        # Claim check
        fell_inside = e.actual_realised_value >= -abs(e.p10_tail_exposure)
        expected_claim = (not fell_inside) or e.lapse_event_triggered
        assert e.is_claim == expected_claim

    # Verify deterministic recalibration on pricing class
    recal = LedgerService.calculate_class_recalibration(db_session, "pricing")
    assert recal.logged_decisions_count == 12
    # Z = 12 / (12 + 10) = 12 / 22 = 0.5455
    expected_z = round(12.0 / 22.0, 4)
    assert abs(recal.credibility_z - expected_z) < 1e-3
    assert 0.5 <= recal.experience_factor <= 2.5

