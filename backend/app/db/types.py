"""TRACE Custom Database Types.

Provides dialect-aware, pgvector-compliant vector representation.
"""

from typing import Optional, List, Any
import logging
from sqlalchemy.types import TypeDecorator, JSON, Float
from sqlalchemy.dialects.postgresql import ARRAY, DOUBLE_PRECISION
from backend.app.core.config import settings

logger = logging.getLogger("trace.db.types")

try:
    from pgvector.sqlalchemy import Vector as PGVector
    HAS_PGVECTOR_LIB = True
except ImportError:
    HAS_PGVECTOR_LIB = False
    PGVector = None


class EmbeddingVector(TypeDecorator):
    """Compliant Vector Type for TRACE.

    Target Architecture: PostgreSQL + pgvector (VECTOR type).
    When running in environments where PostgreSQL has the vector C-extension installed
    and enabled (configured via settings.USE_PGVECTOR or auto-detected), compiles
    natively to pgvector.sqlalchemy.Vector(dim).
    When running in local Windows environments where PostgreSQL lacks the compiled
    pgvector binary, falls back cleanly to PostgreSQL native ARRAY(DOUBLE_PRECISION)
    so relational schema, floating-point precision, and migration integrity remain intact
    without substituting arbitrary unstructured JSON.
    """

    impl = ARRAY(DOUBLE_PRECISION)
    cache_ok = True

    def __init__(self, dim: int = 1536):
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            if getattr(settings, "USE_PGVECTOR", False) and HAS_PGVECTOR_LIB and PGVector is not None:
                try:
                    return dialect.type_descriptor(PGVector(self.dim))
                except Exception:
                    pass
            return dialect.type_descriptor(ARRAY(DOUBLE_PRECISION))
        return dialect.type_descriptor(JSON)

    def process_bind_param(self, value: Any, dialect: Any) -> Optional[List[float]]:
        if value is None:
            return None
        if isinstance(value, (list, tuple)):
            return [float(x) for x in value]
        return value

    def process_result_value(self, value: Any, dialect: Any) -> Optional[List[float]]:
        if value is None:
            return None
        if hasattr(value, "tolist"):
            return value.tolist()
        return list(value)
