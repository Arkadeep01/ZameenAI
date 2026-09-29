"""Decomposed from phase09_uploader_remediation.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
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

import logging
logger = logging.getLogger(__name__)

PHASE_09_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_09"

PHASE_08_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_08"

PHASE_01_ORIGINALS_DIR = APP_DIR / "uploads" / "originals"

class RemediationStatus(str, Enum):
    OPEN = "OPEN"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    SUBMITTED = "SUBMITTED"
    PROCESSING = "PROCESSING"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class RemediationDecisionStatus(str, Enum):
    REMEDIATION_SESSION_CREATED = "REMEDIATION_SESSION_CREATED"
    NO_REMEDIATION_REQUIRED = "NO_REMEDIATION_REQUIRED"
    REVIEW_REQUIRED_NO_REMEDIATION = "REVIEW_REQUIRED_NO_REMEDIATION"
    DUPLICATE_REMEDIATION = "DUPLICATE_REMEDIATION"
    PHASE_08_RESULT_NOT_FOUND = "PHASE_08_RESULT_NOT_FOUND"
    PHASE_08_FAILED = "PHASE_08_FAILED"
    INVALID_REQUEST = "INVALID_REQUEST"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

class RemediationScope(str, Enum):
    FIELD = "FIELD"
    PAGE = "PAGE"
    DOCUMENT = "DOCUMENT"

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class RemediationIssueType(str, Enum):
    DOCUMENT_MISSING = "DOCUMENT_MISSING"
    PAGE_MISSING = "PAGE_MISSING"
    PAGE_UNREADABLE = "PAGE_UNREADABLE"
    LOW_IMAGE_QUALITY = "LOW_IMAGE_QUALITY"
    LOW_RESOLUTION = "LOW_RESOLUTION"
    SEVERE_BLUR = "SEVERE_BLUR"
    EXTREME_DARKNESS = "EXTREME_DARKNESS"
    EXTREME_OVEREXPOSURE = "EXTREME_OVEREXPOSURE"
    CROPPING = "CROPPING"
    FIELD_MISSING = "FIELD_MISSING"
    FIELD_UNREADABLE = "FIELD_UNREADABLE"
    FIELD_CONFLICT = "FIELD_CONFLICT"
    TABLE_UNREADABLE = "TABLE_UNREADABLE"
    INCOMPLETE_DOCUMENT = "INCOMPLETE_DOCUMENT"
    WRONG_DOCUMENT = "WRONG_DOCUMENT"
    WRONG_DOCUMENT_TYPE = "WRONG_DOCUMENT_TYPE"
    ADDITIONAL_EVIDENCE_REQUIRED = "ADDITIONAL_EVIDENCE_REQUIRED"
    OTHER = "OTHER"

class CorrectionType(str, Enum):
    REPLACE_PAGE = "REPLACE_PAGE"
    REPLACE_COMPLETE_DOCUMENT = "REPLACE_COMPLETE_DOCUMENT"
    ADD_MISSING_PAGE = "ADD_MISSING_PAGE"
    UPLOAD_SUPPORTING_DOCUMENT = "UPLOAD_SUPPORTING_DOCUMENT"
    CORRECT_METADATA = "CORRECT_METADATA"
    RE_UPLOAD_CLEARER_SCAN = "RE_UPLOAD_CLEARER_SCAN"

class RemediationErrorCode(str, Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    MISSING_PARAMETERS = "MISSING_PARAMETERS"
    PHASE_08_RESULT_NOT_FOUND = "PHASE_08_RESULT_NOT_FOUND"
    PHASE_08_FAILED = "PHASE_08_FAILED"
    DUPLICATE_REMEDIATION = "DUPLICATE_REMEDIATION"
    REMEDIATION_NOT_FOUND = "REMEDIATION_NOT_FOUND"
    REMEDIATION_NOT_OPEN = "REMEDIATION_NOT_OPEN"
    REMEDIATION_ALREADY_SUBMITTED = "REMEDIATION_ALREADY_SUBMITTED"
    UPLOADER_MISMATCH = "UPLOADER_MISMATCH"
    NO_FILES_PROVIDED = "NO_FILES_PROVIDED"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
    INVALID_FILE = "INVALID_FILE"
    FILE_UNREADABLE = "FILE_UNREADABLE"
    CORRUPTED_FILE = "CORRUPTED_FILE"
    DUPLICATE_EVIDENCE = "DUPLICATE_EVIDENCE"
    STORAGE_ERROR = "STORAGE_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

AUTO_TRIGGER_STATUSES: Tuple[str, ...] = ("REMEDIATION_REQUIRED", "INCOMPLETE")

CRITICAL_TRIGGER_ON_REVIEW: bool = True

IGNORE_VALUE_STATUSES: Tuple[str, ...] = (
    "OPTIONAL_AND_MISSING",
    "NOT_APPLICABLE",
)

INCOMPLETE_DOCUMENT_SCORE = 0.35

SUPPORTED_UPLOAD_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}

MAX_UPLOAD_SIZE_MB = 50

MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

MAX_FILES_PER_SUBMIT = 10

_ISSUE_CORRECTIONS: Dict[RemediationIssueType, List[CorrectionType]] = {
    RemediationIssueType.FIELD_MISSING: [
        CorrectionType.ADD_MISSING_PAGE,
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.UPLOAD_SUPPORTING_DOCUMENT,
    ],
    RemediationIssueType.FIELD_UNREADABLE: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
    ],
    RemediationIssueType.FIELD_CONFLICT: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
        CorrectionType.UPLOAD_SUPPORTING_DOCUMENT,
    ],
    RemediationIssueType.PAGE_MISSING: [
        CorrectionType.ADD_MISSING_PAGE,
        CorrectionType.REPLACE_COMPLETE_DOCUMENT,
    ],
    RemediationIssueType.PAGE_UNREADABLE: [
        CorrectionType.REPLACE_PAGE,
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
    ],
    RemediationIssueType.LOW_IMAGE_QUALITY: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
    ],
    RemediationIssueType.LOW_RESOLUTION: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
    ],
    RemediationIssueType.SEVERE_BLUR: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
    ],
    RemediationIssueType.EXTREME_DARKNESS: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
    ],
    RemediationIssueType.EXTREME_OVEREXPOSURE: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
    ],
    RemediationIssueType.CROPPING: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
        CorrectionType.REPLACE_COMPLETE_DOCUMENT,
    ],
    RemediationIssueType.TABLE_UNREADABLE: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.REPLACE_PAGE,
        CorrectionType.REPLACE_COMPLETE_DOCUMENT,
    ],
    RemediationIssueType.INCOMPLETE_DOCUMENT: [
        CorrectionType.REPLACE_COMPLETE_DOCUMENT,
        CorrectionType.ADD_MISSING_PAGE,
        CorrectionType.UPLOAD_SUPPORTING_DOCUMENT,
    ],
    RemediationIssueType.WRONG_DOCUMENT: [CorrectionType.REPLACE_COMPLETE_DOCUMENT],
    RemediationIssueType.WRONG_DOCUMENT_TYPE: [CorrectionType.REPLACE_COMPLETE_DOCUMENT],
    RemediationIssueType.DOCUMENT_MISSING: [CorrectionType.REPLACE_COMPLETE_DOCUMENT],
    RemediationIssueType.ADDITIONAL_EVIDENCE_REQUIRED: [
        CorrectionType.UPLOAD_SUPPORTING_DOCUMENT,
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
    ],
    RemediationIssueType.OTHER: [
        CorrectionType.RE_UPLOAD_CLEARER_SCAN,
        CorrectionType.UPLOAD_SUPPORTING_DOCUMENT,
    ],
}

_SEVERITY_BY_PRIORITY = {
    "CRITICAL": Severity.CRITICAL,
    "IMPORTANT": Severity.HIGH,
    "OPTIONAL": Severity.MEDIUM,
}

@dataclass
class RemediationIssue:
    issue_id: str
    field: Optional[str]
    field_label: str
    scope: RemediationScope
    issue_type: RemediationIssueType
    severity: str
    page: Optional[int]
    message: str
    required_action: str
    evidence_reference: Dict[str, Any] = field(default_factory=dict)
    correction_types: List[CorrectionType] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "issue_id": self.issue_id,
            "field": self.field,
            "field_label": self.field_label,
            "scope": self.scope.value,
            "issue_type": self.issue_type.value,
            "severity": self.severity,
            "page": self.page,
            "message": self.message,
            "required_action": self.required_action,
            "correction_types": [c.value for c in self.correction_types],
        }
        if self.evidence_reference:
            result["evidence_reference"] = self.evidence_reference
        return result

@dataclass
class RemediationEvidenceSubmission:
    submission_id: str
    kind: str
    original_filename: str
    sha256: str
    file_size_bytes: int
    mime_type: str
    page_count: Optional[int]
    uploader: str
    uploaded_at: str
    stored_filename: str = ""
    resolution_notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "submission_id": self.submission_id,
            "kind": self.kind,
            "original_filename": self.original_filename,
            "sha256": self.sha256,
            "file_size_bytes": self.file_size_bytes,
            "mime_type": self.mime_type,
            "page_count": self.page_count,
            "uploader": self.uploader,
            "uploaded_at": self.uploaded_at,
            "resolution_notes": self.resolution_notes,
        }

    def to_internal_dict(self) -> Dict[str, Any]:
        """Persisted form: same as to_dict plus the stored path so later
        phases (Phase 10 resubmission) can deterministically locate the bytes.

        The stored_filename is deliberately NOT exposed through to_dict() /
        public session serialization (no internal paths in API responses).
        """
        data = self.to_dict()
        data["stored_filename"] = self.stored_filename
        return data

@dataclass
class RemediationAttempt:
    attempt_number: int
    status: str
    issues: List[Dict[str, Any]] = field(default_factory=list)
    submissions: List[RemediationEvidenceSubmission] = field(default_factory=list)
    opened_at: str = ""
    submitted_at: Optional[str] = None
    resolution_notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "attempt_number": self.attempt_number,
            "status": self.status,
            "issues": self.issues,
            "submissions": [s.to_dict() for s in self.submissions],
            "opened_at": self.opened_at,
            "submitted_at": self.submitted_at,
            "resolution_notes": self.resolution_notes,
        }

@dataclass
class RemediationSession:
    remediation_id: str
    record_id: str
    document_id: str
    document_type: str
    status: RemediationStatus
    created_at: str
    created_by: str
    phase08_status: str
    overall_confidence: float
    completeness_score: float
    issues: List[RemediationIssue] = field(default_factory=list)
    requested_actions: List[str] = field(default_factory=list)
    original_submission: Dict[str, Any] = field(default_factory=dict)
    attempts: List[RemediationAttempt] = field(default_factory=list)
    attempt_number: int = 0
    submitted_at: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_notes: str = ""
    handoff: Optional[Dict[str, Any]] = None
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "remediation_id": self.remediation_id,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "document_type": self.document_type,
            "status": self.status.value,
            "created_at": self.created_at,
            "created_by": self.created_by,
            "phase08_status": self.phase08_status,
            "overall_confidence": self.overall_confidence,
            "completeness_score": self.completeness_score,
            "issues": [i.to_dict() for i in self.issues],
            "requested_actions": self.requested_actions,
            "original_submission": self.original_submission,
            "attempts": [a.to_dict() for a in self.attempts],
            "attempt_number": self.attempt_number,
            "submitted_at": self.submitted_at,
            "resolved_at": self.resolved_at,
            "resolution_notes": self.resolution_notes,
            "handoff": self.handoff,
            "timestamps": self.timestamps,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
        }

    def to_public_dict(self) -> Dict[str, Any]:
        """API-safe representation: no absolute file-system paths, no secrets."""
        data = self.to_dict()
        for attempt in data.get("attempts", []):
            for sub in attempt.get("submissions", []):
                sub.pop("stored_filename", None)
        return data
