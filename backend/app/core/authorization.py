"""AuthorizationService — single place for role/permission checks.

Routes must call these dependencies, never ad-hoc ``has_permission`` logic.
Errors follow the canonical contract:
  401 AUTHENTICATION_REQUIRED | 403 PERMISSION_DENIED | 404 safe (scope)
with request_id attached by error handlers.
"""
from __future__ import annotations

from typing import Any, Callable

from fastapi import Depends, HTTPException, Request, status

from app.core.permissions import has_permission, is_known_permission


def _request_id(request: Request | None) -> str | None:
    try:
        return getattr(request.state, "request_id", None) if request is not None else None
    except Exception:
        return None


def _perm_denied(permission: str, request: Request | None = None) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"code": "PERMISSION_DENIED",
                "message": f"Missing permission: {permission}",
                "request_id": _request_id(request)})


class AuthorizationService:
    @staticmethod
    def check(user: dict[str, Any], permission: str,
              request: Request | None = None) -> dict[str, Any]:
        if not is_known_permission(permission):
            raise HTTPException(status_code=500,
                                detail={"code": "UNKNOWN_PERMISSION",
                                        "message": f"Unknown permission: {permission}",
                                        "request_id": _request_id(request)})
        if not has_permission(user.get("role", ""), permission):
            raise _perm_denied(permission, request)
        return user


def require_permission(permission: str) -> Callable:
    """Dependency factory — canonical permission gate."""
    from app.core.deps import get_current_user

    async def _check(request: Request,
                     user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        return AuthorizationService.check(user, permission, request)

    return _check


def require_role(*roles: str) -> Callable:
    from app.core.deps import get_current_user

    async def _check(request: Request,
                     user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "PERMISSION_DENIED",
                        "message": f"Requires one of roles: {', '.join(roles)}",
                        "request_id": _request_id(request)})
        return user

    return _check


def require_any_permission(*permissions: str) -> Callable:
    """Allow when the user holds ANY listed permission (explicit allow-list)."""
    from app.core.deps import get_current_user

    async def _check(request: Request,
                     user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        for perm in permissions:
            if not is_known_permission(perm):
                raise HTTPException(status_code=500,
                                    detail={"code": "UNKNOWN_PERMISSION",
                                            "message": f"Unknown permission: {perm}",
                                            "request_id": _request_id(request)})
        if not any(has_permission(user.get("role", ""), p) for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "PERMISSION_DENIED",
                        "message": f"Missing one of permissions: {', '.join(permissions)}",
                        "request_id": _request_id(request)})
        return user

    return _check
