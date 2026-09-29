"""Decomposed from phase10_anomaly_duplicate_detection.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
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

import logging
logger = logging.getLogger(__name__)

class Severity(str, Enum):
    NONE = "NONE"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class AnomalyCategory(str, Enum):
    OWNERSHIP_CONFLICT = "OWNERSHIP_CONFLICT"
    MUTATION_CONFLICT = "MUTATION_CONFLICT"
    BOUNDARY_PARCEL_CONFLICT = "BOUNDARY_PARCEL_CONFLICT"
    AREA_INCONSISTENCY = "AREA_INCONSISTENCY"
    LOCATION_INCONSISTENCY = "LOCATION_INCONSISTENCY"
    CLASSIFICATION_CONFLICT = "CLASSIFICATION_CONFLICT"
    DUPLICATE_DOCUMENT = "DUPLICATE_DOCUMENT"
    DUPLICATE_RECORD = "DUPLICATE_RECORD"
    DUPLICATE_IDENTIFIER = "DUPLICATE_IDENTIFIER"
    SUSPICIOUS_REPEATED_VALUES = "SUSPICIOUS_REPEATED_VALUES"
    CONFLICTING_OCR_CANDIDATES = "CONFLICTING_OCR_CANDIDATES"
    CONFLICTING_SEMANTIC_CANDIDATES = "CONFLICTING_SEMANTIC_CANDIDATES"
    UNUSUAL_BUT_VALID = "UNUSUAL_BUT_VALID"

class DuplicateMatchType(str, Enum):
    RECORD = "RECORD"
    DOCUMENT = "DOCUMENT"
    IDENTIFIER = "IDENTIFIER"
    COMPOSITE = "COMPOSITE"

class DuplicateStatus(str, Enum):
    CLEAR = "CLEAR"
    SUSPECTED = "SUSPECTED"
    CONFIRMED = "CONFIRMED"

DUPLICATE_SCOPE_LOCAL_DATASET = "LOCAL_DATASET"

DUPLICATE_SUSPECT_THRESHOLD = 0.5

DUPLICATE_CONFIRM_THRESHOLD = 0.9

AREA_UNIT_VOCABULARY: Set[str] = {
    "ACRE", "ACRES", "HECTARE", "HECTARES", "GUNTA", "GUNTAS", "BIGHA",
    "KATHA", "CENT", "SQUARE_METER", "SQUARE_METERS", "SQM", "SQ.M",
    "SQUARE_FEET", "SQFT", "SQUARE_YARD", "SQYD", "DISMILE",
}

NATURE_OF_LAND_VOCABULARY: Set[str] = {
    "HOMESTEAD", "AGRICULTURAL", "AGRICULTURE", "FALLOW", "BARREN",
    "PASTURE", "PLANTATION", "ORCHARD", "WATER", "WATERBODY", "GRAZING",
    "RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "SAND", "MARSHY",
}

ANOMALY_THRESHOLDS: Dict[str, float] = {
    "AREA_ACRES_UPPER": float(10000.0),
    "AREA_ACRES_LOWER": float(0.01),
    "PLOT_OR_KHATA_NUMBER_UPPER": float(1000000.0),
    "CONFLICT_CONFIDENCE_SLACK": float(0.1),
    "REPEATED_VALUE_FIELD_MIN": 5,
}

_NAME_FIELDS: frozenset = frozenset({
    "owner.name", "owner.father_husband_name", "owner.co_owner",
    "owner.recorded_tenant", "document.document_title", "document.department",
    "location.state", "location.district", "location.block", "location.tehsil",
    "location.mouza", "location.village", "land.nature_of_land",
})

_IDENTIFIER_FIELDS: frozenset = frozenset({
    "land.plot_number", "land.khata_number", "land.survey_number",
    "land.khasra_number", "mutation.mutation_number",
    "registration.document_number", "document.map_number",
})

_COMPOSITE_COMPONENTS: Tuple[str, ...] = (
    "location.state", "location.district", "location.mouza", "location.village",
    "land.khata_number", "land.plot_number", "land.survey_number",
    "owner.name",
)

_PRIMARY_IDENTIFIERS: Tuple[str, ...] = (
    "land.plot_number",
    "land.khata_number",
    "mutation.mutation_number",
    "registration.document_number",
    "land.survey_number",
    "land.khasra_number",
)

@dataclass
class Anomaly:
    category: AnomalyCategory
    severity: Severity
    explanation: str
    target_field: Optional[str] = None
    evidence: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "category": self.category.value,
            "severity": self.severity.value,
            "explanation": self.explanation,
        }
        if self.target_field:
            result["field"] = self.target_field
        if self.evidence:
            result["evidence"] = self.evidence
        return result

@dataclass
class DuplicateMatch:
    matched_record_id: str
    matched_document_id: str
    match_type: DuplicateMatchType
    confidence: float
    scope: str = DUPLICATE_SCOPE_LOCAL_DATASET
    fuzzy: bool = False
    evidence: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "matched_record_id": self.matched_record_id,
            "matched_document_id": self.matched_document_id,
            "match_type": self.match_type.value,
            "confidence": round(self.confidence, 4),
            "scope": self.scope,
            "fuzzy": self.fuzzy,
            "evidence": self.evidence,
        }

STAGE_NEXT_PHASE = "PHASE_11_HITL_1"

PHASE_10_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_10"

PHASE_09_RUNS_DIR = APP_DIR / "uploads" / "processing" / "phase_12"

PHASE_08_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_08"

class StageWorkflowState(str, Enum):
    """Phase 10 workflow routing. All three states proceed to HITL-1; the
    state tells the reviewer how the record arrived."""

    CLEAR = "CLEAR"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    BLOCKED = "BLOCKED"

class StageErrorCode(str, Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    VALIDATION_RUN_NOT_FOUND = "VALIDATION_RUN_NOT_FOUND"
    PHASE_08_RESULT_NOT_FOUND = "PHASE_08_RESULT_NOT_FOUND"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

@dataclass
class AnomalyDuplicateStageResult:
    """One Phase 10 stage record: findings + workflow routing for HITL-1."""

    phase: str = "ANOMALY_DUPLICATE_DETECTION"
    status: str = "SUCCESS"
    stage_id: str = ""
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    validation_run_id: Optional[str] = None
    source: str = "VALIDATION_RUN"

    anomalies: List[Dict[str, Any]] = field(default_factory=list)
    duplicates: Dict[str, Any] = field(default_factory=dict)
    summary: Dict[str, Any] = field(default_factory=dict)

    workflow_state: str = StageWorkflowState.CLEAR.value
    next_phase: str = STAGE_NEXT_PHASE
    needs_review: bool = False

    error_code: Optional[str] = None
    error_message: Optional[str] = None
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "phase": self.phase,
            "status": self.status,
            "stage_id": self.stage_id,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "validation_run_id": self.validation_run_id,
            "source": self.source,
            "anomalies": list(self.anomalies),
            "duplicates": dict(self.duplicates),
            "summary": dict(self.summary),
            "workflow_state": self.workflow_state,
            "next_phase": self.next_phase if self.status == "SUCCESS" else None,
            "needs_review": self.needs_review,
            "timestamps": self.timestamps,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
        }
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        return result
