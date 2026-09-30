"""TRACE Pytest Fixtures and Test Configuration.

Configures test database session, test client, and cleanup hooks.
"""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.models import Base
from backend.app.db.session import get_db
from backend.app.main import app

# Use PostgreSQL test database or fallback to SQLite in-memory
TEST_DB_URL = settings.TEST_DATABASE_URL

test_engine = create_engine(TEST_DB_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def configure_test_environment():
    """Ensure automated tests run against deterministic mock provider unless explicitly testing external providers."""
    original_provider = settings.LLM_PROVIDER
    settings.LLM_PROVIDER = "mock"
    yield
    settings.LLM_PROVIDER = original_provider


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all tables in the test database once per session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)



@pytest.fixture
def db_session():
    """Provides a transactional database session rolled back after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """Provides a FastAPI TestClient with the database dependency overridden."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
