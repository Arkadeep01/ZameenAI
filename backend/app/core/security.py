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
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.core.config import settings

# ---------------------------------------------------------------------------
# Roles (per task spec §12 + AGENTS.md federated model)
# ---------------------------------------------------------------------------

SYSTEM_ADMIN = "system_admin"
PIA = "pia"
FIELD_OFFICER = "field_officer"
DESK_VALIDATOR = "desk_validator"  # Desk Validator / LAO
APPROVER = "approver"
EXECUTIVE = "executive"
CITIZEN = "citizen"

ALL_ROLES = [
    SYSTEM_ADMIN, PIA, FIELD_OFFICER, DESK_VALIDATOR, APPROVER, EXECUTIVE, CITIZEN,
]

# Permission strings follow MODULE.ACTION convention (TECHSPEC §13).
PERMISSIONS: dict[str, set[str]] = {
    SYSTEM_ADMIN: {"*"},
    PIA: {
        "PROJECT.READ", "PROJECT.WRITE", "DOCUMENT.READ", "DOCUMENT.CREATE",
        "DIGITIZATION.READ", "DIGITIZATION.RUN", "REPORT.READ", "GIS.READ",
        "WORKFLOW.READ",
    },
    FIELD_OFFICER: {
        "DOCUMENT.CREATE", "DOCUMENT.READ", "DIGITIZATION.READ",
        "FIELD.VERIFY", "GIS.READ",
    },
    DESK_VALIDATOR: {
        "DOCUMENT.READ", "DIGITIZATION.READ", "VALIDATION.REVIEW",
        "HITL.REVIEW", "CORRECTION.REQUEST", "GIS.READ", "WORKFLOW.READ",
    },
    APPROVER: {
        "DOCUMENT.READ", "DIGITIZATION.READ", "WORKFLOW.APPROVE",
        "WORKFLOW.REJECT", "GIS.READ", "REPORT.READ",
    },
    EXECUTIVE: {"DOCUMENT.READ", "DIGITIZATION.READ", "REPORT.READ", "GIS.READ", "DASHBOARD.READ"},
    CITIZEN: {"OWN.RECORD.READ", "OWN.STATUS.READ", "GRIEVANCE.CREATE"},
}


def has_permission(role: str, permission: str) -> bool:
    perms = PERMISSIONS.get(role, set())
    return "*" in perms or permission in perms


# ---------------------------------------------------------------------------
# Password hashing (passlib bcrypt preferred, pbkdf2 fallback)
# ---------------------------------------------------------------------------

try:  # pragma: no cover - optional dep
    from passlib.context import CryptContext as _CryptContext

    _pwd_ctx = _CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(pw: str) -> str:
        return _pwd_ctx.hash(pw)

    def verify_password(pw: str, hashed: str) -> bool:
        try:
            return _pwd_ctx.verify(pw, hashed)
        except Exception:
            return False
except Exception:  # stdlib fallback (no native wheels needed)

    def hash_password(pw: str) -> str:
        salt = os.urandom(16).hex()
        digest = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()
        return f"pbkdf2${salt}${digest}"

    def verify_password(pw: str, hashed: str) -> bool:
        try:
            _, salt, digest = hashed.split("$")
            check = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()
            return hmac.compare_digest(check, digest)
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Dev user store (explicitly development-only seed; real DB wiring lives in
# app.repositories.user_repository.UserRepository).
# ---------------------------------------------------------------------------

def _dev_user(username: str, role: str, user_id: str, scopes: Optional[list[str]] = None) -> dict[str, Any]:
    return {
        "id": user_id,
        "username": username,
        "role": role,
        "password_hash": hash_password("password123"),
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


def authenticate_user(username: str, password: str) -> Optional[dict[str, Any]]:
    user = DEV_USERS.get(username)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return {k: v for k, v in user.items() if k != "password_hash"}


# ---------------------------------------------------------------------------
# Minimal HS256 JWT (stdlib only; avoids adding a new hard dependency).
# ---------------------------------------------------------------------------

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


class _TokenError(Exception):
    pass


def create_access_token(*, user_id: str, username: str, role: str,
                        expires_minutes: Optional[int] = None) -> str:
    exp = int(time.time()) + int((expires_minutes or settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES) * 60)
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = _b64url(json.dumps(
        {"sub": user_id, "username": username, "role": role, "exp": exp},
        separators=(",", ":")).encode())
    sig = _b64url(hmac.new(settings.SECRET_KEY.encode(), f"{header}.{body}".encode(),
                           hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"


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
    return payload
