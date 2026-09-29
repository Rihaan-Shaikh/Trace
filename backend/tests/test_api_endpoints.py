"""Tests for TRACE API v1 Endpoints and Negative Paths."""

import uuid
import pytest
from fastapi import status


def test_api_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"]["connected"] is True
    assert data["database"]["table_count"] > 0


def test_api_rate_card(client):
    response = client.get("/api/v1/rate-card")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "version_str" in data
    assert "weight_data_quality" in data
    assert data["band_recommended_max"] == 0.10


def test_api_dataset_crud(client):
    # Create dataset
    payload = {
        "name": "NovaMart CRM Export",
        "description": "Customer order data 2025-2026",
        "source_type": "csv_upload",
    }
    create_resp = client.post("/api/v1/datasets", json=payload)
    assert create_resp.status_code == status.HTTP_201_CREATED
    ds_data = create_resp.json()
    assert ds_data["name"] == "NovaMart CRM Export"
    ds_id = ds_data["id"]

    # List datasets
    list_resp = client.get("/api/v1/datasets")
    assert list_resp.status_code == status.HTTP_200_OK
    assert list_resp.json()["total"] >= 1

    # Get single dataset
    get_resp = client.get(f"/api/v1/datasets/{ds_id}")
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.json()["id"] == ds_id

    # Data health summary (empty dataset has no computed health score)
    health_resp = client.get(f"/api/v1/data-health/{ds_id}")
    assert health_resp.status_code == status.HTTP_200_OK
    assert health_resp.json()["overall_health_score"] is None
    assert health_resp.json()["audit_status"] == "awaiting_data"


def test_api_decision_crud(client):
    payload = {
        "title": "Stop Blanket Discounts",
        "question_text": "Should we cease discretionary discounts for low-margin customer segments?",
        "horizon_days": 90,
    }
    create_resp = client.post("/api/v1/decisions", json=payload)
    assert create_resp.status_code == status.HTTP_201_CREATED
    dec_id = create_resp.json()["id"]

    # Retrieve decision
    get_resp = client.get(f"/api/v1/decisions/{dec_id}")
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.json()["title"] == "Stop Blanket Discounts"

    # Set objective
    obj_payload = {
        "primary_goal": "Preserve gross profit margin",
        "target_metric": "Gross Profit",
        "constraint_description": "Churn rate must not exceed 6.2%",
    }
    obj_resp = client.post(f"/api/v1/decisions/{dec_id}/objective", json=obj_payload)
    assert obj_resp.status_code == status.HTTP_200_OK
    assert obj_resp.json()["target_metric"] == "Gross Profit"


def test_api_decision_not_found(client):
    random_id = str(uuid.uuid4())
    resp = client.get(f"/api/v1/decisions/{random_id}")
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert resp.json()["error"]["code"] == "ENTITY_NOT_FOUND"


def test_api_invalid_uuid(client):
    resp = client.get("/api/v1/decisions/not-a-valid-uuid")
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_api_missing_required_fields(client):
    # Title missing
    payload = {"question_text": "Missing title"}
    resp = client.post("/api/v1/decisions", json=payload)
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_api_decisions_list_and_templates(client):
    # List decisions
    resp = client.get("/api/v1/decisions")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert "items" in data
    assert "total" in data

    # List templates
    resp_tmpls = client.get("/api/v1/decisions/templates")
    assert resp_tmpls.status_code == status.HTTP_200_OK
    tmpls = resp_tmpls.json()
    assert isinstance(tmpls, list)
    assert len(tmpls) > 0
    assert any(t["template_code"] in ("T1_DISCOUNT_CESSATION", "T1_DISCOUNT_POLICY") for t in tmpls)


