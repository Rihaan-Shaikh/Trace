"""TRACE Common Pydantic Schemas.

Provides standardized pagination, system health, and audit contract structures.
"""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    skip: int = Field(default=0, ge=0, description="Offset items to skip")
    limit: int = Field(default=50, ge=1, le=200, description="Page limit")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int = Field(..., description="Total count across all pages")
    skip: int
    limit: int
    has_more: bool


class DatabaseHealth(BaseModel):
    connected: bool
    database_name: str
    server_version: Optional[str] = None
    table_count: int


class SystemHealthResponse(BaseModel):
    status: str = Field(default="ok", description="Overall system health status")
    version: str
    environment: str
    timestamp: datetime
    database: DatabaseHealth


class AuditLogEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_type: str
    entity_type: str
    entity_id: Optional[str] = None
    actor: str
    details_json: dict
    created_at: datetime
