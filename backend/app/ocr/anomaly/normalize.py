"""Decomposed from phase10_anomaly_duplicate_detection.py: normalize. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple
import time as _time
import uuid as _uuid
from datetime import datetime as _datetime, timezone as _timezone
from .models import *
from .models import (_COMPOSITE_COMPONENTS, _IDENTIFIER_FIELDS, _NAME_FIELDS)

import logging
logger = logging.getLogger(__name__)

def normalize_identifier(value: Any) -> str:
    """Normalize an identifier for comparison.

    * NFKC (full-width -> ASCII); uppercase.
    * Drop every character that is not [A-Z0-9] so OCR separator noise such
      as "-", "/", "_", "." is neutralised: "KH-456", "KH 456" and "KH/456"
      all canonicalise to "KH456".
    """
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    text = text.upper()
    return re.sub(r"[^A-Z0-9]", "", text)

def numeric_core(value: Any) -> Optional[int]:
    """First contiguous digit group of an identifier, if any.

    Used as a fuzzy review signal only (e.g. "P-112" vs "112").
    """
    if value is None:
        return None
    match = re.search(r"\d+", unicodedata.normalize("NFKC", str(value)))
    if not match:
        return None
    try:
        return int(match.group())
    except ValueError:
        return None

def normalize_name(value: Any) -> str:
    """Normalize a person/place/property name for comparison."""
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    text = text.casefold()
    text = re.sub(r"[^0-9a-z\u0980-\u09ff\u0900-\u097f\u0041-\u007a]+", " ", text)
    return " ".join(text.split())

def compare_name(a: Any, b: Any) -> bool:
    na, nb = normalize_name(a), normalize_name(b)
    return bool(na and nb and na == nb)

def compare_identifier(a: Any, b: Any) -> bool:
    na, nb = normalize_identifier(a), normalize_identifier(b)
    return bool(na and nb and na == nb)

def _value_of(assessment: Optional[Dict[str, Any]]) -> Any:
    """Extract the comparison value from a Phase 08 field assessment."""
    if not assessment:
        return None
    value = assessment.get("value")
    if value is None:
        value = assessment.get("raw_value")
    return value

def build_record_profile(
    record_id: str,
    document_id: str,
    fields: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    """Build a comparable profile from a Phase 08 `fields` map.

    Only PRESENT values are recorded. `canonical` holds per-field comparison
    keys already normalized to their semantics (identifier vs name); raw
    values are kept for honest evidence.
    """
    present: Dict[str, Any] = {}
    canonical: Dict[str, str] = {}
    for field_name, assessment in (fields or {}).items():
        value = _value_of(assessment)
        if value is None or value == "":
            continue
        status = (assessment or {}).get("value_status", "")
        if status in ("NOT_APPLICABLE", "REQUIRED_BUT_UNREADABLE", "OPTIONAL_AND_MISSING",
                      "REQUIRED_BUT_MISSING", "CONFLICTING"):
            if status not in ("CONFLICTING",):
                continue
        present[field_name] = value
        if field_name in _NAME_FIELDS:
            canonical[field_name] = normalize_name(value) or normalize_identifier(value)
        else:
            canonical[field_name] = normalize_identifier(value)

    identifiers = {
        fn: normalize_identifier(v)
        for fn, v in present.items()
        if fn in _IDENTIFIER_FIELDS and normalize_identifier(v)
    }

    fingerprint_parts: List[str] = []
    for component in _COMPOSITE_COMPONENTS:
        key = canonical.get(component)
        if key:
            fingerprint_parts.append(f"{component}={key}")

    return {
        "record_id": record_id,
        "document_id": document_id,
        "present": present,
        "canonical": canonical,
        "identifiers": identifiers,
        "fingerprint": "|".join(fingerprint_parts),
        "fingerprint_parts": fingerprint_parts,
        "fingerprint_fields": [c for c in _COMPOSITE_COMPONENTS if c in canonical],
    }

def scan_local_dataset(phase08_dir: Path) -> List[Dict[str, Any]]:
    """Scan already-scanned Phase 08 outputs into record profiles.

    Only the canonical per-record directory is scanned:
    * reprocessing scopes ("<record>~REP-SUB-...") are the same record's
      corrected runs and must NOT participate as independent records, else
      every reprocessing would false-positive a duplicate record.
    """
    profiles: List[Dict[str, Any]] = []
    if not phase08_dir.is_dir():
        return profiles
    for record_dir in sorted(phase08_dir.iterdir()):
        if not record_dir.is_dir():
            continue
        if "~REP-SUB" in record_dir.name or record_dir.name.startswith("_") or record_dir.name.startswith("."):
            continue
        for path in sorted(record_dir.glob("*_confidence_completeness.json")):
            try:
                with open(path, encoding="utf-8") as handle:
                    result = json.load(handle)
            except Exception as exc:
                logger.warning("phase13 scan: unreadable %s: %s", path, exc)
                continue
            if not isinstance(result, dict):
                continue
            fields = result.get("fields") or {}
            if not fields:
                continue
            profile = build_record_profile(
                record_id=result.get("record_id") or record_dir.name,
                document_id=result.get("document_id") or path.stem,
                fields=fields,
            )
            profile["source_path"] = str(path)
            profiles.append(profile)
    return profiles
