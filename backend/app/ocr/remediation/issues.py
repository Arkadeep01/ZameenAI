"""Decomposed from phase09_uploader_remediation.py: issues. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import hashlib
import json
import logging
import re
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .models import *
from app.ocr.utils.time_ids import new_prefixed_id as _canonical_new_id
from app.ocr.utils.time_ids import utc_now_iso as _canonical_now_iso
from .models import (_ISSUE_CORRECTIONS, _SEVERITY_BY_PRIORITY)

import logging
logger = logging.getLogger(__name__)

def _default_severity_override() -> Dict[str, str]:
    return {}

_P08_REASON_TO_ISSUE = {
    "MISSING_FIELD": RemediationIssueType.FIELD_MISSING,
    "UNREADABLE_FIELD": RemediationIssueType.FIELD_UNREADABLE,
    "CONFLICTING_VALUES": RemediationIssueType.FIELD_CONFLICT,
    "LOW_OCR_CONFIDENCE": RemediationIssueType.FIELD_UNREADABLE,
    "LOW_DOCUMENT_CONFIDENCE": RemediationIssueType.LOW_IMAGE_QUALITY,
    "INSUFFICIENT_EVIDENCE": RemediationIssueType.ADDITIONAL_EVIDENCE_REQUIRED,
    "TABLE_EXTRACTION_FAILURE": RemediationIssueType.TABLE_UNREADABLE,
    "CRITICAL_FIELD_MISSING": RemediationIssueType.FIELD_MISSING,
}

_QUALITY_ISSUE_MAP = {
    "blur": RemediationIssueType.SEVERE_BLUR,
    "brightness_dark": RemediationIssueType.EXTREME_DARKNESS,
    "brightness_bright": RemediationIssueType.EXTREME_OVEREXPOSURE,
    "resolution": RemediationIssueType.LOW_RESOLUTION,
    "cropping": RemediationIssueType.CROPPING,
    "contrast": RemediationIssueType.LOW_IMAGE_QUALITY,
}

def _humanize_field(field_name: str) -> str:
    if not field_name:
        return ""
    part = field_name.rsplit(".", 1)[-1] if "." in field_name else field_name
    words = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", part).replace("_", " ").replace("-", " ").strip()
    return words.title() or part

def _now_iso() -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.utc_now_iso."""
    return _canonical_now_iso()

