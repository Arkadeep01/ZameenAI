"""Decomposed from phase04_document_classification.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
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

class ClassificationStatus(str, Enum):
    HIGH_CONFIDENCE = "HIGH_CONFIDENCE"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    AMBIGUOUS = "AMBIGUOUS"

class DocumentType(str, Enum):
    LAND_RECORD = "LAND_RECORD"
    RECORD_OF_RIGHTS = "RECORD_OF_RIGHTS"
    KHATIAN = "KHATIAN"
    MUTATION_RECORD = "MUTATION_RECORD"
    LAND_REGISTRATION_DOCUMENT = "LAND_REGISTRATION_DOCUMENT"
    LAND_OWNERSHIP_RECORD = "LAND_OWNERSHIP_RECORD"
    LAND_TAX_RECORD = "LAND_TAX_RECORD"
    SURVEY_RECORD = "SURVEY_RECORD"
    LAND_MAP_REFERENCE = "LAND_MAP_REFERENCE"
    UNKNOWN = "UNKNOWN"
    OTHER_SUPPORTED_LAND_DOCUMENT = "OTHER_SUPPORTED_LAND_DOCUMENT"

CONFIDENCE_HIGH_THRESHOLD = float(
    os.getenv("CONFIDENCE_HIGH_THRESHOLD", "0.85")
)

CONFIDENCE_REVIEW_THRESHOLD = float(
    os.getenv("CONFIDENCE_REVIEW_THRESHOLD", "0.60")
)

CLASSIFICATION_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_04"

KEYWORD_MAP: Dict[DocumentType, Dict[str, List[str]]] = {
    DocumentType.RECORD_OF_RIGHTS: {
        "titles": [
            "RECORD OF RIGHTS",
            "RECORD OF RIGHTS (RoR)",
            "LAND AND LAND REFORMS",
        ],
        "keywords": [
            "KHATIAN",
            "KHATIAN NO",
            "PLOT NO",
            "AREA",
            "LAND AND LAND REFORMS DEPARTMENT",
        ],
    },
    DocumentType.KHATIAN: {
        "titles": [
            "KHATIAN",
            "KHATIAN CERTIFICATE",
        ],
        "keywords": [
            "KHATIAN NO",
            "PLOT NO",
            "AREA",
        ],
    },
    DocumentType.MUTATION_RECORD: {
        "titles": [
            "MUTATION RECORD",
            "MUTATION ENTRY",
            "CHANGE OF OWNERSHIP",
        ],
        "keywords": [
            "MUTATION NO",
            "PREVIOUS OWNER",
            "NEW OWNER",
            "DATE OF MUTATION",
        ],
    },
    DocumentType.LAND_REGISTRATION_DOCUMENT: {
        "titles": [
            "LAND REGISTRATION DOCUMENT",
            "REGISTRY DEED",
            "PROPERTY DEED",
        ],
        "keywords": [
            "REGISTRATION NO",
            "SUB-REGISTRAR",
            "DATE OF REGISTRATION",
            "PARTIES",
        ],
    },
    DocumentType.LAND_OWNERSHIP_RECORD: {
        "titles": [
            "LAND OWNERSHIP RECORD",
            "OWNERSHIP CERTIFICATE",
        ],
        "keywords": [
            "OWNER NAME",
            "PROPRIETOR",
            "HOLDING NO",
        ],
    },
    DocumentType.LAND_TAX_RECORD: {
        "titles": [
            "LAND TAX RECORD",
            "TAX ASSESSMENT",
            "PROPERTY TAX",
        ],
        "keywords": [
            "TAX ASSESSMENT YEAR",
            "ANNUAL TAX",
            "ASSESSED VALUE",
        ],
    },
    DocumentType.SURVEY_RECORD: {
        "titles": [
            "SURVEY RECORD",
            "SURVEY REPORT",
            "MAP REFERENCE",
        ],
        "keywords": [
            "SURVEY NO",
            "MAP NO",
            "SURVEY NUMBER",
        ],
    },
    DocumentType.LAND_MAP_REFERENCE: {
        "titles": [
            "LAND MAP REFERENCE",
            "MAP REFERENCE",
            "SURVEY MAP",
        ],
        "keywords": [
            "MAP NO",
            "SHEET NO",
            "REFERENCE NUMBER",
        ],
    },
    DocumentType.LAND_RECORD: {
        "titles": [
            "LAND RECORD",
            "LAND RECORD DOCUMENT",
        ],
        "keywords": [
            "LAND RECORD",
            "PROPERTY RECORD",
        ],
    },
}

@dataclass
class PageClassification:
    """Classification result for a single page."""
    page_number: int
    predicted_type: DocumentType
    confidence: float
    evidence: List[str]
    alternative_predictions: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class ClassificationResult:
    """Result of document classification."""
    record_id: str
    document_id: str
    ingestion_id: str
    phase: str = "DOCUMENT_CLASSIFICATION"

    # Document-level prediction
    predicted_document_type: DocumentType = DocumentType.UNKNOWN
    confidence: float = 0.0
    classification_status: ClassificationStatus = ClassificationStatus.LOW_CONFIDENCE

    # Evidence and alternatives
    evidence: List[str] = field(default_factory=list)
    alternative_predictions: List[Dict[str, Any]] = field(default_factory=list)

    # Page-level results (for multi-page documents)
    pages: List[PageClassification] = field(default_factory=list)

    # Processing metadata
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0
    next_phase: str = "OCR_CONFIGURATION"

    # Error / warnings
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "phase": self.phase,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "predicted_document_type": self.predicted_document_type.value,
            "confidence": round(self.confidence, 4),
            "classification_status": self.classification_status.value,
            "evidence": list(self.evidence),
            "alternative_predictions": list(self.alternative_predictions),
            "timestamps": self.timestamps,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
            "next_phase": self.next_phase,
        }

        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        if self.warnings:
            result["warnings"] = list(self.warnings)

        if self.pages:
            result["pages"] = [p.to_dict() for p in self.pages]

        return result

LAYOUT_SIGNATURES: Dict[DocumentType, Dict[str, Any]] = {
    DocumentType.RECORD_OF_RIGHTS: {
        "required_regions": ["HEADER", "TABLE"],
        "forbidden_regions": [],
        "region_scores": {
            "HEADER": 0.35,
            "TABLE": 0.45,
            "TEXT_BLOCK": 0.1,
        },
        "layout_features": {
            "has_horizontal_lines": True,
            "has_vertical_lines": True,
            "min_table_count": 1,
            "table_dominance": True,
        },
    },
    DocumentType.KHATIAN: {
        "required_regions": ["HEADER", "TABLE"],
        "forbidden_regions": [],
        "region_scores": {
            "HEADER": 0.3,
            "TABLE": 0.4,
            "TEXT_BLOCK": 0.15,
        },
        "layout_features": {
            "has_horizontal_lines": True,
            "has_vertical_lines": True,
            "min_table_count": 1,
        },
    },
    DocumentType.MUTATION_RECORD: {
        "required_regions": ["HEADER", "TABLE"],
        "forbidden_regions": [],
        "region_scores": {
            "TABLE": 0.35,
            "HEADER": 0.3,
            "TEXT_BLOCK": 0.2,
        },
        "layout_features": {
            "has_horizontal_lines": True,
            "has_vertical_lines": True,
            "min_table_count": 1,
        },
    },
    DocumentType.LAND_REGISTRATION_DOCUMENT: {
        "required_regions": ["HEADER"],
        "forbidden_regions": [],
        "region_scores": {
            "HEADER": 0.4,
            "TEXT_BLOCK": 0.25,
            "TABLE": 0.15,
            "SIGNATURE": 0.1,
        },
        "layout_features": {
            "has_horizontal_lines": False,
            "has_vertical_lines": False,
            "min_table_count": 0,
        },
    },
    DocumentType.LAND_OWNERSHIP_RECORD: {
        "required_regions": ["HEADER", "TABLE"],
        "forbidden_regions": [],
        "region_scores": {
            "TABLE": 0.4,
            "HEADER": 0.3,
            "TEXT_BLOCK": 0.15,
        },
        "layout_features": {
            "has_horizontal_lines": True,
            "has_vertical_lines": True,
            "min_table_count": 1,
        },
    },
    DocumentType.LAND_TAX_RECORD: {
        "required_regions": ["HEADER", "TABLE"],
        "forbidden_regions": [],
        "region_scores": {
            "TABLE": 0.35,
            "HEADER": 0.35,
            "TEXT_BLOCK": 0.15,
        },
        "layout_features": {
            "has_horizontal_lines": True,
            "has_vertical_lines": True,
            "min_table_count": 1,
        },
    },
    DocumentType.SURVEY_RECORD: {
        "required_regions": ["HEADER", "TABLE"],
        "forbidden_regions": [],
        "region_scores": {
            "TABLE": 0.4,
            "HEADER": 0.3,
            "TEXT_BLOCK": 0.15,
        },
        "layout_features": {
            "has_horizontal_lines": True,
            "has_vertical_lines": True,
            "min_table_count": 1,
        },
    },
    DocumentType.LAND_MAP_REFERENCE: {
        "required_regions": ["HEADER"],
        "forbidden_regions": ["TABLE"],
        "region_scores": {
            "HEADER": 0.4,
            "LARGE_BLOB": 0.3,
            "TEXT_BLOCK": 0.15,
        },
        "layout_features": {
            "has_horizontal_lines": False,
            "has_vertical_lines": False,
            "min_table_count": 0,
        },
    },
}

_REGION_TYPE_MAP: Dict[str, str] = {
    "HEADER": "HEADER",
    "TABLE": "TABLE",
    "TEXT_BLOCK": "TEXT_BLOCK",
    "TEXT_REGION": "TEXT_BLOCK",
    "SIGNATURE": "SIGNATURE",
    "STAMP": "SIGNATURE",
    "SEAL": "SIGNATURE",
}

_TITLE_BAND_FRACTION = 0.25
