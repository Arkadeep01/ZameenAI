"""Secure file-upload endpoint (authenticated, validated, audited)."""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.permissions import DOCUMENT_UPLOAD

router = APIRouter()

_ALLOWED_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
_ALLOWED_MIME_PREFIXES = ("application/pdf", "image/")


def _fail(code: str, message: str, http: int, request: Request | None) -> HTTPException:
    rid = getattr(getattr(request, "state", None), "request_id", None)
    return HTTPException(status_code=http,
                         detail={"code": code, "message": message, "request_id": rid})


@router.post("")
async def upload_file(request: Request, file: UploadFile = File(...),
                      user: dict = Depends(get_current_user)):
    from app.core.permissions import has_permission

    if not has_permission(user.get("role", ""), DOCUMENT_UPLOAD):
        raise _fail("PERMISSION_DENIED", f"Missing permission: {DOCUMENT_UPLOAD}", 403, request)
    BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
    UPLOAD_DIR = BASE_DIR / "data" / "uploads"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    filename = file.filename or ""
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in _ALLOWED_EXTS:
        raise _fail("INVALID_FILE_TYPE",
                    f"File type {file_ext or '(none)'} not allowed", 400, request)
    if file.content_type and not file.content_type.startswith(_ALLOWED_MIME_PREFIXES):
        raise _fail("INVALID_FILE_TYPE",
                    f"MIME {file.content_type} not allowed", 400, request)
    content = await file.read()
    max_bytes = int(settings.MAX_UPLOAD_SIZE_MB) * 1024 * 1024
    if not content:
        raise _fail("EMPTY_UPLOAD", "Empty upload", 400, request)
    if len(content) > max_bytes:
        raise _fail("FILE_TOO_LARGE",
                    f"Upload exceeds {settings.MAX_UPLOAD_SIZE_MB} MB", 413, request)

    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception:
        raise _fail("UPLOAD_FAILED", "Could not store upload", 500, request)

    # Audit (best-effort here; failures must not lose the upload but must be
    # visible — surfaced in response meta, never silent).
    audit_ok = True
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        db = _SessionFactory()
        try:
            rid = getattr(request.state, "request_id", None)
            ip = request.client.host if request.client else None
            AuditService(db).log(actor_id=user.get("id"), actor_role=user.get("role"),
                                 action="DOCUMENT_UPLOADED", entity_type="document",
                                 entity_id=unique_filename, request_id=rid,
                                 ip_address=ip,
                                 meta={"filename": filename, "size_bytes": len(content)})
        finally:
            db.close()
    except Exception:
        audit_ok = False

    return {
        "message": "File uploaded successfully",
        "filename": unique_filename,  # opaque id only — never absolute path
        "size_bytes": len(content),
        "audit_recorded": audit_ok,
    }