def _new_id(prefix: str) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.new_prefixed_id."""
    return _canonical_new_id(prefix)

def _field_priority_level(field_name: str) -> str:
    try:
        from ..confidence.models import FIELD_PRIORITY as _P08_FIELD_PRIORITY
    except ImportError:
        return "OPTIONAL"
    for label, cfg in _P08_FIELD_PRIORITY.items():
        if field_name in cfg.get("fields", []):
            return label
    return "OPTIONAL"

def _resolve_severity(
    priority_level: str,
    issue_type: RemediationIssueType,
    severity_override: Optional[Dict[str, str]] = None,
    field: str = "",
) -> str:
    override = severity_override or {}
    if field and field in override:
        return override[field]
    if issue_type.value in override:
        return override[issue_type.value]
    base = _SEVERITY_BY_PRIORITY.get(priority_level, Severity.MEDIUM)
    return base.value

def _reason_to_issue(
    reason: Dict[str, Any],
    fields_section: Dict[str, Dict[str, Any]],
    severity_override: Optional[Dict[str, str]] = None,
) -> Optional[RemediationIssue]:
    field = reason.get("field") or ""
    p08_reason = reason.get("reason", "")
    issue_type = _P08_REASON_TO_ISSUE.get(p08_reason)
    if issue_type is None:
        issue_type = RemediationIssueType.OTHER

    field_assessment = fields_section.get(field, {})
    priority_level = field_assessment.get("priority") or _field_priority_level(field)

    page = reason.get("page")
    if page is None and field_assessment:
        page = field_assessment.get("source_page")

    label = field_assessment.get("source_label") or _humanize_field(field)
    method = field_assessment.get("method")

    evidence_ref: Dict[str, Any] = {}
    if label:
        evidence_ref["label"] = label
    if method:
        evidence_ref["method"] = method
    if field_assessment.get("value") is not None:
        evidence_ref["value"] = field_assessment.get("value")
    if field_assessment.get("raw_value"):
        evidence_ref["raw_value"] = field_assessment.get("raw_value")
    if page is not None:
        evidence_ref["page"] = page

    severity = _resolve_severity(priority_level, issue_type, severity_override, field)
    if p08_reason == "LOW_OCR_CONFIDENCE" and severity == Severity.CRITICAL.value:
        severity = Severity.HIGH.value

    message = reason.get("message") or _default_message(
        issue_type, field, label, page, severity
    )
    required_action = _default_required_action(issue_type, label, page)

    corrections = _ISSUE_CORRECTIONS.get(
        issue_type, [CorrectionType.RE_UPLOAD_CLEARER_SCAN, CorrectionType.UPLOAD_SUPPORTING_DOCUMENT]
    )

    return RemediationIssue(
        issue_id=_new_id("ISS"),
        field=field or None,
        field_label=label,
        scope=RemediationScope.FIELD,
        issue_type=issue_type,
        severity=severity,
        page=page,
        message=message,
        required_action=required_action,
        evidence_reference=evidence_ref,
        correction_types=corrections,
    )

def _default_message(
    issue_type: RemediationIssueType,
    field: str,
    label: str,
    page: Optional[int],
    severity: str,
) -> str:
    target = label or _humanize_field(field) or "unknown field"
    prefix = f"On page {page}, " if page is not None else ""
    if issue_type == RemediationIssueType.FIELD_MISSING:
        return f"{prefix}the {target} was not found in the extracted document. It is marked {severity} because this information matters for the land record."
    if issue_type == RemediationIssueType.FIELD_UNREADABLE:
        return f"{prefix}the {target} is present in the document but could not be read reliably from the scan."
    if issue_type == RemediationIssueType.FIELD_CONFLICT:
        return f"{prefix}multiple different values were read for the {target}; the correct value cannot be confirmed from the current scan."
    if issue_type == RemediationIssueType.INCOMPLETE_DOCUMENT:
        return "The submitted document is incomplete — key content could not be located or read."
    if issue_type == RemediationIssueType.WRONG_DOCUMENT:
        return "The submitted document does not appear to be the expected land record."
    if issue_type == RemediationIssueType.WRONG_DOCUMENT_TYPE:
        return "The submitted document type does not match the expected land record type."
    if issue_type == RemediationIssueType.ADDITIONAL_EVIDENCE_REQUIRED:
        return f"{prefix}additional evidence is needed to confirm the {target}."
    if issue_type == RemediationIssueType.PAGE_MISSING:
        return f"A page required to complete the land record could not be accounted for."
    if issue_type == RemediationIssueType.PAGE_UNREADABLE:
        return f"{prefix}the page could not be read reliably."
    if issue_type == RemediationIssueType.TABLE_UNREADABLE:
        return f"{prefix}the tabular section of the document could not be read reliably."
    return f"{prefix}the {target} requires attention before the record can be processed safely."

def _default_required_action(issue_type: RemediationIssueType, label: str, page: Optional[int]) -> str:
    target = label or "the affected field"
    page_clause = f" containing the {target}" if page is not None else f" containing the {target}"
    if issue_type == RemediationIssueType.FIELD_MISSING:
        return f"Provide the page/section of the document that contains the {target}, or upload a complete scan of the document."
    if issue_type == RemediationIssueType.FIELD_UNREADABLE:
        return f"Re-upload a clearer, in-focus scan of the page{page_clause}."
    if issue_type == RemediationIssueType.FIELD_CONFLICT:
        return f"Re-upload the page that clearly shows the {target} so the correct value can be confirmed."
    if issue_type == RemediationIssueType.INCOMPLETE_DOCUMENT:
        return "Upload all pages of the document. If a page is missing from the original, add it as a separate scan."
    if issue_type == RemediationIssueType.WRONG_DOCUMENT:
        return "Upload the correct government land-record document for this request."
    if issue_type == RemediationIssueType.WRONG_DOCUMENT_TYPE:
        return "Upload the document that matches the expected record type (for example, Record of Rights)."
    if issue_type == RemediationIssueType.ADDITIONAL_EVIDENCE_REQUIRED:
        return f"Upload a supporting document or clearer scan that confirms the {target}."
    if issue_type == RemediationIssueType.PAGE_MISSING:
        return "Upload the missing page as a separate scan, or the complete document with all pages."
    if issue_type == RemediationIssueType.PAGE_UNREADABLE:
        return "Re-upload a clearer scan of this page, or replace the page."
    if issue_type == RemediationIssueType.TABLE_UNREADABLE:
        return "Re-upload a clearer scan of the table, or replace the page containing the table."
    return f"Provide a clearer scan or additional evidence for {target}."

def _field_level_issue(
    fn: str,
    fa: Dict[str, Any],
    issue_type: RemediationIssueType,
    severity_override: Optional[Dict[str, str]] = None,
    severity_hint: Optional[str] = None,
) -> RemediationIssue:
    """Build a field-level remediation issue from a Phase 08 field assessment."""
    label = fa.get("source_label") or _humanize_field(fn)
    page = fa.get("source_page")
    priority_level = fa.get("priority") or _field_priority_level(fn)
    severity = severity_hint or _resolve_severity(priority_level, issue_type, severity_override, fn)

    evidence_ref: Dict[str, Any] = {"label": label} if label else {}
    if fa.get("method"):
        evidence_ref["method"] = fa["method"]
    if fa.get("value") is not None:
        evidence_ref["value"] = fa.get("value")
    if fa.get("raw_value"):
        evidence_ref["raw_value"] = fa.get("raw_value")
    if page is not None:
        evidence_ref["page"] = page

    return RemediationIssue(
        issue_id=_new_id("ISS"),
        field=fn,
        field_label=label,
        scope=RemediationScope.FIELD,
        issue_type=issue_type,
        severity=severity,
        page=page,
        message=_default_message(issue_type, fn, label, page, severity),
        required_action=_default_required_action(issue_type, label, page),
        evidence_reference=evidence_ref,
        correction_types=_ISSUE_CORRECTIONS.get(
            issue_type, [CorrectionType.RE_UPLOAD_CLEARER_SCAN, CorrectionType.UPLOAD_SUPPORTING_DOCUMENT]
        ),
    )

def build_remediation_issues(
    phase08_result: Dict[str, Any],
    severity_override: Optional[Dict[str, str]] = None,
) -> List[RemediationIssue]:
    """Convert a Phase 08 result (dict form) into specific remediation issues.

    Only evidence-backed problems become issues:
      - Phase 08 remediation reasons (already filtered to real problems)
      - critical missing fields
      - field assessments flagged REQUIRED_BUT_MISSING / REQUIRED_BUT_UNREADABLE
        or CONFLICTING (defense in depth if the reason list is incomplete)
      - a genuinely incomplete document (never for REVIEW grade or optional gaps)

    Optional-absent and not-applicable fields NEVER create remediation.
    """
    issues: List[RemediationIssue] = []
    fields_section: Dict[str, Dict[str, Any]] = phase08_result.get("fields", {})

    remediation = phase08_result.get("remediation") or {}
    reasons = remediation.get("reasons", []) if isinstance(remediation, dict) else []

    seen_fields = set()
    for reason in reasons:
        issue = _reason_to_issue(reason, fields_section, severity_override)
        if issue is None:
            continue
        if issue.field:
            seen_fields.add(issue.field)
        # Low-confidence single fields may resolve to a field-level issue only.
        issues.append(issue)

    completeness = phase08_result.get("completeness") or {}
    critical_missing = completeness.get("critical_missing") or []
    for fn in critical_missing:
        if fn in seen_fields:
            continue
        fa = fields_section.get(fn) or {}
        issues.append(
            _field_level_issue(
                fn, fa,
                RemediationIssueType.FIELD_MISSING,
                severity_override,
                severity_hint=Severity.CRITICAL.value,
            )
        )
        seen_fields.add(fn)

    # Defense in depth: surface problems directly from field assessments even
    # when the Phase 08 remediation reason list is incomplete.
    for fn, fa in fields_section.items():
        if fn in seen_fields:
            continue
        vs = fa.get("value_status", "")
        if vs == "REQUIRED_BUT_MISSING":
            issue_type = RemediationIssueType.FIELD_MISSING
        elif vs == "REQUIRED_BUT_UNREADABLE":
            issue_type = RemediationIssueType.FIELD_UNREADABLE
        elif vs == "CONFLICTING" or (fa.get("in_conflict") and vs in ("EXTRACTED", "LOW_CONFIDENCE")):
            issue_type = RemediationIssueType.FIELD_CONFLICT
        else:
            continue
        issues.append(_field_level_issue(fn, fa, issue_type, severity_override))
        seen_fields.add(fn)

    status = phase08_result.get("status", "")
    score = completeness.get("score", 0.0)
    if status in ("REMEDIATION_REQUIRED", "INCOMPLETE") and score < INCOMPLETE_DOCUMENT_SCORE:
        doc_type = phase08_result.get("document_type", "document")
        issues.append(
            RemediationIssue(
                issue_id=_new_id("ISS"),
                field=None,
                field_label="",
                scope=RemediationScope.DOCUMENT,
                issue_type=RemediationIssueType.INCOMPLETE_DOCUMENT,
                severity=Severity.CRITICAL.value,
                page=None,
                message="The document could not be read completely; too little of the record was usable.",
                required_action=f"Upload all pages of the {doc_type} document as a clearer, complete scan.",
                evidence_reference={"completeness_score": score},
                correction_types=_ISSUE_CORRECTIONS[RemediationIssueType.INCOMPLETE_DOCUMENT],
            )
        )

    return issues

def decide_remediation(
    phase08_result: Dict[str, Any],
    trigger_statuses: Optional[Tuple[str, ...]] = None,
    force: bool = False,
    critical_trigger_on_review: bool = CRITICAL_TRIGGER_ON_REVIEW,
) -> Tuple[bool, str]:
    """Decide whether remediation is warranted for a Phase 08 result.

    Returns (should_create, reason_code).
    """
    status = phase08_result.get("status", "")
    triggers = tuple(trigger_statuses or AUTO_TRIGGER_STATUSES)

    if force:
        return True, "forced"

    if status in triggers:
        return True, f"status:{status}"

    if status == "READY_FOR_VALIDATION":
        return False, "status:READY_FOR_VALIDATION"

    if status == "REVIEW_REQUIRED":
        if not critical_trigger_on_review:
            return False, "status:REVIEW_REQUIRED"
        # A critical remediation condition exists only when a required/critical
        # field is genuinely missing, unreadable, or conflicting.
        completeness = phase08_result.get("completeness") or {}
        if completeness.get("critical_missing"):
            return True, "critical_missing"
        fields_section = phase08_result.get("fields", {})
        for fn, fa in fields_section.items():
            vs = fa.get("value_status", "")
            if _field_priority_level(fn) == "CRITICAL" and vs in (
                "REQUIRED_BUT_MISSING",
                "REQUIRED_BUT_UNREADABLE",
                "CONFLICTING",
            ):
                return True, f"critical_field:{fn}:{vs}"
        return False, "status:REVIEW_REQUIRED"

    if status in ("EXTRACTION_ERROR", "MODEL_UNAVAILABLE"):
        return False, f"status:{status}"

    return False, f"status:{status}"
