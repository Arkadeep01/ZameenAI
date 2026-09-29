"""Audit + notification + land-record repositories (persistence only)."""
from __future__ import annotations

import json
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.database.models.audit_event import AuditEvent
from app.database.models.hitl_review import HitlReview
from app.database.models.land_record import ExtractedField, LandRecord
from app.database.models.notification import Notification
from app.database.models.parcel_link import LandRecordParcelLink


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def log(self, *, actor_id: Optional[str], actor_role: Optional[str], action: str,
            entity_type: Optional[str] = None, entity_id: Optional[str] = None,
            prev_state: Optional[str] = None, new_state: Optional[str] = None,
            request_id: Optional[str] = None, ip_address: Optional[str] = None,
            meta: Optional[dict[str, Any]] = None) -> AuditEvent:
        event = AuditEvent(
            actor_id=actor_id, actor_role=actor_role, action=action,
            entity_type=entity_type, entity_id=entity_id,
            prev_state=prev_state, new_state=new_state,
            request_id=request_id, ip_address=ip_address,
            meta=json.dumps(meta or {}, ensure_ascii=False),
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def list(self, *, entity_type: Optional[str] = None, entity_id: Optional[str] = None,
             limit: int = 100) -> list[AuditEvent]:
        q = self.db.query(AuditEvent).order_by(AuditEvent.id.desc())
        if entity_type:
            q = q.filter(AuditEvent.entity_type == entity_type)
        if entity_id:
            q = q.filter(AuditEvent.entity_id == entity_id)
        return q.limit(limit).all()


class LandRecordRepository:
    def __init__(self, db: Session):
        self.db = db

    def upsert_record(self, record: LandRecord) -> LandRecord:
        existing = self.db.get(LandRecord, record.id)
        if existing:
            for attr in ("document_id", "job_id", "document_type", "status",
                         "confidence", "completeness", "payload", "verified_by"):
                setattr(existing, attr, getattr(record, attr))
            self.db.commit()
            self.db.refresh(existing)
            return existing
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get(self, record_id: str) -> Optional[LandRecord]:
        return self.db.get(LandRecord, record_id)

    def save_fields(self, record_id: str, fields: list[ExtractedField]) -> None:
        self.db.query(ExtractedField).filter(ExtractedField.record_id == record_id).delete()
        for f in fields:
            self.db.add(f)
        self.db.commit()


class HitlRepository:
    def __init__(self, db: Session):
        self.db = db

    def upsert(self, review: HitlReview) -> HitlReview:
        existing = self.db.get(HitlReview, review.id)
        if existing:
            for attr in ("status", "reviewer", "decision", "field_reviews", "notes"):
                setattr(existing, attr, getattr(review, attr))
            self.db.commit()
            self.db.refresh(existing)
            return existing
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    def get(self, hitl_id: str) -> Optional[HitlReview]:
        return self.db.get(HitlReview, hitl_id)


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, notif: Notification) -> Notification:
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def for_user(self, user_id: str, *, unread_only: bool = False) -> list[Notification]:
        q = self.db.query(Notification).filter(Notification.recipient_id == user_id)
        if unread_only:
            q = q.filter(Notification.read.is_(False))
        return q.order_by(Notification.id.desc()).all()

    def mark_read(self, notif_id: int, user_id: str) -> Optional[Notification]:
        n = self.db.get(Notification, notif_id)
        if not n or n.recipient_id != user_id:
            return None
        n.read = True
        self.db.commit()
        self.db.refresh(n)
        return n


class ParcelLinkRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, link: LandRecordParcelLink) -> LandRecordParcelLink:
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    def for_record(self, record_id: str) -> list[LandRecordParcelLink]:
        return (
            self.db.query(LandRecordParcelLink)
            .filter(LandRecordParcelLink.record_id == record_id)
            .order_by(LandRecordParcelLink.id.desc())
            .all()
        )
