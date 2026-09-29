"""Decomposed from phase03_ai_document_preprocessing.py: ai_service. (Authoritative implementation; verbatim move.)"""
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
from .ai_models import *
from .metrics import *
from .decision import *
from .image_ops import *
from .layout import *
from .restoration import *

import logging
logger = logging.getLogger(__name__)

class AIDocumentPreprocessingService:
    """Main service for Phase 03 AI Document Preprocessing."""

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or (APP_DIR / "uploads" / "originals")
        self.processing_dir = PROCESSING_STORAGE_DIR
        self.evidence_dir = EVIDENCE_STORAGE_DIR
        self.processing_dir.mkdir(parents=True, exist_ok=True)
        self.evidence_dir.mkdir(parents=True, exist_ok=True)

        self.metrics_calc = ImageMetricsCalculator()
        self.decision_engine = PreprocessingDecisionEngine(self.metrics_calc)
        self.processor = ImageProcessor(self.metrics_calc)
        self.region_detector = LayoutAndRegionDetector(self.metrics_calc)
        self.restoration_pipeline = LowQualityRestorationPipeline(self.processor, self.metrics_calc)

    def _find_source_file(self, ingestion_id: str) -> Optional[Path]:
        if not self.storage_dir.exists():
            return None
        for ext in SUPPORTED_EXTENSIONS:
            path = self.storage_dir / f"{ingestion_id}{ext}"
            if path.exists():
                return path
        return None

    def _render_pdf_page(self, path: Path, page_num: int = 0) -> Image.Image:
        import io
        import pymupdf as fitz
        doc = fitz.open(str(path))
        if page_num >= len(doc):
            doc.close()
            raise ValueError(f"Page {page_num} does not exist in PDF")
        page = doc[page_num]
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        doc.close()
        img_data = pix.tobytes("png")
        return Image.open(io.BytesIO(img_data)).convert("RGB")

    def _save_image(self, img: Image.Image, path: Path) -> str:
        path.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(path), "PNG")
        return str(path)

    def _build_derivative_dict(self, derived: Derivative, original_readability: float) -> Dict[str, Any]:
        return {
            "name": derived.name,
            "description": derived.description,
            "readability": derived.readability.to_dict(),
            "readability_delta": round(derived.readability.overall - original_readability, 4),
            "metrics": derived.metrics.to_dict(),
            "operations_applied": derived.operations_applied,
            "is_binary": derived.is_binary,
            "is_selected": derived.is_selected,
            "improvement_score": round(derived.improvement_score, 4),
        }

    def _select_best_derivative(
        self,
        derivatives: Dict[str, Derivative],
        original_name: str,
        original_readability: float,
    ) -> Tuple[str, float, bool, List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Select the best derivative using OCR-oriented readability.

        Returns (best_name, improvement_score, improvement_sufficient,
                 candidate_evaluations, rejected_candidates).

        Rejection logic:
        - A binary candidate is rejected if its readability is materially below
          the best grayscale candidate (binarization may have destroyed strokes).
        - Any candidate below the original readability is rejected (fallback).
        """
        candidates: List[Derivative] = []
        for name, deriv in derivatives.items():
            if name == original_name:
                continue
            deriv.improvement_score = deriv.readability.overall - original_readability
            candidates.append(deriv)

        candidate_evaluations = []
        rejected: List[Dict[str, Any]] = []

        for deriv in candidates:
            entry = self._build_derivative_dict(deriv, original_readability)
            candidate_evaluations.append(entry)

        if not candidates:
            return original_name, 0.0, False, candidate_evaluations, rejected

        best_grayscale = None
        for deriv in candidates:
            if not deriv.is_binary:
                if best_grayscale is None or deriv.readability.overall > best_grayscale.readability.overall:
                    best_grayscale = deriv

        sorted_candidates = sorted(candidates, key=lambda d: d.readability.overall, reverse=True)
        best = sorted_candidates[0]

        selected = best
        if best.is_binary and best_grayscale is not None:
            if best.readability.overall < best_grayscale.readability.overall - 0.05:
                rejected.append({
                    "name": best.name,
                    "reason": (
                        f"binary candidate readability {best.readability.overall:.4f} is below best "
                        f"grayscale {best_grayscale.readability.overall:.4f}; binarization likely "
                        f"destroyed faint character strokes"
                    ),
                    "readability": best.readability.to_dict(),
                })
                selected = best_grayscale

        improvement_score = selected.readability.overall - original_readability
        if improvement_score <= MIN_READABILITY_IMPROVEMENT:
            rejected.append({
                "name": selected.name,
                "reason": (
                    f"candidate readability {selected.readability.overall:.4f} does not improve on "
                    f"original {original_readability:.4f}; falling back to original"
                ),
                "readability": selected.readability.to_dict(),
            })
            selected = None
            improvement_score = 0.0

        if selected is not None:
            selected.is_selected = True
            candidate_evaluations = [
                {
                    **entry,
                    "is_selected": entry["name"] == selected.name,
                }
                for entry in candidate_evaluations
            ]
            return selected.name, improvement_score, improvement_score > 0.02, candidate_evaluations, rejected

        return original_name, 0.0, False, candidate_evaluations, rejected

    def _generate_standard_derivatives(
        self,
        original: Image.Image,
        original_metrics: PageMetrics,
        plan: List[OperationResult],
    ) -> Dict[str, Derivative]:
        """Generate derivatives for CLEAR / MEDIUM strategy (minimal intervention)."""
        derivatives: Dict[str, Derivative] = {}
        original_bgr = cv2.cvtColor(np.array(original), cv2.COLOR_RGB2BGR)
        original_readability = self.metrics_calc.compute_readability_metrics(original_bgr)

        derivatives["original"] = Derivative(
            name="original",
            description="Unmodified source",
            image=original,
            metrics=original_metrics,
            operations_applied=[],
            readability=original_readability,
        )

        original_array = cv2.cvtColor(np.array(original), cv2.COLOR_RGB2BGR)
        plan_dict = {op.operation: op for op in plan}

        enhanced = original_array.copy()
        operations_applied = []

        if plan_dict.get("brightness_correction", OperationResult(operation="x", applied=False)).applied:
            enhanced = self.processor.correct_brightness(enhanced, original_metrics.brightness_normalized)
            operations_applied.append("brightness_correction")

        if plan_dict.get("denoising", OperationResult(operation="x", applied=False)).applied:
            enhanced = self.processor.denoise(enhanced)
            operations_applied.append("denoising")

        if plan_dict.get("contrast_enhancement", OperationResult(operation="x", applied=False)).applied:
            enhanced = self.processor.apply_clahe(enhanced)
            operations_applied.append("contrast_enhancement")

        if plan_dict.get("sharpening", OperationResult(operation="x", applied=False)).applied:
            enhanced = self.processor.sharpen(enhanced)
            operations_applied.append("sharpening")

        if plan_dict.get("deskew", OperationResult(operation="x", applied=False)).applied:
            enhanced = self.processor.deskew(enhanced, original_metrics.skew_angle_degrees)
            operations_applied.append("deskew")

        if operations_applied:
            enhanced_img = Image.fromarray(cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB))
            enhanced_metrics = self.metrics_calc.compute_all_metrics(enhanced_img)
            enhanced_readability = self.metrics_calc.compute_readability_metrics(enhanced)
            derivatives["enhanced"] = Derivative(
                name="enhanced",
                description="Full preprocessing pipeline",
                image=enhanced_img,
                metrics=enhanced_metrics,
                operations_applied=operations_applied,
                readability=enhanced_readability,
            )

        if plan_dict.get("upscale", OperationResult(operation="x", applied=False)).applied:
            upscaled, _ = self.processor.upscale(enhanced, target_width=TARGET_WIDTH)
            upscaled_img = Image.fromarray(cv2.cvtColor(upscaled, cv2.COLOR_BGR2RGB))
            upscaled_metrics = self.metrics_calc.compute_all_metrics(upscaled_img)
            upscaled_readability = self.metrics_calc.compute_readability_metrics(upscaled)
            derivatives["upscaled"] = Derivative(
                name="upscaled",
                description="Enhanced + upscaled for OCR",
                image=upscaled_img,
                metrics=upscaled_metrics,
                operations_applied=operations_applied + ["upscale"],
                readability=upscaled_readability,
            )

        if plan_dict.get("binarization", OperationResult(operation="x", applied=False)).applied:
            binarized = self.processor.gray2bgr(self.processor.binarize(enhanced))
            binarized_img = Image.fromarray(cv2.cvtColor(binarized, cv2.COLOR_BGR2RGB))
            binarized_metrics = self.metrics_calc.compute_all_metrics(binarized_img)
            binarized_readability = self.metrics_calc.compute_readability_metrics(binarized)
            derivatives["binarized"] = Derivative(
                name="binarized",
                description="Adaptive threshold binarization",
                image=binarized_img,
                metrics=binarized_metrics,
                operations_applied=operations_applied + ["binarization"],
                readability=binarized_readability,
                is_binary=True,
            )

        return derivatives

    def _generate_low_restoration_derivatives(
        self,
        original: Image.Image,
        original_metrics: PageMetrics,
    ) -> Dict[str, Derivative]:
        """Generate the full LOW restoration candidate set."""
        derivatives: Dict[str, Derivative] = {}
        original_bgr = cv2.cvtColor(np.array(original), cv2.COLOR_RGB2BGR)
        original_readability = self.metrics_calc.compute_readability_metrics(original_bgr)

        derivatives["original"] = Derivative(
            name="original",
            description="Unmodified source",
            image=original,
            metrics=original_metrics,
            operations_applied=[],
            readability=original_readability,
        )

        gray = cv2.cvtColor(original_bgr, cv2.COLOR_BGR2GRAY)
        for candidate in self.restoration_pipeline.build_candidates(original, gray):
            derivatives[candidate.name] = candidate

        return derivatives

    def _selective_enhance(
        self,
        upscaled_bgr: np.ndarray,
        sharpness: float,
        contrast: float,
        brightness: float,
        skew: float,
    ) -> Tuple[np.ndarray, List[OperationResult], List[str]]:
        """Apply the stable MODERATE sequence. Returns (image, op log, applied names).

        Order: DESKEW -> BRIGHTNESS_CORRECTION -> CONTRAST_ENHANCEMENT ->
        DENOISE -> SHARPEN. Every step is conservative to protect printed /
        handwritten characters, table lines, seals, stamps and signatures.
        """
        img = upscaled_bgr.copy()
        operations: List[OperationResult] = []
        applied: List[str] = []

        plan = self.decision_engine.select_moderate_operations(
            sharpness, contrast, brightness, skew
        )
        wanted = {op.operation: op for op in plan if op.applied}

        if "DESKEW" in wanted:
            img = self.processor.deskew(img, skew)
            applied.append("DESKEW")
        operations.append(OperationResult(
            operation="DESKEW", applied="DESKEW" in wanted,
            reason=f"skew={skew:.2f}deg threshold={SKEW_THRESHOLD_DEGREES}deg",
            input_metric=abs(skew), threshold=SKEW_THRESHOLD_DEGREES,
        ))

        if "BRIGHTNESS_CORRECTION" in wanted:
            img = self.processor.correct_brightness(img, brightness)
            applied.append("BRIGHTNESS_CORRECTION")
        operations.append(OperationResult(
            operation="BRIGHTNESS_CORRECTION", applied="BRIGHTNESS_CORRECTION" in wanted,
            reason=f"brightness={brightness:.3f} band=[{LOW_BRIGHTNESS_THRESHOLD}, {HIGH_BRIGHTNESS_THRESHOLD}]",
            input_metric=brightness,
            threshold=LOW_BRIGHTNESS_THRESHOLD if brightness < LOW_BRIGHTNESS_THRESHOLD else HIGH_BRIGHTNESS_THRESHOLD,
        ))

        if "CONTRAST_ENHANCEMENT" in wanted:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            img = self.processor.gray2bgr(self.processor.apply_clahe(gray, clip_limit=1.5, tile=8))
            applied.append("CONTRAST_ENHANCEMENT")
        operations.append(OperationResult(
            operation="CONTRAST_ENHANCEMENT", applied="CONTRAST_ENHANCEMENT" in wanted,
            reason=f"contrast={contrast:.3f} threshold={LOW_CONTRAST_THRESHOLD} (mild CLAHE 1.5)",
            input_metric=contrast, threshold=LOW_CONTRAST_THRESHOLD,
        ))

        if "DENOISE" in wanted:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            img = self.processor.gray2bgr(self.processor.denoise_bilateral(gray, d=5, sigma_color=15.0))
            applied.append("DENOISE")
        operations.append(OperationResult(
            operation="DENOISE", applied="DENOISE" in wanted,
            reason=f"sharpness={sharpness:.3f} threshold={SHARPNESS_LOW_THRESHOLD} (edge-preserving bilateral)",
            input_metric=sharpness, threshold=SHARPNESS_LOW_THRESHOLD,
        ))

        if "SHARPEN" in wanted:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            img = self.processor.gray2bgr(self.processor.sharpen(gray, amount=0.35, sigma=1.0))
            applied.append("SHARPEN")
        operations.append(OperationResult(
            operation="SHARPEN", applied="SHARPEN" in wanted,
            reason=f"sharpness={sharpness:.3f} threshold={SHARPNESS_LOW_THRESHOLD} (conservative unsharp 0.35)",
            input_metric=sharpness, threshold=SHARPNESS_LOW_THRESHOLD,
        ))

        img = np.clip(img, 0, 255).astype(np.uint8)
        return img, operations, applied

    def _build_reject_page(
        self,
        page_num: int,
        page_img: Optional[Image.Image],
        metrics: PageMetrics,
        score: Optional[float],
        reasons: List[str],
        output_dir: Path,
        evidence_dir: Path,
    ) -> PageResult:
        """Record a REJECTED page. Original is preserved; nothing is enhanced."""
        output_files: Dict[str, str] = {}
        if page_img is not None:
            output_files["original"] = self._save_image(
                page_img, output_dir / f"page_{page_num:03d}_original.png")
            output_files["evidence_before"] = self._save_image(
                page_img, evidence_dir / "before" / f"page_{page_num:03d}.png")
        operations = [
            OperationResult(
                operation="preprocessing_decision",
                applied=True,
                reason=f"decision=REJECT score={score} reasons={','.join(reasons)}",
                input_metric=score,
                confidence=1.0,
            )
        ]
        for name in ALL_OPERATIONS:
            operations.append(OperationResult(
                operation=name, applied=False,
                reason=f"not attempted: page rejected ({','.join(reasons)})",
            ))
        dims = PageDimensions(width=page_img.width, height=page_img.height) if page_img is not None else PageDimensions(width=0, height=0)
        return PageResult(
            page_number=page_num,
            status=PreprocessingStatus.REJECTED,
            original_dimensions=dims,
            processed_dimensions=dims,
            operations=operations,
            regions_detected=[],
            metrics_before=metrics,
            metrics_after=metrics,
            output_files=output_files,
            derivatives={},
            selected_derivative=None,
            improvement_score=0.0,
            processing_improvement_sufficient=False,
            table_detected=False,
            table_bbox=None,
            strategy=PreprocessingStrategy.LOW_QUALITY_RESTORATION.value,
            readability_before=0.0,
            readability_after=0.0,
            candidate_evaluations=[],
            rejected_candidates=[],
            decision=PageDecision.REJECT.value,
            preprocessing_mode=PreprocessingMode.NONE.value,
            quality_score=score,
            quality_source="phase02",
            rejection_reasons=list(reasons),
            upscaled=False,
            scale_factor=1.0,
        )

    def _process_page(
        self,
        page_img: Image.Image,
        page_num: int,
        phase02_page: Optional[Dict[str, Any]],
        output_dir: Path,
        evidence_dir: Path,
        doc_level_reject: Optional[List[str]] = None,
        doc_score: Optional[float] = None,
    ) -> PageResult:
        """Decision-gated page processing: REJECT / MODERATE / CLEAR.

        ``phase02_page`` is the Phase 02 page entry
        ``{score, status, checks, issues, quality}`` — the ONLY quality
        signal used for the decision. Phase 03 never invents its own score.
        ``doc_level_reject`` carries document-level gate reasons (e.g. the
        document score is below threshold): the page is then REJECTED while
        still recording its own page-level evidence for explainability.
        ``doc_score`` is the Phase 02 document score, logged alongside the
        page score so the two values are never confused (the document score
        includes Phase 02's page-status penalty; the page score does not).
        """
        original_metrics = self.metrics_calc.compute_all_metrics(page_img)
        width, height = page_img.width, page_img.height

        score = phase02_page.get("score") if phase02_page else None
        checks = (phase02_page.get("checks", {}) or {}) if phase02_page else {}
        issues = (phase02_page.get("issues", []) or []) if phase02_page else []

        # Effective per-metric values: Phase 02 normalized metrics win when
        # present, otherwise fall back to locally measured ones.
        quality_for_metrics = (phase02_page.get("quality", {}) or {}) if phase02_page else {}
        sharpness, contrast, brightness, skew, _ = self.decision_engine._effective_metrics(
            original_metrics, {
                "sharpness_normalized": quality_for_metrics.get(
                    "sharpness_normalized", original_metrics.sharpness_normalized),
                "contrast_normalized": quality_for_metrics.get(
                    "contrast_normalized", original_metrics.contrast_normalized),
                "brightness_normalized": quality_for_metrics.get(
                    "brightness_normalized", original_metrics.brightness_normalized),
                "skew_angle_degrees": quality_for_metrics.get(
                    "skew_angle_degrees", original_metrics.skew_angle_degrees),
            },
        )

        critical = self.decision_engine.detect_critical_failures(
            checks, issues, width, height,
            original_metrics.sharpness_normalized,
            original_metrics.brightness_normalized,
        )
        # Document-level gate first: a below-threshold document score rejects
        # every page (the LOW-sample contract: document 43.73 -> REJECT).
        gate = list(doc_level_reject or [])
        for reason in critical:
            if reason not in gate:
                gate.append(reason)
        decision, mode, reasons = self.decision_engine.decide_quality_band(score, gate)

        logger.info(
            "PHASE 03 DECISION page=%d quality_score=%s doc_score=%s decision=%s mode=%s reasons=%s",
            page_num, score, doc_score, decision.value, mode.value, ",".join(reasons) or "-",
        )

        if decision == PageDecision.REJECT:
            return self._build_reject_page(
                page_num, page_img, original_metrics, score, reasons,
                output_dir, evidence_dir,
            )

        # Mandatory controlled upscaling for every accepted page.
        original_bgr = cv2.cvtColor(np.array(page_img), cv2.COLOR_RGB2BGR)
        original_readability = self.metrics_calc.compute_readability_metrics(original_bgr).overall
        upscaled_arr, did_upscale = self.processor.upscale(
            original_bgr, target_width=TARGET_WIDTH, max_scale=MAX_SCALE)
        scale_factor = min(
            (upscaled_arr.shape[1] / max(1, width)) if did_upscale else 1.0,
            MAX_SCALE,
        )

        operations: List[OperationResult] = [
            OperationResult(
                operation="preprocessing_decision",
                applied=True,
                reason=f"decision={decision.value} mode={mode.value} score={score}",
                input_metric=score,
                confidence=1.0,
            )
        ]
        applied_names: List[str] = []
        final_bgr = upscaled_arr
        selected_name = "upscaled" if did_upscale else "original_passthrough"
        readability_after = original_readability

        if did_upscale:
            applied_names.append("UPSCALE")
        operations.append(OperationResult(
            operation="UPSCALE", applied=did_upscale,
            reason=f"width={width} target={TARGET_WIDTH} max_scale={MAX_SCALE} scale={scale_factor:.3f}",
            input_metric=float(width), threshold=float(TARGET_WIDTH),
        ))

        if decision == PageDecision.CLEAR:
            # CLEAR: enhancement forbidden — upscale only.
            for name in ("DESKEW", "BRIGHTNESS_CORRECTION", "CONTRAST_ENHANCEMENT", "DENOISE", "SHARPEN"):
                operations.append(OperationResult(
                    operation=name, applied=False,
                    reason="CLEAR image: enhancement forbidden, upscale only",
                ))
        else:
            # MODERATE: stable selective sequence with readability guard.
            enhanced, selective_ops, selective_applied = self._selective_enhance(
                upscaled_arr, sharpness, contrast, brightness, skew)
            base_gray = cv2.cvtColor(upscaled_arr, cv2.COLOR_BGR2GRAY)
            readability_before_up = self.metrics_calc.compute_readability_metrics(
                upscaled_arr, base_gray=base_gray).overall
            readability_after_enh = self.metrics_calc.compute_readability_metrics(
                enhanced, base_gray=base_gray).overall
            if selective_applied and readability_after_enh < readability_before_up - READABILITY_GUARD_TOLERANCE:
                operations.extend(selective_ops)
                operations.append(OperationResult(
                    operation="readability_guard",
                    applied=True,
                    reason=(
                        f"selective enhancement reverted: readability "
                        f"{readability_before_up:.4f} -> {readability_after_enh:.4f}; "
                        f"keeping upscale-only to protect OCR information"
                    ),
                    before_value=readability_before_up,
                    after_value=readability_after_enh,
                ))
            else:
                operations.extend(selective_ops)
                if selective_applied:
                    final_bgr = enhanced
                    applied_names.extend(selective_applied)
                    readability_after = readability_after_enh
                    selected_name = "selective_enhanced"
                else:
                    readability_after = readability_before_up

        final_img = Image.fromarray(cv2.cvtColor(final_bgr, cv2.COLOR_BGR2RGB))
        metrics_after = self.metrics_calc.compute_all_metrics(final_img)
        if readability_after == original_readability and selected_name != "original_passthrough":
            readability_after = self.metrics_calc.compute_readability_metrics(final_bgr).overall

        original_path = self._save_image(page_img, output_dir / f"page_{page_num:03d}_original.png")
        evidence_before = self._save_image(page_img, evidence_dir / "before" / f"page_{page_num:03d}.png")
        processed_path = self._save_image(final_img, output_dir / f"page_{page_num:03d}_processed.png")
        evidence_after = self._save_image(final_img, evidence_dir / "after" / f"page_{page_num:03d}_{selected_name}.png")

        regions = self.region_detector.detect_all_regions(final_bgr, page_num)
        table_region = next((r for r in regions if r.region_type == "TABLE"), None)

        # Legacy strategy label retained for continuity alongside the decision.
        legacy_strategy = self.decision_engine.classify_strategy(sharpness, contrast, brightness)

        logger.info(
            "PHASE 03 DECISION page=%d quality_score=%s decision=%s mode=%s operations=%s",
            page_num, score, decision.value, mode.value,
            ",".join(applied_names) if applied_names else "-",
        )

        return PageResult(
            page_number=page_num,
            status=PreprocessingStatus.SUCCESS,
            original_dimensions=PageDimensions(width=width, height=height),
            processed_dimensions=PageDimensions(width=final_img.width, height=final_img.height),
            operations=operations,
            regions_detected=regions,
            metrics_before=original_metrics,
            metrics_after=metrics_after,
            output_files={
                "original": original_path,
                "evidence_before": evidence_before,
                "evidence_after": evidence_after,
                "processed": processed_path,
            },
            derivatives={selected_name: processed_path},
            selected_derivative=selected_name,
            improvement_score=round(readability_after - original_readability, 4),
            processing_improvement_sufficient=True,
            table_detected=table_region is not None,
            table_bbox=table_region.bbox if table_region else None,
            strategy=legacy_strategy.value,
            readability_before=original_readability,
            readability_after=readability_after,
            candidate_evaluations=[
                {
                    "name": selected_name,
                    "description": f"Decision-gated {mode.value} output",
                    "readability": self.metrics_calc.compute_readability_metrics(final_bgr).to_dict(),
                    "readability_delta": round(readability_after - original_readability, 4),
                    "operations_applied": list(applied_names),
                    "is_binary": False,
                    "is_selected": True,
                    "improvement_score": round(readability_after - original_readability, 4),
                }
            ],
            rejected_candidates=[],
            decision=decision.value,
            preprocessing_mode=mode.value,
            quality_score=score,
            quality_source="phase02",
            rejection_reasons=[],
            upscaled=did_upscale,
            scale_factor=round(scale_factor, 4),
        )

    def _result_json_path(self, record_id: str) -> Path:
        return self.processing_dir / record_id / "preprocessing_result.json"

    @staticmethod
    def _source_checksum(source_path: Path) -> Optional[str]:
        try:
            digest = hashlib.sha256()
            with open(source_path, "rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
            return digest.hexdigest()
        except Exception:
            return None

    def _load_cached_result(
        self, record_id: str, checksum: Optional[str]
    ) -> Optional[PreprocessingResult]:
        """Replay guard (§8): return the stored result when the source is unchanged.

        Prevents unintended repeated enhancement when Phase 03 is invoked again
        for the same document. Any source change (checksum mismatch) reprocesses.
        """
        if not checksum:
            return None
        cache_path = self._result_json_path(record_id)
        if not cache_path.exists():
            return None
        try:
            with open(cache_path, encoding="utf-8") as handle:
                data = json.load(handle)
            if data.get("source_checksum") != checksum:
                return None
            cached = PreprocessingResult.from_dict(data)
            cached.timestamps["replayed_at"] = datetime.now().isoformat()
            logger.info(
                "PHASE 03 DECISION record=%s replay=cached decision=%s (source unchanged)",
                record_id, cached.decision,
            )
            return cached
        except Exception:
            return None

    def _save_result_json(self, result: PreprocessingResult) -> None:
        try:
            cache_path = self._result_json_path(result.record_id)
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(cache_path, "w", encoding="utf-8") as handle:
                json.dump(result.to_dict(), handle, indent=2, ensure_ascii=False)
        except Exception as exc:
            logger.warning("Could not persist Phase 03 result JSON: %s", exc)

    def _ensure_quality_result(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        quality_result: Optional[Any],
    ) -> Optional[Dict[str, Any]]:
        """Guarantee Phase 02 output: use the caller's, else run Phase 02.

        Phase 02 measures quality; Phase 03 only consumes its output and never
        invents a parallel score. Returns the result dict or None when Phase 02
        itself cannot run (a technical failure, not a quality verdict).
        """
        if quality_result is None:
            try:
                from ..quality.service import DocumentQualityCheckService
                service = DocumentQualityCheckService(storage_dir=self.storage_dir)
                return service.check_quality(record_id, document_id, ingestion_id).to_dict()
            except Exception as exc:
                logger.warning("Phase 02 auto-run for Phase 03 failed: %s", exc)
                return None
        if hasattr(quality_result, "to_dict"):
            try:
                return quality_result.to_dict()
            except Exception:
                return None
        return quality_result if isinstance(quality_result, dict) else None

    def preprocess_document(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        quality_result: Optional[Dict[str, Any]] = None,
        force: bool = False,
    ) -> PreprocessingResult:
        """Decision-gated preprocessing driven by Phase 02 quality output.

        REJECT (score < 45 or critical failure) stops the page with explicit
        reasons and no Phase 04 handoff; CLEAR (score >= 65) upscales only;
        MODERATE applies justified selective enhancement. Set ``force=True``
        to bypass the unchanged-source replay guard.
        """
        result = PreprocessingResult(
            status=PreprocessingStatus.SUCCESS,
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            timestamps={"started_at": datetime.now().isoformat()},
        )

        try:
            source_path = self._find_source_file(ingestion_id)
            if not source_path:
                result.status = PreprocessingStatus.FAILED
                result.error_code = Phase03ErrorCode.SOURCE_NOT_FOUND.value
                result.error_message = f"Source file not found for ingestion_id={ingestion_id}"
                result.timestamps["completed_at"] = datetime.now().isoformat()
                return result

            checksum = self._source_checksum(source_path)
            result.source_checksum = checksum
            if not force:
                cached = self._load_cached_result(record_id, checksum)
                if cached is not None:
                    return cached

            quality_dict = self._ensure_quality_result(
                record_id, document_id, ingestion_id, quality_result)
            if not quality_dict:
                result.status = PreprocessingStatus.FAILED
                result.error_code = Phase03ErrorCode.PHASE_02_INCOMPLETE.value
                result.error_message = (
                    "Phase 02 quality output unavailable; Phase 03 refuses to "
                    "invent its own quality score."
                )
                result.timestamps["completed_at"] = datetime.now().isoformat()
                return result

            output_dir = self.processing_dir / record_id
            output_dir.mkdir(parents=True, exist_ok=True)

            evidence_dir = self.evidence_dir / record_id
            (evidence_dir / "before").mkdir(parents=True, exist_ok=True)
            (evidence_dir / "after").mkdir(parents=True, exist_ok=True)

            is_pdf = source_path.suffix.lower() == ".pdf"
            page_count = 1
            if is_pdf:
                try:
                    import pymupdf as fitz
                    with fitz.open(str(source_path)) as doc:
                        page_count = len(doc)
                except Exception as exc:
                    logger.exception(f"PDF render failed for {document_id}: {exc}")
                    result.status = PreprocessingStatus.REJECTED
                    result.decision = PageDecision.REJECT.value
                    result.preprocessing_mode = PreprocessingMode.NONE.value
                    result.rejection_reasons = [RejectionReason.UNREADABLE_DOCUMENT.value]
                    result.operations_skipped = list(ALL_OPERATIONS)
                    result.next_phase = None
                    result.error_code = Phase03ErrorCode.PDF_RENDER_FAILURE.value
                    result.error_message = str(exc)
                    result.timestamps["completed_at"] = datetime.now().isoformat()
                    return result

            # Document-level REJECT gate from the Phase 02 document score.
            doc_score_gate = self.decision_engine.document_quality_score(quality_dict)
            doc_level_reject: List[str] = []
            if doc_score_gate is not None and doc_score_gate < MODERATE_THRESHOLD:
                doc_level_reject = [RejectionReason.QUALITY_SCORE_BELOW_THRESHOLD.value]

            result_strategies: List[str] = []
            for page_num in range(page_count):
                try:
                    if is_pdf:
                        page_img = self._render_pdf_page(source_path, page_num)
                    else:
                        page_img = Image.open(str(source_path)).convert("RGB")
                except Exception as exc:
                    logger.warning(f"Page {page_num + 1} undecodable, rejecting: {exc}")
                    empty_metrics = PageMetrics()
                    try:
                        fallback = self._build_reject_page(
                            page_num + 1, None, empty_metrics, None,
                            [RejectionReason.UNREADABLE_DOCUMENT.value],
                            output_dir, evidence_dir,
                        )
                    except Exception:
                        fallback = PageResult(
                            page_number=page_num + 1,
                            status=PreprocessingStatus.FAILED,
                            original_dimensions=PageDimensions(width=0, height=0),
                            processed_dimensions=PageDimensions(width=0, height=0),
                            operations=[],
                            regions_detected=[],
                            metrics_before=PageMetrics(),
                            metrics_after=PageMetrics(),
                            output_files={},
                        )
                    result.pages.append(fallback)
                    continue

                try:
                    phase02_page = self.decision_engine.extract_page_quality(
                        quality_dict, page_num + 1)
                    page_result = self._process_page(
                        page_img, page_num + 1, phase02_page, output_dir,
                        evidence_dir, doc_level_reject=doc_level_reject,
                        doc_score=doc_score_gate,
                    )
                    result.pages.append(page_result)
                    result.operations_summary.extend(page_result.operations)
                    result.regions_detected_summary.extend(page_result.regions_detected)
                    result_strategies.append(page_result.strategy)
                except Exception:
                    logger.exception(f"Failed to process page {page_num + 1}")
                    result.pages.append(PageResult(
                        page_number=page_num + 1,
                        status=PreprocessingStatus.FAILED,
                        original_dimensions=PageDimensions(width=0, height=0),
                        processed_dimensions=PageDimensions(width=0, height=0),
                        operations=[],
                        regions_detected=[],
                        metrics_before=PageMetrics(),
                        metrics_after=PageMetrics(),
                        output_files={},
                    ))

            result.pages_processed = len(result.pages)
            if result_strategies:
                result.strategy = result_strategies[0]
            result.output_directory = str(output_dir)

            rejected_pages = [p for p in result.pages if p.decision == PageDecision.REJECT.value]
            failed_pages = [p for p in result.pages if p.status == PreprocessingStatus.FAILED]
            accepted_pages = [p for p in result.pages
                              if p.status == PreprocessingStatus.SUCCESS]

            # Document-level decision: REJECT only when nothing is usable;
            # MODERATE when any page needed enhancement; else CLEAR.
            if accepted_pages:
                if any(p.decision == PageDecision.MODERATE.value for p in accepted_pages):
                    result.decision = PageDecision.MODERATE.value
                    result.preprocessing_mode = PreprocessingMode.SELECTIVE_ENHANCEMENT.value
                else:
                    result.decision = PageDecision.CLEAR.value
                    result.preprocessing_mode = PreprocessingMode.UPSCALE_ONLY.value
            else:
                result.decision = PageDecision.REJECT.value
                result.preprocessing_mode = PreprocessingMode.NONE.value

            # Canonical per-page applied names (uppercase vocabulary).
            per_page_applied: List[str] = []
            for page in accepted_pages:
                names = [op.operation for op in page.operations
                         if op.applied and op.operation in ALL_OPERATIONS]
                for name in names:
                    if name not in per_page_applied:
                        per_page_applied.append(name)
            result.operations_applied = [n for n in ALL_OPERATIONS if n in per_page_applied]
            result.operations_skipped = [n for n in ALL_OPERATIONS if n not in per_page_applied]
            if not accepted_pages:
                result.operations_applied = []
                result.operations_skipped = list(ALL_OPERATIONS)

            seen_reasons: List[str] = []
            for page in result.pages:
                for reason in page.rejection_reasons:
                    if reason not in seen_reasons:
                        seen_reasons.append(reason)
            result.rejection_reasons = seen_reasons
            result.upscaled = any(p.upscaled for p in accepted_pages)
            result.scale_factor = max([p.scale_factor for p in accepted_pages] or [1.0])

            page_scores = [p.quality_score for p in result.pages
                           if p.quality_score is not None]
            doc_score = self.decision_engine.document_quality_score(quality_dict)
            result.quality_score = doc_score if doc_score is not None else (
                round(sum(page_scores) / len(page_scores), 2) if page_scores else None)
            result.quality_source = "phase02"

            if not accepted_pages and not failed_pages:
                result.status = PreprocessingStatus.REJECTED
                result.next_phase = None
            elif failed_pages and not accepted_pages:
                result.status = PreprocessingStatus.FAILED
                result.error_code = Phase03ErrorCode.IMAGE_PROCESSING_FAILURE.value
                result.next_phase = None
            elif rejected_pages or failed_pages:
                # Mixed accept/reject: surviving pages flow on; rejected pages
                # stay recorded with reasons (never silently discarded).
                result.status = PreprocessingStatus.PARTIAL
                result.next_phase = "DOCUMENT_CLASSIFICATION"
            else:
                result.status = PreprocessingStatus.SUCCESS
                result.next_phase = "DOCUMENT_CLASSIFICATION"

            result.timestamps["completed_at"] = datetime.now().isoformat()
            if result.pages:
                self._save_result_json(result)

            logger.info(
                "PHASE 03 DECISION record=%s quality_score=%s decision=%s mode=%s "
                "operations=%s status=%s",
                record_id, result.quality_score, result.decision,
                result.preprocessing_mode,
                ",".join(result.operations_applied) if result.operations_applied else "-",
                result.status.value,
            )

            return result

        except Exception as e:
            logger.exception(f"Preprocessing failed for {document_id}: {e}")
            result.status = PreprocessingStatus.FAILED
            result.error_code = Phase03ErrorCode.UNKNOWN_ERROR.value
            result.error_message = str(e)
            result.timestamps["completed_at"] = datetime.now().isoformat()
            return result

_service_instance: Optional[AIDocumentPreprocessingService] = None

def get_preprocessing_service() -> AIDocumentPreprocessingService:
    global _service_instance
    if _service_instance is None:
        _service_instance = AIDocumentPreprocessingService()
    return _service_instance
