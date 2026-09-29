"""Decomposed from phase03_ai_document_preprocessing.py: decision. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
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
from .ai_models import *
from .metrics import *

import logging
logger = logging.getLogger(__name__)

class PreprocessingDecisionEngine:
    """Makes preprocessing decisions based on Phase 02 quality metrics."""

    def __init__(self, metrics_calc: ImageMetricsCalculator):
        self.metrics_calc = metrics_calc

    def classify_strategy(
        self,
        sharpness: float,
        contrast: float,
        brightness: float,
    ) -> PreprocessingStrategy:
        """Select a preprocessing strategy from measured deficiencies.

        LOW: dedicated restoration pipeline for degraded documents.
        MODERATE: controlled enhancement (upscaling, conditional sharpening).
        MINIMAL: clear documents get the lightest possible intervention.
        """
        if sharpness < SHARPNESS_LOW_THRESHOLD or contrast < CONTRAST_LOW_THRESHOLD:
            return PreprocessingStrategy.LOW_QUALITY_RESTORATION
        if (
            sharpness < MODERATE_SHARPNESS_THRESHOLD
            or contrast < MODERATE_CONTRAST_THRESHOLD
            or brightness < BRIGHTNESS_DARK_THRESHOLD
            or brightness > BRIGHTNESS_BRIGHT_THRESHOLD
        ):
            return PreprocessingStrategy.MODERATE
        return PreprocessingStrategy.MINIMAL

    def _effective_metrics(
        self,
        original_metrics: PageMetrics,
        phase02_metrics: Optional[Dict[str, Any]],
    ) -> Tuple[float, float, float, float, int]:
        sharpness = original_metrics.sharpness_normalized
        contrast = original_metrics.contrast_normalized
        brightness = original_metrics.brightness_normalized
        skew = original_metrics.skew_angle_degrees
        width = original_metrics.width

        if phase02_metrics:
            if phase02_metrics.get("sharpness_normalized") is not None:
                sharpness = phase02_metrics["sharpness_normalized"]
            if phase02_metrics.get("contrast_normalized") is not None:
                contrast = phase02_metrics["contrast_normalized"]
            if phase02_metrics.get("brightness_normalized") is not None:
                brightness = phase02_metrics["brightness_normalized"]
            if phase02_metrics.get("skew_angle_degrees") is not None:
                skew = phase02_metrics["skew_angle_degrees"]
        return sharpness, contrast, brightness, skew, width

    def build_processing_plan(
        self,
        original_metrics: PageMetrics,
        phase02_metrics: Optional[Dict[str, Any]] = None,
    ) -> List[OperationResult]:
        """Build a processing plan based on measured quality deficiencies."""
        plan: List[OperationResult] = []

        sharpness, contrast, brightness, skew, width = self._effective_metrics(
            original_metrics, phase02_metrics
        )
        strategy = self.classify_strategy(sharpness, contrast, brightness)

        plan.append(OperationResult(
            operation="processing_strategy",
            applied=True,
            reason=(
                f"strategy={strategy.value} sharpness={sharpness:.3f} threshold={SHARPNESS_LOW_THRESHOLD} "
                f"contrast={contrast:.3f} threshold={CONTRAST_LOW_THRESHOLD}"
            ),
            input_metric=sharpness,
            threshold=SHARPNESS_LOW_THRESHOLD,
            confidence=1.0,
        ))

        plan.append(OperationResult(
            operation="brightness_correction",
            applied=brightness < BRIGHTNESS_DARK_THRESHOLD or brightness > BRIGHTNESS_BRIGHT_THRESHOLD,
            reason=f"brightness={brightness:.3f} threshold=[{BRIGHTNESS_DARK_THRESHOLD}, {BRIGHTNESS_BRIGHT_THRESHOLD}]",
            input_metric=brightness,
            threshold=BRIGHTNESS_DARK_THRESHOLD,
        ))

        plan.append(OperationResult(
            operation="deskew",
            applied=abs(skew) >= SKEW_MIN_THRESHOLD and abs(skew) <= SKEW_MAX_THRESHOLD,
            reason=f"skew={skew:.2f}° threshold=[{SKEW_MIN_THRESHOLD}, {SKEW_MAX_THRESHOLD}]",
            input_metric=abs(skew),
            threshold=SKEW_MIN_THRESHOLD,
        ))

        sharpness_is_low = sharpness < SHARPNESS_LOW_THRESHOLD
        plan.append(OperationResult(
            operation="denoising",
            applied=sharpness_is_low,
            reason=f"sharpness={sharpness:.3f} threshold={SHARPNESS_LOW_THRESHOLD}",
            input_metric=sharpness,
            threshold=SHARPNESS_LOW_THRESHOLD,
        ))

        plan.append(OperationResult(
            operation="sharpening",
            applied=sharpness_is_low,
            reason=f"sharpness={sharpness:.3f} threshold={SHARPNESS_LOW_THRESHOLD}",
            input_metric=sharpness,
            threshold=SHARPNESS_LOW_THRESHOLD,
        ))

        contrast_is_low = contrast < CONTRAST_LOW_THRESHOLD
        plan.append(OperationResult(
            operation="contrast_enhancement",
            applied=contrast_is_low,
            reason=f"contrast={contrast:.3f} threshold={CONTRAST_LOW_THRESHOLD}",
            input_metric=contrast,
            threshold=CONTRAST_LOW_THRESHOLD,
        ))

        needs_upscale = width < TARGET_WIDTH
        plan.append(OperationResult(
            operation="upscale",
            applied=needs_upscale,
            reason=f"width={width} target={TARGET_WIDTH}",
            input_metric=float(width),
            threshold=float(TARGET_WIDTH),
        ))

        plan.append(OperationResult(
            operation="binarization",
            applied=sharpness_is_low or contrast_is_low,
            reason=f"binarization candidates generated for low-quality docs "
                   f"(sharpness={sharpness:.3f}, contrast={contrast:.3f})",
            input_metric=sharpness,
            threshold=SHARPNESS_LOW_THRESHOLD,
        ))

        if strategy == PreprocessingStrategy.LOW_QUALITY_RESTORATION:
            plan.append(OperationResult(
                operation="background_correction",
                applied=True,
                reason="LOW strategy: estimate paper/illumination background and correct it",
                confidence=1.0,
            ))
            plan.append(OperationResult(
                operation="candidate_evaluation",
                applied=True,
                reason="LOW strategy: generate and OCR-score multiple restoration candidates",
                confidence=1.0,
            ))

        return plan

    # -- Decision-gated workflow (REJECT / MODERATE / CLEAR) -----------------
    # Consumes Phase 02 quality output; never invents its own quality score.

    @staticmethod
    def extract_page_quality(
        quality_result: Optional[Dict[str, Any]],
        page_number: int,
    ) -> Optional[Dict[str, Any]]:
        """Pull the Phase 02 page entry for a 1-based page number.

        Handles the ``QualityCheckResult.to_dict()`` shape:
        ``pages[].{page_number, status, quality.quality_score, checks, issues}``.
        Returns None when Phase 02 data for the page is unavailable.
        """
        if not quality_result:
            return None
        for qpage in quality_result.get("pages", []) or []:
            if not isinstance(qpage, dict):
                continue
            if int(qpage.get("page_number", -1)) == page_number:
                quality = qpage.get("quality", {}) or {}
                return {
                    "score": quality.get("quality_score"),
                    "status": qpage.get("status"),
                    "checks": qpage.get("checks", {}) or {},
                    "issues": qpage.get("issues", []) or [],
                    "quality": quality,
                }
        return None

    @staticmethod
    def document_quality_score(quality_result: Optional[Dict[str, Any]]) -> Optional[float]:
        """Document-level Phase 02 score (``quality.quality_score``, 0-100)."""
        if not quality_result:
            return None
        quality = quality_result.get("quality", {}) or {}
        score = quality.get("quality_score")
        return float(score) if score is not None else None

    @staticmethod
    def detect_critical_failures(
        checks: Dict[str, Any],
        issues: List[Dict[str, Any]],
        width: int,
        height: int,
        sharpness: float,
        brightness: float,
    ) -> List[str]:
        """Deterministic critical-failure scan -> rejection reasons.

        A condition is critical only when Phase 02 flags it as such
        (FAIL / ERROR / unreadable / blank) or the image is provably
        undecodable-by-size. Imperfect-but-usable pages are never rejected.
        """
        reasons: List[str] = []

        def _has_issue(code: str, severities: Tuple[str, ...] = ("ERROR",)) -> bool:
            for issue in issues or []:
                if not isinstance(issue, dict):
                    continue
                if issue.get("code") == code and str(issue.get("severity", "")).upper() in severities:
                    return True
            return False

        if min(width, height) < MIN_IMAGE_DIMENSION:
            reasons.append(RejectionReason.LOW_RESOLUTION.value)
        if checks.get("resolution") == "FAIL" or _has_issue("LOW_RESOLUTION"):
            if RejectionReason.LOW_RESOLUTION.value not in reasons:
                reasons.append(RejectionReason.LOW_RESOLUTION.value)
        if checks.get("blank") is True or _has_issue("BLANK_PAGE", ("ERROR", "WARNING")):
            reasons.append(RejectionReason.BLANK_PAGE.value)
        if checks.get("readable") is False:
            reasons.append(RejectionReason.UNREADABLE_DOCUMENT.value)
        if checks.get("cropping") == "FAIL":
            reasons.append(RejectionReason.SEVERE_CROPPING.value)
        if checks.get("blur") == "FAIL" and sharpness < 0.20:
            reasons.append(RejectionReason.SEVERE_BLUR.value)
        if checks.get("brightness") == "FAIL":
            if brightness < LOW_BRIGHTNESS_THRESHOLD or _has_issue("TOO_DARK"):
                reasons.append(RejectionReason.EXTREME_DARKNESS.value)
            elif brightness > HIGH_BRIGHTNESS_THRESHOLD or _has_issue("TOO_BRIGHT"):
                reasons.append(RejectionReason.EXTREME_OVEREXPOSURE.value)

        return reasons

    @staticmethod
    def decide_quality_band(
        score: Optional[float],
        critical_reasons: List[str],
    ) -> Tuple[PageDecision, PreprocessingMode, List[str]]:
        """Map Phase 02 score + critical failures to (decision, mode, reasons).

        Bands (single source of truth — CLEAR_THRESHOLD / MODERATE_THRESHOLD):
            critical failure  -> REJECT / NONE
            score < 45        -> REJECT / NONE (+ QUALITY_SCORE_BELOW_THRESHOLD)
            score >= 65       -> CLEAR  / UPSCALE_ONLY
            else              -> MODERATE / SELECTIVE_ENHANCEMENT
            score unknown     -> MODERATE / SELECTIVE_ENHANCEMENT is NOT
                                 allowed (no invented scores); caller treats
                                 missing Phase 02 output as a technical failure.
        """
        reasons = list(critical_reasons)
        if reasons:
            return PageDecision.REJECT, PreprocessingMode.NONE, reasons
        if score is None:
            return PageDecision.REJECT, PreprocessingMode.NONE, [
                RejectionReason.UNREADABLE_DOCUMENT.value
            ]
        if score < MODERATE_THRESHOLD:
            reasons.append(RejectionReason.QUALITY_SCORE_BELOW_THRESHOLD.value)
            return PageDecision.REJECT, PreprocessingMode.NONE, reasons
        if score >= CLEAR_THRESHOLD:
            return PageDecision.CLEAR, PreprocessingMode.UPSCALE_ONLY, []
        return PageDecision.MODERATE, PreprocessingMode.SELECTIVE_ENHANCEMENT, []

    def select_moderate_operations(
        self,
        sharpness: float,
        contrast: float,
        brightness: float,
        skew: float,
    ) -> List[OperationResult]:
        """Selective MODERATE plan: only metric-justified operations.

        Order is stable: DESKEW -> BRIGHTNESS -> CONTRAST -> DENOISE ->
        SHARPEN. No binarization, no morphological processing, no aggressive
        enhancement — every applied op cites its input metric + threshold.
        """
        plan: List[OperationResult] = []

        deskew_needed = abs(skew) > SKEW_THRESHOLD_DEGREES
        plan.append(OperationResult(
            operation="DESKEW",
            applied=deskew_needed,
            reason=f"skew={skew:.2f}deg threshold={SKEW_THRESHOLD_DEGREES}deg",
            input_metric=abs(skew),
            threshold=SKEW_THRESHOLD_DEGREES,
        ))

        bright_needed = brightness < LOW_BRIGHTNESS_THRESHOLD or brightness > HIGH_BRIGHTNESS_THRESHOLD
        plan.append(OperationResult(
            operation="BRIGHTNESS_CORRECTION",
            applied=bright_needed,
            reason=(
                f"brightness={brightness:.3f} "
                f"band=[{LOW_BRIGHTNESS_THRESHOLD}, {HIGH_BRIGHTNESS_THRESHOLD}]"
            ),
            input_metric=brightness,
            threshold=LOW_BRIGHTNESS_THRESHOLD if brightness < LOW_BRIGHTNESS_THRESHOLD else HIGH_BRIGHTNESS_THRESHOLD,
        ))

        contrast_needed = contrast < LOW_CONTRAST_THRESHOLD
        plan.append(OperationResult(
            operation="CONTRAST_ENHANCEMENT",
            applied=contrast_needed,
            reason=f"contrast={contrast:.3f} threshold={LOW_CONTRAST_THRESHOLD} (mild CLAHE)",
            input_metric=contrast,
            threshold=LOW_CONTRAST_THRESHOLD,
        ))

        blur_recoverable = sharpness < SHARPNESS_LOW_THRESHOLD
        plan.append(OperationResult(
            operation="DENOISE",
            applied=blur_recoverable,
            reason=f"sharpness={sharpness:.3f} threshold={SHARPNESS_LOW_THRESHOLD} (edge-preserving bilateral)",
            input_metric=sharpness,
            threshold=SHARPNESS_LOW_THRESHOLD,
        ))
        plan.append(OperationResult(
            operation="SHARPEN",
            applied=blur_recoverable,
            reason=f"sharpness={sharpness:.3f} threshold={SHARPNESS_LOW_THRESHOLD} (conservative unsharp 0.35)",
            input_metric=sharpness,
            threshold=SHARPNESS_LOW_THRESHOLD,
        ))
        return plan

    def should_skip_enhancement(
        self,
        original_metrics: PageMetrics,
        final_metrics: PageMetrics,
    ) -> bool:
        """Determine if preprocessing actually improved the document."""
        sharp_improved = final_metrics.sharpness_normalized >= original_metrics.sharpness_normalized * 0.9
        contrast_improved = final_metrics.contrast_normalized >= original_metrics.contrast_normalized * 0.9
        brightness_ok = (
            BRIGHTNESS_DARK_THRESHOLD <= final_metrics.brightness_normalized <= BRIGHTNESS_BRIGHT_THRESHOLD
            or abs(final_metrics.brightness_normalized - original_metrics.brightness_normalized) < 0.1
        )
        return not (sharp_improved or contrast_improved) or not brightness_ok
