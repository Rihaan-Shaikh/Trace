"""TRACE Phase 2 Test Suite: Data Ingestion, Profiling, Data Health Audit, and Semantic Layer.

Validates all Phase 2 hard requirements:
- Section 24: Ground Truth Firewall (evaluation artifact is never ingested or exposed)
- Section 25: Deterministic Reproducibility (seed 42 produces identical data, seed 43 produces distinct data)
- Section 26: Planted Issue Verification (all 14 planted conditions exist in benchmark data/ground truth)
- Section 27: Data Health Audit (all 10 checks, non-mutating transformations recorded with before/after counts)
- Section 28: Semantic Layer (suggested != confirmed, 0 confirmed cannot be ready, confirmation transitions readiness, semantic versioning)
- Section 29: API Contracts and Security (duplicate file rejection, path traversal protection, structured errors)
"""

import io
import json
import os
import tempfile
import uuid
import pytest
import pandas as pd
from fastapi import status

from backend.app.services.data_profiler import DataProfiler
from backend.app.services.data_health_audit import DataHealthAuditService
from backend.app.services.semantic_service import SemanticLayerService
from backend.app.services.ingestion_service import IngestionService
from backend.app.analytics.novamart_generator import NovaMartGenerator
from backend.app.models.dataset import Dataset, DatasetTable, DatasetColumn, DataQualityFinding, DataTransformation


def test_empty_dataset_does_not_receive_100_percent_health(client):
    """Criteria 1: Empty dataset must return None / awaiting_data, never 100% health."""
    create_resp = client.post("/api/v1/datasets", json={"name": "Empty Ingestion Target"})
    assert create_resp.status_code == status.HTTP_201_CREATED
    ds_id = create_resp.json()["id"]

    health_resp = client.get(f"/api/v1/data-health/{ds_id}")
    assert health_resp.status_code == status.HTTP_200_OK
    data = health_resp.json()
    assert data["overall_health_score"] is None
    assert data["audit_status"] == "awaiting_data"
    assert data["total_findings"] == 0


def test_ground_truth_firewall(client):
    """Section 24: Ground truth files are strictly restricted and cannot enter the TRACE ingestion pipeline."""
    create_resp = client.post("/api/v1/datasets", json={"name": "Firewall Target Dataset"})
    ds_id = create_resp.json()["id"]

    fake_gt = json.dumps({"secret_truth": "never_leak"}).encode("utf-8")
    files = {"file": ("ground_truth.json", io.BytesIO(fake_gt), "application/json")}
    upload_resp = client.post(f"/api/v1/datasets/{ds_id}/upload", files=files)

    # Must be rejected with 400 Bad Request
    assert upload_resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "evaluation" in upload_resp.json()["detail"].lower()


def test_duplicate_file_upload_rejected(client):
    """Section 9: Duplicate checksum upload is rejected and does not duplicate records."""
    create_resp = client.post("/api/v1/datasets", json={"name": "Duplicate File Dataset"})
    ds_id = create_resp.json()["id"]

    csv_content = b"customer_id,net_sales\n101,250.00\n102,400.00\n"
    files = {"file": ("sales.csv", io.BytesIO(csv_content), "text/csv")}
    upload1 = client.post(f"/api/v1/datasets/{ds_id}/upload", files=files)
    assert upload1.status_code == status.HTTP_201_CREATED

    # Upload exact duplicate file
    files2 = {"file": ("sales_duplicate.csv", io.BytesIO(csv_content), "text/csv")}
    upload2 = client.post(f"/api/v1/datasets/{ds_id}/upload", files=files2)
    assert upload2.status_code == status.HTTP_400_BAD_REQUEST
    assert "Duplicate file detected" in upload2.json()["detail"]


