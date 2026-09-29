"""TRACE Audit Event Service.

Provides centralized audit logging for compliance and tamper-evident provenance.
"""

from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from backend.app.models.system import AuditEvent
from backend.app.models.enums import AuditAction
from backend.app.core.logging import logger


class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        event_type: AuditAction,
        entity_type: str,
        entity_id: Optional[str] = None,
        actor: str = "system",
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        """Create and persist an audit event."""
        event = AuditEvent(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            actor=actor,
            details_json=details or {},
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        logger.info(f"AUDIT | {event_type.value} on {entity_type}:{entity_id} by {actor}")
        return event

    @staticmethod
    def list_events(
        db: Session,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[AuditEvent]:
        query = select(AuditEvent)
        if entity_type:
            query = query.where(AuditEvent.entity_type == entity_type)
        if entity_id:
            query = query.where(AuditEvent.entity_id == entity_id)
        query = query.order_by(desc(AuditEvent.created_at)).offset(skip).limit(limit)
        return list(db.scalars(query).all())
