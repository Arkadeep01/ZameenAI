"""Authentication routes (canonical JWT + refresh + revocation + citizen OTP)."""
from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.permissions import permissions_for
from app.core.roles import ALL_ROLES
from app.core.security import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    dev_users_enabled,
    is_token_revoked,
    revoke_token,
)
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    LogoutRequest,
    OtpRequest,
    OtpVerifyRequest,
    RefreshRequest,
    RoleInfo,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _audit(request: Request | None, *, actor: str, role: str, action: str,
           entity_id: str = "", ok: bool = True, meta: dict | None = None) -> None:
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        db = _SessionFactory()
        try:
            rid = getattr(getattr(request, "state", None), "request_id", None)
            ip = request.client.host if request and request.client else None
            AuditService(db).log_strict(
                actor_id=actor, actor_role=role, action=action,
                entity_type="auth", entity_id=entity_id or actor,
                request_id=rid, ip_address=ip,
                meta={**(meta or {}), "ok": ok})
        finally:
            db.close()
    except Exception as exc:
        from app.services.audit_notification_service import report_audit_failure

        report_audit_failure(action, "auth", entity_id or actor, exc)


def _rate_key(request: Request | None, suffix: str) -> str:
    ip = request.client.host if request and request.client else "unknown"
    return f"{suffix}:{ip}"


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request):
    from app.core import token_store as _ts

    if not _ts.rate_limit_ok(_rate_key(request, "login"),
                             limit=settings.LOGIN_RATE_LIMIT,
                             window_seconds=settings.LOGIN_RATE_WINDOW_SECONDS):
        raise HTTPException(status_code=429, detail={
            "code": "RATE_LIMITED", "message": "Too many login attempts",
            "request_id": getattr(request.state, "request_id", None)})
    from app.database.session import _SessionFactory

    db = _SessionFactory()
    try:
        user = authenticate_user(payload.username, payload.password, db)
    finally:
        db.close()
    if not user:
        _audit(request, actor=payload.username, role="", action="LOGIN_FAILED", ok=False)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={
            "code": "AUTHENTICATION_REQUIRED", "message": "Invalid username or password",
            "request_id": getattr(request.state, "request_id", None)})
    access = create_access_token(user_id=user["id"], username=user["username"], role=user["role"])
    refresh = create_refresh_token(user_id=user["id"], username=user["username"], role=user["role"])
    _audit(request, actor=user["username"], role=user["role"], action="LOGIN_SUCCESS",
           entity_id=user["id"])
    return TokenResponse(access_token=access, refresh_token=refresh,
                         expires_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, request: Request):
    from app.core import token_store as _ts

    try:
        data = decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={
            "code": "AUTHENTICATION_REQUIRED", "message": "Invalid refresh token",
            "request_id": getattr(request.state, "request_id", None)})
    if data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={
            "code": "AUTHENTICATION_REQUIRED", "message": "Invalid token type",
            "request_id": getattr(request.state, "request_id", None)})
    jti = str(data.get("jti", ""))
    if _ts.revoked_jti.contains(jti) or _ts.refresh_tokens.get(jti) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={
            "code": "AUTHENTICATION_REQUIRED", "message": "Refresh token revoked",
            "request_id": getattr(request.state, "request_id", None)})
    from app.database.session import _SessionFactory

    db = _SessionFactory()
    try:
        if is_token_revoked(jti, db):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={
                "code": "AUTHENTICATION_REQUIRED", "message": "Refresh token revoked",
                "request_id": getattr(request.state, "request_id", None)})
    finally:
        db.close()
    # Rotate: revoke old refresh, mint new pair.
    revoke_token(jti, user_id=str(data.get("sub", "")), token_type="refresh",
                 ttl_seconds=settings.JWT_REFRESH_TOKEN_EXPIRE_MINUTES * 60)
    access = create_access_token(user_id=str(data["sub"]), username=str(data["username"]),
                                 role=str(data["role"]))
    refresh_tok = create_refresh_token(user_id=str(data["sub"]),
                                       username=str(data["username"]),
                                       role=str(data["role"]))
    return TokenResponse(access_token=access, refresh_token=refresh_tok,
                         expires_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)


@router.post("/logout")
def logout(payload: LogoutRequest, request: Request,
           user: dict = Depends(get_current_user)):
    # Revoke access jti + optional refresh jti.
    revoke_token(str(user.get("jti", "")), user_id=user.get("id"), token_type="access",
                 ttl_seconds=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    if payload.refresh_token:
        try:
            data = decode_token(payload.refresh_token)
            # Only revoke refresh tokens that belong to the caller — otherwise a
            # logged-in user could revoke another user's session (DoS).
            if str(data.get("sub", "")) == str(user.get("id", "")):
                revoke_token(str(data.get("jti", "")), user_id=user.get("id"),
                             token_type="refresh",
                             ttl_seconds=settings.JWT_REFRESH_TOKEN_EXPIRE_MINUTES * 60)
        except Exception as exc:
            logging.getLogger("zameenai.auth").warning(
                "logout_refresh_decode_failed user=%s error=%s", user.get("id"), exc)
    _audit(request, actor=user.get("username", ""), role=user.get("role", ""),
           action="LOGOUT", entity_id=user.get("id", ""))
    return {"status": "SUCCESS"}


@router.get("/me", response_model=CurrentUserResponse)
def me(user: dict = Depends(get_current_user)):
    return CurrentUserResponse(id=user["id"], username=user["username"], role=user["role"],
                               project_ids=[str(p) for p in user.get("project_ids", [])],
                               scopes=list(user.get("scopes", [])))


@router.get("/roles", response_model=list[RoleInfo])
def roles():
    from app.core.roles import ROLE_DESCRIPTIONS

    return [RoleInfo(role=r, permissions=sorted(permissions_for(r)),
                     description=ROLE_DESCRIPTIONS.get(r)) for r in ALL_ROLES]


@router.get("/dev-users")
def dev_users():
    """Explicitly development-only credential hint (never passwords)."""
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "Not found", "request_id": None})
    from app.core.security import DEV_USERS

    return {"users": sorted(DEV_USERS.keys()),
            "warning": "Development-only; production uses DB-backed users. "
                       "No passwords are exposed by this endpoint."}


