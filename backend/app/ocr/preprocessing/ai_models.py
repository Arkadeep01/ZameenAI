"""Decomposed from phase03_ai_document_preprocessing.py: ai_models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import hashlib
import json
import logging
import math
import os
import shutil
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

class PreprocessingStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"
    REJECTED = "REJECTED"

class PageDecision(str, Enum):
    """Per-page quality decision driven by Phase 02 metrics."""

    REJECT = "REJECT"
    MODERATE = "MODERATE"
    CLEAR = "CLEAR"

class PreprocessingMode(str, Enum):
    """What Phase 03 is allowed to do to a page."""

    NONE = "NONE"
    UPSCALE_ONLY = "UPSCALE_ONLY"
    SELECTIVE_ENHANCEMENT = "SELECTIVE_ENHANCEMENT"

class RejectionReason(str, Enum):
    """Deterministic, explainable rejection reasons (never vague)."""

    LOW_RESOLUTION = "LOW_RESOLUTION"
    SEVERE_BLUR = "SEVERE_BLUR"
    EXTREME_DARKNESS = "EXTREME_DARKNESS"
    EXTREME_OVEREXPOSURE = "EXTREME_OVEREXPOSURE"
    BLANK_PAGE = "BLANK_PAGE"
    SEVERE_CROPPING = "SEVERE_CROPPING"
    UNREADABLE_DOCUMENT = "UNREADABLE_DOCUMENT"
    QUALITY_SCORE_BELOW_THRESHOLD = "QUALITY_SCORE_BELOW_THRESHOLD"

ALL_OPERATIONS = [
    "UPSCALE",
    "DESKEW",
    "BRIGHTNESS_CORRECTION",
    "CONTRAST_ENHANCEMENT",
    "DENOISE",
    "SHARPEN",
]

class PreprocessingStrategy(str, Enum):
    MINIMAL = "MINIMAL"
    MODERATE = "MODERATE"
    LOW_QUALITY_RESTORATION = "LOW_QUALITY_RESTORATION"

class Phase03ErrorCode(str, Enum):
    INVALID_RECORD = "INVALID_RECORD"
    INVALID_DOCUMENT = "INVALID_DOCUMENT"
    SOURCE_NOT_FOUND = "SOURCE_NOT_FOUND"
    PHASE_01_INCOMPLETE = "PHASE_01_INCOMPLETE"
    PHASE_02_INCOMPLETE = "PHASE_02_INCOMPLETE"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    PDF_RENDER_FAILURE = "PDF_RENDER_FAILURE"
    IMAGE_PROCESSING_FAILURE = "IMAGE_PROCESSING_FAILURE"
    OUTPUT_WRITE_FAILURE = "OUTPUT_WRITE_FAILURE"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"}

PROCESSING_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_03"

EVIDENCE_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_03_evidence"

SHARPNESS_REFERENCE = float(os.getenv("SHARPNESS_REFERENCE", "15000"))

TARGET_WIDTH = int(os.getenv("TARGET_WIDTH", "2200"))

MAX_SCALE = float(os.getenv("MAX_SCALE", "2.5"))

CLEAR_THRESHOLD = float(os.getenv("PHASE03_CLEAR_THRESHOLD", "65.0"))

MODERATE_THRESHOLD = float(os.getenv("PHASE03_MODERATE_THRESHOLD", "45.0"))

SKEW_THRESHOLD_DEGREES = float(os.getenv("PHASE03_SKEW_THRESHOLD_DEGREES", "1.5"))

LOW_CONTRAST_THRESHOLD = float(os.getenv("PHASE03_LOW_CONTRAST_THRESHOLD", "0.40"))

LOW_BRIGHTNESS_THRESHOLD = float(os.getenv("PHASE03_LOW_BRIGHTNESS_THRESHOLD", "0.10"))

HIGH_BRIGHTNESS_THRESHOLD = float(os.getenv("PHASE03_HIGH_BRIGHTNESS_THRESHOLD", "0.95"))

MIN_IMAGE_DIMENSION = int(os.getenv("PHASE03_MIN_IMAGE_DIMENSION", "100"))

READABILITY_GUARD_TOLERANCE = float(os.getenv("PHASE03_READABILITY_GUARD", "0.005"))

BRIGHTNESS_DARK_THRESHOLD = float(os.getenv("BRIGHTNESS_DARK_THRESHOLD", "0.30"))

BRIGHTNESS_BRIGHT_THRESHOLD = float(os.getenv("BRIGHTNESS_BRIGHT_THRESHOLD", "0.95"))

CONTRAST_LOW_THRESHOLD = float(os.getenv("CONTRAST_LOW_THRESHOLD", "0.35"))

SHARPNESS_LOW_THRESHOLD = float(os.getenv("SHARPNESS_LOW_THRESHOLD", "0.55"))

SKEW_MIN_THRESHOLD = float(os.getenv("SKEW_MIN_THRESHOLD", "0.5"))

SKEW_MAX_THRESHOLD = float(os.getenv("SKEW_MAX_THRESHOLD", "7.0"))

MODERATE_SHARPNESS_THRESHOLD = float(os.getenv("MODERATE_SHARPNESS_THRESHOLD", "0.80"))

MODERATE_CONTRAST_THRESHOLD = float(os.getenv("MODERATE_CONTRAST_THRESHOLD", "0.55"))

LOW_UPSCALE_SCALES = tuple(float(s) for s in os.getenv("LOW_UPSCALE_SCALES", "1.5,2.0,2.5,3.0").split(","))

OCR_TARGET_WIDTH = int(os.getenv("OCR_TARGET_WIDTH", "2200"))

MAX_RESTORED_DIM = int(os.getenv("MAX_RESTORED_DIM", "2600"))

READABILITY_WEIGHTS = {
    "character_like_ratio": 0.20,
    "noise_free_ratio": 0.10,
    "local_contrast": 0.10,
    "stroke_width_quality": 0.15,
    "background_uniformity": 0.05,
    "structure_preservation": 0.15,
    "information_preservation": 0.25,
}

MIN_READABILITY_IMPROVEMENT = float(os.getenv("MIN_READABILITY_IMPROVEMENT", "0.01"))

@dataclass
class PageDimensions:
    width: int
    height: int

    def to_dict(self) -> Dict[str, int]:
        return {"width": self.width, "height": self.height}

@dataclass
class PageMetrics:
    sharpness_normalized: float = 0.0
    contrast_normalized: float = 0.0
    brightness_normalized: float = 0.0
    skew_angle_degrees: float = 0.0
    blur_score: float = 0.0
    width: int = 0
    height: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sharpness_normalized": round(self.sharpness_normalized, 4),
            "contrast_normalized": round(self.contrast_normalized, 4),
            "brightness_normalized": round(self.brightness_normalized, 4),
            "skew_angle_degrees": round(self.skew_angle_degrees, 2),
            "blur_score": round(self.blur_score, 2),
            "width": self.width,
            "height": self.height,
        }

@dataclass
class ReadabilityMetrics:
    """OCR-oriented readability of a candidate image.

    These metrics evaluate whether text strokes survive a transformation, not
    merely how many edges the image contains. Character-like connected
    components, stroke width, background uniformity and noise all estimate
    how much recoverable OCR information is present.
    """

    local_contrast: float = 0.0
    text_region_contrast: float = 0.0
    character_like_ratio: float = 0.0
    component_density: float = 0.0
    stroke_width_quality: float = 0.0
    noise_free_ratio: float = 0.0
    background_uniformity: float = 0.0
    structure_preservation: float = 0.0
    information_preservation: float = 0.0
    overall: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "local_contrast": round(self.local_contrast, 4),
            "text_region_contrast": round(self.text_region_contrast, 4),
            "character_like_ratio": round(self.character_like_ratio, 4),
            "component_density": round(self.component_density, 4),
            "stroke_width_quality": round(self.stroke_width_quality, 4),
            "noise_free_ratio": round(self.noise_free_ratio, 4),
            "background_uniformity": round(self.background_uniformity, 4),
            "structure_preservation": round(self.structure_preservation, 4),
            "information_preservation": round(self.information_preservation, 4),
            "overall": round(self.overall, 4),
        }

@dataclass
class RegionOfInterest:
    region_id: str
    region_type: str
    page: int
    bbox: List[int]
    confidence: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "region_id": self.region_id,
            "type": self.region_type,
            "page": self.page,
            "bbox": self.bbox,
            "confidence": round(self.confidence, 4),
        }

@dataclass
class OperationResult:
    operation: str
    applied: bool
    reason: str = ""
    input_metric: Optional[float] = None
    threshold: Optional[float] = None
    before_value: Optional[float] = None
    after_value: Optional[float] = None
    confidence: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "operation": self.operation,
            "applied": self.applied,
            "reason": self.reason,
        }
        if self.input_metric is not None:
            result["input_metric"] = round(self.input_metric, 4)
        if self.threshold is not None:
            result["threshold"] = round(self.threshold, 4)
        if self.before_value is not None:
            result["before_value"] = round(self.before_value, 4)
        if self.after_value is not None:
            result["after_value"] = round(self.after_value, 4)
        if self.confidence > 0:
            result["confidence"] = round(self.confidence, 4)
        return result

@dataclass
class Derivative:
    name: str
    description: str
    image: Image.Image
    metrics: PageMetrics
    operations_applied: List[str]
    is_selected: bool = False
    improvement_score: float = 0.0
    readability: ReadabilityMetrics = field(default_factory=ReadabilityMetrics)
    is_binary: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "metrics": self.metrics.to_dict(),
            "readability": self.readability.to_dict(),
            "operations_applied": self.operations_applied,
            "is_selected": self.is_selected,
            "improvement_score": round(self.improvement_score, 4),
            "is_binary": self.is_binary,
        }

@dataclass
class PageResult:
    page_number: int
    status: PreprocessingStatus
    original_dimensions: PageDimensions
    processed_dimensions: PageDimensions
    operations: List[OperationResult]
    regions_detected: List[RegionOfInterest]
    metrics_before: PageMetrics
    metrics_after: PageMetrics
    output_files: Dict[str, str]
    derivatives: Dict[str, str] = field(default_factory=dict)
    selected_derivative: Optional[str] = None
    improvement_score: float = 0.0
    processing_improvement_sufficient: bool = True
    table_detected: bool = False
    table_bbox: Optional[List[int]] = None
    strategy: str = PreprocessingStrategy.MINIMAL.value
    readability_before: float = 0.0
    readability_after: float = 0.0
    candidate_evaluations: List[Dict[str, Any]] = field(default_factory=list)
    rejected_candidates: List[Dict[str, Any]] = field(default_factory=list)
    # Decision-gated fields (REJECT / MODERATE / CLEAR workflow).
    decision: str = PageDecision.CLEAR.value
    preprocessing_mode: str = PreprocessingMode.UPSCALE_ONLY.value
    quality_score: Optional[float] = None
    quality_source: str = "phase02"
    rejection_reasons: List[str] = field(default_factory=list)
    upscaled: bool = False
    scale_factor: float = 1.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_number": self.page_number,
            "status": self.status.value,
            "strategy": self.strategy,
            "decision": self.decision,
            "preprocessing_mode": self.preprocessing_mode,
            "quality_score": self.quality_score,
            "quality_source": self.quality_source,
            "rejection_reasons": list(self.rejection_reasons),
            "upscaled": self.upscaled,
            "scale_factor": round(self.scale_factor, 4),
            "original_dimensions": self.original_dimensions.to_dict(),
            "processed_dimensions": self.processed_dimensions.to_dict(),
            "operations": [op.to_dict() for op in self.operations],
            "regions_detected": [r.to_dict() for r in self.regions_detected],
            "metrics_before": self.metrics_before.to_dict(),
            "metrics_after": self.metrics_after.to_dict(),
            "output_files": self.output_files,
            "derivatives": self.derivatives,
            "selected_derivative": self.selected_derivative,
            "improvement_score": round(self.improvement_score, 4),
            "processing_improvement_sufficient": self.processing_improvement_sufficient,
            "table_detected": self.table_detected,
            "table_bbox": self.table_bbox,
            "readability_before": round(self.readability_before, 4),
            "readability_after": round(self.readability_after, 4),
            "candidate_evaluations": self.candidate_evaluations,
            "rejected_candidates": self.rejected_candidates,
        }

@dataclass
class PreprocessingResult:
    status: PreprocessingStatus = PreprocessingStatus.SUCCESS
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    phase: str = "AI_DOCUMENT_PREPROCESSING"
    pages_processed: int = 0
    pages: List[PageResult] = field(default_factory=list)
    operations_summary: List[OperationResult] = field(default_factory=list)
    regions_detected_summary: List[RegionOfInterest] = field(default_factory=list)
    output_directory: Optional[str] = None
    next_phase: Optional[str] = "DOCUMENT_CLASSIFICATION"
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    timestamps: Dict[str, str] = field(default_factory=dict)
    strategy: str = PreprocessingStrategy.MINIMAL.value
    # Document-level decision summary (REJECT / MODERATE / CLEAR workflow).
    decision: str = PageDecision.CLEAR.value
    preprocessing_mode: str = PreprocessingMode.UPSCALE_ONLY.value
    quality_score: Optional[float] = None
    quality_source: str = "phase02"
    operations_applied: List[str] = field(default_factory=list)
    operations_skipped: List[str] = field(default_factory=list)
    rejection_reasons: List[str] = field(default_factory=list)
    upscaled: bool = False
    scale_factor: float = 1.0
    source_checksum: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "phase": self.phase,
            "status": self.status.value,
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "pages_processed": self.pages_processed,
            "strategy": self.strategy,
            "decision": self.decision,
            "preprocessing_mode": self.preprocessing_mode,
            "quality_score": self.quality_score,
            "quality_source": self.quality_source,
            "operations_applied": list(self.operations_applied),
            "operations_skipped": list(self.operations_skipped),
            "rejection_reasons": list(self.rejection_reasons),
            "upscaled": self.upscaled,
            "scale_factor": round(self.scale_factor, 4),
            "pages": [p.to_dict() for p in self.pages],
            "operations": [op.to_dict() for op in self.operations_summary],
            "regions_detected": [r.to_dict() for r in self.regions_detected_summary],
            "next_phase": self.next_phase,
            "timestamps": self.timestamps,
        }
        if self.source_checksum:
            result["source_checksum"] = self.source_checksum
        if self.output_directory:
            result["output_directory"] = str(self.output_directory)
        if self.error_code:
            result["error_code"] = self.error_code
        if self.error_message:
            result["error_message"] = self.error_message
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PreprocessingResult":
        """Rebuild a result from a persisted ``to_dict`` payload (replay path).

        Used to prevent unintended repeated enhancement when Phase 03 is
        invoked again for an unchanged source document.
        """
        pages: List[PageResult] = []
        for pdata in data.get("pages", []) or []:
            ops = [
                OperationResult(
                    operation=str(o.get("operation", "")),
                    applied=bool(o.get("applied", False)),
                    reason=str(o.get("reason", "")),
                    input_metric=o.get("input_metric"),
                    threshold=o.get("threshold"),
                    before_value=o.get("before_value"),
                    after_value=o.get("after_value"),
                    confidence=float(o.get("confidence", 0.0) or 0.0),
                )
                for o in (pdata.get("operations", []) or [])
                if isinstance(o, dict)
            ]
            regions = [
                RegionOfInterest(
                    region_id=str(r.get("region_id", "")),
                    region_type=str(r.get("type", "")),
                    page=int(r.get("page", pdata.get("page_number", 1))),
                    bbox=list(r.get("bbox", [])),
                    confidence=float(r.get("confidence", 0.0) or 0.0),
                )
                for r in (pdata.get("regions_detected", []) or [])
                if isinstance(r, dict)
            ]
            odims = pdata.get("original_dimensions", {}) or {}
            pdims = pdata.get("processed_dimensions", {}) or {}
            mbefore = pdata.get("metrics_before", {}) or {}
            mafter = pdata.get("metrics_after", {}) or {}
            pages.append(PageResult(
                page_number=int(pdata.get("page_number", 1)),
                status=PreprocessingStatus(pdata.get("status", "SUCCESS")),
                original_dimensions=PageDimensions(
                    width=int(odims.get("width", 0)), height=int(odims.get("height", 0))),
                processed_dimensions=PageDimensions(
                    width=int(pdims.get("width", 0)), height=int(pdims.get("height", 0))),
                operations=ops,
                regions_detected=regions,
                metrics_before=PageMetrics(
                    sharpness_normalized=float(mbefore.get("sharpness_normalized", 0.0) or 0.0),
                    contrast_normalized=float(mbefore.get("contrast_normalized", 0.0) or 0.0),
                    brightness_normalized=float(mbefore.get("brightness_normalized", 0.0) or 0.0),
                    skew_angle_degrees=float(mbefore.get("skew_angle_degrees", 0.0) or 0.0),
                    blur_score=float(mbefore.get("blur_score", 0.0) or 0.0),
                    width=int(odims.get("width", 0)), height=int(odims.get("height", 0))),
                metrics_after=PageMetrics(
                    sharpness_normalized=float(mafter.get("sharpness_normalized", 0.0) or 0.0),
                    contrast_normalized=float(mafter.get("contrast_normalized", 0.0) or 0.0),
                    brightness_normalized=float(mafter.get("brightness_normalized", 0.0) or 0.0),
                    skew_angle_degrees=float(mafter.get("skew_angle_degrees", 0.0) or 0.0),
                    blur_score=float(mafter.get("blur_score", 0.0) or 0.0),
                    width=int(pdims.get("width", 0)), height=int(pdims.get("height", 0))),
                output_files=dict(pdata.get("output_files", {}) or {}),
                derivatives=dict(pdata.get("derivatives", {}) or {}),
                selected_derivative=pdata.get("selected_derivative"),
                improvement_score=float(pdata.get("improvement_score", 0.0) or 0.0),
                processing_improvement_sufficient=bool(
                    pdata.get("processing_improvement_sufficient", True)),
                table_detected=bool(pdata.get("table_detected", False)),
                table_bbox=pdata.get("table_bbox"),
                strategy=str(pdata.get("strategy", PreprocessingStrategy.MINIMAL.value)),
                readability_before=float(pdata.get("readability_before", 0.0) or 0.0),
                readability_after=float(pdata.get("readability_after", 0.0) or 0.0),
                candidate_evaluations=list(pdata.get("candidate_evaluations", []) or []),
                rejected_candidates=list(pdata.get("rejected_candidates", []) or []),
                decision=str(pdata.get("decision", PageDecision.CLEAR.value)),
                preprocessing_mode=str(pdata.get(
                    "preprocessing_mode", PreprocessingMode.UPSCALE_ONLY.value)),
                quality_score=pdata.get("quality_score"),
                quality_source=str(pdata.get("quality_source", "phase02")),
                rejection_reasons=list(pdata.get("rejection_reasons", []) or []),
                upscaled=bool(pdata.get("upscaled", False)),
                scale_factor=float(pdata.get("scale_factor", 1.0) or 1.0),
            ))
        return cls(
            status=PreprocessingStatus(data.get("status", "SUCCESS")),
            record_id=str(data.get("record_id", "")),
            document_id=str(data.get("document_id", "")),
            ingestion_id=str(data.get("ingestion_id", "")),
            phase=str(data.get("phase", "AI_DOCUMENT_PREPROCESSING")),
            pages_processed=int(data.get("pages_processed", len(pages))),
            pages=pages,
            operations_summary=[
                op for page in pages for op in page.operations
            ],
            regions_detected_summary=[
                region for page in pages for region in page.regions_detected
            ],
            output_directory=data.get("output_directory"),
            next_phase=data.get("next_phase"),
            error_code=data.get("error_code"),
            error_message=data.get("error_message"),
            timestamps=dict(data.get("timestamps", {}) or {}),
            strategy=str(data.get("strategy", PreprocessingStrategy.MINIMAL.value)),
            decision=str(data.get("decision", PageDecision.CLEAR.value)),
            preprocessing_mode=str(data.get(
                "preprocessing_mode", PreprocessingMode.UPSCALE_ONLY.value)),
            quality_score=data.get("quality_score"),
            quality_source=str(data.get("quality_source", "phase02")),
            operations_applied=list(data.get("operations_applied", []) or []),
            operations_skipped=list(data.get("operations_skipped", []) or []),
            rejection_reasons=list(data.get("rejection_reasons", []) or []),
            upscaled=bool(data.get("upscaled", False)),
            scale_factor=float(data.get("scale_factor", 1.0) or 1.0),
            source_checksum=data.get("source_checksum"),
        )
