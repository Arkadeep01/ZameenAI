"""Decomposed from phase05_ocr_configuration.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import logging
import os
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import logging
logger = logging.getLogger(__name__)

ROBOFLOW_MODEL_ID = "stamp-and-signature-detection-xqk9l-p0rwh/1"

ROBOFLOW_API_URL = "https://serverless.roboflow.com"

class OCREngine(str, Enum):
    TESSERACT = "TESSERACT"
    NATIVE_PDF_TEXT = "NATIVE_PDF_TEXT"
    TESSERACT_THEN_NATIVE = "TESSERACT_THEN_NATIVE"

class OCRLanguage(str, Enum):
    ENGLISH = "eng"
    HINDI = "hin"
    BENGALI = "ben"

class OCREngineRole(str, Enum):
    """Fixed engine responsibilities — never blurred (see module docstring)."""

    PRIMARY_CHARACTER = "tesseract"
    LAYOUT = "surya"
    ARTIFACT = "roboflow"

class LanguagePackStatus(str, Enum):
    OK = "OK"
    PARTIAL = "PARTIAL"
    UNAVAILABLE = "UNAVAILABLE"

TESSERACT_LANG_MAP: Dict[str, Optional[str]] = {
    "en": "eng", "hi": "hin", "bn": "ben", "as": "asm", "gu": "guj",
    "kn": "kan", "ml": "mal", "mr": "mar", "or": "ori", "pa": "pan",
    "ta": "tam", "te": "tel", "ur": "urd", "ne": "nep", "sa": "san",
    # Scheduled languages with no verified upstream Tesseract pack:
    "kok": None, "ks": None, "mai": None, "brx": None, "mni": None,
    "sat": None, "doi": None, "sd": None,
}

LANGUAGE_DISPLAY: Dict[str, str] = {
    "en": "English", "hi": "Hindi", "bn": "Bengali", "as": "Assamese",
    "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam", "mr": "Marathi",
    "or": "Odia", "pa": "Punjabi", "ta": "Tamil", "te": "Telugu",
    "ur": "Urdu", "ne": "Nepali", "sa": "Sanskrit", "kok": "Konkani",
    "ks": "Kashmiri", "mai": "Maithili", "brx": "Bodo", "mni": "Manipuri",
    "sat": "Santali", "doi": "Dogri", "sd": "Sindhi",
}

REGION_PSM: Dict[str, int] = {
    "HEADER": 6,
    "METADATA": 6,
    "MAIN_TABLE": 6,
    "FOOTER": 6,
    "CELL": 7,
    "FULL_PAGE": 6,
}

REGION_PRIORS: Dict[str, Tuple[float, float]] = {
    "HEADER": (0.00, 0.15),
    "METADATA": (0.15, 0.35),
    "MAIN_TABLE": (0.35, 0.75),
    "FOOTER": (0.75, 1.00),
}

class InputSource(str, Enum):
    ORIGINAL_DOCUMENT = "ORIGINAL_DOCUMENT"
    PREPROCESSED_IMAGE = "PREPROCESSED_IMAGE"
    RENDERED_PDF_PAGE = "RENDERED_PDF_PAGE"

class PageOCRMode(str, Enum):
    SINGLE_PAGE = "SINGLE_PAGE"
    MULTI_PAGE_SEQUENTIAL = "MULTI_PAGE_SEQUENTIAL"
    TABLE_AWARE = "TABLE_AWARE"

class ConfigurationStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"

OCR_CONFIGURATION_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_06"

@dataclass
class OCRRouting:
    primary: str
    fallback: Optional[str] = None
    fallback_enabled: bool = True

@dataclass
class OCRConfiguration:
    engine: str = OCREngine.TESSERACT.value
    language: str = OCRLanguage.ENGLISH.value
    page_mode: str = PageOCRMode.SINGLE_PAGE.value
    input_source: str = InputSource.PREPROCESSED_IMAGE.value
    input_paths: List[str] = field(default_factory=list)
    native_pdf_text_attempt: bool = False
    table_aware: bool = True
    preserve_layout: bool = True
    fallback_enabled: bool = True
    tesseract_psm: int = 6
    tesseract_oem: int = 3
    # Multi-engine plan (fixed responsibilities; availability resolved at runtime).
    ocr_engines: Dict[str, str] = field(default_factory=lambda: {
        "primary": OCREngineRole.PRIMARY_CHARACTER.value,
        "layout": OCREngineRole.LAYOUT.value,
        "artifact": OCREngineRole.ARTIFACT.value,
    })
    region_psm: Dict[str, int] = field(default_factory=lambda: dict(REGION_PSM))
    regions: Dict[str, bool] = field(default_factory=lambda: {
        "header": True, "metadata": True, "main_table": True, "footer": True})
    region_strategy: str = "DYNAMIC_LAYOUT_FIRST"
    # Language pack resolution (detected vs requested vs available).
    detected_language: str = "en"
    detected_script: str = "Latin"
    language_confidence: float = 0.0
    requested_languages: List[str] = field(default_factory=list)
    available_languages: List[str] = field(default_factory=list)
    language_status: str = LanguagePackStatus.OK.value

@dataclass
class OCRConfigurationResult:
    status: ConfigurationStatus = ConfigurationStatus.SUCCESS
    phase: str = "OCR_CONFIGURATION"
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    document_type: str = ""
    classification_confidence: float = 0.0
    classification_status: str = ""
    configuration: Optional[OCRConfiguration] = None
    routing: Optional[OCRRouting] = None
    next_phase: Optional[str] = "PHASE_06_OCR"
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    timestamps: Dict[str, str] = field(default_factory=dict)
    processing_time_seconds: float = 0.0
    # Language/script evidence (always present, even on OCR_LANGUAGE_UNAVAILABLE).
    language: Optional[str] = None
    script: Optional[str] = None
    language_confidence: float = 0.0
    surya_available: bool = False
    roboflow_configured: bool = False
    roboflow_model: Optional[str] = None
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "phase": self.phase,
            "status": self.status.value,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "document_type": self.document_type,
            "classification_confidence": round(self.classification_confidence, 4),
            "classification_status": self.classification_status,
            "next_phase": self.next_phase,
            "timestamps": self.timestamps,
            "processing_time_seconds": round(self.processing_time_seconds, 4),
        }
        if self.configuration:
            result["configuration"] = {
                "engine": self.configuration.engine,
                "language": self.configuration.language,
                "page_mode": self.configuration.page_mode,
                "input_source": self.configuration.input_source,
                "input_paths": self.configuration.input_paths,
                "native_pdf_text_attempt": self.configuration.native_pdf_text_attempt,
                "table_aware": self.configuration.table_aware,
                "preserve_layout": self.configuration.preserve_layout,
                "fallback_enabled": self.configuration.fallback_enabled,
                "tesseract_psm": self.configuration.tesseract_psm,
                "tesseract_oem": self.configuration.tesseract_oem,
                "ocr_engines": dict(self.configuration.ocr_engines),
                "tesseract": {
                    "language": self.configuration.language,
                    "psm": self.configuration.tesseract_psm,
                    "oem": self.configuration.tesseract_oem,
                    "region_psm": dict(self.configuration.region_psm),
                },
                "regions": dict(self.configuration.regions),
                "region_strategy": self.configuration.region_strategy,
            }
            result["language"] = self.configuration.detected_language
            result["script"] = self.configuration.detected_script
            result["language_confidence"] = round(
                float(self.configuration.language_confidence), 4)
            result["ocr_engines"] = dict(self.configuration.ocr_engines)
            result["regions"] = dict(self.configuration.regions)
            result["region_strategy"] = self.configuration.region_strategy
        if self.language is not None:
            result["language"] = self.language
        if self.script is not None:
            result["script"] = self.script
        if self.language_confidence:
            result["language_confidence"] = round(float(self.language_confidence), 4)
        result["surya_available"] = self.surya_available
        result["roboflow_configured"] = self.roboflow_configured
        if self.roboflow_model:
            result["roboflow_model"] = self.roboflow_model
        if self.routing:
            result["routing"] = {
                "primary": self.routing.primary,
                "fallback": self.routing.fallback,
                "fallback_enabled": self.routing.fallback_enabled,
            }
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        if self.warnings:
            result["warnings"] = list(self.warnings)
        return result
