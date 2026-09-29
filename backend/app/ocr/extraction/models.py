"""Decomposed from phase07_semantic_field_extraction.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import difflib
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


import logging
logger = logging.getLogger(__name__)

PHASE_07_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_07"

class ExtractionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PARTIAL_SUCCESS = "PARTIAL_SUCCESS"
    NO_FIELDS_EXTRACTED = "NO_FIELDS_EXTRACTED"
    FAILED = "FAILED"

class FieldStatus(str, Enum):
    EXTRACTED = "EXTRACTED"
    MISSING = "MISSING"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    UNREADABLE = "UNREADABLE"
    AMBIGUOUS = "AMBIGUOUS"

class ExtractionMethod(str, Enum):
    LABEL_VALUE_SAME_LINE = "LABEL_VALUE_SAME_LINE"
    LABEL_VALUE_SPATIAL = "LABEL_VALUE_SPATIAL"
    LABEL_VALUE_NEXT_LINE = "LABEL_VALUE_NEXT_LINE"
    TABLE_CELL = "TABLE_CELL"
    TABLE_COLUMN_HEADER = "TABLE_COLUMN_HEADER"
    REGEX_PATTERN = "REGEX_PATTERN"
    DETERMINISTIC = "DETERMINISTIC"
    AI_SEMANTIC = "AI_SEMANTIC"
    MISTRAL = "MISTRAL"
    OLLAMA = "OLLAMA"
    INDICBART_NORMALIZED = "INDICBART_NORMALIZED"
    RECONCILED = "RECONCILED"

class ModelStatus(str, Enum):
    USED = "USED"
    AVAILABLE_NOT_INVOKED = "AVAILABLE_NOT_INVOKED"
    UNAVAILABLE = "UNAVAILABLE"
    DISABLED = "DISABLED"
    ERROR = "ERROR"

@dataclass
class BoundingBox:
    x: int
    y: int
    width: int
    height: int

    def to_dict(self) -> Dict[str, int]:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }

@dataclass
class ExtractionSource:
    page: int
    label: str
    text: str
    bbox: BoundingBox

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page": self.page,
            "label": self.label,
            "text": self.text,
            "bbox": self.bbox.to_dict(),
        }

@dataclass
class FieldMetadata:
    field_name: str
    status: FieldStatus
    confidence: float
    source: Optional[ExtractionSource] = None
    method: Optional[ExtractionMethod] = None
    raw_value: Optional[str] = None
    normalized_value: Optional[Any] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "field_name": self.field_name,
            "status": self.status.value,
            "confidence": round(self.confidence, 4),
        }
        if self.source:
            result["source"] = self.source.to_dict()
        if self.method:
            result["method"] = self.method.value
        if self.raw_value is not None:
            result["raw_value"] = self.raw_value
        if self.normalized_value is not None:
            result["normalized_value"] = self.normalized_value
        if self.error_message:
            result["error_message"] = self.error_message
        return result

@dataclass
class ExtractedRecord:
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""

    document: Dict[str, Any] = field(default_factory=dict)
    owner: Dict[str, Any] = field(default_factory=dict)
    land: Dict[str, Any] = field(default_factory=dict)
    location: Dict[str, Any] = field(default_factory=dict)
    registration: Dict[str, Any] = field(default_factory=dict)
    mutation: Dict[str, Any] = field(default_factory=dict)
    additional: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "document": self.document,
            "owner": self.owner,
            "land": self.land,
            "location": self.location,
            "registration": self.registration,
            "mutation": self.mutation,
            "additional": self.additional,
        }

@dataclass
class ExtractionResult:
    status: ExtractionStatus = ExtractionStatus.SUCCESS
    phase: str = "SEMANTIC_FIELD_EXTRACTION"
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""

    extracted_record: Optional[ExtractedRecord] = None
    field_metadata: Dict[str, FieldMetadata] = field(default_factory=dict)

    document_type: str = ""
    classification_confidence: float = 0.0

    fields_expected: int = 0
    fields_extracted: int = 0
    fields_missing: int = 0
    fields_not_applicable: int = 0

    next_phase: str = "PHASE_08_CONFIDENCE_COMPLETENESS"

    error_code: Optional[str] = None
    error_message: Optional[str] = None
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0

    models: Dict[str, str] = field(default_factory=dict)
    unresolved_fields: List[str] = field(default_factory=list)
    conflicts: List[Dict[str, Any]] = field(default_factory=list)
    needs_review: bool = False

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "phase": self.phase,
            "status": self.status.value,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "document_type": self.document_type,
            "classification_confidence": round(self.classification_confidence, 4),
            "extracted_record": self.extracted_record.to_dict() if self.extracted_record else None,
            "field_metadata": {k: v.to_dict() for k, v in self.field_metadata.items()},
            "completeness": {
                "fields_expected": self.fields_expected,
                "fields_extracted": self.fields_extracted,
                "fields_missing": self.fields_missing,
                "fields_not_applicable": self.fields_not_applicable,
            },
            "next_phase": self.next_phase,
            "timestamps": self.timestamps,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
            "models": self.models,
            "unresolved_fields": self.unresolved_fields,
            "conflicts": self.conflicts,
            "needs_review": self.needs_review,
        }
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        return result

@dataclass
class EvidenceCandidate:
    field_name: str
    value: str
    raw_value: str
    label: str
    label_score: float
    confidence: float
    method: ExtractionMethod
    page: int
    bbox: Optional[BoundingBox] = None
    source_text: str = ""
    source_model: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field_name": self.field_name,
            "value": self.value,
            "raw_value": self.raw_value,
            "label": self.label,
            "label_score": round(self.label_score, 4),
            "confidence": round(self.confidence, 4),
            "method": self.method.value,
            "page": self.page,
            "bbox": self.bbox.to_dict() if self.bbox else None,
            "source_text": self.source_text,
            "source_model": self.source_model,
        }
