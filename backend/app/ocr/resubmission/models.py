"""Decomposed from phase10_resubmission.py: models. (Authoritative implementation; verbatim move.)"""
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

PHASE_10_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_10"

PHASE_09_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_09"

PHASE_01_ORIGINALS_DIR = APP_DIR / "uploads" / "originals"

SUPPORTED_UPLOAD_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}

MAX_UPLOAD_SIZE_MB = 50

MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

MAX_FILES_PER_SUBMISSION = 20

class SubmissionStatus(str, Enum):
    RECEIVED = "RECEIVED"
    VALIDATED = "VALIDATED"
    REJECTED = "REJECTED"
    QUEUED_FOR_REPROCESSING = "QUEUED_FOR_REPROCESSING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class SubmissionType(str, Enum):
    REMEDIATION_RESUBMISSION = "REMEDIATION_RESUBMISSION"
    COMPLETE_DOCUMENT_REPLACEMENT = "COMPLETE_DOCUMENT_REPLACEMENT"
    PAGE_REPLACEMENT = "PAGE_REPLACEMENT"
    ADDITIONAL_EVIDENCE = "ADDITIONAL_EVIDENCE"

class SubmissionSource(str, Enum):
    UPLOADER = "UPLOADER"
    SYSTEM = "SYSTEM"

class PageAction(str, Enum):
    KEPT = "KEPT"
    REPLACED = "REPLACED"
    ADDED = "ADDED"
    SUPPORTING = "SUPPORTING"
    REPLACED_BY_COMPLETE_DOCUMENT = "REPLACED_BY_COMPLETE_DOCUMENT"

class ResubmissionErrorCode(str, Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    MISSING_PARAMETERS = "MISSING_PARAMETERS"
    REMEDIATION_NOT_FOUND = "REMEDIATION_NOT_FOUND"
    REMEDIATION_NOT_ELIGIBLE = "REMEDIATION_NOT_ELIGIBLE"
    REMEDIATION_ALREADY_PROCESSING = "REMEDIATION_ALREADY_PROCESSING"
    SUBMISSION_NOT_FOUND = "SUBMISSION_NOT_FOUND"
    SUBMISSION_ALREADY_REGISTERED = "SUBMISSION_ALREADY_REGISTERED"
    RECORD_MISMATCH = "RECORD_MISMATCH"
    DOCUMENT_MISMATCH = "DOCUMENT_MISMATCH"
    UPLOADER_MISMATCH = "UPLOADER_MISMATCH"
    NO_EVIDENCE_FOUND = "NO_EVIDENCE_FOUND"
    EVIDENCE_NOT_FOUND = "EVIDENCE_NOT_FOUND"
    UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_FILE = "INVALID_FILE"
    FILE_UNREADABLE = "FILE_UNREADABLE"
    CORRUPTED_FILE = "CORRUPTED_FILE"
    DUPLICATE_SUBMISSION = "DUPLICATE_SUBMISSION"
    DUPLICATE_EVIDENCE = "DUPLICATE_EVIDENCE"
    PAGE_MISMATCH = "PAGE_MISMATCH"
    INVALID_SUBMISSION_TYPE = "INVALID_SUBMISSION_TYPE"
    STORAGE_ERROR = "STORAGE_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

_SUBMISSION_TRANSITIONS: Dict[str, Tuple[str, ...]] = {
    SubmissionStatus.RECEIVED.value: (
        SubmissionStatus.VALIDATED.value,
        SubmissionStatus.REJECTED.value,
    ),
    SubmissionStatus.VALIDATED.value: (
        SubmissionStatus.QUEUED_FOR_REPROCESSING.value,
        SubmissionStatus.REJECTED.value,
    ),
    SubmissionStatus.QUEUED_FOR_REPROCESSING.value: (
        SubmissionStatus.PROCESSING.value,
        SubmissionStatus.FAILED.value,
        SubmissionStatus.REJECTED.value,
    ),
    SubmissionStatus.PROCESSING.value: (
        SubmissionStatus.COMPLETED.value,
        SubmissionStatus.FAILED.value,
    ),
    SubmissionStatus.COMPLETED.value: (),
    SubmissionStatus.REJECTED.value: (),
    SubmissionStatus.FAILED.value: (SubmissionStatus.QUEUED_FOR_REPROCESSING.value,),
}

PAGE_REPLACEMENT_ISSUE_TYPES = {
    "FIELD_UNREADABLE",
    "FIELD_CONFLICT",
    "PAGE_UNREADABLE",
    "TABLE_UNREADABLE",
    "LOW_IMAGE_QUALITY",
    "LOW_RESOLUTION",
    "SEVERE_BLUR",
    "EXTREME_DARKNESS",
    "EXTREME_OVEREXPOSURE",
    "CROPPING",
}

SUPPORTING_EVIDENCE_ISSUE_TYPES = {
    "ADDITIONAL_EVIDENCE_REQUIRED",
    "FIELD_MISSING",
}

COMPARABLE_STATUSES: Tuple[str, ...] = ("SUBMITTED", "PROCESSING")

@dataclass
class ResubmissionEvidence:
    """One evidence file registered as part of a resubmission."""

    evidence_submission_id: str   # Phase 09 submission id (SUB-...) or generated
    kind: str                     # kind hint from Phase 09 evidence
    original_filename: str
    sha256: str
    file_size_bytes: int
    mime_type: str
    page_count: Optional[int]
    page_number: Optional[int]    # assigned page in the corrected document (PAGE_REPLACEMENT)
    source: str                   # where the bytes came from ("PHASE_09_EVIDENCE")
    stored_filename: str = ""     # relative path inside phase_10 storage

    def to_dict(self) -> Dict[str, Any]:
        return {
            "evidence_submission_id": self.evidence_submission_id,
            "kind": self.kind,
            "original_filename": self.original_filename,
            "sha256": self.sha256,
            "file_size_bytes": self.file_size_bytes,
            "mime_type": self.mime_type,
            "page_count": self.page_count,
            "page_number": self.page_number,
            "source": self.source,
        }

    def to_internal_dict(self) -> Dict[str, Any]:
        data = self.to_dict()
        data["stored_filename"] = self.stored_filename
        return data

@dataclass
class PageProvenance:
    """Page-level provenance: how each page of the record's document resolves."""

    page_number: Optional[int]
    action: PageAction
    original_page_source: str
    replacement_sha256: Optional[str] = None
    replacement_filename: str = ""
    note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_number": self.page_number,
            "action": self.action.value,
            "original_page_source": self.original_page_source,
            "replacement_sha256": self.replacement_sha256,
            "replacement_filename": self.replacement_filename,
            "note": self.note,
        }

