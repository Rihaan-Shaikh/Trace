"""TRACE Evidence, Calculation, Verification, Assumption, and RAG Domain Models.

Implements the Evidence Chain and Provenance foundation specified in Project Bible Section 17 & 20:
- Every recommendation traces to calculations, source records, and assumptions.
- Independent verification checks: method 1 vs method 2 comparison with explicit tolerances.
- Quantified counter-findings from the Counter-Decision Underwriter.
- Document and chunk storage for RAG evidence (treating uploaded documents strictly as DATA, not instructions).
"""

from typing import List, Optional
import uuid
from sqlalchemy import (
    String,
    Text,
    Integer,
    Float,
    Boolean,
    ForeignKey,
    Enum as SAEnum,
    Index,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, GUID, TimestampMixin, UUIDPrimaryKeyMixin
from backend.app.models.enums import StatementLevel, AssumptionType
from backend.app.db.types import EmbeddingVector


class EvidenceItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """An individual piece of inspectable evidence linking statements to facts."""
    __tablename__ = "evidence_items"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    statement_text: Mapped[str] = mapped_column(Text, nullable=False)
    statement_level: Mapped[StatementLevel] = mapped_column(
        SAEnum(StatementLevel, native_enum=False),
        default=StatementLevel.CALCULATED_RESULT,
        nullable=False,
    )
    metric_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    calculation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("calculations.id", ondelete="SET NULL"), nullable=True
    )
    source_table_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    row_count_sample: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_contradiction: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    provenance_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="evidence_items")
    calculation: Mapped[Optional["Calculation"]] = relationship("Calculation")


class Calculation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Deterministic mathematical computation with complete provenance."""
    __tablename__ = "calculations"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric_name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    formula_used: Mapped[str] = mapped_column(Text, nullable=False)
    result_numeric: Mapped[float] = mapped_column(Float, nullable=False)
    result_formatted: Mapped[str] = mapped_column(String(64), nullable=False)
    input_parameters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    input_row_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    code_provenance: Mapped[str] = mapped_column(String(255), default="deterministic_analytics_v1", nullable=False)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="calculations")
    verification_results: Mapped[List["VerificationResult"]] = relationship(
        "VerificationResult", back_populates="calculation", cascade="all, delete-orphan"
    )


class VerificationResult(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Independent verification recomputation by a secondary method."""
    __tablename__ = "verification_results"

    calculation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("calculations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    method_primary_name: Mapped[str] = mapped_column(String(128), nullable=False)
    method_secondary_name: Mapped[str] = mapped_column(String(128), nullable=False)
    method_primary_value: Mapped[float] = mapped_column(Float, nullable=False)
    method_secondary_value: Mapped[float] = mapped_column(Float, nullable=False)
    absolute_discrepancy: Mapped[float] = mapped_column(Float, nullable=False)
    relative_discrepancy: Mapped[float] = mapped_column(Float, nullable=False)
    tolerance_threshold: Mapped[float] = mapped_column(Float, default=0.01, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    calculation: Mapped["Calculation"] = relationship("Calculation", back_populates="verification_results")


class Assumption(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Assumption utilized in decision analysis (data-derived, judgement, or user-supplied)."""
    __tablename__ = "assumptions"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    assumption_type: Mapped[AssumptionType] = mapped_column(
        SAEnum(AssumptionType, native_enum=False),
        default=AssumptionType.DATA_DERIVED,
        nullable=False,
    )
    base_value: Mapped[float] = mapped_column(Float, nullable=False)
    min_value: Mapped[float] = mapped_column(Float, nullable=False)
    max_value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    sensitivity_rank: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="assumptions")


class CounterFinding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Adverse finding produced by the Counter-Decision Underwriter."""
    __tablename__ = "counter_findings"

    decision_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    finding_text: Mapped[str] = mapped_column(Text, nullable=False)
    quantified_impact: Mapped[float] = mapped_column(Float, nullable=False)
    affected_segment: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    evidence_reference: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_absorbed_into_model: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unabsorbed_impact: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    decision: Mapped["Decision"] = relationship("Decision", back_populates="counter_findings")


class Document(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Uploaded reference document (contracts, policies, reports). Treated strictly as DATA."""
    __tablename__ = "documents"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    document_type: Mapped[str] = mapped_column(String(64), default="contract", nullable=False)
    content_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    chunks: Mapped[List["DocumentChunk"]] = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Extracted text chunk with embedding vector representation."""
    __tablename__ = "document_chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    embedding: Mapped[Optional[List[float]]] = mapped_column(EmbeddingVector(1536), nullable=True)  # pgvector-compliant embedding
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    document: Mapped["Document"] = relationship("Document", back_populates="chunks")


class RetrievalRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Audit log of RAG retrieval executions."""
    __tablename__ = "retrieval_records"

    decision_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("decisions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    matched_chunks_json: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    agent_role: Mapped[str] = mapped_column(String(64), nullable=False)
