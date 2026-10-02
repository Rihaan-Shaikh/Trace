"""TRACE Decision Underwriting Engine Ã¢Â€Â” Main FastAPI Application Entrypoint.

Architecture Principles:
- ONE LLM + STRUCTURED SPECIALIST ROLES + DETERMINISTIC ANALYTICS
- The LLM may NEVER be the source of numerical truth.
- Human approval remains mandatory for a decision to become an actual Decision Record.
- Immutability of signed decisions and historical predictions.
"""

import sys
import os

# Ensure workspace root is always on sys.path for direct uvicorn invocations
_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from backend.app.api.v1.router import api_router
from backend.app.core.config import settings
from backend.app.core.errors import (
    TraceBaseException,
    EntityNotFoundError,
    ImmutableRecordError,
    InvalidStateTransitionError,
    NumericalIntegrityViolationError,
    DataSufficiencyError,
    InvestigationPrerequisiteError,
)
from backend.app.core.logging import logger
from backend.app.db.session import SessionLocal
from backend.app.services.rate_card_service import RateCardService
from backend.app.services.decision_service import DecisionService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle startup and shutdown handler."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}]")
    # Initialize default Rate Card policy and Decision Templates in database
    with SessionLocal() as db:
        try:
            RateCardService.get_or_create_default_rate_card(db)
            DecisionService.seed_default_templates(db)
            logger.info("Successfully verified default Rate Card and Decision Templates.")
        except Exception as e:
            logger.warning(f"Startup database initialization deferred or failed: {e}")

    yield
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title="TRACE Ã¢Â€Â” Decision Underwriting Engine",
    description=(
        "TRACE underwrites business decisions instead of guessing at them. "
        "Delivers Decision Premium, Exposure Report, Coverage Lapse Conditions, and an inspectable Evidence Chain."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers
@app.exception_handler(EntityNotFoundError)
async def entity_not_found_handler(request: Request, exc: EntityNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(ImmutableRecordError)
async def immutable_record_handler(request: Request, exc: ImmutableRecordError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(InvalidStateTransitionError)
async def invalid_state_handler(request: Request, exc: InvalidStateTransitionError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(NumericalIntegrityViolationError)
async def numerical_violation_handler(request: Request, exc: NumericalIntegrityViolationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(DataSufficiencyError)
async def data_sufficiency_handler(request: Request, exc: DataSufficiencyError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(InvestigationPrerequisiteError)
async def investigation_prerequisite_handler(request: Request, exc: InvestigationPrerequisiteError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(TraceBaseException)
async def generic_trace_exception_handler(request: Request, exc: TraceBaseException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request payload failed schema validation",
                "details": {"errors": exc.errors()},
            }
        },
    )


# Root route
@app.get("/")
def root():
    return {
        "product": "TRACE",
        "tagline": "Not confidence. Coverage.",
        "description": "Decision Underwriting Engine for Business Data",
        "api_docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }


# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)
