"""JWT authentication + password hashing + 7 project roles.

Real server-side auth (previously absent: no login, no token, no RBAC).
Uses ``passlib`` when available, falls back to stdlib pbkdf2 so the API
boots without extra native deps. Dev user store is in-memory and clearly
marked; production must back ``authenticate_user`` with the UserRepository.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.core.config import settings
from app.core.permissions import ROLE_PERMISSIONS as _ROLE_PERMISSIONS
from app.core.permissions import has_permission as _canonical_has_permission
from app.core.roles import (
    ALL_ROLES as _ALL_ROLES,
    APPROVER as _APPROVER,
    CITIZEN as _CITIZEN,
    DESK_VALIDATOR as _DESK_VALIDATOR,
    EXECUTIVE as _EXECUTIVE,
    FIELD_OFFICER as _FIELD_OFFICER,
    PIA as _PIA,
    SYSTEM_ADMIN as _SYSTEM_ADMIN,
)

# ---------------------------------------------------------------------------
# Roles — re-exported from app.core.roles (single source of truth).
# ---------------------------------------------------------------------------

SYSTEM_ADMIN = _SYSTEM_ADMIN
PIA = _PIA
FIELD_OFFICER = _FIELD_OFFICER
DESK_VALIDATOR = _DESK_VALIDATOR  # Desk Validator / LAO
APPROVER = _APPROVER
EXECUTIVE = _EXECUTIVE
CITIZEN = _CITIZEN

ALL_ROLES = _ALL_ROLES

# Permission map — re-exported from app.core.permissions (single vocabulary).
# Kept as dict[str, set] for backward compatibility with existing callers.
PERMISSIONS: dict[str, set[str]] = {
    role: set(perms) for role, perms in _ROLE_PERMISSIONS.items()
}


def has_permission(role: str, permission: str) -> bool:
    return _canonical_has_permission(role, permission)


# ---------------------------------------------------------------------------
# Password hashing (passlib bcrypt preferred, pbkdf2 fallback)
# ---------------------------------------------------------------------------

def _pbkdf2_hash(pw: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()
    return f"pbkdf2${salt}${digest}"


def _pbkdf2_verify(pw: str, hashed: str) -> bool:
    try:
        _, salt, digest = hashed.split("$")
        check = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()
        return hmac.compare_digest(check, digest)
    except Exception:
        return False


try:  # pragma: no cover - optional dep
    from passlib.context import CryptContext as _CryptContext

    _pwd_ctx = _CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(pw: str) -> str:
        try:
            return _pwd_ctx.hash(pw)
        except Exception:
            # bcrypt backend broken (e.g. version mismatch) -> secure fallback.
            return _pbkdf2_hash(pw)

    def verify_password(pw: str, hashed: str) -> bool:
        try:
            if hashed.startswith("pbkdf2$"):
                return _pbkdf2_verify(pw, hashed)
            return bool(_pwd_ctx.verify(pw, hashed))
        except Exception:
            return _pbkdf2_verify(pw, hashed) if hashed.startswith("pbkdf2$") else False
except Exception:  # stdlib fallback (no native wheels needed)

    def hash_password(pw: str) -> str:
        return _pbkdf2_hash(pw)

    def verify_password(pw: str, hashed: str) -> bool:
        return _pbkdf2_verify(pw, hashed)


# ---------------------------------------------------------------------------
# Dev user store (explicitly development-only seed; real DB wiring lives in
# app.repositories.user_repository.UserRepository).
# ---------------------------------------------------------------------------

_DEV_EPHEMERAL_PASSWORD: Optional[str] = None


def _dev_password() -> str:
    """Resolve the dev seed password from the environment.

    There is intentionally no hardcoded fallback. When ``DEV_USERS_PASSWORD``
    is unset a single random password is generated for the whole process and
    logged once, so all seed identities share one usable credential and no
    credential is ever committed. Generating per call would give every user a
    different unknown password and make the seed identities unusable.
    """
    global _DEV_EPHEMERAL_PASSWORD
    configured = (getattr(settings, "DEV_USERS_PASSWORD", "") or "").strip()
    if configured:
        return configured
    if _DEV_EPHEMERAL_PASSWORD is None:
        _DEV_EPHEMERAL_PASSWORD = secrets.token_urlsafe(12)
        logging.getLogger("zameenai.security").warning(
            "DEV_USERS_PASSWORD not set; generated an ephemeral dev password for "
            "this process: %s (development only - set DEV_USERS_PASSWORD to pin it)",
            _DEV_EPHEMERAL_PASSWORD)
    return _DEV_EPHEMERAL_PASSWORD


def _dev_user(username: str, role: str, user_id: str, scopes: Optional[list[str]] = None) -> dict[str, Any]:
    return {
        "id": user_id,
        "username": username,
        "role": role,
        "password_hash": hash_password(_dev_password()),
        "project_ids": ["1"] if role in (PIA, FIELD_OFFICER, DESK_VALIDATOR, APPROVER) else [],
        "scopes": scopes or [],
    }


DEV_USERS: dict[str, dict[str, Any]] = {
    "admin": _dev_user("admin", SYSTEM_ADMIN, "u-admin"),
    "pia": _dev_user("pia", PIA, "u-pia"),
    "field": _dev_user("field", FIELD_OFFICER, "u-field"),
    "validator": _dev_user("validator", DESK_VALIDATOR, "u-validator"),
    "approver": _dev_user("approver", APPROVER, "u-approver"),
    "executive": _dev_user("executive", EXECUTIVE, "u-executive"),
    "citizen": _dev_user("citizen", CITIZEN, "u-citizen", scopes=["LR-2026-000002"]),
}


def is_production() -> bool:
    return not bool(settings.DEBUG)


def assert_secure_secret() -> None:
    """Fail closed in production when a weak or missing secret is configured."""
    if not is_production():
        return
    key = settings.SECRET_KEY.strip().strip('"').strip("'")
    if not key:
        raise RuntimeError("Refusing to boot in production without a SECRET_KEY")
    if key.lower().startswith("django-insecure-") or key.lower() in {"change-me", "secret"}:
        raise RuntimeError("Refusing to boot in production with a placeholder SECRET_KEY")
    if len(key) < 32:
        raise RuntimeError("Refusing to boot in production with short SECRET_KEY (<32 chars)")


def dev_users_enabled() -> bool:
    return bool(settings.DEBUG)


def authenticate_user(username: str, password: str, db=None) -> Optional[dict[str, Any]]:
    """Dev-store when DEBUG; DB-backed User table in production."""
    if dev_users_enabled():
        user = DEV_USERS.get(username)
        if not user:
            return None
        if not verify_password(password, user["password_hash"]):
            return None
        return {k: v for k, v in user.items() if k != "password_hash"}
    # Production: DB-backed users only (no hardcoded credentials).
    if db is None:
        return None
    try:
        from app.database.models.user import User

        row = db.query(User).filter(User.username == username).first()
        if not row or not getattr(row, "is_active", True):
            return None
        if not verify_password(password, row.password_hash):
            return None
        return {"id": row.id, "username": row.username, "role": row.role,
                "project_ids": [], "scopes": []}
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Minimal HS256 JWT (stdlib only; avoids adding a new hard dependency).
# Claims: sub, username, role, jti, iat, exp (+ type for refresh).
# ---------------------------------------------------------------------------

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


class _TokenError(Exception):
    pass


def _sign(header_b64: str, body_b64: str) -> str:
    return _b64url(hmac.new(settings.SECRET_KEY.encode(), f"{header_b64}.{body_b64}".encode(),
                            hashlib.sha256).digest())


def _mint(payload: dict[str, Any]) -> str:
    from app.core import token_store as _ts

    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = _b64url(json.dumps(payload, separators=(",", ":")).encode())
    return f"{header}.{body}.{_sign(header, body)}"


def create_access_token(*, user_id: str, username: str, role: str,
                        expires_minutes: Optional[int] = None) -> str:
    from app.core import token_store as _ts

    now = int(time.time())
    return _mint({
        "sub": user_id, "username": username, "role": role,
        "jti": _ts.new_jti(), "iat": now,
        "exp": now + int((expires_minutes or settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES) * 60),
        "type": "access",
    })


def create_refresh_token(*, user_id: str, username: str, role: str,
                         expires_minutes: Optional[int] = None) -> str:
    from app.core import token_store as _ts

    now = int(time.time())
    ttl = int((expires_minutes or settings.JWT_REFRESH_TOKEN_EXPIRE_MINUTES) * 60)
    jti = _ts.new_jti()
    token = _mint({
        "sub": user_id, "username": username, "role": role,
        "jti": jti, "iat": now, "exp": now + ttl, "type": "refresh",
    })
    _ts.refresh_tokens.set(jti, user_id, ttl)
    return token


def decode_token(token: str) -> dict[str, Any]:
    try:
        header_b64, body_b64, sig_b64 = token.split(".")
    except ValueError:
        raise _TokenError("Malformed token")
    expected = _b64url(hmac.new(settings.SECRET_KEY.encode(),
                                f"{header_b64}.{body_b64}".encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(expected, sig_b64):
        raise _TokenError("Bad signature")
    try:
        payload = json.loads(_b64url_decode(body_b64))
    except Exception:
        raise _TokenError("Bad payload")
    if int(payload.get("exp", 0)) < int(time.time()):
        raise _TokenError("Token expired")
    if not payload.get("sub") or not payload.get("role") or not payload.get("jti") \
            or not payload.get("iat"):
        # Legacy tokens without jti/iat are rejected (fail closed).
        raise _TokenError("Missing required claims")
    return payload


def is_token_revoked(jti: str, db=None) -> bool:
    from app.core import token_store as _ts

    if _ts.revoked_jti.contains(jti):
        return True
    if db is not None:
        try:
            from app.database.models.auth_token import RevokedToken

            return db.get(RevokedToken, jti) is not None
        except Exception:
            return False
    return False


def revoke_token(jti: str, *, user_id: Optional[str] = None,
                 token_type: str = "access", ttl_seconds: int = 86400,
                 db=None) -> None:
    from app.core import token_store as _ts

    _ts.revoked_jti.set(jti, "1", ttl_seconds)
    _ts.refresh_tokens.pop(jti)
    if db is not None:
        try:
            from datetime import datetime, timezone as _tz

            from app.database.models.auth_token import RevokedToken

            if db.get(RevokedToken, jti) is None:
                db.add(RevokedToken(jti=jti, user_id=user_id, token_type=token_type,
                                    expires_at=datetime.fromtimestamp(
                                        time.time() + ttl_seconds, tz=_tz.utc)))
                db.commit()
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
