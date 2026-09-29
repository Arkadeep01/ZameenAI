"""Decomposed from phase05_language_and_script_detection.py: lang_models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import json
import logging
import os
import re
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .registry import (
    LANGUAGE_REGISTRY as _AUTHORITATIVE_LANGUAGE_REGISTRY, SCRIPT_LANGUAGES as _AUTHORITATIVE_SCRIPT_LANGUAGES, SCRIPT_RANGES as _AUTHORITATIVE_SCRIPT_RANGES, SCRIPT_TO_LANGUAGE as _AUTHORITATIVE_SCRIPT_TO_LANGUAGE, TERMINOLOGY as _AUTHORITATIVE_TERMINOLOGY,
)

import logging
logger = logging.getLogger(__name__)

PHASE_NAME = "PHASE_05_LANGUAGE_SCRIPT_DETECTION"

NEXT_PHASE = "OCR_VISUAL_TEXT_RECOGNITION"

GEMINI_LIVE_TRANSLATE_MODEL = "gemini-3.5-live-translate-preview"

GEMINI_DOCUMENT_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

LANGUAGE_DETECTION_STORAGE_DIR = (
    APP_DIR / "uploads" / "processing" / "phase_05"
)

MIN_SCRIPT_CHARS = int(os.getenv("PHASE05_MIN_SCRIPT_CHARS", "20"))

MULTILINGUAL_SHARE_THRESHOLD = float(
    os.getenv("PHASE05_MULTILINGUAL_SHARE", "0.15")
)

MULTILINGUAL_MIN_CHARS = int(os.getenv("PHASE05_MULTILINGUAL_MIN_CHARS", "15"))

class DetectionStatus(str, Enum):
    DETECTED = "DETECTED"
    MULTILINGUAL = "MULTILINGUAL"
    UNCERTAIN = "UNCERTAIN"
    UNSUPPORTED = "UNSUPPORTED"
    FAILED = "FAILED"

class APIStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

LANGUAGE_REGISTRY: Dict[str, Dict[str, Any]] = {
    lang: {
        "script": meta["scripts"][0],
        "tesseract": meta.get("tesseract"),
        "display": meta["display"],
    }
    for lang, meta in _AUTHORITATIVE_LANGUAGE_REGISTRY.items()
}

MVP_LANGUAGES = ("en", "hi", "bn")

SCRIPT_TO_LANGUAGE: Dict[str, str] = dict(_AUTHORITATIVE_SCRIPT_TO_LANGUAGE)

SCRIPT_LANGUAGES: Dict[str, Tuple[str, ...]] = {
    script: tuple(langs)
    for script, langs in _AUTHORITATIVE_SCRIPT_LANGUAGES.items()
}

SCRIPT_RANGES: List[Tuple[int, int, str]] = list(_AUTHORITATIVE_SCRIPT_RANGES)

TERMINOLOGY: Dict[str, List[str]] = {
    lang: list(terms) for lang, terms in _AUTHORITATIVE_TERMINOLOGY.items()
}

@dataclass
class Evidence:
    source: str
    language: str
    script: str
    confidence: float
    sample: str = ""
    detail: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "language": self.language,
            "script": self.script,
            "confidence": round(float(self.confidence), 4),
            "sample": self.sample[:160],
            "detail": self.detail,
        }

@dataclass
class DetectedLanguage:
    language: str
    script: str
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "language": self.language,
            "script": self.script,
            "confidence": round(float(self.confidence), 4),
        }

@dataclass
class OCRRouting:
    language_codes: List[str]
    preferred_language: str
    script: str
    engine_preferences: List[str] = field(
        default_factory=lambda: ["TESSERACT", "SURYA"]
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "language_codes": list(self.language_codes),
            "preferred_language": self.preferred_language,
            "script": self.script,
            "engine_preferences": list(self.engine_preferences),
        }

@dataclass
class LanguageDetectionResult:
    status: APIStatus = APIStatus.SUCCESS
    detection_status: DetectionStatus = DetectionStatus.FAILED
    record_id: str = ""
    document_id: str = ""
    classification_id: Optional[str] = None
    ingestion_id: Optional[str] = None
    document_type: Optional[str] = None
    classification_confidence: float = 0.0
    primary_language: str = "und"
    language_confidence: float = 0.0
    language_alternatives: List[Dict[str, Any]] = field(default_factory=list)
    primary_script: str = "Unknown"
    script_confidence: float = 0.0
    script_alternatives: List[Dict[str, Any]] = field(default_factory=list)
    multilingual: bool = False
    detected_languages: List[DetectedLanguage] = field(default_factory=list)
    ocr_routing: Optional[OCRRouting] = None
    evidence: List[Evidence] = field(default_factory=list)
    next_phase: Optional[str] = NEXT_PHASE
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "phase": PHASE_NAME,
            "status": self.status.value,
            "detection_status": self.detection_status.value,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "language": {
                "primary": self.primary_language,
                "confidence": round(float(self.language_confidence), 4),
                "alternatives": list(self.language_alternatives),
            },
            "script": {
                "primary": self.primary_script,
                "confidence": round(float(self.script_confidence), 4),
                "alternatives": list(self.script_alternatives),
            },
            "multilingual": bool(self.multilingual),
            "detected_languages": [d.to_dict() for d in self.detected_languages],
            "ocr_routing": self.ocr_routing.to_dict() if self.ocr_routing else {},
            "evidence": [e.to_dict() for e in self.evidence],
            "next_phase": self.next_phase,
            "timestamps": dict(self.timestamps),
            "processing_time_seconds": round(float(self.processing_time_seconds), 4),
        }
        if self.classification_id:
            result["classification_id"] = self.classification_id
        if self.ingestion_id:
            result["ingestion_id"] = self.ingestion_id
        if self.document_type:
            result["document_type"] = self.document_type
        result["classification_confidence"] = round(
            float(self.classification_confidence or 0.0), 4
        )
        if self.warnings:
            result["warnings"] = list(self.warnings)
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LanguageDetectionResult":
        lang = data.get("language", {}) or {}
        script = data.get("script", {}) or {}
        routing = data.get("ocr_routing", {}) or {}
        detected = [
            DetectedLanguage(
                language=str(d.get("language", "und")),
                script=str(d.get("script", "Unknown")),
                confidence=float(d.get("confidence", 0.0)),
            )
            for d in (data.get("detected_languages", []) or [])
            if isinstance(d, dict)
        ]
        evidence = [
            Evidence(
                source=str(e.get("source", "")),
                language=str(e.get("language", "und")),
                script=str(e.get("script", "Unknown")),
                confidence=float(e.get("confidence", 0.0)),
                sample=str(e.get("sample", "")),
                detail=str(e.get("detail", "")),
            )
            for e in (data.get("evidence", []) or [])
            if isinstance(e, dict)
        ]
        ocr_routing = None
        if routing.get("language_codes") is not None:
            ocr_routing = OCRRouting(
                language_codes=list(routing.get("language_codes", [])),
                preferred_language=str(routing.get("preferred_language", "")),
                script=str(routing.get("script", "Unknown")),
                engine_preferences=list(
                    routing.get("engine_preferences", ["TESSERACT", "SURYA"])
                ),
            )
        return cls(
            status=APIStatus(data.get("status", "FAILED")),
            detection_status=DetectionStatus(
                data.get("detection_status", "FAILED")
            ),
            record_id=str(data.get("record_id", "")),
            document_id=str(data.get("document_id", "")),
            classification_id=data.get("classification_id"),
            ingestion_id=data.get("ingestion_id"),
            document_type=data.get("document_type"),
            classification_confidence=float(
                data.get("classification_confidence", 0.0) or 0.0
            ),
            primary_language=str(lang.get("primary", "und")),
            language_confidence=float(lang.get("confidence", 0.0) or 0.0),
            language_alternatives=list(lang.get("alternatives", []) or []),
            primary_script=str(script.get("primary", "Unknown")),
            script_confidence=float(script.get("confidence", 0.0) or 0.0),
            script_alternatives=list(script.get("alternatives", []) or []),
            multilingual=bool(data.get("multilingual", False)),
            detected_languages=detected,
            ocr_routing=ocr_routing,
            evidence=evidence,
            next_phase=data.get("next_phase"),
            error_code=data.get("error_code"),
            error_message=data.get("error_message"),
            warnings=list(data.get("warnings", []) or []),
            timestamps=dict(data.get("timestamps", {}) or {}),
            processing_time_seconds=float(
                data.get("processing_time_seconds", 0.0) or 0.0
            ),
        )
