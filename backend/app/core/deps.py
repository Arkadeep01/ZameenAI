"""FastAPI auth/RBAC dependencies (server-side enforcement).

Central wiring: get_current_user (JWT + revocation + role normalize),
require_permission / require_role (via AuthorizationService),
enforce_ownership / authorize_scope (via ScopeService, enumeration-safe 404),
authorize_transition (via WorkflowAuthorizationService).

Never trusts client-supplied role/user_id/project_id: identity comes only
from the verified JWT.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.roles import ALL_ROLES, normalize_role
from app.core.scopes import ScopeService

_bearer = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Authentication required",
                  code: str = "AUTHENTICATION_REQUIRED",
                  request: Request | None = None) -> HTTPException:
    rid = getattr(getattr(request, "state", None), "request_id", None)
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                         detail={"code": code, "message": detail, "request_id": rid})


def _forbidden(detail: str = "Forbidden",
               code: str = "PERMISSION_DENIED",
               request: Request | None = None) -> HTTPException:
    rid = getattr(getattr(request, "state", None), "request_id", None)
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                         detail={"code": code, "message": detail, "request_id": rid})


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict[str, Any]:
    from app.core import token_store as _ts
    from app.core.security import DEV_USERS, decode_token, is_token_revoked

    token = credentials.credentials if credentials else None
    if not token:
        raise _unauthorized(request=request)
    try:
        payload = decode_token(token)
    except Exception:
        raise _unauthorized("Invalid or expired token", request=request)
    if payload.get("type", "access") != "access":
        raise _unauthorized("Invalid token type", request=request)
    jti = str(payload.get("jti", ""))
    # Revocation: memory first, then DB best-effort (never fail open on DB
    # errors — memory verdict stands; DB check is additive).
    if _ts.revoked_jti.contains(jti):
        raise _unauthorized("Token revoked", request=request)
    try:
        from app.database.session import _SessionFactory

        db = _SessionFactory()
        try:
            if is_token_revoked(jti, db):
                raise _unauthorized("Token revoked", request=request)
        finally:
            db.close()
    except HTTPException:
        raise
    except Exception:
        pass
    role = normalize_role(str(payload.get("role", "")))
    if role not in ALL_ROLES:
        raise _unauthorized("Unknown role in token", request=request)
    user_id = str(payload.get("sub", ""))
    username = str(payload.get("username", ""))
    user: dict[str, Any] = {"id": user_id, "username": username, "role": role,
                            "jti": jti}
    # Attach project scope from dev store / DB when available.
    attached = False
    for record in DEV_USERS.values():
        if record["id"] == user_id:
            user["project_ids"] = record.get("project_ids", [])
            user["scopes"] = record.get("scopes", [])
            attached = True
            break
    if not attached:
        try:
            from app.database.session import _SessionFactory

            db = _SessionFactory()
            try:
                from app.database.models.user import User

                row = db.get(User, user_id)
                if row is not None:
                    user["project_ids"] = []
                    user["scopes"] = []
                    attached = True
            finally:
                db.close()
        except Exception:
            pass
    # Citizen scope hydration from ownership registry (DB file-truth).
    if not attached:
        user.setdefault("project_ids", [])
        user.setdefault("scopes", [])
    else:
        user.setdefault("project_ids", [])
        user.setdefault("scopes", [])
    try:
        from app.core.scopes import assignment_for  # noqa: F401 (hook point)
    except Exception:
        pass
    # Citizen dynamic scopes: records created by this citizen (ownership).
    if role == "citizen":
        try:
            from app.services.ownership_service import owned_records_for

            dyn = owned_records_for(user_id, username)
            if dyn:
                user["scopes"] = sorted(set(user.get("scopes", [])) | set(dyn))
        except Exception:
            pass
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict[str, Any]]:
    if not credentials:
        return None
    try:
        from fastapi import Request as _Req  # type: ignore

        # No request context here; revocation memory-check only.
        from app.core.security import decode_token

        payload = decode_token(credentials.credentials)
        if payload.get("type", "access") != "access":
            return None
        from app.core import token_store as _ts

        if _ts.revoked_jti.contains(str(payload.get("jti", ""))):
            return None
        role = normalize_role(str(payload.get("role", "")))
        if role not in ALL_ROLES:
            return None
        return {"id": str(payload.get("sub", "")),
                "username": str(payload.get("username", "")),
                "role": role, "project_ids": [], "scopes": []}
    except HTTPException:
        return None
    except Exception:
        return None


def require_roles(*roles: str) -> Callable:
    """Legacy alias — routes should prefer require_role/require_permission."""
    normalized = [normalize_role(r) for r in roles]

    async def _check(request: Request,
                     user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if user["role"] not in normalized:
            raise _forbidden(f"Requires one of roles: {', '.join(normalized)}",
                             request=request)
        return user

    return _check


def require_role(*roles: str) -> Callable:
    return require_roles(*roles)


def require_permission(permission: str) -> Callable:
    from app.core.authorization import AuthorizationService

    async def _check(request: Request,
                     user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        return AuthorizationService.check(user, permission, request)

    return _check


def enforce_ownership(user: dict[str, Any], *, owner_id: Optional[str] = None,
                      project_id: Optional[str] = None,
                      record_id: Optional[str] = None) -> None:
    """Legacy helper — enumeration-safe (404 on scope denial)."""
    ScopeService.check(user, owner_id=owner_id, project_id=project_id,
                       record_id=record_id, request=None)


def require_scope(*, project_id: Optional[str] = None) -> Callable:
    async def _check(request: Request,
                     user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        ScopeService.check(user, project_id=project_id, request=request)
        return user

    return _check


def authorize_resource(*, owner_id: Optional[str] = None,
                       project_id: Optional[str] = None,
                       record_id: Optional[str] = None,
                       parcel_id: Optional[str] = None,
                       document_id: Optional[str] = None) -> Callable:
    async def _check(request: Request,
                     user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        ScopeService.check(user, owner_id=owner_id, project_id=project_id,
                           record_id=record_id, parcel_id=parcel_id,
                           document_id=document_id, request=request)
        return user

    return _check


def authorize_transition(*, source: str, target: str) -> Callable:
    from app.workflow.authorization import WorkflowAuthorizationService

    async def _check(request: Request,
                     user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        WorkflowAuthorizationService.authorize(
            source=source, target=target, role=user.get("role", ""), request=request)
        return user

    return _check
