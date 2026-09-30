"""Canonical role registry (single source of truth).

Seven runtime roles only. Desk Validator / LAO is ``desk_validator``.
Never introduce LAO as a separate runtime role.
Frontend must map its display names to these canonical values.
"""
from __future__ import annotations

SYSTEM_ADMIN = "system_admin"
PIA = "pia"
FIELD_OFFICER = "field_officer"
DESK_VALIDATOR = "desk_validator"
APPROVER = "approver"
EXECUTIVE = "executive"
CITIZEN = "citizen"

ALL_ROLES: list[str] = [
    SYSTEM_ADMIN,
    PIA,
    FIELD_OFFICER,
    DESK_VALIDATOR,
    APPROVER,
    EXECUTIVE,
    CITIZEN,
]

ROLE_DESCRIPTIONS: dict[str, str] = {
    SYSTEM_ADMIN: "Platform-wide configuration, users, audit",
    PIA: "Create & Initiate: projects, proposals, uploads, submit",
    FIELD_OFFICER: "Ground truth: assigned parcels, GPS, geo-tagged evidence",
    DESK_VALIDATOR: "AI/record validation: OCR review, extraction edit, HITL",
    APPROVER: "Legal/acquisition authorization: approve/reject, notices, compensation",
    EXECUTIVE: "Monitor/analyze/report: dashboards, GIS, KPIs (read-heavy)",
    CITIZEN: "Own data only (OTP): land, acquisition, compensation, grievance",
}

# Frontend display-name -> canonical mapping (frontend used SYSTEM_ADMIN/LAO/etc).
FRONTEND_ROLE_ALIASES: dict[str, str] = {
    "SYSTEM_ADMIN": SYSTEM_ADMIN,
    "PIA": PIA,
    "FIELD_OFFICER": FIELD_OFFICER,
    "FIELD": FIELD_OFFICER,
    "LAO": DESK_VALIDATOR,
    "DESK_VALIDATOR": DESK_VALIDATOR,
    "APPROVER": APPROVER,
    "CALA": APPROVER,
    "CALA/DM": APPROVER,
    "DM": APPROVER,
    "EXECUTIVE": EXECUTIVE,
    "EXEC": EXECUTIVE,
    "CITIZEN": CITIZEN,
}


def normalize_role(raw: str) -> str:
    """Map frontend aliases to canonical; unknown values returned as-is."""
    if not raw:
        return raw
    key = raw.strip()
    if key in ALL_ROLES:
        return key
    return FRONTEND_ROLE_ALIASES.get(key.upper(), key)
