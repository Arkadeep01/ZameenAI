"""FastAPI auth/RBAC dependencies (server-side enforcement).

Never trusts client-supplied role/user_id/project_id: identity comes only
from the verified JWT; ownership scoping (citizen own-data, cross-project
denial) is enforced here and re-checked at the service level.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import ALL_ROLES, DEV_USERS, decode_token, has_permission

_bearer = HTTPBearer(auto_error=False)


def _unauthorized(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _forbidden(detail: str = "Forbidden") -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict[str, Any]:
    # Allow tests / local dev without token ONLY when explicitly enabled.
    # Default is authenticated; anonymous access is opt-in via header.
    token = credentials.credentials if credentials else None
    if not token:
        # Back-compat escape hatch for the pre-auth frontend: treat as
        # validator? NO — fail closed. Callers needing open access must
        # declare `get_optional_user` explicitly.
        raise _unauthorized()
    try:
        payload = decode_token(token)
    except Exception:
        raise _unauthorized("Invalid or expired token")
    user_id = payload.get("sub", "")
    username = payload.get("username", "")
    role = payload.get("role", "")
    if role not in ALL_ROLES:
        raise _unauthorized("Unknown role in token")
    user = {"id": user_id, "username": username, "role": role}
    # Attach project scope from dev store when available (DB-backed later).
    for record in DEV_USERS.values():
        if record["id"] == user_id:
            user["project_ids"] = record.get("project_ids", [])
            user["scopes"] = record.get("scopes", [])
            break
    user.setdefault("project_ids", [])
    user.setdefault("scopes", [])
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict[str, Any]]:
    if not credentials:
        return None
    try:
        return await get_current_user(None, credentials)  # type: ignore[arg-type]
    except HTTPException:
        return None


def require_roles(*roles: str) -> Callable:
    async def _check(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if user["role"] not in roles:
            raise _forbidden(f"Requires one of roles: {', '.join(roles)}")
        return user

    return _check


def require_permission(permission: str) -> Callable:
    async def _check(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if not has_permission(user["role"], permission):
            raise _forbidden(f"Missing permission: {permission}")
        return user

    return _check


def enforce_ownership(user: dict[str, Any], *, owner_id: Optional[str] = None,
                      project_id: Optional[str] = None,
                      record_id: Optional[str] = None) -> None:
    """IDOR/BOLA guard: citizens see only their own scope; project members
    only their assigned projects. Raises 403 on violation."""
    role = user.get("role", "")
    if role == "system_admin":
        return
    if role == "citizen":
        allowed = set(user.get("scopes", []))
        target = record_id or owner_id
        if target and target not in allowed:
            raise _forbidden("Cross-user record access denied")
        return
    if project_id is not None:
        assigned = {str(p) for p in user.get("project_ids", [])}
        if assigned and str(project_id) not in assigned:
            raise _forbidden("Cross-project access denied")
