"""Decomposed from phase08_confidence_completeness.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import json
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import logging
logger = logging.getLogger(__name__)

PHASE_08_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_08"

PHASE_06_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_06"

PHASE_07_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_07"

CONFIDENCE_WEIGHTS: Dict[str, float] = {
    "semantic": 0.3,
    "ocr": 0.2,
    "evidence": 0.15,
    "structural": 0.15,
    "validation": 0.1,
    "agreement": 0.1,
}

CONFIDENCE_BAND_THRESHOLDS: Dict[str, float] = {
    "HIGH": 0.85,
    "MEDIUM": 0.6,
}

FIELD_PRIORITY: Dict[str, Dict[str, Any]] = {
    "CRITICAL": {"weight": 1.0, "fields": [
        "document.document_title",
        "document.department",
        "document.document_date",
        "land.plot_number",
        "land.area",
        "land.area_unit",
        "land.khata_number",
        "owner.recorded_tenant",
        "location.mouza",
    ]},
    "IMPORTANT": {"weight": 0.5, "fields": [
        "location.district",
        "location.block",
        "location.tehsil",
        "land.survey_number",
        "land.khasra_number",
        "land.nature_of_land",
        "land.land_type",
        "owner.name",
        "owner.father_husband_name",
        "owner.co_owner",
    ]},
    "OPTIONAL": {"weight": 0.25, "fields": [
        "document.map_number",
        "mutation.mutation_number",
        "mutation.mutation_date",
        "registration.document_number",
        "registration.registration_date",
        "registration.issue_date",
        "additional.remarks",
    ]},
}

READY_FOR_VALIDATION_MIN_CONFIDENCE: float = 0.8

READY_FOR_VALIDATION_MIN_COMPLETENESS: float = 0.85

REVIEW_REQUIRED_MIN_CONFIDENCE: float = 0.6

REMEDIATION_REQUIRED_MIN_COMPLETENESS: float = 0.5

METHOD_STRUCTURAL_CONFIDENCE: Dict[str, float] = {
    "TABLE_CELL": 1.0,
    "TABLE_COLUMN_HEADER": 1.0,
    "DETERMINISTIC": 0.95,
    "RECONCILED": 1.0,
    "LABEL_VALUE_SAME_LINE": 0.9,
    "LABEL_VALUE_NEXT_LINE": 0.85,
    "AI_SEMANTIC": 0.85,
    "MISTRAL": 0.9,
    "LABEL_VALUE_SPATIAL": 0.8,
    "INDICBART_NORMALIZED": 0.8,
    "REGEX_PATTERN": 0.7,
}

class RemediationReason(str, Enum):
    LOW_OCR_CONFIDENCE = "LOW_OCR_CONFIDENCE"
    MISSING_FIELD = "MISSING_FIELD"
    UNREADABLE_FIELD = "UNREADABLE_FIELD"
    CONFLICTING_VALUES = "CONFLICTING_VALUES"
    LOW_DOCUMENT_CONFIDENCE = "LOW_DOCUMENT_CONFIDENCE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    TABLE_EXTRACTION_FAILURE = "TABLE_EXTRACTION_FAILURE"
    CRITICAL_FIELD_MISSING = "CRITICAL_FIELD_MISSING"

class ConfidenceBand(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class RecordStatus(str, Enum):
    READY_FOR_VALIDATION = "READY_FOR_VALIDATION"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    REMEDIATION_REQUIRED = "REMEDIATION_REQUIRED"
    INCOMPLETE = "INCOMPLETE"
    EXTRACTION_ERROR = "EXTRACTION_ERROR"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"

class FieldValueStatus(str, Enum):
    REQUIRED_AND_PRESENT = "REQUIRED_AND_PRESENT"
    REQUIRED_BUT_MISSING = "REQUIRED_BUT_MISSING"
    REQUIRED_BUT_UNREADABLE = "REQUIRED_BUT_UNREADABLE"
    OPTIONAL_AND_PRESENT = "OPTIONAL_AND_PRESENT"
    OPTIONAL_AND_MISSING = "OPTIONAL_AND_MISSING"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    CONFLICTING = "CONFLICTING"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"

@dataclass
class ConfidenceFactors:
    semantic: float = 0.0
    ocr: float = 0.0
    evidence: float = 0.0
    structural: float = 0.0
    validation: float = 0.0
    agreement: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return {
            "semantic": round(self.semantic, 4),
            "ocr": round(self.ocr, 4),
            "evidence": round(self.evidence, 4),
            "structural": round(self.structural, 4),
            "validation": round(self.validation, 4),
            "agreement": round(self.agreement, 4),
        }

@dataclass
class FieldAssessment:
    field_name: str
    value_status: FieldValueStatus
    confidence: float
    priority: str
    confidence_factors: ConfidenceFactors = field(default_factory=ConfidenceFactors)
    value: Optional[Any] = None
    raw_value: Optional[str] = None
    method: Optional[str] = None
    source_page: Optional[int] = None
    source_label: Optional[str] = None
    in_conflict: bool = False
    conflict_alternatives: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "field_name": self.field_name,
            "value_status": self.value_status.value,
            "confidence": round(self.confidence, 4),
            "priority": self.priority,
            "confidence_factors": self.confidence_factors.to_dict(),
            "in_conflict": self.in_conflict,
        }
        if self.value is not None:
            result["value"] = self.value
        if self.raw_value is not None:
            result["raw_value"] = self.raw_value
        if self.method:
            result["method"] = self.method
        if self.source_page is not None:
            result["source_page"] = self.source_page
        if self.source_label:
            result["source_label"] = self.source_label
        if self.conflict_alternatives:
            result["conflict_alternatives"] = self.conflict_alternatives
        return result

@dataclass
class RemediationSignal:
    field: str
    reason: RemediationReason
    page: Optional[int] = None
    message: str = ""

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "field": self.field,
            "reason": self.reason.value,
            "message": self.message,
        }
        if self.page is not None:
            result["page"] = self.page
        return result

@dataclass
class CompletenessResult:
    score: float
    band: ConfidenceBand
    applicable_fields: int
    present_fields: int
    missing_fields: int
    unreadable_fields: int
    not_applicable_fields: int
    critical_missing: List[str]
    important_missing: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": round(self.score, 4),
            "band": self.band.value,
            "applicable_fields": self.applicable_fields,
            "present_fields": self.present_fields,
            "missing_fields": self.missing_fields,
            "unreadable_fields": self.unreadable_fields,
            "not_applicable_fields": self.not_applicable_fields,
            "critical_missing": self.critical_missing,
            "important_missing": self.important_missing,
        }

@dataclass
class ConfidenceCompletenessResult:
    phase: str = "CONFIDENCE_COMPLETENESS"
    status: RecordStatus = RecordStatus.REVIEW_REQUIRED
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    document_type: str = ""
    overall_confidence: float = 0.0
    confidence_band: ConfidenceBand = ConfidenceBand.LOW
    completeness: Optional[CompletenessResult] = None
    field_assessments: Dict[str, FieldAssessment] = field(default_factory=dict)
    missing_fields: List[str] = field(default_factory=list)
    unreadable_fields: List[str] = field(default_factory=list)
    conflicting_fields: List[str] = field(default_factory=list)
    critical_issues: List[str] = field(default_factory=list)
    needs_review: bool = False
    remediation: Optional[Dict[str, Any]] = None
    next_phase: str = ""
    models: Dict[str, str] = field(default_factory=dict)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "phase": self.phase,
            "status": self.status.value,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "document_type": self.document_type,
            "confidence": {
                "overall": round(self.overall_confidence, 4),
                "band": self.confidence_band.value,
            },
            "completeness": self.completeness.to_dict() if self.completeness else {},
            "fields": {k: v.to_dict() for k, v in self.field_assessments.items()},
            "missing_fields": self.missing_fields,
            "unreadable_fields": self.unreadable_fields,
            "conflicting_fields": self.conflicting_fields,
            "critical_issues": self.critical_issues,
            "needs_review": self.needs_review,
            "next_phase": self.next_phase,
            "models": self.models,
            "timestamps": self.timestamps,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
        }
        if self.remediation:
            result["remediation"] = self.remediation
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        return result