def test_api_investigation_and_package_lifecycle(client):
    # 1. Create a decision
    create_resp = client.post(
        "/api/v1/decisions",
        json={
            "title": "API Lifecycle Commercial Decision",
            "question_text": "Should we cease discretionary discounts on accounts with margins < 15%?",
            "horizon_days": 90,
        },
    )
    assert create_resp.status_code == status.HTTP_201_CREATED
    dec_id = create_resp.json()["id"]

    # 1.5. Bind structured objective (mandatory prerequisite for investigation plan)
    obj_resp = client.post(
        f"/api/v1/decisions/{dec_id}/objective",
        json={
            "primary_goal": "Preserve gross profit margin",
            "target_metric": "Gross Profit",
            "constraint_description": "Churn rate must not exceed 6.2%",
        },
    )
    assert obj_resp.status_code == status.HTTP_200_OK

    # 2. Plan generation
    plan_resp = client.post(f"/api/v1/decisions/{dec_id}/plan")
    assert plan_resp.status_code == status.HTTP_200_OK
    plan_data = plan_resp.json()
    assert plan_data["decision_id"] == dec_id
    assert "sufficiency_verdict" in plan_data

    # 3. Retrieve plan
    get_plan = client.get(f"/api/v1/decisions/{dec_id}/plan")
    assert get_plan.status_code == status.HTTP_200_OK
    assert get_plan.json()["id"] == plan_data["id"]

    # 4. Run end-to-end investigation
    inv_resp = client.post(f"/api/v1/decisions/{dec_id}/investigate")
    assert inv_resp.status_code == status.HTTP_200_OK
    inv_data = inv_resp.json()
    assert inv_data["decision_id"] == dec_id
    assert "verdict" in inv_data or "status" in inv_data

    # 5. Retrieve investigation package
    pkg_resp = client.get(f"/api/v1/decisions/{dec_id}/package")
    assert pkg_resp.status_code == status.HTTP_200_OK
    pkg = pkg_resp.json()
    assert "decision" in pkg
    assert "evidence_items" in pkg

    # 6. Verify underwriting outputs APIs
    prem_resp = client.get(f"/api/v1/underwriting/decisions/{dec_id}/premium")
    assert prem_resp.status_code == status.HTTP_200_OK
    assert prem_resp.json()["total_decision_premium"] > 0

    exp_resp = client.get(f"/api/v1/underwriting/decisions/{dec_id}/exposure")
    assert exp_resp.status_code == status.HTTP_200_OK
    assert exp_resp.json()["downside_at_tail"] > 0

    lapse_resp = client.get(f"/api/v1/underwriting/decisions/{dec_id}/lapse-conditions")
    assert lapse_resp.status_code == status.HTTP_200_OK
    assert isinstance(lapse_resp.json(), list)
    assert len(lapse_resp.json()) > 0

    verd_resp = client.get(f"/api/v1/underwriting/decisions/{dec_id}/verdict")
    assert verd_resp.status_code == status.HTTP_200_OK
    assert "verdict" in verd_resp.json()

    # 7. Verify evidence APIs
    ev_resp = client.get(f"/api/v1/evidence/decisions/{dec_id}")
    assert ev_resp.status_code == status.HTTP_200_OK
    assert isinstance(ev_resp.json(), list)

    calc_resp = client.get(f"/api/v1/evidence/decisions/{dec_id}/calculations")
    assert calc_resp.status_code == status.HTTP_200_OK
    assert isinstance(calc_resp.json(), list)

    contra_resp = client.get(f"/api/v1/evidence/decisions/{dec_id}/counter-findings")
    assert contra_resp.status_code == status.HTTP_200_OK
    assert isinstance(contra_resp.json(), list)

    # 8. Verify documents API
    docs_resp = client.get("/api/v1/documents")
    assert docs_resp.status_code == status.HTTP_200_OK
    assert isinstance(docs_resp.json(), list)
    assert len(docs_resp.json()) > 0
    doc_id = docs_resp.json()[0]["id"]

    single_doc = client.get(f"/api/v1/documents/{doc_id}")
    assert single_doc.status_code == status.HTTP_200_OK
    assert single_doc.json()["id"] == doc_id

    # 9. Verify Decision Brief API (Canonical /decisions/{id}/brief)
    brief_resp = client.get(f"/api/v1/decisions/{dec_id}/brief")
    assert brief_resp.status_code == status.HTTP_200_OK
    brief = brief_resp.json()
    assert brief["decision_id"] == dec_id
    assert "sections_json" in brief

    # 10. Verify Approval Action API (APPROVE creates immutable DecisionRecord with snapshot hash)
    action_resp = client.post(
        f"/api/v1/decisions/{dec_id}/actions",
        json={
            "action": "Approve",
            "approver_name": "Chief Risk Officer Sarah Chen",
            "approver_role": "CRO",
            "notes": "Binding authorized under executive delegated authority.",
        },
    )
    assert action_resp.status_code == status.HTTP_200_OK
    rec = action_resp.json()
    assert rec["approver_name"] == "Chief Risk Officer Sarah Chen"
    assert rec["is_immutable"] is True
    assert rec["snapshot_integrity_hash"] is not None
    assert len(rec["snapshot_integrity_hash"]) == 64  # SHA-256 hex digest

    # 11. Retrieve DecisionRecord
    bound_resp = client.get(f"/api/v1/decisions/{dec_id}/record")
    assert bound_resp.status_code == status.HTTP_200_OK
    assert bound_resp.json()["id"] == rec["id"]
    assert bound_resp.json()["snapshot_integrity_hash"] == rec["snapshot_integrity_hash"]


