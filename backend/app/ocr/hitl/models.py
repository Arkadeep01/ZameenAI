"""Decomposed from phase11_hitl_verification.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import logging
logger = logging.getLogger(__name__)

HITL1_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "hitl_1"

class Hitl1Status(str, Enum):
    READY_FOR_HITL = "READY_FOR_HITL"
    UNDER_REVIEW = "UNDER_REVIEW"
    CORRECTION_REQUIRED = "CORRECTION_REQUIRED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

TERMINAL_STATES = {
    Hitl1Status.VERIFIED,
    Hitl1Status.CORRECTION_REQUIRED,
    Hitl1Status.REJECTED,
}

class FieldReviewAction(str, Enum):
    VERIFY = "VERIFY"
    CORRECT = "CORRECT"
    UNRESOLVED = "UNRESOLVED"

class Hitl1ErrorCode(str, Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    VALIDATION_RUN_NOT_FOUND = "VALIDATION_RUN_NOT_FOUND"
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    SESSION_TERMINAL = "SESSION_TERMINAL"
    FIELD_REVIEW_INCOMPLETE = "FIELD_REVIEW_INCOMPLETE"
    REASON_REQUIRED = "REASON_REQUIRED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

@dataclass
class Hitl1Session:
    """One HITL-1 verification session."""

    phase: str = "HITL_1_VERIFICATION"
    status: str = Hitl1Status.READY_FOR_HITL.value
    hitl1_id: str = ""
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    validation_run_id: Optional[str] = None
    stage_id: Optional[str] = None

    # Extracted-value snapshot at open time (Phase 08 fields), so CORRECT
    # reviews preserve the original value instead of overwriting history.
    field_snapshot: Dict[str, Any] = field(default_factory=dict)
    flagged_fields: List[str] = field(default_factory=list)

    field_reviews: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    notes: List[Dict[str, Any]] = field(default_factory=list)
    history: List[Dict[str, Any]] = field(default_factory=list)
    evidence: Dict[str, Any] = field(default_factory=dict)

    error_code: Optional[str] = None
    error_message: Optional[str] = None
    timestamps: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "phase": self.phase,
            "status": self.status,
            "hitl1_id": self.hitl1_id,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "validation_run_id": self.validation_run_id,
            "stage_id": self.stage_id,
            "field_snapshot": dict(self.field_snapshot),
            "flagged_fields": list(self.flagged_fields),
            "field_reviews": {k: dict(v) for k, v in self.field_reviews.items()},
            "notes": list(self.notes),
            "history": list(self.history),
            "evidence": dict(self.evidence),
            "timestamps": dict(self.timestamps),
        }
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Hitl1Session":
        return cls(
            phase=data.get("phase", "HITL_1_VERIFICATION"),
            status=data.get("status", Hitl1Status.READY_FOR_HITL.value),
            hitl1_id=data.get("hitl1_id", ""),
            record_id=data.get("record_id", ""),
            document_id=data.get("document_id", ""),
            ingestion_id=data.get("ingestion_id", ""),
            validation_run_id=data.get("validation_run_id"),
            stage_id=data.get("stage_id"),
            field_snapshot=dict(data.get("field_snapshot", {}) or {}),
            flagged_fields=list(data.get("flagged_fields", []) or []),
            field_reviews=dict(data.get("field_reviews", {}) or {}),
            notes=list(data.get("notes", []) or []),
            history=list(data.get("history", []) or []),
            evidence=dict(data.get("evidence", {}) or {}),
            error_code=data.get("error_code"),
            error_message=data.get("error_message"),
            timestamps=dict(data.get("timestamps", {}) or {}),
        )
