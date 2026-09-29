"""TRACE Custom Exceptions and Error Models.

Enforces RFC 7807 problem details semantics for API errors and defines
domain-specific exceptions for underwriting invariants and provenance rules.
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Unique error code for client handling")
    message: str = Field(..., description="Human-readable summary of the error")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Structured diagnostics")


class ErrorResponse(BaseModel):
    error: ErrorDetail


class TraceBaseException(Exception):
    """Base exception for all TRACE domain errors."""

    def __init__(self, message: str, code: str = "TRACE_ERROR", details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class EntityNotFoundError(TraceBaseException):
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{entity_id}' was not found.",
            code="ENTITY_NOT_FOUND",
            details={"entity_name": entity_name, "entity_id": str(entity_id)},
        )


class ImmutableRecordError(TraceBaseException):
    def __init__(self, entity_name: str, entity_id: Any, reason: str = "Record is immutable"):
        super().__init__(
            message=f"Cannot modify immutable {entity_name} '{entity_id}': {reason}.",
            code="IMMUTABLE_RECORD_VIOLATION",
            details={"entity_name": entity_name, "entity_id": str(entity_id), "reason": reason},
        )


class InvalidStateTransitionError(TraceBaseException):
    def __init__(self, current_state: str, attempted_state: str, allowed_states: list):
        super().__init__(
            message=f"Invalid lifecycle transition from '{current_state}' to '{attempted_state}'. Allowed: {allowed_states}",
            code="INVALID_STATE_TRANSITION",
            details={
                "current_state": current_state,
                "attempted_state": attempted_state,
                "allowed_states": allowed_states,
            },
        )


class NumericalIntegrityViolationError(TraceBaseException):
    def __init__(self, message: str, calculation_id: Optional[str] = None):
        super().__init__(
            message=f"Numerical integrity check failed: {message}",
            code="NUMERICAL_INTEGRITY_VIOLATION",
            details={"calculation_id": calculation_id} if calculation_id else {},
        )


class DataSufficiencyError(TraceBaseException):
    def __init__(self, message: str, missing_requirements: list):
        super().__init__(
            message=message,
            code="DATA_INSUFFICIENT",
            details={"missing_requirements": missing_requirements},
        )


class RateCardNotFoundError(TraceBaseException):
    def __init__(self, version: str):
        super().__init__(
            message=f"Rate Card version '{version}' not found.",
            code="RATE_CARD_NOT_FOUND",
            details={"version": version},
        )


class InvestigationPrerequisiteError(TraceBaseException):
    def __init__(self, message: str, missing_prerequisite: str):
        super().__init__(
            message=message,
            code="INVESTIGATION_PREREQUISITE_MISSING",
            details={"missing_prerequisite": missing_prerequisite},
        )


class InvestigationExecutionError(TraceBaseException):
    def __init__(self, message: str, stage_id: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="INVESTIGATION_EXECUTION_FAILED",
            details={"stage_id": stage_id, **(details or {})},
        )
