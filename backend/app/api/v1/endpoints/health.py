"""TRACE Health and Diagnostic Endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.schemas.common import SystemHealthResponse, DatabaseHealth

router = APIRouter()


@router.get("/health", response_model=SystemHealthResponse)
def get_system_health(db: Session = Depends(get_db)):
    """System health check verifying API operational status and PostgreSQL connectivity."""
    db_connected = False
    server_version = None
    table_count = 0

    try:
        ver_result = db.execute(text("SELECT version();")).scalar()
        server_version = str(ver_result).split(" on ")[0] if ver_result else "unknown"
        tbl_result = db.execute(
            text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name != 'alembic_version';")
        ).scalar()
        table_count = int(tbl_result or 0)
        db_connected = True
    except Exception as e:
        server_version = f"Error: {e}"

    return SystemHealthResponse(
        status="ok" if db_connected else "degraded",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
        database=DatabaseHealth(
            connected=db_connected,
            database_name="trace_dev",
            server_version=server_version,
            table_count=table_count,
        ),
    )
