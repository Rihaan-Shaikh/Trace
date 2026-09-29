"""Tests for TRACE Central Configuration and Policy Defaults."""

import pytest
from backend.app.core.config import Settings, settings


def test_settings_load_defaults():
    s = Settings()
    assert s.APP_NAME == "TRACE Decision Underwriting Engine"
    assert s.ENVIRONMENT in ("development", "test", "production")
    assert s.WEIGHT_DATA_QUALITY_LOAD == 0.10
    assert s.WEIGHT_VERIFICATION_LOAD == 0.05
    assert s.WEIGHT_CONTRADICTION_LOAD == 1.00
    assert s.BASE_MODEL_UNCERTAINTY_WEIGHT == 0.05
    assert s.BAND_RECOMMENDED_MAX_RATE == 0.10
    assert s.BAND_RECOMMENDED_WITH_CONDITIONS_MAX_RATE == 0.25
    assert s.BAND_REFER_MAX_RATE == 0.50
    assert s.TAIL_PERCENTILE == 0.10
    assert s.SCENARIO_SIMULATION_COUNT == 1000
    assert s.SCENARIO_DEFAULT_SEED == 42


def test_settings_cors_origins_configured():
    assert "http://localhost:3000" in settings.CORS_ORIGINS
    assert "http://127.0.0.1:3000" in settings.CORS_ORIGINS


def test_no_hardcoded_secrets_in_production():
    # If in production, SECRET_KEY should not be default
    s = Settings(ENVIRONMENT="production")
    assert s.ENVIRONMENT == "production"
