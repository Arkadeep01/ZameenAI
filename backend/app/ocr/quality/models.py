"""Decomposed from phase02_quality_check.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import logging
import math
import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image

import logging
logger = logging.getLogger(__name__)

class QualityStatus(str, Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"

class DocumentQualityStatus(str, Enum):
    PASS = "PASS"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    FAIL = "FAIL"

class ProcessingReadiness(str, Enum):
    READY = "READY"
    READY_WITH_WARNINGS = "READY_WITH_WARNINGS"
    BLOCKED = "BLOCKED"

class Phase02ErrorCode(str, Enum):
    SOURCE_NOT_FOUND = "SOURCE_NOT_FOUND"
    SOURCE_UNREADABLE = "SOURCE_UNREADABLE"
    RENDERING_FAILED = "RENDERING_FAILED"
    QUALITY_CHECK_FAILED = "QUALITY_CHECK_FAILED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"}

MIN_IMAGE_WIDTH = int(os.getenv("MIN_IMAGE_WIDTH", "500"))

MIN_IMAGE_HEIGHT = int(os.getenv("MIN_IMAGE_HEIGHT", "500"))

MIN_DPI = int(os.getenv("MIN_DPI", "100"))

BLUR_THRESHOLD = float(os.getenv("BLUR_THRESHOLD", "50.0"))

BRIGHTNESS_DARK_THRESHOLD = float(os.getenv("BRIGHTNESS_DARK_THRESHOLD", "0.10"))

BRIGHTNESS_BRIGHT_THRESHOLD = float(os.getenv("BRIGHTNESS_BRIGHT_THRESHOLD", "0.95"))

CONTRAST_LOW_THRESHOLD = float(os.getenv("CONTRAST_LOW_THRESHOLD", "0.05"))

SKEW_SEVERE_THRESHOLD = float(os.getenv("SKEW_SEVERE_THRESHOLD", "15.0"))

SKEW_WARNING_THRESHOLD = float(os.getenv("SKEW_WARNING_THRESHOLD", "5.0"))

BLANK_THRESHOLD = float(os.getenv("BLANK_THRESHOLD", "0.0005"))

SHARPNESS_REFERENCE = float(os.getenv("SHARPNESS_REFERENCE", "15000"))

RESOLUTION_FAIL_WIDTH = int(os.getenv("RESOLUTION_FAIL_WIDTH", "200"))

RESOLUTION_FAIL_HEIGHT = int(os.getenv("RESOLUTION_FAIL_HEIGHT", "200"))

RESOLUTION_WARN_WIDTH = int(os.getenv("RESOLUTION_WARN_WIDTH", "500"))

RESOLUTION_WARN_HEIGHT = int(os.getenv("RESOLUTION_WARN_HEIGHT", "500"))

QUALITY_WEIGHTS = {
    "readability": 0.30,
    "sharpness": 0.20,
    "contrast": 0.15,
    "resolution": 0.15,
    "brightness": 0.10,
    "skew": 0.05,
}

@dataclass
class PageDimensions:
    width: int
    height: int

    def to_dict(self) -> Dict[str, int]:
        return {"width": self.width, "height": self.height}

@dataclass
class PageQualityMetrics:
    quality_score: float
    blur_score: float
    brightness_score: float
    contrast_score: float
    skew_angle_degrees: float
    content_ratio: float
    sharpness_normalized: float = 0.0
    contrast_normalized: float = 0.0
    brightness_normalized: float = 0.0
    skew_normalized: float = 0.0
    resolution_normalized: float = 0.0
    readability_score: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return {
            "quality_score": round(self.quality_score, 2),
            "blur_score": round(self.blur_score, 2),
            "brightness_score": round(self.brightness_score, 3),
            "contrast_score": round(self.contrast_score, 3),
            "skew_angle_degrees": round(self.skew_angle_degrees, 2),
            "content_ratio": round(self.content_ratio, 4),
        }

@dataclass
class PageChecks:
    readable: bool = False
    blank: bool = False
    resolution_status: QualityStatus = QualityStatus.PASS
    blur_status: QualityStatus = QualityStatus.PASS
    brightness_status: QualityStatus = QualityStatus.PASS
    contrast_status: QualityStatus = QualityStatus.PASS
    skew_status: QualityStatus = QualityStatus.PASS
    cropping_status: QualityStatus = QualityStatus.PASS

    def to_dict(self) -> Dict[str, Any]:
        return {
            "readable": self.readable,
            "blank": self.blank,
            "resolution": self.resolution_status.value,
            "blur": self.blur_status.value,
            "brightness": self.brightness_status.value,
            "contrast": self.contrast_status.value,
            "skew": self.skew_status.value,
            "cropping": self.cropping_status.value,
        }

@dataclass
class PageIssue:
    severity: str
    code: str
    message: str
    page: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "severity": self.severity,
            "code": self.code,
            "message": self.message,
        }
        if self.page is not None:
            result["page"] = self.page
        return result

@dataclass
class PageResult:
    page_number: int
    status: QualityStatus
    dimensions: PageDimensions
    quality: PageQualityMetrics
    checks: PageChecks
    issues: List[PageIssue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_number": self.page_number,
            "status": self.status.value,
            "dimensions": self.dimensions.to_dict(),
            "quality": self.quality.to_dict(),
            "checks": self.checks.to_dict(),
            "issues": [i.to_dict() for i in self.issues],
        }

@dataclass
class DocumentQuality:
    overall_status: DocumentQualityStatus
    processing_readiness: ProcessingReadiness
    quality_score: float
    pages_passed: int = 0
    pages_warning: int = 0
    pages_failed: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_status": self.overall_status.value,
            "processing_readiness": self.processing_readiness.value,
            "quality_score": round(self.quality_score, 2),
            "pages_passed": self.pages_passed,
            "pages_warning": self.pages_warning,
            "pages_failed": self.pages_failed,
        }

@dataclass
class DocumentCompleteness:
    status: QualityStatus
    pages_accounted_for: bool = True
    rendering_complete: bool = True
    blank_pages_detected: int = 0
    unreadable_pages: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "pages_accounted_for": self.pages_accounted_for,
            "rendering_complete": self.rendering_complete,
            "blank_pages_detected": self.blank_pages_detected,
            "unreadable_pages": self.unreadable_pages,
        }

@dataclass
class QualityCheckResult:
    phase: str = "DOCUMENT_QUALITY_COMPLETENESS_CHECK"
    status: str = "SUCCESS"
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    document_info: Dict[str, Any] = field(default_factory=dict)
    quality: Optional[DocumentQuality] = None
    completeness: Optional[DocumentCompleteness] = None
    pages: List[PageResult] = field(default_factory=list)
    issues: List[PageIssue] = field(default_factory=list)
    timestamps: Dict[str, str] = field(default_factory=dict)
    next_phase: Optional[str] = "AI_DOCUMENT_PREPROCESSING"
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "phase": self.phase,
            "status": self.status,
        }

        if self.error_code:
            result.update({
                "error_code": self.error_code,
                "message": self.error_message,
                "record_id": self.record_id,
                "document_id": self.document_id,
                "ingestion_id": self.ingestion_id,
            })
            return result

        result.update({
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "document": self.document_info,
            "quality": self.quality.to_dict() if self.quality else {},
            "completeness": self.completeness.to_dict() if self.completeness else {},
            "pages": [p.to_dict() for p in self.pages],
            "issues": [i.to_dict() for i in self.issues],
            "timestamps": self.timestamps,
            "next_phase": self.next_phase,
        })
        return result
