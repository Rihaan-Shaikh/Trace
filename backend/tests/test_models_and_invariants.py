"""Tests for TRACE Domain Models, Relationships, and Invariants."""

import uuid
from datetime import datetime, timezone
import pytest
from backend.app.models.dataset import Dataset, DatasetTable, DatasetColumn, DataQualityFinding
from backend.app.models.decision import Decision, DecisionObjective, DecisionTemplate
from backend.app.models.evidence import Calculation, VerificationResult, EvidenceItem, Assumption
from backend.app.models.underwriting import RateCard, RateCardVersion
from backend.app.models.enums import (
    DataQualitySeverity,
    DecisionStatus,
    StatementLevel,
    AssumptionType,
)


def test_dataset_and_table_relationship(db_session):
    ds = Dataset(name="NovaMart Sales 2026", source_type="file_upload")
    db_session.add(ds)
    db_session.flush()

    tbl = DatasetTable(
        dataset_id=ds.id,
        name="transactions",
        row_count=100000,
        column_count=8,
    )
    db_session.add(tbl)
    db_session.flush()

    col = DatasetColumn(
        dataset_table_id=tbl.id,
        name="discount_rate",
        data_type="float",
        null_count=0,
        distinct_count=15,
    )
    db_session.add(col)
    db_session.commit()

    # Query back
    fetched_ds = db_session.get(Dataset, ds.id)
    assert len(fetched_ds.tables) == 1
    assert fetched_ds.tables[0].name == "transactions"
    assert len(fetched_ds.tables[0].columns) == 1
    assert fetched_ds.tables[0].columns[0].name == "discount_rate"


def test_evidence_chain_provenance(db_session):
    dec = Decision(
        title="Cease Blanket Discounts",
        question_text="Should we stop discounts for low-margin accounts?",
        status=DecisionStatus.UNDERWRITTEN,
    )
    db_session.add(dec)
    db_session.flush()

    calc = Calculation(
        decision_id=dec.id,
        metric_name="upside_estimate",
        formula_used="sum(discount_amount * (1 - churn_risk))",
        result_numeric=1200000.0,
        result_formatted="$1.2M",
        input_parameters={"segment": "low_margin"},
        input_row_count=25000,
        code_provenance="deterministic_analytics_v1",
    )
    db_session.add(calc)
    db_session.flush()

    verif = VerificationResult(
        calculation_id=calc.id,
        method_primary_name="transaction_level_sum",
        method_secondary_name="customer_aggregate_recalc",
        method_primary_value=1200000.0,
        method_secondary_value=1201500.0,
        absolute_discrepancy=1500.0,
        relative_discrepancy=0.00125,
        tolerance_threshold=0.01,
        is_verified=True,
        explanation="Secondary method agrees within 0.125% (< 1% tolerance).",
    )
    db_session.add(verif)

    ev = EvidenceItem(
        decision_id=dec.id,
        title="Projected Upside Verification",
        statement_text="Projected upside is verified at $1.2M with 0.125% discrepancy.",
        statement_level=StatementLevel.CALCULATED_RESULT,
        calculation_id=calc.id,
    )
    db_session.add(ev)
    db_session.commit()

    # Verify provenance path
    fetched_ev = db_session.get(EvidenceItem, ev.id)
    assert fetched_ev.calculation is not None
    assert fetched_ev.calculation.result_numeric == 1200000.0
    assert len(fetched_ev.calculation.verification_results) == 1
    assert fetched_ev.calculation.verification_results[0].is_verified is True


def test_rate_card_versioning(db_session):
    rc = RateCard(name="Corporate Underwriting Policy", description="Policy for commercial lines")
    db_session.add(rc)
    db_session.flush()

    v1 = RateCardVersion(
        rate_card_id=rc.id,
        version_str="1.0.0",
        weight_data_quality=0.10,
        weight_verification=0.05,
        weight_contradiction=1.00,
        is_active=True,
    )
    db_session.add(v1)
    db_session.commit()

    # Add v2
    v1.is_active = False
    v2 = RateCardVersion(
        rate_card_id=rc.id,
        version_str="1.1.0",
        weight_data_quality=0.12,
        weight_verification=0.05,
        weight_contradiction=1.00,
        is_active=True,
    )
    db_session.add(v2)
    db_session.commit()

    # Historical v1 remains intact
    fetched_v1 = db_session.get(RateCardVersion, v1.id)
    assert fetched_v1.version_str == "1.0.0"
    assert fetched_v1.is_active is False
    assert fetched_v1.weight_data_quality == 0.10

    fetched_rc = db_session.get(RateCard, rc.id)
    assert len(fetched_rc.versions) == 2
