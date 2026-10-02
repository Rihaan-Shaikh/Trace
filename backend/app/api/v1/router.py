"""TRACE API v1 Router Aggregator.

Assembles all domain routers under /api/v1.
"""

from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    health,
    datasets,
    data_health,
    semantic,
    decisions,
    investigations,
    evidence,
    documents,
    scenarios,
    underwriting,
    sandbox,
    approvals,
    ledger,
    rate_card,
    jobs,
    evaluation,
    demo,
)

api_router = APIRouter()

# System & Policy
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(rate_card.router, tags=["Rate Card"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(demo.router, prefix="/demo", tags=["Demo Management"])

# Data & Semantic
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(data_health.router, prefix="/data-health", tags=["Data Health"])
api_router.include_router(semantic.router, prefix="/semantic", tags=["Semantic Layer"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])

# Decision Lifecycle
api_router.include_router(decisions.router, prefix="/decisions", tags=["Decisions"])
api_router.include_router(investigations.router, prefix="/investigations", tags=["Investigations"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["Evidence Chain"])

# Underwriting & Sandbox
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["Scenarios"])
api_router.include_router(underwriting.router, prefix="/underwriting", tags=["Underwriting"])
api_router.include_router(sandbox.router, prefix="/sandbox", tags=["Decision Sandbox"])

# Approval & Ledger (Canonical /decisions/{id}/brief, /actions, /record)
api_router.include_router(approvals.router, tags=["Human Approval"])
api_router.include_router(ledger.router, prefix="/ledger", tags=["Loss History Ledger"])

# Evaluation Harness
api_router.include_router(evaluation.router, prefix="/evaluation", tags=["Evaluation Harness"])

