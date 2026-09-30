"""Platform administration APIs (admin-only, audited).

Users, roles (read), permissions (read/assign audit), system configuration
flags, and audit reads. All endpoints require the corresponding canonical
permission (held only by system_admin via *).
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.deps import get_current_user, require_permission
from app.core.permissions import (
    AUDIT_READ,
    PERMISSION_ASSIGN,
    PERMISSION_READ,
    ROLE_READ,
    SYSTEM_CONFIGURE,
    USER_CREATE,
    USER_DISABLE,
    USER_READ,
    USER_UPDATE,
)
from app.core.roles import ALL_ROLES
from app.database.session import get_domain_db

router = APIRouter(prefix="/admin", tags=["admin"])


def _audit(request: Request | None, user: dict, action: str, entity_type: str,
           entity_id: str, meta: dict | None = None) -> None:
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        db = _SessionFactory()
        try:
            AuditService(db).log(
                actor_id=user.get("id"), actor_role=user.get("role"), action=action,
                entity_type=entity_type, entity_id=entity_id,
                request_id=getattr(getattr(request, "state", None), "request_id", None),
                ip_address=request.client.host if request and request.client else None,
                meta=meta or {})
        finally:
            db.close()
    except Exception as exc:
        from app.services.audit_notification_service import report_audit_failure

        report_audit_failure(action, entity_type, entity_id, exc)


class UserCreateBody(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    role: str = Field(..., min_length=1)


class UserUpdateBody(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


@router.get("/users", dependencies=[Depends(require_permission(USER_READ))])
def list_users(db=Depends(get_domain_db)):
    from app.database.models.user import User

    rows = db.query(User).order_by(User.username).all()
    return {"count": len(rows),
            "users": [{"id": r.id, "username": r.username, "role": r.role,
                       "is_active": r.is_active} for r in rows]}


@router.post("/users", dependencies=[Depends(require_permission(USER_CREATE))])
def create_user(body: UserCreateBody, request: Request,
                user: dict = Depends(get_current_user), db=Depends(get_domain_db)):
    from app.core.roles import normalize_role
    from app.database.models.user import User
    from app.core.security import hash_password

    role = normalize_role(body.role)
    if role not in ALL_ROLES:
        raise HTTPException(status_code=400, detail={
            "code": "INVALID_ROLE", "message": f"Unknown role: {body.role}",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail={
            "code": "USER_EXISTS", "message": "Username already exists",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    import uuid as _uuid

    row = User(id=f"u-{_uuid.uuid4().hex[:8]}", username=body.username,
               password_hash=hash_password(body.password), role=role, is_active=True)
    db.add(row)
    db.commit()
    _audit(request, user, "USER_CREATED", "user", row.id, {"role": role})
    return {"id": row.id, "username": row.username, "role": row.role}


@router.patch("/users/{user_id}", dependencies=[Depends(require_permission(USER_UPDATE))])
def update_user(user_id: str, body: UserUpdateBody, request: Request,
                user: dict = Depends(get_current_user), db=Depends(get_domain_db)):
    from app.core.roles import normalize_role
    from app.database.models.user import User
    from app.core.security import hash_password

    row = db.get(User, user_id)
    if not row:
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "User not found",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    changes: dict = {}
    if body.role is not None:
        role = normalize_role(body.role)
        if role not in ALL_ROLES:
            raise HTTPException(status_code=400, detail={
                "code": "INVALID_ROLE", "message": f"Unknown role: {body.role}",
                "request_id": getattr(getattr(request, "state", None), "request_id", None)})
        changes["role"] = {"from": row.role, "to": role}
        row.role = role
    if body.is_active is not None:
        changes["is_active"] = {"from": row.is_active, "to": body.is_active}
        row.is_active = body.is_active
    if body.password is not None:
        if len(body.password) < 8:
            raise HTTPException(status_code=400, detail={
                "code": "WEAK_PASSWORD", "message": "Password too short",
                "request_id": getattr(getattr(request, "state", None), "request_id", None)})
        row.password_hash = hash_password(body.password)
        changes["password"] = "rotated"
    db.commit()
    _audit(request, user, "USER_UPDATED", "user", row.id, changes)
    return {"id": row.id, "username": row.username, "role": row.role,
            "is_active": row.is_active}


@router.post("/users/{user_id}/disable",
             dependencies=[Depends(require_permission(USER_DISABLE))])
def disable_user(user_id: str, request: Request, user: dict = Depends(get_current_user),
                 db=Depends(get_domain_db)):
    from app.database.models.user import User

    row = db.get(User, user_id)
    if not row:
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "User not found",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    if row.id == user.get("id"):
        raise HTTPException(status_code=400, detail={
            "code": "SELF_DISABLE_DENIED", "message": "Cannot disable own account",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    row.is_active = False
    db.commit()
    _audit(request, user, "USER_DISABLED", "user", row.id)
    return {"id": row.id, "is_active": False}


@router.get("/roles", dependencies=[Depends(require_permission(ROLE_READ))])
def list_roles():
    from app.core.permissions import permissions_for
    from app.core.roles import ROLE_DESCRIPTIONS

    return [{"role": r, "description": ROLE_DESCRIPTIONS.get(r),
             "permissions": sorted(permissions_for(r))} for r in ALL_ROLES]


@router.get("/permissions", dependencies=[Depends(require_permission(PERMISSION_READ))])
def list_permissions():
    from app.core.permissions import ALL_PERMISSIONS

    return {"count": len(ALL_PERMISSIONS), "permissions": sorted(ALL_PERMISSIONS)}


@router.post("/permissions/assign",
             dependencies=[Depends(require_permission(PERMISSION_ASSIGN))])
def assign_permission_note(request: Request, user: dict = Depends(get_current_user)):
    # Role-permission bindings are code-governed (permissions.py) in this
    # release; assignments via API are recorded as audited requests, not
    # silent mutations — prevents a second competing permission vocabulary.
    _audit(request, user, "PERMISSION_ASSIGN_REQUESTED", "permission", "registry")
    return {"status": "RECORDED",
            "note": "Role-permission bindings are governed by the canonical registry; "
                    "change requires reviewed code change + migration."}


@router.get("/audit", dependencies=[Depends(require_permission(AUDIT_READ))])
def admin_audit(entity_type: str = "", entity_id: str = "", limit: int = 100,
                db=Depends(get_domain_db)):
    from app.repositories.domain_repositories import AuditRepository

    events = AuditRepository(db).list(entity_type=entity_type or None,
                                      entity_id=entity_id or None, limit=min(limit, 500))
    return {"count": len(events),
            "events": [{"id": e.id, "actor_id": e.actor_id, "actor_role": e.actor_role,
                        "action": e.action, "entity_type": e.entity_type,
                        "entity_id": e.entity_id, "prev_state": e.prev_state,
                        "new_state": e.new_state,
                        "created_at": e.created_at.isoformat() if e.created_at else None}
                       for e in events]}


@router.get("/system/config", dependencies=[Depends(require_permission(SYSTEM_CONFIGURE))])
def system_config():
    from app.core.config import settings

    return {"debug": settings.DEBUG,
            "jwt_access_minutes": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "jwt_refresh_minutes": settings.JWT_REFRESH_TOKEN_EXPIRE_MINUTES,
            "otp_minutes": settings.OTP_EXPIRE_MINUTES,
            "max_upload_mb": settings.MAX_UPLOAD_SIZE_MB,
            "ocr_provider": settings.OCR_PROVIDER}
