"""Decomposed from phase09_automated_validation.py: rules. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import os
import re
import time
import uuid
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from app.ocr.anomaly.models import (
    Severity,
)
from app.ocr.confidence.models import (
    FIELD_PRIORITY, FieldValueStatus,
)
from .models import *
from .models import (_DATE_FORMATS, _PRIORITY_SEVERITY)

import logging
logger = logging.getLogger(__name__)

def _to_number(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return None
    text = str(value).strip().replace(",", "").replace("\u00a0", " ")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None

def _parse_date(value: Any) -> Optional[date]:
    if isinstance(value, date):
        return value
    if value is None:
        return None
    text = str(value).strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None

def _field_priority(field_name: str) -> str:
    for label, cfg in FIELD_PRIORITY.items():
        if field_name in cfg["fields"]:
            return label
    return "OPTIONAL"

def _severity_for_priority(field_name: str) -> Severity:
    return _PRIORITY_SEVERITY.get(_field_priority(field_name), Severity.WARNING)

def _evidence_from_assessment(assessment: Optional[Dict[str, Any]]) -> List[Any]:
    if not assessment:
        return []
    evidence: List[Any] = []
    status = assessment.get("value_status")
    if status:
        evidence.append(f"value_status={status}")
    confidence = assessment.get("confidence")
    if confidence is not None:
        evidence.append(f"confidence={confidence}")
    method = assessment.get("method")
    if method:
        evidence.append(f"method={method}")
    page = assessment.get("source_page")
    label = assessment.get("source_label")
    if page is not None:
        evidence.append(f"source_page={page}")
    if label:
        evidence.append(f"source_label={label!r}")
    return evidence

def _base_field_check(field_name: str, assessment: Optional[Dict[str, Any]],
                      applicability_level: str) -> Optional[FieldValidationResult]:
    """Mandatory presence/applicability-aware base check for one field."""
    status = (assessment or {}).get("value_status", "")

    if applicability_level == "NOT_APPLICABLE" or status == FieldValueStatus.NOT_APPLICABLE.value:
        present = assessment.get("value") if assessment else None
        if present is not None and str(present).strip() != "":
            return FieldValidationResult(
                field=field_name,
                status=ValidationFieldStatus.WARNING,
                severity=Severity.WARNING,
                rule=RuleCategory.APPLICABILITY_AWARE,
                reason="A value is present for a field that is NOT_APPLICABLE for this "
                       "document type; verify the extraction or applicability matrix.",
                value=present,
                original_value=assessment.get("raw_value"),
                evidence=[f"applicability={applicability_level}",
                          f"value_status={status}"],
            )
        return FieldValidationResult(
            field=field_name,
            status=ValidationFieldStatus.NOT_APPLICABLE,
            severity=Severity.NONE,
            rule=RuleCategory.APPLICABILITY_AWARE,
            reason=f"Field is NOT_APPLICABLE for this document type "
                   f"(applicability={applicability_level}).",
            evidence=[f"value_status={status or 'NOT_APPLICABLE'}"],
        )

    if status in (FieldValueStatus.REQUIRED_BUT_MISSING.value,
                  FieldValueStatus.OPTIONAL_AND_MISSING.value) or not status:
        severity = _severity_for_priority(field_name) if applicability_level == "REQUIRED" \
            else Severity.INFO
        return FieldValidationResult(
            field=field_name,
            status=ValidationFieldStatus.MISSING,
            severity=severity,
            rule=RuleCategory.REQUIRED_PRESENCE,
            reason=f"Applicability={applicability_level}; no value was extracted.",
            evidence=[f"applicability={applicability_level}",
                      f"value_status={status or 'MISSING'}"],
        )

    if status == FieldValueStatus.REQUIRED_BUT_UNREADABLE.value:
        return FieldValidationResult(
            field=field_name,
            status=ValidationFieldStatus.UNREADABLE,
            severity=_severity_for_priority(field_name),
            rule=RuleCategory.REQUIRED_PRESENCE,
            reason="The field's label was found in the document but its value could "
                   "not be read.",
            evidence=[f"value_status={status}", f"applicability={applicability_level}"],
        )

    if status == FieldValueStatus.CONFLICTING.value or (assessment or {}).get("in_conflict"):
        return FieldValidationResult(
            field=field_name,
            status=ValidationFieldStatus.CONFLICT,
            severity=Severity.ERROR,
            rule=RuleCategory.REQUIRED_PRESENCE,
            reason="Conflicting candidate values were extracted; Phase 09 never "
                   "auto-resolves a conflict.",
            value=(assessment or {}).get("value"),
            original_value=(assessment or {}).get("raw_value"),
            evidence=[f"value_status={status}", f"applicability={applicability_level}",
                      *(a or {} for a in ((assessment or {}).get("conflict_alternatives") or []))],
        )

    return None
