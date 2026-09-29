"""Decomposed from phase06_ocr_visual_text_recognition.py: models. (Authoritative implementation; verbatim move.)"""
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
import cv2
import numpy as np
import pytesseract
from PIL import Image


import logging
logger = logging.getLogger(__name__)

OCR_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_06"

DEFAULT_TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

class OCRStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PARTIAL_SUCCESS = "PARTIAL_SUCCESS"
    NO_TEXT_DETECTED = "NO_TEXT_DETECTED"
    FAILED = "FAILED"

@dataclass
class OCRBoundingBox:
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
class OCRWord:
    text: str
    confidence: Optional[float]
    bbox: OCRBoundingBox
    block_num: int = 0
    par_num: int = 0
    line_num: int = 0
    word_num: int = 0
    # Evidence provenance (additive; raw Tesseract scale preserved separately
    # because `confidence` stays 0-1 normalized for downstream consumers).
    page: int = 1
    line_id: str = ""
    region: str = "FULL_PAGE"
    engine: str = "tesseract"
    script: str = ""
    needs_review: bool = False
    confidence_raw: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "confidence": self.confidence,
            "confidence_raw": self.confidence_raw,
            "bbox": self.bbox.to_dict(),
            "page": self.page,
            "line_id": self.line_id,
            "block_num": self.block_num,
            "par_num": self.par_num,
            "line_num": self.line_num,
            "word_num": self.word_num,
            "region": self.region,
            "engine": self.engine,
            "script": self.script,
            "needs_review": self.needs_review,
        }

@dataclass
class OCRLine:
    text: str
    words: List[OCRWord]
    bbox: OCRBoundingBox
    region: str = "FULL_PAGE"
    page: int = 1
    confidence: float = 0.0
    reading_order: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "words": [w.to_dict() for w in self.words],
            "bbox": self.bbox.to_dict(),
            "region": self.region,
            "page": self.page,
            "confidence": round(float(self.confidence), 4),
            "reading_order": self.reading_order,
        }

@dataclass
class DocumentRegion:
    """A page region: Surya box > Phase 03 region > geometry prior fallback."""

    type: str  # HEADER | METADATA | MAIN_TABLE | FOOTER
    bbox: OCRBoundingBox
    confidence: float = 0.0
    source: str = "geometry_prior"
    page: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "bbox": [self.bbox.x, self.bbox.y,
                     self.bbox.x + self.bbox.width, self.bbox.y + self.bbox.height],
            "bbox_xywh": self.bbox.to_dict(),
            "confidence": round(float(self.confidence), 4),
            "source": self.source,
            "page": self.page,
        }

@dataclass
class TableCell:
    row_index: int
    column_index: int
    text: str
    confidence: float
    bbox: OCRBoundingBox
    page: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "row_index": self.row_index,
            "column_index": self.column_index,
            "text": self.text,
            "confidence": round(float(self.confidence), 4),
            "bbox": self.bbox.to_dict(),
            "page": self.page,
        }

@dataclass
class TableRow:
    row_index: int
    cells: List[TableCell]
    bbox: OCRBoundingBox
    confidence: float = 0.0
    page: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "row_index": self.row_index,
            "cells": [c.to_dict() for c in self.cells],
            "bbox": self.bbox.to_dict(),
            "confidence": round(float(self.confidence), 4),
            "page": self.page,
        }

@dataclass
class TableData:
    table_index: int
    bbox: OCRBoundingBox
    rows: List[TableRow]
    structure_status: str = "RESOLVED"  # or UNRESOLVED
    source: str = "ruling_line_grid"
    page: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "table_index": self.table_index,
            "bbox": self.bbox.to_dict(),
            "rows": [r.to_dict() for r in self.rows],
            "structure_status": self.structure_status,
            "source": self.source,
            "page": self.page,
        }