# --- Citizen OTP (username/phone -> 6-digit challenge, 5-min TTL) ---

def _citizen_username(payload_username: str) -> str:
    return payload_username.strip()


@router.post("/citizen/request-otp")
def citizen_request_otp(payload: OtpRequest, request: Request):
    from app.core import token_store as _ts

    if not _ts.rate_limit_ok(_rate_key(request, f"otp:{payload.username}"),
                             limit=settings.OTP_MAX_ATTEMPTS, window_seconds=300):
        raise HTTPException(status_code=429, detail={
            "code": "RATE_LIMITED", "message": "Too many OTP requests",
            "request_id": getattr(request.state, "request_id", None)})
    username = _citizen_username(payload.username)
    otp = _ts.new_otp()
    _ts.otp_challenges.set(f"otp:{username}", otp, settings.OTP_EXPIRE_MINUTES * 60)
    _audit(request, actor=username, role="citizen", action="OTP_REQUESTED",
           meta={"ttl_minutes": settings.OTP_EXPIRE_MINUTES})
    # Dev/test channel returns the OTP; production integrates an SMS gateway
    # and must NOT return it (DEBUG-gated).
    if settings.DEBUG:
        return {"status": "SUCCESS", "otp": otp, "expires_in_minutes": settings.OTP_EXPIRE_MINUTES}
    return {"status": "SUCCESS", "expires_in_minutes": settings.OTP_EXPIRE_MINUTES}


@router.post("/citizen/verify-otp", response_model=TokenResponse)
def citizen_verify_otp(payload: OtpVerifyRequest, request: Request):
    from app.core import token_store as _ts

    username = _citizen_username(payload.username)
    expected = _ts.otp_challenges.get(f"otp:{username}")
    if not expected or expected != payload.otp.strip():
        _audit(request, actor=username, role="citizen", action="OTP_FAILED", ok=False)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={
            "code": "AUTHENTICATION_REQUIRED", "message": "Invalid or expired OTP",
            "request_id": getattr(request.state, "request_id", None)})
    _ts.otp_challenges.pop(f"otp:{username}")
    # Bind OTP identity to a citizen user: dev-store citizen when DEBUG,
    # else look up username in User table (role must be citizen).
    user_id = "u-citizen"
    role = "citizen"
    scopes: list[str] = []
    if settings.DEBUG:
        from app.core.security import DEV_USERS

        # Per-citizen binding: OTP username maps to its own scope bucket.
        # Known dev citizen keeps its seed scope; unknown OTP users get an
        # isolated empty scope (own uploads only).
        base = DEV_USERS.get(username) or DEV_USERS.get("citizen", {})
        user_id = str(base.get("id", f"u-citizen-{username}"))
        scopes = list(base.get("scopes", []))
        if username not in DEV_USERS:
            user_id = f"u-citizen-{username}"
    else:
        from app.database.session import _SessionFactory

        db = _SessionFactory()
        try:
            from app.database.models.user import User

            row = db.query(User).filter(User.username == username).first()
            if not row or row.role != "citizen" or not row.is_active:
                _audit(request, actor=username, role="citizen",
                       action="OTP_FAILED", ok=False, meta={"reason": "unknown"})
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={
                    "code": "AUTHENTICATION_REQUIRED",
                    "message": "Invalid or expired OTP",
                    "request_id": getattr(request.state, "request_id", None)})
            user_id = row.id
        finally:
            db.close()
    try:
        from app.services.ownership_service import owned_records_for

        scopes = sorted(set(scopes) | set(owned_records_for(user_id, username)))
    except Exception as exc:
        # Scope derivation failure must not widen access: keep citizen scopes
        # empty and surface the fault rather than silently granting more.
        logging.getLogger("zameenai.auth").error(
            "otp_scope_resolution_failed user=%s error=%s", user_id, exc, exc_info=True)
        scopes = sorted(set(scopes))
    access = create_access_token(user_id=user_id, username=username, role=role)
    refresh = create_refresh_token(user_id=user_id, username=username, role=role)
    # Attach per-session scopes for this token holder (memory; DB later).
    if settings.DEBUG:
        try:
            from app.core.security import DEV_USERS as _DU

            _DU.setdefault(username, {"id": user_id, "username": username,
                                      "role": role, "project_ids": [],
                                      "scopes": scopes})
            _DU[username]["scopes"] = scopes
        except Exception as exc:
            logging.getLogger("zameenai.auth").warning(
                "otp_dev_session_register_failed user=%s error=%s", user_id, exc)
    _audit(request, actor=username, role=role, action="OTP_VERIFIED",
           entity_id=user_id)
    return TokenResponse(access_token=access, refresh_token=refresh,
                         expires_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
