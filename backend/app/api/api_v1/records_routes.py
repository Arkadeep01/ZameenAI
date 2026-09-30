"""Land-record + document APIs (permission + scope + audit gated).

Enforces the LAND_RECORD.* and DOCUMENT.* families on the canonical
record/document stores. Mutations validate workflow state (frozen records
reject edits) and every access is audited.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.deps import get_current_user, require_permission
from app.core.permissions import (
    DOCUMENT_DELETE,
    DOCUMENT_DOWNLOAD,
    DOCUMENT_READ,
    LAND_RECORD_READ,
    LAND_RECORD_UPDATE,
)
from app.database.session import get_domain_db

router = APIRouter(tags=["records"])


def _not_found(request: Request | None = None) -> HTTPException:
    rid = getattr(getattr(request, "state", None), "request_id", None)
    return HTTPException(status_code=404, detail={
        "code": "RESOURCE_NOT_FOUND", "message": "Resource not found", "request_id": rid})


def _audit(request: Request | None, user: dict, action: str, entity_type: str,
           entity_id: str, prev: str = "", new: str = "",
           meta: dict | None = None) -> None:
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        db = _SessionFactory()
        try:
            AuditService(db).log(
                actor_id=user.get("id"), actor_role=user.get("role"), action=action,
                entity_type=entity_type, entity_id=entity_id,
                prev_state=prev or None, new_state=new or None,
                request_id=getattr(getattr(request, "state", None), "request_id", None),
                ip_address=request.client.host if request.client else None,
                meta=meta or {})
        finally:
            db.close()
    except Exception as exc:
        from app.services.audit_notification_service import report_audit_failure

        report_audit_failure(action, entity_type, entity_id, exc)


def _is_frozen(record_id: str) -> bool:
    """Return the freeze state, failing closed on a storage error.

    A lookup failure must never be reported as "not frozen": that would let a
    sub-judice or litigation-hold record be edited because the freeze table
    could not be read.
    """
    from app.database.session import _SessionFactory
    from app.database.models.acquisition import RecordFreeze

    db = _SessionFactory()
    try:
        rows = db.query(RecordFreeze).filter(
            RecordFreeze.record_id == record_id).order_by(
            RecordFreeze.id.desc()).limit(1).all()
        return bool(rows) and rows[0].frozen == "YES"
    except Exception as exc:
        logging.getLogger("zameenai.api.records").error(
            "freeze lookup failed for %s; denying access (fail closed): %s", record_id, exc)
        raise HTTPException(status_code=503, detail={
            "code": "FREEZE_STATE_UNAVAILABLE",
            "message": "Record freeze state is temporarily unavailable",
        }) from exc
    finally:
        db.close()


class RecordUpdateBody(BaseModel):
    status: Optional[str] = None
    verified_by: Optional[str] = None


@router.get("/records/{record_id}", dependencies=[Depends(require_permission(LAND_RECORD_READ))])
def get_record(record_id: str, request: Request, user: dict = Depends(get_current_user),
               db=Depends(get_domain_db)):
    from app.core.scopes import ScopeService
    from app.repositories.domain_repositories import LandRecordRepository

    ScopeService.check(user, record_id=record_id, request=request)
    row = LandRecordRepository(db).get(record_id)
    if not row:
        raise _not_found(request)
    _audit(request, user, "LAND_RECORD_VIEWED", "land_record", record_id)
    return {"id": row.id, "document_id": row.document_id, "status": row.status,
            "confidence": row.confidence, "completeness": row.completeness,
            "verified_by": row.verified_by}


@router.patch("/records/{record_id}", dependencies=[Depends(require_permission(LAND_RECORD_UPDATE))])
def update_record(record_id: str, body: RecordUpdateBody, request: Request,
                  user: dict = Depends(get_current_user), db=Depends(get_domain_db)):
    from app.core.scopes import ScopeService
    from app.repositories.domain_repositories import LandRecordRepository

    ScopeService.check(user, record_id=record_id, request=request)
    if _is_frozen(record_id):
        raise HTTPException(status_code=423, detail={
            "code": "RECORD_FROZEN", "message": "Record is frozen; request unfreeze first",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    repo = LandRecordRepository(db)
    row = repo.get(record_id)
    if not row:
        raise _not_found(request)
    prev = row.status
    if body.status is not None:
        row.status = body.status
    if body.verified_by is not None:
        row.verified_by = body.verified_by
    db.commit()
    _audit(request, user, "LAND_RECORD_UPDATED", "land_record", record_id, prev, row.status)
    return {"id": row.id, "status": row.status}


@router.get("/documents/{document_id}",
            dependencies=[Depends(require_permission(DOCUMENT_READ))])
def get_document(document_id: str, request: Request, user: dict = Depends(get_current_user),
                 db=Depends(get_domain_db)):
    from app.core.scopes import ScopeService
    from app.database.models.document import Document

    row = db.get(Document, document_id)
    if not row:
        raise _not_found(request)
    ScopeService.check(user, record_id=row.record_id, document_id=document_id, request=request)
    _audit(request, user, "DOCUMENT_VIEWED", "document", document_id)
    return {"id": row.id, "record_id": row.record_id, "filename": row.filename,
            "mime_type": row.mime_type, "size_bytes": row.size_bytes,
            "created_by": row.created_by}


@router.get("/documents/{document_id}/download",
            dependencies=[Depends(require_permission(DOCUMENT_DOWNLOAD))])
def download_document(document_id: str, request: Request,
                      user: dict = Depends(get_current_user), db=Depends(get_domain_db)):
    from app.core.scopes import ScopeService
    from app.database.models.document import Document

    row = db.get(Document, document_id)
    if not row:
        raise _not_found(request)
    ScopeService.check(user, record_id=row.record_id, document_id=document_id, request=request)
    _audit(request, user, "DOCUMENT_DOWNLOADED", "document", document_id)
    # Files live outside the web root; return a scoped pointer, never a path.
    return {"id": row.id, "filename": row.filename, "size_bytes": row.size_bytes,
            "note": "Binary retrieval via authorized job artifacts; path never disclosed."}


@router.delete("/documents/{document_id}",
               dependencies=[Depends(require_permission(DOCUMENT_DELETE))])
def delete_document(document_id: str, request: Request,
                    user: dict = Depends(get_current_user), db=Depends(get_domain_db)):
    from app.core.scopes import ScopeService
    from app.database.models.document import Document

    row = db.get(Document, document_id)
    if not row:
        raise _not_found(request)
    ScopeService.check(user, record_id=row.record_id, document_id=document_id, request=request)
    if _is_frozen(row.record_id):
        raise HTTPException(status_code=423, detail={
            "code": "RECORD_FROZEN", "message": "Record is frozen; request unfreeze first",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    db.delete(row)
    db.commit()
    _audit(request, user, "DOCUMENT_DELETED", "document", document_id)
    return {"status": "SUCCESS", "id": document_id}