@dataclass
class ArtifactDetection:
    """Seal / stamp / signature evidence. Source is always the recognizer
    that produced it (roboflow) — never color/shape heuristics."""

    artifact_type: str  # seal | stamp | signature
    confidence: float
    bbox: OCRBoundingBox
    page: int = 1
    source: str = "roboflow"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.artifact_type,
            "artifact_type": self.artifact_type,
            "confidence": round(float(self.confidence), 4),
            "bbox": self.bbox.to_dict(),
            "page": self.page,
            "source": self.source,
        }

@dataclass
class GovernmentEvidence:
    """Non-authoritative evidence signals only. Phase 04 owns classification;
    this object must never override it and never claims government_document."""

    header_detected: bool = False
    department_detected: bool = False
    government_terminology: List[str] = field(default_factory=list)
    document_title_detected: bool = False
    emblem_region_detected: bool = False
    seal_detected: bool = False
    signature_detected: bool = False
    footer_legal_text_detected: bool = False
    evidence_score: float = 0.0
    matched_signals: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "header_detected": self.header_detected,
            "department_detected": self.department_detected,
            "government_terminology": list(self.government_terminology),
            "document_title_detected": self.document_title_detected,
            "emblem_region_detected": self.emblem_region_detected,
            "seal_detected": self.seal_detected,
            "signature_detected": self.signature_detected,
            "footer_legal_text_detected": self.footer_legal_text_detected,
            "evidence_score": round(float(self.evidence_score), 4),
            "matched_signals": list(self.matched_signals),
        }

@dataclass
class CandidateText:
    """Preserved alternative readings (e.g. Tesseract vs Surya). Phase 07 resolves."""

    text: str
    engine: str
    confidence: float
    region: str = ""
    page: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "engine": self.engine,
            "confidence": self.confidence,
            "region": self.region,
            "page": self.page,
        }

@dataclass
class NumericToken:
    """Raw numeric/identifier token, exactly as observed (never normalized)."""

    text: str
    confidence: Optional[float]
    bbox: OCRBoundingBox
    page: int = 1
    region: str = ""
    needs_review: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "confidence": self.confidence,
            "bbox": self.bbox.to_dict(),
            "page": self.page,
            "region": self.region,
            "needs_review": self.needs_review,
        }

@dataclass
class PageOCRResult:
    page_number: int
    text: str
    words: List[OCRWord]
    lines: List[OCRLine]
    mean_confidence: float
    word_count: int
    character_count: int
    native_text_used: bool = False
    native_text: str = ""
    status: OCRStatus = OCRStatus.SUCCESS
    error_message: Optional[str] = None
    # Multi-engine evidence (additive; Phase 07 consumes words/lines/text).
    regions: List[DocumentRegion] = field(default_factory=list)
    tables: List[TableData] = field(default_factory=list)
    table_structure_status: str = "UNRESOLVED"
    artifacts: List[ArtifactDetection] = field(default_factory=list)
    government_document_evidence: Optional[GovernmentEvidence] = None
    candidate_texts: List[CandidateText] = field(default_factory=list)
    numeric_tokens: List[NumericToken] = field(default_factory=list)
    scripts_present: List[str] = field(default_factory=list)
    input_path: Optional[str] = None
    layout_source: str = "geometry_prior"
    table_view_used: bool = False

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "page": self.page_number,
            "page_number": self.page_number,
            "text": self.text,
            "words": [w.to_dict() for w in self.words],
            "lines": [l.to_dict() for l in self.lines],
            "mean_confidence": round(self.mean_confidence, 4),
            "word_count": self.word_count,
            "character_count": self.character_count,
            "native_text_used": self.native_text_used,
            "status": self.status.value,
            "regions": [r.to_dict() for r in self.regions],
            "tables": [t.to_dict() for t in self.tables],
            "table_structure_status": self.table_structure_status,
            "artifacts": [a.to_dict() for a in self.artifacts],
            "candidate_texts": [c.to_dict() for c in self.candidate_texts],
            "numeric_tokens": [n.to_dict() for n in self.numeric_tokens],
            "scripts_present": list(self.scripts_present),
            "layout_source": self.layout_source,
            "table_view_used": self.table_view_used,
            "ocr": {
                "text": self.text,
                "word_count": self.word_count,
                "mean_confidence": round(self.mean_confidence, 4),
            },
        }
        if self.native_text:
            result["native_text"] = self.native_text
        if self.error_message:
            result["error_message"] = self.error_message
        if self.government_document_evidence is not None:
            result["government_document_evidence"] = self.government_document_evidence.to_dict()
        if self.input_path:
            result["input_path"] = self.input_path
        return result

