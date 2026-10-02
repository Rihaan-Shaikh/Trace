"""TRACE Evaluation Run Database Model.

Stores historical and automated evaluation run results for the Evaluation Panel.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Float, JSON
from backend.app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin


class EvaluationRunRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable record of an automated Evaluation Harness run."""
    __tablename__ = "evaluation_runs"

    run_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    dataset_version: Mapped[str] = mapped_column(String(64), nullable=False)
    ground_truth_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    random_seed: Mapped[int] = mapped_column(Integer, default=42, nullable=False)
    scenarios_total: Mapped[int] = mapped_column(Integer, nullable=False)
    scenarios_passed: Mapped[int] = mapped_column(Integer, nullable=False)
    scenarios_failed: Mapped[int] = mapped_column(Integer, nullable=False)
    pass_rate: Mapped[float] = mapped_column(Float, nullable=False)
    metrics_summary: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    scenario_results: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