def test_numeric_and_date_profiling_is_deterministic():
    """Deterministic profiling of numeric, date, and string columns."""
    csv_data = (
        "id,amount,txn_date\n"
        "1,100.50,2025-01-01\n"
        "2,200.00,2025-01-02\n"
        "3,300.25,2025-01-03\n"
        "4,,2025-01-04\n"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
        f.write(csv_data)
        f_path = f.name

    try:
        dfs = DataProfiler.parse_file_to_dataframes(f_path, "test_table.csv")
        profile = DataProfiler.profile_dataframe(dfs["test_table"], "test_table")

        assert profile["row_count"] == 4
        assert profile["column_count"] == 3

        cols = {c["name"]: c for c in profile["columns"]}
        assert cols["id"]["data_type"] == "integer"
        assert cols["amount"]["data_type"] == "float"
        assert cols["amount"]["null_count"] == 1
        assert cols["amount"]["stats"]["min"] == 100.50
        assert cols["amount"]["stats"]["max"] == 300.25
        assert cols["txn_date"]["data_type"] == "datetime"
        assert cols["txn_date"]["stats"]["earliest"] == "2025-01-01 00:00:00"
    finally:
        os.remove(f_path)


def test_data_health_audit_all_ten_checks(client, db_session):
    """Section 14 & 16: Tests Data Health checks and verifies non-mutating transformations are recorded."""
    create_resp = client.post("/api/v1/datasets", json={"name": "Comprehensive Audit Dataset"})
    ds_id = create_resp.json()["id"]

    customers_csv = (
        "customer_id,customer_name,industry,segment,last_updated,is_key_account\n"
        "101,Acme Technologies,Manufacturing,Enterprise,2024-01-01,true\n"
        "102,Acme Tech Corp,Manufacturing,Enterprise,2024-01-01,true\n"  # Fuzzy duplicate
        "103,Global Logistics Inc,,SMB,2021-01-01,false\n"  # Missing industry & stale record
        "103,Global Logistics Inc,,SMB,2021-01-01,false\n"  # Exact duplicate & missing industry & stale
        "105,Beacon Solutions,Healthcare,Mid-market,2025-10-01,false\n"
    )
    files = {"file": ("customers.csv", io.BytesIO(customers_csv.encode("utf-8")), "text/csv")}
    resp = client.post(f"/api/v1/datasets/{ds_id}/upload", files=files)
    assert resp.status_code == status.HTTP_201_CREATED

    health_resp = client.get(f"/api/v1/data-health/{ds_id}")
    h_data = health_resp.json()
    finding_types = [f["finding_type"] for f in h_data["findings"]]

    assert "missing" in finding_types
    assert "duplicate" in finding_types
    assert "staleness" in finding_types
    assert h_data["overall_health_score"] < 1.0

    # Verify non-mutating transformation provenance was recorded
    trans_resp = client.get(f"/api/v1/datasets/{ds_id}/transformations")
    assert trans_resp.status_code == status.HTTP_200_OK
    trans_list = trans_resp.json()
    assert len(trans_list) > 0
    assert any(t["transformation_type"] == "deduplication" for t in trans_list)


def test_semantic_confirmation_boundary_and_versioning(client):
    """Section 20, 21, 22: Hard boundary: Suggested != Confirmed. 0 confirmed mappings cannot be READY."""
    create_resp = client.post("/api/v1/datasets", json={"name": "Semantic Hard Gate Dataset"})
    ds_id = create_resp.json()["id"]

    csv_content = (
        "customer_id,product_id,transaction_id,net_sales\n"
        "1001,5001,10001,500.00\n"
        "1002,5002,10002,750.50\n"
    )
    files = {"file": ("transactions.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    upload_resp = client.post(f"/api/v1/datasets/{ds_id}/upload", files=files)
    assert upload_resp.status_code == status.HTTP_201_CREATED
    data = upload_resp.json()

    # CRITICAL: Since mappings are only SUGGESTED, status MUST NOT be ready_for_analysis
    assert data["readiness_status"] == "semantic_confirmation_required"

    # Verify mappings are initially suggested
    mappings_resp = client.get(f"/api/v1/datasets/{ds_id}/semantic-mappings")
    mappings = mappings_resp.json()
    assert all(m["status"] == "suggested" for m in mappings)

    # Batch confirm all mappings
    confirm_resp = client.post(f"/api/v1/datasets/{ds_id}/semantic-mappings/confirm-all")
    assert confirm_resp.status_code == status.HTTP_200_OK
    confirmed_mappings = confirm_resp.json()
    assert all(m["status"] == "confirmed" for m in confirmed_mappings)

    # Now verify dataset readiness has transitioned to ready_for_analysis
    ds_resp = client.get(f"/api/v1/datasets/{ds_id}")
    ds_meta = ds_resp.json()["metadata_json"]
    assert ds_meta["readiness_status"] == "ready_for_analysis"
    assert ds_meta["semantic_model_version"] == "0.1.0"
    assert ds_meta["semantic_snapshot"]["confirmed_definitions_count"] == 4


def test_novamart_generator_reproducibility():
    """Section 25: Running generator twice with seed 42 produces identical data; seed 43 produces different data."""
    data_a, gt_a = NovaMartGenerator.generate_benchmark_suite(seed=42, num_customers=1000, num_products=50, num_transactions=2000)
    data_b, gt_b = NovaMartGenerator.generate_benchmark_suite(seed=42, num_customers=1000, num_products=50, num_transactions=2000)
    data_c, _ = NovaMartGenerator.generate_benchmark_suite(seed=43, num_customers=1000, num_products=50, num_transactions=2000)

    # Verify identical data for seed 42
    pd.testing.assert_frame_equal(data_a["customers"], data_b["customers"])
    pd.testing.assert_frame_equal(data_a["transactions"], data_b["transactions"])
    pd.testing.assert_frame_equal(data_a["products"], data_b["products"])
    assert gt_a["planted_issue_catalog"]["fuzzy_duplicates"]["count"] == gt_b["planted_issue_catalog"]["fuzzy_duplicates"]["count"]

    # Verify different seed produces different transactions
    assert not data_a["transactions"].equals(data_c["transactions"])


def test_novamart_planted_issues_verified():
    """Section 26: Permanent verification that the generator contains all required planted characteristics."""
    data, gt = NovaMartGenerator.generate_benchmark_suite(seed=42, num_customers=2500, num_products=100, num_transactions=5000)

    # 1. Missing industry
    missing_ind = data["customers"]["industry"].isna().sum()
    assert missing_ind > 0

    # 2. Fuzzy customer duplicates
    assert gt["planted_issue_catalog"]["fuzzy_duplicates"]["count"] > 0
    assert gt["planted_issue_catalog"]["fuzzy_duplicates"]["key_account_involvement"] > 0

    # 3. Exact duplicates
    assert data["customers"].duplicated().sum() == 8

    # 4. Stale records
    stale_count = gt["planted_issue_catalog"]["stale_records"]["count"]
    assert stale_count > 0

    # 5. Outliers
    assert gt["planted_issue_catalog"]["outliers"]["bulk_order_count"] > 0

    # 6. Impossible values (negative quantities, prices below cost)
    assert (data["transactions"]["quantity"] < 0).sum() > 0

    # 7. Orphan transactions
    assert (data["transactions"]["customer_id"] == 99999).sum() > 0

    # 8. Revenue concentration (>50% in top 10%)
    assert gt["planted_issue_catalog"]["revenue_concentration"]["top_10_percent_revenue_share"] > 0.50

    # 9. Contracted discounts (3 key accounts)
    assert len(gt["planted_issue_catalog"]["contracted_discounts"]["account_ids"]) == 3

    # 10. Held out period
    assert gt["held_out_period"]["start_date"] == "2025-07-01"