@dataclass
class OCRMetrics:
    mean_confidence: float
    median_confidence: float
    low_confidence_word_count: int
    low_confidence_percentage: float
    total_words: int
    total_characters: int
    pages_processed: int
    pages_failed: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mean_confidence": round(self.mean_confidence, 4),
            "median_confidence": round(self.median_confidence, 4),
            "low_confidence_word_count": self.low_confidence_word_count,
            "low_confidence_percentage": round(self.low_confidence_percentage, 4),
            "total_words": self.total_words,
            "total_characters": self.total_characters,
            "pages_processed": self.pages_processed,
            "pages_failed": self.pages_failed,
        }

@dataclass
class OCRResult:
    status: OCRStatus = OCRStatus.SUCCESS
    phase: str = "OCR"
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    engine: str = "TESSERACT"
    language: str = "eng"
    pages: List[PageOCRResult] = field(default_factory=list)
    full_text: str = ""
    metrics: Optional[OCRMetrics] = None
    next_phase: Optional[str] = "PHASE_07_SEMANTIC_FIELD_EXTRACTION"
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0
    # Multi-engine evidence envelope (additive).
    input: Dict[str, Any] = field(default_factory=dict)
    language_info: Dict[str, Any] = field(default_factory=dict)
    engines: Dict[str, str] = field(default_factory=lambda: {
        "tesseract": "SUCCESS", "surya": "UNAVAILABLE", "roboflow": "UNAVAILABLE"})
    qr_status: str = "NOT_IMPLEMENTED"
    surya: Dict[str, Any] = field(default_factory=dict)
    roboflow: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "phase": self.phase,
            "status": self.status.value,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "engine": self.engine,
            "language": self.language,
            "input": dict(self.input),
            "engines": dict(self.engines),
            "qr_status": self.qr_status,
            "surya": dict(self.surya),
            "roboflow": dict(self.roboflow),
            "pages": [p.to_dict() for p in self.pages],
            "full_text": self.full_text,
            "next_phase": self.next_phase,
            "timestamps": self.timestamps,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
        }
        if self.language_info:
            result["language"] = dict(self.language_info)
        if self.metrics:
            result["metrics"] = self.metrics.to_dict()
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        if self.warnings:
            result["warnings"] = list(self.warnings)
        return result

NEEDS_REVIEW_CONF = 0.6

MAX_TABLE_CELLS = 200

NATIVE_WORD_CONF = 1.0

GOVT_SIGNALS: Dict[str, List[str]] = {
    "government": ["government", "sarkar", "सरकार", "সরকার"],
    "department": ["department", "directorate", "revenue", "land reform",
                   "vibhag", "विभाग", "বিভাগ"],
    "title": ["record of rights", "khatian", "khata", "mutation", "jamabandi",
              "khasra", "khesra", "dag number", "dag no",
              "खतौनी", "खतियान", "खसरा", "नामांतरण",
              "খতিয়ান", "দাগ", "মিউটেশন"],
    "footer_legal": ["computer generated", "no signature", "signature required",
                     "हस्ताक्षर", "मोहर", "স্বাক্ষর"],
}

REGION_ORDER = ["HEADER", "METADATA", "MAIN_TABLE", "FOOTER"]

_PHASE03_TO_REGION = {
    "HEADER": "HEADER",
    "FOOTER": "FOOTER",
    "TABLE": "MAIN_TABLE",
    "TEXT_REGION": "METADATA",
    "TEXT_BLOCK": "METADATA",
}

_NUMERIC_RE = re.compile(r"^[\d]+(?:[.,/:\-–\s]*[\d]+)*$")

_SUSPICIOUS_NUMERIC_RE = re.compile(r"[A-Za-z]{1}")

RULE_MARGIN = 4
