"""Shared time/identity helpers (single authoritative implementation).

Consolidates the previously duplicated ``_now_iso`` / ``_utcnow`` /
``_new_id`` / ``_gen_*_id`` helpers that were copied across the
remediation, resubmission, reprocessing, HITL and anomaly-duplicate
stage modules. Domain modules keep thin private wrappers delegating
here so existing import paths and ID formats are unchanged.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone


def utc_now_iso() -> str:
    """Current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def new_prefixed_id(prefix: str) -> str:
    """Random hex-suffixed identifier: ``{prefix}-{16 hex chars}``."""
    return f"{prefix}-{uuid.uuid4().hex[:16]}"


def new_dated_id(prefix: str) -> str:
    """Dated identifier: ``{prefix}-YYYYMMDD-{10 hex chars}``.

    Preserves the exact legacy format used for HITL (``HITL1-``),
    anomaly-duplicate stage (``ADP-``) and reprocessing (``REP-``) IDs,
    including the local-time date component.
    """
    return f"{prefix}-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:10]}"
