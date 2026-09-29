"""Decomposed from phase02_quality_check.py: service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
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
from .models import *
from .metrics import *
from .loaders import *

import logging
logger = logging.getLogger(__name__)

class DocumentQualityCheckService:
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or (APP_DIR / "uploads" / "originals")
        self.analyzer = ImageQualityAnalyzer()

    def find_source_document(self, ingestion_id: str) -> Optional[Path]:
        if not self.storage_dir.exists():
            return None

        for ext in SUPPORTED_EXTENSIONS:
            path = self.storage_dir / f"{ingestion_id}{ext}"
            if path.exists():
                return path

        return None

    def check_quality(self, record_id: str, document_id: str, ingestion_id: str) -> QualityCheckResult:
        started_at = datetime.now().isoformat()
        result = QualityCheckResult(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            timestamps={"started_at": started_at}
        )

        try:
            source_path = self.find_source_document(ingestion_id)
            if not source_path:
                result.status = "FAILED"
                result.error_code = Phase02ErrorCode.SOURCE_NOT_FOUND.value
                result.error_message = f"Source document not found for ingestion ID: {ingestion_id}"
                result.timestamps["completed_at"] = datetime.now().isoformat()
                return result

            suffix = source_path.suffix.lower()

            if suffix == ".pdf":
                pages_data = PDFPageLoader.load_pdf_pages(source_path, dpi=300)
            else:
                pages_data = ImagePageLoader.load_image_pages(source_path)

            if not pages_data:
                result.status = "FAILED"
                result.error_code = Phase02ErrorCode.SOURCE_UNREADABLE.value
                result.error_message = "Could not render any pages from the source document"
                result.timestamps["completed_at"] = datetime.now().isoformat()
                return result

            result.document_info = {
                "filename": source_path.name,
                "page_count": len(pages_data)
            }

            page_results: List[PageResult] = []
            all_issues: List[PageIssue] = []
            pages_passed = 0
            pages_warning = 0
            pages_failed = 0

            for page_num, img_array, dimensions in pages_data:
                page_result = self._analyze_page(page_num, img_array, dimensions)
                page_results.append(page_result)

                if page_result.status == QualityStatus.PASS:
                    pages_passed += 1
                elif page_result.status == QualityStatus.WARNING:
                    pages_warning += 1
                else:
                    pages_failed += 1

                all_issues.extend(page_result.issues)

            blank_count = sum(1 for p in page_results if p.checks.blank)
            unreadable_count = sum(1 for p in page_results if not p.checks.readable)

            overall_score = self._calculate_overall_score(page_results)

            material_warnings = 0
            for p in page_results:
                if p.status == QualityStatus.WARNING:
                    if (p.checks.blur_status == QualityStatus.WARNING or
                        p.checks.contrast_status == QualityStatus.WARNING or
                        p.checks.brightness_status == QualityStatus.WARNING):
                        material_warnings += 1

            if pages_failed > 0:
                overall_status = DocumentQualityStatus.FAIL
            elif material_warnings > 0:
                overall_status = DocumentQualityStatus.REVIEW_REQUIRED
            else:
                overall_status = DocumentQualityStatus.PASS

            if pages_failed > 0 or unreadable_count > 0:
                processing_readiness = ProcessingReadiness.BLOCKED
            elif pages_warning > 0:
                processing_readiness = ProcessingReadiness.READY_WITH_WARNINGS
            else:
                processing_readiness = ProcessingReadiness.READY

            if unreadable_count > 0:
                completeness_status = QualityStatus.FAIL
            elif blank_count > 0:
                completeness_status = QualityStatus.WARNING
            else:
                completeness_status = QualityStatus.PASS

            result.pages = page_results
            result.issues = all_issues
            result.quality = DocumentQuality(
                overall_status=overall_status,
                processing_readiness=processing_readiness,
                quality_score=overall_score,
                pages_passed=pages_passed,
                pages_warning=pages_warning,
                pages_failed=pages_failed,
            )
            result.completeness = DocumentCompleteness(
                status=completeness_status,
                pages_accounted_for=True,
                rendering_complete=unreadable_count == 0,
                blank_pages_detected=blank_count,
                unreadable_pages=unreadable_count,
            )

            # Execution status vs quality verdict (M12): a completed assessment
            # is always SUCCESS, even when the verdict is FAIL/BLOCKED — the
            # verdict lives in quality.overall_status / processing_readiness
            # and next_phase=None. FAILED is reserved for execution failures
            # (source missing/unreadable, exceptions) so the frontend can
            # display a poor-quality verdict instead of crashing on HTTP 400.
            if overall_status == DocumentQualityStatus.FAIL:
                result.status = "SUCCESS"
                result.next_phase = None
            else:
                result.status = "SUCCESS"
                result.next_phase = "AI_DOCUMENT_PREPROCESSING"

            result.timestamps["completed_at"] = datetime.now().isoformat()

            logger.info(
                f"Quality check completed for {document_id}: "
                f"score={overall_score:.1f}, status={overall_status.value}, "
                f"readiness={processing_readiness.value}, "
                f"passed={pages_passed}, warning={pages_warning}, failed={pages_failed}"
            )

            return result

        except Exception as e:
            logger.exception(f"Quality check failed for {document_id}: {e}")
            result.status = "FAILED"
            result.error_code = Phase02ErrorCode.UNKNOWN_ERROR.value
            result.error_message = str(e)
            result.timestamps["completed_at"] = datetime.now().isoformat()
            return result

    def _analyze_page(self, page_num: int, img_array: np.ndarray, dimensions: Tuple[int, int]) -> PageResult:
        issues: List[PageIssue] = []
        width, height = dimensions

        blur_score = self.analyzer.compute_blur_score(img_array)
        brightness_score = self.analyzer.compute_brightness_score(img_array)
        contrast_score = self.analyzer.compute_contrast_score(img_array)
        contrast_simple = self.analyzer.compute_contrast_score_simple(img_array)
        skew_angle = self.analyzer.compute_skew_angle(img_array)
        content_ratio = self.analyzer.compute_content_ratio(img_array)
        readability_score = self.analyzer.compute_readability_score(img_array)

        resolution_status, _ = self.analyzer.check_resolution(dimensions)

        sharpness_normalized = min(math.log(1 + blur_score) / math.log(1 + SHARPNESS_REFERENCE), 1.0)
        blur_status = self.analyzer.check_blur(blur_score, sharpness_normalized)
        brightness_status = self.analyzer.check_brightness(brightness_score)
        contrast_status = self.analyzer.check_contrast(contrast_score, contrast_simple)
        skew_status = self.analyzer.check_skew(skew_angle)
        is_blank, _ = self.analyzer.check_blank(content_ratio)

        checks = PageChecks(
            readable=True,
            blank=is_blank,
            resolution_status=resolution_status,
            blur_status=blur_status,
            brightness_status=brightness_status,
            contrast_status=contrast_status,
            skew_status=skew_status,
            cropping_status=QualityStatus.PASS,
        )

        if is_blank:
            issues.append(PageIssue(
                severity="WARNING",
                code="BLANK_PAGE",
                message="Page appears to be blank or nearly blank",
                page=page_num
            ))

        if resolution_status != QualityStatus.PASS:
            issues.append(PageIssue(
                severity="ERROR" if resolution_status == QualityStatus.FAIL else "WARNING",
                code="LOW_RESOLUTION",
                message=f"Page resolution is below acceptable threshold: {width}x{height}",
                page=page_num
            ))
            if resolution_status == QualityStatus.FAIL:
                checks.readable = False

        if blur_status != QualityStatus.PASS:
            issues.append(PageIssue(
                severity="WARNING",
                code="LOW_SHARPNESS",
                message=f"Page appears blurred (sharpness: {sharpness_normalized:.2f})",
                page=page_num
            ))

        if brightness_status != QualityStatus.PASS:
            severity = "ERROR" if brightness_status == QualityStatus.FAIL else "WARNING"
            code = "TOO_DARK" if brightness_score < BRIGHTNESS_DARK_THRESHOLD else "TOO_BRIGHT"
            issues.append(PageIssue(
                severity=severity,
                code=code,
                message=f"Page brightness is outside acceptable range: {brightness_score:.3f}",
                page=page_num
            ))

        if contrast_status != QualityStatus.PASS:
            issues.append(PageIssue(
                severity="WARNING",
                code="LOW_CONTRAST",
                message=f"Page contrast is below acceptable threshold: {contrast_score:.3f}",
                page=page_num
            ))

        if skew_status != QualityStatus.PASS:
            issues.append(PageIssue(
                severity="WARNING",
                code="SKEW_DETECTED",
                message=f"Page appears skewed: {skew_angle:.1f} degrees",
                page=page_num
            ))

        page_score, normalized_metrics = self._calculate_page_score(
            blur_score, brightness_score, contrast_score, contrast_simple,
            skew_angle, content_ratio, sharpness_normalized,
            readability_score, width, height, checks.readable
        )

        page_status = QualityStatus.PASS
        if checks.readable is False:
            page_status = QualityStatus.FAIL
        elif any(s == QualityStatus.FAIL for s in [
            resolution_status, blur_status, brightness_status, contrast_status, skew_status
        ]):
            page_status = QualityStatus.FAIL
        elif any(s == QualityStatus.WARNING for s in [
            resolution_status, blur_status, brightness_status, contrast_status, skew_status
        ]):
            page_status = QualityStatus.WARNING

        return PageResult(
            page_number=page_num,
            status=page_status,
            dimensions=PageDimensions(width=width, height=height),
            quality=PageQualityMetrics(
                quality_score=page_score,
                blur_score=blur_score,
                brightness_score=brightness_score,
                contrast_score=contrast_score,
                skew_angle_degrees=skew_angle,
                content_ratio=content_ratio,
                sharpness_normalized=normalized_metrics["sharpness"],
                contrast_normalized=normalized_metrics["contrast"],
                brightness_normalized=normalized_metrics["brightness"],
                skew_normalized=normalized_metrics["skew"],
                resolution_normalized=normalized_metrics["resolution"],
                readability_score=normalized_metrics["readability"],
            ),
            checks=checks,
            issues=issues,
        )

    def _calculate_page_score(
        self,
        blur_score: float,
        brightness_score: float,
        contrast_score: float,
        contrast_simple: float,
        skew_angle: float,
        content_ratio: float,
        sharpness_normalized: float,
        readability_score: float,
        width: int,
        height: int,
        readable: bool,
    ) -> Tuple[float, Dict[str, float]]:
        if not readable:
            return 0.0, {}

        min_dim = min(width, height)
        max_dim = max(width, height)

        if min_dim < RESOLUTION_FAIL_WIDTH or max_dim < RESOLUTION_FAIL_HEIGHT:
            resolution_normalized = 0.3
        elif min_dim < RESOLUTION_WARN_WIDTH or max_dim < RESOLUTION_WARN_HEIGHT:
            resolution_normalized = 0.7
        else:
            resolution_normalized = 1.0

        if brightness_score < BRIGHTNESS_DARK_THRESHOLD:
            brightness_normalized = 0.5
        elif brightness_score > BRIGHTNESS_BRIGHT_THRESHOLD:
            brightness_normalized = 0.7
        else:
            brightness_normalized = 1.0

        combined_contrast = (contrast_score + contrast_simple) / 2
        contrast_normalized = min(combined_contrast / 0.4, 1.0)

        skew_normalized = 1.0 - min(abs(skew_angle) / 15.0, 1.0)

        readability_normalized = min(max(readability_score / 100.0, 0.0), 1.0)

        weights = QUALITY_WEIGHTS

        score = (
            readability_normalized * weights["readability"] +
            sharpness_normalized * weights["sharpness"] +
            contrast_normalized * weights["contrast"] +
            resolution_normalized * weights["resolution"] +
            brightness_normalized * weights["brightness"] +
            skew_normalized * weights["skew"]
        ) * 100

        normalized_metrics = {
            "sharpness": sharpness_normalized,
            "contrast": contrast_normalized,
            "brightness": brightness_normalized,
            "skew": skew_normalized,
            "resolution": resolution_normalized,
            "readability": readability_normalized,
        }

        return max(0.0, min(100.0, score)), normalized_metrics

    def _calculate_overall_score(self, page_results: List[PageResult]) -> float:
        if not page_results:
            return 0.0

        total_score = sum(p.quality.quality_score for p in page_results)
        avg_score = total_score / len(page_results)

        failed_count = sum(1 for p in page_results if p.status == QualityStatus.FAIL)
        warning_count = sum(1 for p in page_results if p.status == QualityStatus.WARNING)

        penalty = (failed_count * 15 + warning_count * 5) / max(len(page_results), 1)
        final_score = avg_score - penalty

        return max(0.0, min(100.0, final_score))

_quality_service: Optional[DocumentQualityCheckService] = None

def get_quality_service() -> DocumentQualityCheckService:
    global _quality_service
    if _quality_service is None:
        _quality_service = DocumentQualityCheckService()
    return _quality_service