def test_api_phase6_sandbox_and_ledger_endpoints(client):
    """End-to-end API verification for Phase 6: Sandbox re-quotes, versioning, ledger, and recalibration."""
    # 1. Setup an underwritten decision
    create_resp = client.post(
        "/api/v1/decisions",
        json={
            "title": "Phase 6 Sandbox Lifecycle Decision",
            "question_text": "Should we cease discounts for accounts with gross margin under 15%?",
            "horizon_days": 90,
        },
    )
    assert create_resp.status_code == status.HTTP_201_CREATED
    dec_id = create_resp.json()["id"]

    client.post(
        f"/api/v1/decisions/{dec_id}/objective",
        json={
            "primary_goal": "Preserve gross margin",
            "target_metric": "Gross Profit",
        },
    )
    client.post(f"/api/v1/decisions/{dec_id}/plan")
    inv_resp = client.post(f"/api/v1/decisions/{dec_id}/investigate")
    assert inv_resp.status_code == status.HTTP_200_OK

    # 2. Supported assumptions endpoint
    assump_resp = client.get(f"/api/v1/sandbox/decisions/{dec_id}/supported-assumptions")
    assert assump_resp.status_code == status.HTTP_200_OK
    assumps = assump_resp.json()
    assert isinstance(assumps, list)
    assump_names = [a["name"] for a in assumps]
    assert "segment_churn" in assump_names
    assert "volume_retention" in assump_names

    # 3. Scenario versions endpoint
    vers_resp = client.get(f"/api/v1/sandbox/decisions/{dec_id}/versions")
    assert vers_resp.status_code == status.HTTP_200_OK
    vers = vers_resp.json()
    assert len(vers) >= 1
    assert any(v["is_baseline"] is True for v in vers)

    # 4. Instant Deterministic Re-quote (normal what-if)
    baseline_churn = next(a["baseline_value"] for a in assumps if a["name"] == "segment_churn")
    requote_resp = client.post(
        "/api/v1/sandbox/re-quote",
        json={
            "decision_id": dec_id,
            "run_label": "Test What-If 1",
            "assumptions": {
                "segment_churn": baseline_churn + 0.02,
                "volume_retention": 0.95,
            },
        },
    )
    assert requote_resp.status_code == status.HTTP_200_OK
    q_data = requote_resp.json()
    assert q_data["is_sandbox"] is True
    assert len(q_data["changed_assumptions"]) >= 1
    assert "projected_upside" in q_data
    assert "decision_premium" in q_data
    assert "coverage_state" in q_data

    # 5. Deterministic Re-quote with severe shock triggering COVERAGE_LAPSED
    shock_resp = client.post(
        "/api/v1/sandbox/re-quote",
        json={
            "decision_id": dec_id,
            "run_label": "Severe Stress Run",
            "assumptions": {
                "segment_churn": 0.20,  # 20% churn far exceeds tolerance
                "volume_retention": 0.80,
            },
        },
    )
    assert shock_resp.status_code == status.HTTP_200_OK
    shock_data = shock_resp.json()
    assert shock_data["coverage_state"] == "COVERAGE_LAPSED"
    assert any(c["is_breached"] is True for c in shock_data["lapse_conditions"])

    # 6. Seed synthetic historical ledger
    seed_resp = client.post("/api/v1/ledger/seed-simulated?force=true")
    assert seed_resp.status_code == status.HTTP_200_OK
    assert len(seed_resp.json()) == 12

    # 7. List ledger entries and verify simulated disclaimer flag
    ledger_list = client.get("/api/v1/ledger?limit=20")
    assert ledger_list.status_code == status.HTTP_200_OK
    assert ledger_list.json()["total"] >= 12
    assert any(e["is_simulated"] is True for e in ledger_list.json()["items"])

    # 8. Query recalibration for pricing class
    recal_resp = client.get("/api/v1/ledger/recalibration/pricing")
    assert recal_resp.status_code == status.HTTP_200_OK
    recal = recal_resp.json()
    assert recal["decision_class"] == "pricing"
    assert recal["logged_decisions_count"] >= 12
    assert recal["credibility_z"] > 0.5
    assert 0.5 <= recal["experience_factor"] <= 2.5

    # 9. Approve the decision and verify automatic ledger binding
    appr_resp = client.post(
        f"/api/v1/decisions/{dec_id}/actions",
        json={
            "action": "Approve",
            "approver_name": "Eleanor Vance",
            "approver_role": "Chief Underwriter",
            "notes": "Approved under Phase 6 sandbox validation.",
        },
    )
    assert appr_resp.status_code == status.HTTP_200_OK

    # 10. Verify decision entry exists in ledger
    dec_entry_resp = client.get(f"/api/v1/ledger/decisions/{dec_id}/entry")
    assert dec_entry_resp.status_code == status.HTTP_200_OK
    entry = dec_entry_resp.json()
    assert entry["decision_id"] == dec_id
    assert entry["human_action"] == "Approved"

    # 11. Log actual outcome and assert deterministic variance
    entry_id = entry["id"]
    outcome_resp = client.post(
        f"/api/v1/ledger/{entry_id}/outcomes",
        json={
            "primary_metric_realised": entry["projected_upside"] - 15000.0,
            "logged_by": "Eleanor Vance",
            "variance_notes": "Minor shortfall within tolerance.",
        },
    )
    assert outcome_resp.status_code == status.HTTP_201_CREATED
    assert outcome_resp.json()["primary_metric_realised"] == entry["projected_upside"] - 15000.0

    # Verify updated entry has exact variance
    updated_entry = client.get(f"/api/v1/ledger/{entry_id}")
    assert updated_entry.status_code == status.HTTP_200_OK
    assert abs(updated_entry.json()["actual_vs_predicted_variance"] - (-15000.0)) < 1e-4


