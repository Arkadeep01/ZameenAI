"""Audit + notification application services (domain logic, no HTTP)."""
from __future__ import annotations

import json
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.database.models.audit_event import AuditEvent
from app.database.models.notification import Notification
from app.repositories.domain_repositories import AuditRepository, NotificationRepository


class AuditService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def log(self, *, actor_id: Optional[str], actor_role: Optional[str], action: str,
            entity_type: Optional[str] = None, entity_id: Optional[str] = None,
            prev_state: Optional[str] = None, new_state: Optional[str] = None,
            request_id: Optional[str] = None, ip_address: Optional[str] = None,
            meta: Optional[dict[str, Any]] = None) -> Optional[AuditEvent]:
        if self.db is None:
            return None
        try:
            return AuditRepository(self.db).log(
                actor_id=actor_id, actor_role=actor_role, action=action,
                entity_type=entity_type, entity_id=entity_id,
                prev_state=prev_state, new_state=new_state,
                request_id=request_id, ip_address=ip_address, meta=meta)
        except Exception:
            self.db.rollback()
            return None


class NotificationService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def notify(self, *, recipient_id: str, type: str, title: str, message: str,
               severity: str = "INFO", reference_type: Optional[str] = None,
               reference_id: Optional[str] = None) -> Optional[Notification]:
        if self.db is None:
            return None
        try:
            return NotificationRepository(self.db).create(Notification(
                recipient_id=recipient_id, type=type, title=title, message=message,
                severity=severity, reference_type=reference_type, reference_id=reference_id))
        except Exception:
            self.db.rollback()
            return None

    def unread_count(self, user_id: str) -> tuple[int, int]:
        if self.db is None:
            return 0, 0
        items = NotificationRepository(self.db).for_user(user_id)
        return sum(1 for n in items if not n.read), len(items)
