"""TRACE Evaluation API Endpoints.

Provides developer and audit inspection of benchmark evaluation runs,
scoring against isolated ground truth without exposing ground truth to runtime agents.
"""

from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from backend.app.db.session import get_db
from backend.app.evaluation.harness import EvaluationHarness
from backend.app.models.evaluation import EvaluationRunRecord

router = APIRouter()


@router.post("/run")
def trigger_evaluation_run(
    seed: int = Query(42, description="Deterministic pseudo-random seed for evaluation scenarios"),
    db: Session = Depends(get_db),
):
    """Triggers the full 18-scenario Evaluation Harness benchmark suite."""
    report = EvaluationHarness.run_suite(db=db, random_seed=seed)
    return report


@router.get("/runs")
def list_evaluation_runs(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Lists past persisted Evaluation Harness runs."""
    records = list(
        db.scalars(
            select(EvaluationRunRecord)
            .order_by(desc(EvaluationRunRecord.created_at))
            .limit(limit)
        ).all()
    )
    return [
        {
            "id": str(r.id),
            "run_id": r.run_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "dataset_version": r.dataset_version,
            "ground_truth_hash": r.ground_truth_hash,
            "random_seed": r.random_seed,
            "scenarios_total": r.scenarios_total,
            "scenarios_passed": r.scenarios_passed,
            "scenarios_failed": r.scenarios_failed,
            "pass_rate": round(r.pass_rate * 100.0, 2),
            "metrics_summary": r.metrics_summary,
        }
        for r in records
    ]


@router.get("/latest")
def get_latest_evaluation_run(db: Session = Depends(get_db)):
    """Fetches the most recent Evaluation Harness run."""
    record = db.scalar(
        select(EvaluationRunRecord)
        .order_by(desc(EvaluationRunRecord.created_at))
    )
    if not record:
        # Return a structured empty state indicating no runs have been performed yet
        return {
            "has_run": False,
            "message": "No evaluation run completed.",
        }

    return {
        "has_run": True,
        "id": str(record.id),
        "run_id": record.run_id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "dataset_version": record.dataset_version,
        "ground_truth_hash": record.ground_truth_hash,
        "random_seed": record.random_seed,
        "scenarios_total": record.scenarios_total,
        "scenarios_passed": record.scenarios_passed,
        "scenarios_failed": record.scenarios_failed,
        "pass_rate": round(record.pass_rate * 100.0, 2),
        "metrics_summary": record.metrics_summary,
        "scenario_results": record.scenario_results,
    }


@router.get("/runs/{run_id}")
def get_evaluation_run_by_id(run_id: str, db: Session = Depends(get_db)):
    """Retrieves full scenario details for a specific evaluation run."""
    record = db.scalar(
        select(EvaluationRunRecord).where(EvaluationRunRecord.run_id == run_id)
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation run '{run_id}' not found.",
        )

    return {
        "id": str(record.id),
        "run_id": record.run_id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "dataset_version": record.dataset_version,
        "ground_truth_hash": record.ground_truth_hash,
        "random_seed": record.random_seed,
        "scenarios_total": record.scenarios_total,
        "scenarios_passed": record.scenarios_passed,
        "scenarios_failed": record.scenarios_failed,
        "pass_rate": round(record.pass_rate * 100.0, 2),
        "metrics_summary": record.metrics_summary,
        "scenario_results": record.scenario_results,
    }
