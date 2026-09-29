"""Decomposed from phase09_automated_validation.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
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

import logging
logger = logging.getLogger(__name__)

PHASE_09_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_12"

PHASE_08_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_08"

PHASE_07_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_07"

PHASE_11_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_11"

RULES_VERSION = "1.0.0"

REFERENCE_DB_ENV = "ZAMEENAI_VALIDATION_REFERENCE_DB"

class RuleCategory(str, Enum):
    REQUIRED_PRESENCE = "REQUIRED_PRESENCE"
    DATA_TYPE = "DATA_TYPE"
    FORMAT = "FORMAT"
    RANGE = "RANGE"
    MEASUREMENT = "MEASUREMENT"
    CROSS_FIELD = "CROSS_FIELD"
    LOCATION_HIERARCHY = "LOCATION_HIERARCHY"
    LAND_AREA = "LAND_AREA"
    OWNERSHIP = "OWNERSHIP"
    MUTATION = "MUTATION"
    REGISTRATION = "REGISTRATION"
    DOCUMENT_METADATA = "DOCUMENT_METADATA"
    ENUM_CONTROLLED_VALUE = "ENUM_CONTROLLED_VALUE"
    EVIDENCE_BACKED = "EVIDENCE_BACKED"
    APPLICABILITY_AWARE = "APPLICABILITY_AWARE"

class ValidationFieldStatus(str, Enum):
    VALID = "VALID"
    MISSING = "MISSING"
    INVALID = "INVALID"
    UNREADABLE = "UNREADABLE"
    CONFLICT = "CONFLICT"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    WARNING = "WARNING"

class ValidationDecision(str, Enum):
    READY_FOR_HITL = "READY_FOR_HITL"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    ANOMALY_DETECTED = "ANOMALY_DETECTED"
    DUPLICATE_SUSPECTED = "DUPLICATE_SUSPECTED"
    BLOCKED = "BLOCKED"

class ValidationErrorCode(str, Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    MISSING_PARAMETERS = "MISSING_PARAMETERS"
    PHASE_08_RESULT_NOT_FOUND = "PHASE_08_RESULT_NOT_FOUND"
    REPROCESSING_RUN_NOT_FOUND = "REPROCESSING_RUN_NOT_FOUND"
    PREVIOUS_PHASE_FAILED = "PREVIOUS_PHASE_FAILED"
    RUN_NOT_FOUND = "RUN_NOT_FOUND"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

NEXT_PHASE = "PHASE_10_ANOMALY_DUPLICATE_DETECTION"

_PRIORITY_SEVERITY: Dict[str, Severity] = {
    "CRITICAL": Severity.CRITICAL,
    "IMPORTANT": Severity.ERROR,
    "OPTIONAL": Severity.WARNING,
}

@dataclass
class FieldValidationResult:
    field: str
    status: ValidationFieldStatus
    severity: Severity
    rule: RuleCategory
    reason: str
    value: Any = None
    original_value: Any = None
    comparison_value: Any = None
    evidence: List[Any] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "field": self.field,
            "status": self.status.value,
            "severity": self.severity.value,
            "rule": self.rule.value,
            "reason": self.reason,
        }
        if self.value is not None:
            result["value"] = self.value
        if self.original_value is not None:
            result["original_value"] = self.original_value
        if self.comparison_value is not None:
            result["comparison_value"] = self.comparison_value
        if self.evidence:
            result["evidence"] = self.evidence
        return result

@dataclass
class ValidationSummary:
    total_checks: int
    passed: int
    warning: int
    error: int
    critical: int
    not_applicable: int

    @classmethod
    def from_checks(cls, checks: List[FieldValidationResult]) -> "ValidationSummary":
        counter = Counter(c.severity.value for c in checks)
        return cls(
            total_checks=len(checks),
            passed=sum(
                1 for c in checks
                if c.status in (ValidationFieldStatus.VALID, ValidationFieldStatus.NOT_APPLICABLE)
            ),
            warning=counter.get(Severity.WARNING.value, 0),
            error=counter.get(Severity.ERROR.value, 0),
            critical=counter.get(Severity.CRITICAL.value, 0),
            not_applicable=sum(1 for c in checks if c.status == ValidationFieldStatus.NOT_APPLICABLE),
        )

    def to_dict(self) -> Dict[str, int]:
        return {
            "total_checks": self.total_checks,
            "passed": self.passed,
            "warning": self.warning,
            "error": self.error,
            "critical": self.critical,
            "not_applicable": self.not_applicable,
        }

@dataclass
class ValidationRunResult:
    phase: str = "AUTOMATED_VALIDATION"
    status: str = "SUCCESS"
    validation_run_id: str = ""
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    document_type: str = ""
    rules_version: str = RULES_VERSION
    input_reference: Dict[str, Any] = field(default_factory=dict)
    validation_result: Dict[str, Any] = field(default_factory=dict)
    anomalies: List[Dict[str, Any]] = field(default_factory=list)
    duplicates: Dict[str, Any] = field(default_factory=dict)
    decision: str = ValidationDecision.REVIEW_REQUIRED.value
    summary: str = ""
    next_phase: str = NEXT_PHASE
    needs_review: bool = False
    remediation: Dict[str, Any] = field(default_factory=dict)
    hitl_1: Dict[str, Any] = field(default_factory=dict)
    models: Dict[str, Any] = field(
        default_factory=lambda: {"rule_engine": "DETERMINISTIC", "llm_used": False}
    )
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "phase": self.phase,
            "status": self.status,
            "validation_run_id": self.validation_run_id,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "document_type": self.document_type,
            "rules_version": self.rules_version,
            "input_reference": self.input_reference,
            "validation_result": self.validation_result,
            "anomalies": self.anomalies,
            "duplicates": self.duplicates,
            "decision": self.decision,
            "summary": self.summary,
            "next_phase": self.next_phase,
            "needs_review": self.needs_review,
            "remediation": self.remediation,
            "hitl_1": self.hitl_1,
            "models": self.models,
            "timestamps": self.timestamps,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
        }
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        return result

    def _mark_failed(self, code: str, message: str) -> "ValidationRunResult":
        self.status = "FAILED"
        self.error_code = code
        self.error_message = message
        self.next_phase = ""
        self.decision = ValidationDecision.BLOCKED.value
        self.summary = message
        return self

_DATE_FORMATS = (
    "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y",
    "%d %b %Y", "%d %B %Y", "%Y", "%Y-%m",
)
