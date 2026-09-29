"""Decomposed from phase11_reprocessing.py: file_helpers. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import hashlib
import io
import json
import os
import shutil
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .models import *
from app.ocr.utils.hashing import sha256_bytes as _canonical_bytes
from app.ocr.utils.hashing import sha256_file as _canonical_file
from app.ocr.utils.json_io import atomic_write_json as _canonical_atomic_write
from app.ocr.utils.json_io import read_json as _canonical_read_json
from app.ocr.utils.time_ids import new_dated_id as _canonical_dated_id
from app.ocr.utils.time_ids import utc_now_iso as _canonical_now_iso

import logging
logger = logging.getLogger(__name__)

def _now_iso() -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.utc_now_iso."""
    return _canonical_now_iso()

def _gen_reprocessing_id() -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.new_dated_id."""
    return _canonical_dated_id("REP")

def _sha256_bytes(content: bytes) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.hashing.sha256_bytes."""
    return _canonical_bytes(content)

def _sha256_path(path: Path) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.hashing.sha256_file."""
    return _canonical_file(path)

def _atomic_write_json(path: Path, payload: Dict[str, Any]) -> None:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.json_io.atomic_write_json."""
    return _canonical_atomic_write(path, payload)

def _read_json(path: Path) -> Optional[Dict[str, Any]]:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.json_io.read_json."""
    return _canonical_read_json(path)

def _flatten_record(record: Optional[Dict[str, Any]], prefix: str = "") -> Dict[str, Any]:
    """Flatten a nested extracted_record dict into canonical dotted paths."""
    out: Dict[str, Any] = {}
    if not isinstance(record, dict):
        return out
    for key, value in record.items():
        dotted = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            out.update(_flatten_record(value, dotted))
        else:
            out[dotted] = value
    return out

def new_run_record(*, reprocessing_id: str, submission: Dict[str, Any],
                   scope: Dict[str, str], by: str) -> Dict[str, Any]:
    return {
        "phase": "REPROCESSING",
        "reprocessing_id": reprocessing_id,
        "record_id": submission.get("record_id", ""),
        "document_id": submission.get("document_id", ""),
        "parent_document_id": submission.get("parent_document_id", ""),
        "parent_submission_id": submission.get("parent_submission_id", ""),
        "submission_id": submission.get("submission_id", ""),
        "remediation_id": submission.get("remediation_id", ""),
        "attempt_number": int(submission.get("attempt_number", 0)),
        "version": int(submission.get("version", 0)),
        "submission_type": submission.get("submission_type", ""),
        "retry_of": None,
        "superseded_by": None,
        "scope": dict(scope),
        "status": ReprocessingStatus.QUEUED.value,
        "current_phase": ReprocessingStatus.QUEUED.value,
        "progress": 0,
        "phases": [],
        "result": None,
        "decision": None,
        "next_phase": None,
        "review_required": False,
        "attempts_exhausted": False,
        "remediation": {"session_status": None, "note": ""},
        "error": None,
        "timestamps": {"created_at": _now_iso()},
        "duration_seconds": 0.0,
        "created_by": by,
    }
