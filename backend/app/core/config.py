"""TRACE Central Configuration.

Provides environment-driven settings, sensible development defaults,
and central definitions for Rate Card defaults, verdict bands,
and system thresholds.

Rules:
- [DEFAULT] values are configurable.
- [LOCKED] values must not be reinterpreted.
- No secrets committed.
"""

from pathlib import Path
import os
from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Deterministically resolve repository root regardless of current working directory
_CURRENT_DIR = Path(__file__).resolve().parent  # backend/app/core
_BACKEND_DIR = _CURRENT_DIR.parent.parent       # backend
_REPO_ROOT = _BACKEND_DIR.parent                # TRACE root

# Single canonical source of truth for local environment configuration
_CANONICAL_ENV_FILE = _REPO_ROOT / ".env"
_BACKEND_ENV_FILE = _BACKEND_DIR / ".env"
_CWD_ENV_FILE = Path(".env").resolve()

_RESOLVED_ENV_FILE = (
    _CANONICAL_ENV_FILE if _CANONICAL_ENV_FILE.is_file()
    else _BACKEND_ENV_FILE if _BACKEND_ENV_FILE.is_file()
    else _CWD_ENV_FILE if _CWD_ENV_FILE.is_file()
    else _CANONICAL_ENV_FILE
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_RESOLVED_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Application
    APP_NAME: str = "TRACE Decision Underwriting Engine"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = Field(default="development", description="development, test, production")
    DEBUG: bool = Field(default=True)
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(
        default="trace-dev-insecure-secret-key-change-in-production-32bytes",
        description="Application secret key",
    )
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]


    # Database (PostgreSQL)
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/trace_dev",
        description="Primary PostgreSQL database URL",
    )
    TEST_DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/trace_test",
        description="Database URL for automated test runs",
    )
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    USE_PGVECTOR: bool = Field(
        default=False,
        description="True if PostgreSQL has the pgvector extension compiled and enabled",
    )
    EMBEDDING_DIMENSION: int = Field(
        default=1536,
        description="Vector embedding dimension for semantic retrieval",
    )

    # LLM Configuration (Provider-Agnostic Interface)
    # Architecture: One LLM + Structured Specialist Roles + Deterministic Analytics
    # The LLM may NEVER be the source of numerical truth.
    LLM_PROVIDER: str = Field(default="mock", description="mock, openai, anthropic, gemini")
    LLM_MODEL: str = Field(default="mock-trace-v1", description="Model name identifier")
    LLM_API_KEY: Optional[str] = Field(default=None, description="API key for selected LLM provider")
    LLM_BASE_URL: Optional[str] = Field(default=None, description="Optional custom base URL for OpenAI-compatible LLM endpoints")
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 4096
    LLM_TIMEOUT_SECONDS: int = 60

    @property
    def LLM_MODEL_NAME(self) -> str:
        """Alias for backward compatibility with older references."""
        return self.LLM_MODEL


    # Rate Card Default Policy Settings [DEFAULT]
    # Note from Bible: Weights & bands are product policy, shown openly to the user, never hidden.
    RATE_CARD_DEFAULT_NAME: str = "Standard Commercial Underwriting Policy"
    RATE_CARD_DEFAULT_VERSION: str = "1.0.0"
    
    # Premium Loads Weights
    WEIGHT_DATA_QUALITY_LOAD: float = Field(
        default=0.10,
        description="Max weight on Data-Quality Load (up to ~10% of Projected Upside at quality score 1.0)",
    )
    WEIGHT_VERIFICATION_LOAD: float = Field(
        default=0.05,
        description="Max weight on Verification Load (up to ~5% of Projected Upside for unverified figures)",
    )
    WEIGHT_CONTRADICTION_LOAD: float = Field(
        default=1.00,
        description="Weight on Contradiction Load (100% of quantified unabsorbed adverse findings)",
    )
    BASE_MODEL_UNCERTAINTY_WEIGHT: float = Field(
        default=0.05,
        description="Baseline load for model and sample uncertainty before ledger experience recalibration",
    )

    # Verdict Bands (as a percentage of Projected Upside)
    # Bible Section 16.5:
    # Recommended: Premium Rate < 10% and no breached lapse condition
    # Recommended with Conditions: 10% to 25%, or specific conditions required
    # Refer: 25% to 50%, or limited data sufficiency, or critical verification failure
    # Decline: > 50%, or net loss probability above cap, or insufficient data
    BAND_RECOMMENDED_MAX_RATE: float = 0.10
    BAND_RECOMMENDED_WITH_CONDITIONS_MAX_RATE: float = 0.25
    BAND_REFER_MAX_RATE: float = 0.50

    # Risk Metrics & Scenarios
    TAIL_PERCENTILE: float = Field(default=0.10, description="Tail definition: worst 10% of outcomes (P10)")
    SCENARIO_SIMULATION_COUNT: int = Field(default=1000, description="Number of Monte Carlo scenario draws")
    SCENARIO_DEFAULT_SEED: int = Field(default=42, description="Deterministic seed for reproducible runs")
    DEFAULT_DECISION_VALIDITY_DAYS: int = Field(default=60, description="Standard validity window in days")

    # Credibility Recalibration Policy (Loss History Ledger)
    # Project Bible Section 21.4 [DEFAULT method]:
    # Form: Z = n / (n + k), where k is a tuning constant; Z is capped.
    # Note: k is not locked by the Bible; it is a configurable policy parameter.
    # When n = 0, behavior remains strictly neutral (Z = 0.0, experience factor = 1.0).
    LEDGER_CREDIBILITY_K: float = Field(
        default=10.0,
        description="Configurable credibility policy tuning constant k for experience factor blending (default: 10.0)",
    )
    LEDGER_MAX_CREDIBILITY: float = Field(
        default=0.85,
        description="Configurable maximum credibility cap Z applied to historical error adjustment (default: 0.85)",
    )
    LEDGER_EXPERIENCE_FACTOR_MIN: float = Field(
        default=0.50,
        description="Configurable lower bound cap for experience factor recalibration (default: 0.50)",
    )
    LEDGER_EXPERIENCE_FACTOR_MAX: float = Field(
        default=2.50,
        description="Configurable upper bound cap for experience factor recalibration (default: 2.50)",
    )

    # File Ingestion & Storage Limits
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS: List[str] = [".csv", ".xlsx", ".xls", ".json", ".pdf", ".txt", ".md"]


settings = Settings()
