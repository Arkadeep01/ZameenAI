"""Decomposed from phase11_hitl_verification.py: store. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from .models import *
from app.ocr.utils.time_ids import new_dated_id as _canonical_dated_id
from app.ocr.utils.time_ids import utc_now_iso as _canonical_now_iso

import logging
logger = logging.getLogger(__name__)

def _utcnow() -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.utc_now_iso."""
    return _canonical_now_iso()

def _gen_hitl1_id() -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.new_dated_id."""
    return _canonical_dated_id("HITL1")

def _flagged_from_assessment(phase08: Dict[str, Any]) -> List[str]:
    """Fields that must be dispositioned before VERIFIED.

    Conflicted fields (explicit conflict list or CONFLICTING status) and
    REQUIRED_BUT_UNREADABLE fields. Merely missing fields may stay missing:
    the reviewer cannot conjure values.
    """
    flagged: List[str] = []
    for entry in (phase08.get("conflicts", []) or []):
        fn = entry.get("field") if isinstance(entry, dict) else None
        if fn and fn not in flagged:
            flagged.append(fn)
    for fn, assessment in ((phase08.get("fields", {}) or {}).items()):
        if not isinstance(assessment, dict):
            continue
        status = str(assessment.get("value_status", ""))
        if assessment.get("in_conflict") or status == "CONFLICTING":
            if fn not in flagged:
                flagged.append(fn)
        elif status == "REQUIRED_BUT_UNREADABLE":
            if fn not in flagged:
                flagged.append(fn)
    return sorted(flagged)