@dataclass
class Resubmission:
    """A registered Phase 10 resubmission (a new submission/version for a record)."""

    submission_id: str
    record_id: str
    document_id: str
    parent_document_id: str
    parent_submission_id: str
    remediation_id: str
    attempt_number: int
    version: int
    submission_type: SubmissionType
    status: SubmissionStatus
    source: SubmissionSource
    created_at: str
    created_by: str
    remediation_reasons: List[str] = field(default_factory=list)
    remediation_issues: List[Dict[str, Any]] = field(default_factory=list)
    integrity: Dict[str, Any] = field(default_factory=dict)
    evidence: List[ResubmissionEvidence] = field(default_factory=list)
    pages: List[PageProvenance] = field(default_factory=list)
    original_preserved: bool = True
    notes: str = ""
    status_history: List[Dict[str, Any]] = field(default_factory=list)
    timestamps: Dict[str, str] = field(default_factory=dict)
    handoff: Optional[Dict[str, Any]] = None
    processing_time_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "phase": "RESUBMISSION",
            "submission_id": self.submission_id,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "parent_document_id": self.parent_document_id,
            "parent_submission_id": self.parent_submission_id,
            "remediation_id": self.remediation_id,
            "attempt_number": self.attempt_number,
            "version": self.version,
            "submission_type": self.submission_type.value,
            "status": self.status.value,
            "source": self.source.value,
            "created_at": self.created_at,
            "created_by": self.created_by,
            "remediation_reasons": self.remediation_reasons,
            "remediation_issues": self.remediation_issues,
            "integrity": self.integrity,
            "evidence": [e.to_dict() for e in self.evidence],
            "pages": [p.to_dict() for p in self.pages],
            "original_preserved": self.original_preserved,
            "notes": self.notes,
            "status_history": self.status_history,
            "timestamps": self.timestamps,
            "handoff": self.handoff,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
        }

    def to_internal_dict(self) -> Dict[str, Any]:
        """Persisted form — evidence entries keep the on-disk stored_filename
        so Phase 11 can deterministically locate the corrected bytes. The
        public form (to_public_dict / to_dict) never leaks internal paths."""
        data = self.to_dict()
        data["evidence"] = [e.to_internal_dict() for e in self.evidence]
        return data

    def to_public_dict(self) -> Dict[str, Any]:
        """API safe: no absolute or on-disk file paths."""
        data = self.to_dict()
        return data
