"""Decomposed from phase06_ocr_visual_text_recognition.py: service. (Authoritative implementation; verbatim move.)"""
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
from app.ocr.core.surya_adapter import (
    map_blocks_to_regions, run_surya_local, save_pil_to_temp,
)
from app.ocr.core.surya_config import (
    SURYA_LABEL_TO_REGION, is_surya_local_enabled,
)
from app.ocr.core.tesseract_engine import (
    configure_tesseract, run_ocr_with_data, run_real_ocr,
)
from app.ocr.ocr_config.models import (
    REGION_PSM,
)
from app.ocr.preprocessing.pipeline import (
    ImagePreprocessor, get_optimal_tesseract_psm,
)
from app.ocr.preprocessing.quality import (
    ImageQualityAssessment,
)
from .models import *
from .layout import *
from .artifacts import *
from .words import *
from .tables import *
from .evidence import *
from .layout import (_TessdataEnv, _try_native_pdf_text)
from .tables import (_ocr_table_tight)
from .words import (_build_lines_from_words, _calculate_metrics, _tag_words_by_region)

import logging
logger = logging.getLogger(__name__)

def detect_input_type(original_path: Optional[str],
                      page_image_paths: List[str]) -> str:
    """NATIVE_PDF (extractable text) vs SCANNED_PDF vs IMAGE."""
    candidates: List[str] = []
    if original_path and original_path.lower().endswith(".pdf"):
        candidates.append(original_path)
    candidates.extend(p for p in page_image_paths
                      if str(p).lower().endswith(".pdf"))
    for pdf_path in candidates:
        if not Path(pdf_path).exists():
            continue
        has_text, _ = _try_native_pdf_text(pdf_path, 1)
        return "NATIVE_PDF" if has_text else "SCANNED_PDF"
    return "IMAGE"

def _ocr_image(
    image_path: str,
    language: str = "eng",
    psm: Optional[int] = None,
    tesseract_cmd: Optional[str] = None,
    preprocess: bool = True,
) -> PageOCRResult:
    """
    Perform OCR on a single image with adaptive preprocessing.
    
    Args:
        image_path: Path to image file
        language: OCR language code
        psm: Tesseract page segmentation mode. If None, auto-detect based on image quality
        tesseract_cmd: Optional Tesseract executable path
        preprocess: Whether to preprocess image before OCR
    """
    try:
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        else:
            configure_tesseract()

        # Preprocess image for better OCR
        if preprocess:
            logger.info(f"Preprocessing image: {image_path}")
            pil_img = ImagePreprocessor.preprocess_for_ocr(image_path)
            
            # Auto-detect optimal PSM if not provided
            if psm is None:
                quality, _ = ImageQualityAssessment.assess_quality(pil_img)
                psm = get_optimal_tesseract_psm(quality)
                logger.info(f"Auto-detected PSM={psm} based on image quality={quality}")
        else:
            pil_img = Image.open(image_path)
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
            if psm is None:
                psm = 6  # Default fallback

        # Run OCR with determined settings
        text = run_real_ocr(pil_img, language=language, psm=psm)
        words_data = run_ocr_with_data(pil_img, language=language, psm=psm)

        # Filter out extremely low confidence words (likely OCR errors)
        # But keep track of all for detailed analysis
        words = []
        high_conf_words = []
        
        for w in words_data:
            bbox = w.get("bbox", [0, 0, 0, 0])
            confidence = w.get("confidence")
            
            word_obj = OCRWord(
                text=w["text"],
                confidence=confidence,
                bbox=OCRBoundingBox(x=bbox[0], y=bbox[1], width=bbox[2] - bbox[0], height=bbox[3] - bbox[1]),
                block_num=w.get("block_num", 0),
                par_num=w.get("par_num", 0),
                line_num=w.get("line_num", 0),
                word_num=w.get("word_num", 0),
            )
            words.append(word_obj)
            
            # Track high confidence words for metrics
            if confidence is not None and confidence >= 0.65:
                high_conf_words.append(word_obj)

        lines = _build_lines_from_words(words)

        # Calculate confidence metrics
        confidences = [w.confidence for w in words if w.confidence is not None]
        mean_conf = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Log quality metrics
        low_conf_count = len([c for c in confidences if c < 0.6])
        low_conf_pct = (low_conf_count / len(confidences) * 100) if confidences else 0
        
        if low_conf_pct > 40:
            logger.warning(
                f"High proportion of low-confidence words ({low_conf_pct:.1f}%). "
                f"Consider improving image quality or adjusting PSM."
            )

        return PageOCRResult(
            page_number=1,
            text=text,
            words=words,
            lines=lines,
            mean_confidence=mean_conf,
            word_count=len(words),
            character_count=len(text),
        )

    except Exception as e:
        logger.exception(f"OCR failed for image {image_path}: {e}")
        return PageOCRResult(
            page_number=1,
            text="",
            words=[],
            lines=[],
            mean_confidence=0.0,
            word_count=0,
            character_count=0,
            status=OCRStatus.FAILED,
            error_message=str(e),
        )

class OCRService:
    """Main service for Phase 06 OCR."""

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or OCR_STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def get_original_path(self, ingestion_id: str) -> Optional[str]:
        """Get original document path from Phase 01."""
        from ..ingestion.service import DocumentIngestionService
        storage = DocumentIngestionService()
        original_dir = storage.storage_dir

        if not original_dir.exists():
            return None

        for ext in [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"]:
            path = original_dir / f"{ingestion_id}{ext}"
            if path.exists():
                return str(path)
        return None

    def get_preprocessed_paths(self, record_id: str, ingestion_id: str) -> List[str]:
        """Get Phase 03 selected outputs (decision record first, glob fallback)."""
        _, processed = phase03_page_data(record_id)
        if processed:
            return processed
        from ..preprocessing.ai_models import PROCESSING_STORAGE_DIR

        processed_dir = PROCESSING_STORAGE_DIR / record_id
        if not processed_dir.exists():
            return []
        paths = []
        for pattern in ("page_*_processed.png", "page_*_upscaled.png"):
            for found in sorted(processed_dir.glob(pattern)):
                if found.is_file():
                    paths.append(str(found))
            if paths:
                break
        return sorted(set(paths))

    def perform_ocr(
        self,
        *,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        engine: str = "TESSERACT",
        language: str = "eng",
        input_source: str = "PREPROCESSED_IMAGE",
        input_paths: Optional[List[str]] = None,
        native_pdf_text_attempt: bool = False,
        table_aware: bool = True,
        tesseract_psm: Optional[int] = None,
        tesseract_oem: int = 3,
        # Phase 03 owns preprocessing — Phase 06 must not re-enhance by default.
        preprocess: bool = False,
        # Phase 05 language evidence / Phase 04 context (optional, additive).
        language_detection: Optional[Dict[str, Any]] = None,
        document_type: Optional[str] = None,
        run_layout: bool = True,
        run_artifacts: bool = True,
    ) -> OCRResult:
        """Multi-engine OCR: Tesseract characters + Surya layout + Roboflow artifacts.

        Backward compatible with the previous single-engine signature; new
        keyword arguments are optional and additive. ``tesseract_psm``, when
        given, overrides the region-specific PSM map for every region.
        """
        import time
        started_at = datetime.now().isoformat()
        wall_start = time.time()

        result = OCRResult(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            engine=engine,
            language=language,
            timestamps={"started_at": started_at},
        )

        try:
            # ---- language packs: requested vs installed (no silent English) ----
            requested = [c.strip() for c in str(language or "eng").split("+") if c.strip()]
            usable, missing = check_tesseract_languages(requested or ["eng"])
            if missing:
                result.warnings.append(
                    f"Missing Tesseract packs {missing}; proceeding with [{'+'.join(usable)}]"
                    if usable else
                    f"No requested Tesseract pack installed {requested}: OCR_LANGUAGE_UNAVAILABLE"
                )
            if not usable:
                result.status = OCRStatus.FAILED
                result.error_code = "OCR_LANGUAGE_UNAVAILABLE"
                result.error_message = (
                    f"None of the requested OCR languages {requested} is installed; "
                    f"refusing to pretend otherwise.")
                result.next_phase = None
                result.timestamps["completed_at"] = datetime.now().isoformat()
                result.processing_time_seconds = round(time.time() - wall_start, 4)
                return result
            active_language = "+".join(usable)

            # ---- inputs: explicit paths > Phase 03 decision record > original ----
            original_path = self.get_original_path(ingestion_id)
            if not input_paths:
                if input_source == "PREPROCESSED_IMAGE":
                    input_paths = self.get_preprocessed_paths(record_id, ingestion_id)
                if not input_paths and original_path:
                    input_paths = [original_path]

            if not input_paths:
                result.status = OCRStatus.FAILED
                result.error_code = "NO_INPUT_FILES"
                result.error_message = "No input files found for OCR"
                result.next_phase = None
                result.timestamps["completed_at"] = datetime.now().isoformat()
                result.processing_time_seconds = round(time.time() - wall_start, 4)
                return result

            input_type = detect_input_type(original_path, [str(p) for p in input_paths])
            processed_hint = self.get_preprocessed_paths(record_id, ingestion_id)
            result.input = {
                "type": input_type,
                "original_path": original_path,
                "processed_path": processed_hint[0] if processed_hint else None,
                "input_paths": [str(p) for p in input_paths],
            }
            result.language_info = self._resolve_language_info(
                record_id, document_id, language_detection, usable)

            engine_statuses = {"tesseract": "SUCCESS",
                               "surya": "UNAVAILABLE", "roboflow": "UNAVAILABLE"}
            surya_block: Dict[str, Any] = {"status": "UNAVAILABLE"}
            roboflow_block: Dict[str, Any] = {"status": "UNAVAILABLE"}

            pages: List[PageOCRResult] = []
            page_counter = 0
            for path in input_paths:
                path_str = str(path)
                if path_str.lower().endswith(".pdf"):
                    for pdf_page in self._pdf_page_numbers(path_str):
                        page_counter += 1
                        pages.append(self._ocr_pdf_page(
                            path_str, pdf_page, page_counter, original_path,
                            active_language, engine_statuses,
                            run_layout, run_artifacts, table_aware,
                            tesseract_psm, preprocess,
                            surya_block, roboflow_block, record_id))
                else:
                    if not Path(path_str).exists():
                        pages.append(self._failed_page(
                            page_counter + 1, path_str, "INVALID_IMAGE",
                            f"Input image not found: {path_str}"))
                        page_counter += 1
                        continue
                    page_counter += 1
                    pages.append(self._ocr_image_page(
                        path_str, page_counter, active_language,
                        engine_statuses, run_layout, run_artifacts,
                        table_aware, tesseract_psm, preprocess,
                        surya_block, roboflow_block, record_id))

            full_text = "\n\n".join(p.text for p in pages if p.text)
            result.pages = pages
            result.full_text = full_text
            result.metrics = _calculate_metrics(pages)
            result.engines = engine_statuses
            result.surya = surya_block
            result.roboflow = roboflow_block
            result.qr_status = "NOT_IMPLEMENTED"  # no QR detector in repo (deferred)

            ok_pages = sum(1 for p in pages if p.status == OCRStatus.SUCCESS)
            failed_pages = sum(1 for p in pages if p.status == OCRStatus.FAILED)
            words_total = result.metrics.total_words if result.metrics else 0
            if ok_pages == len(pages) and words_total > 0:
                result.status = OCRStatus.SUCCESS
            elif ok_pages == len(pages):
                result.status = OCRStatus.NO_TEXT_DETECTED
            elif ok_pages > 0:
                result.status = OCRStatus.PARTIAL_SUCCESS
            elif failed_pages == len(pages) and any(
                    (p.error_message or "").startswith("TESSERACT_FAILED")
                    for p in pages):
                # Engine failed on otherwise valid input: partial, never fake-ok.
                result.status = OCRStatus.PARTIAL_SUCCESS
                result.error_code = "TESSERACT_FAILED"
                result.error_message = next(
                    p.error_message for p in pages if p.error_message)
            else:
                result.status = OCRStatus.FAILED
                result.error_code = "OCR_ENGINE_ERROR"
                result.error_message = next(
                    (p.error_message for p in pages if p.error_message),
                    "All pages failed")

            if result.status != OCRStatus.FAILED:
                self._save_ocr_result(result)

            result.timestamps["completed_at"] = datetime.now().isoformat()
            result.processing_time_seconds = round(time.time() - wall_start, 4)

            logger.info(
                f"OCR completed for {document_id}: "
                f"status={result.status.value}, pages={len(pages)}, "
                f"words={words_total}, engines={engine_statuses}"
            )

        except Exception as e:
            logger.exception(f"OCR failed for {document_id}: {e}")
            result.status = OCRStatus.FAILED
            result.error_code = "OCR_ENGINE_ERROR"
            result.error_message = str(e)
            result.next_phase = None
            result.timestamps["completed_at"] = datetime.now().isoformat()

        return result

    @staticmethod
    def _failed_page(page_num: int, input_path: str, code: str,
                     message: str) -> PageOCRResult:
        return PageOCRResult(
            page_number=page_num, text="", words=[], lines=[],
            mean_confidence=0.0, word_count=0, character_count=0,
            status=OCRStatus.FAILED, error_message=f"{code}: {message}",
            input_path=input_path,
        )

    @staticmethod
    def _resolve_language_info(
        record_id: str, document_id: str,
        language_detection: Optional[Dict[str, Any]],
        usable_codes: List[str],
    ) -> Dict[str, Any]:
        """Language/script evidence block (never translated here).

        Prefers the explicit Phase 05 payload, then the stored Phase 05
        decision file, else undetermined — never invented.
        """
        payload = language_detection
        if payload is None:
            candidate = (APP_DIR / "uploads" / "processing"
                         / "phase_05" / record_id / f"{document_id}_language_detection.json")
            if candidate.exists():
                try:
                    with open(candidate, encoding="utf-8") as handle:
                        payload = json.load(handle)
                except Exception:
                    payload = None
        if isinstance(payload, dict):
            lang = (payload.get("language", {}) or {})
            script = (payload.get("script", {}) or {})
            routing = (payload.get("ocr_routing", {}) or {})
            if isinstance(lang, str):
                lang = {"primary": lang}
            if isinstance(script, str):
                script = {"primary": script}
            if not isinstance(routing, dict):
                routing = {}
            return {
                "language": lang.get("primary", "und"),
                "script": script.get("primary", "Unknown"),
                "confidence": lang.get("confidence", 0.0),
                "multilingual": bool(payload.get("multilingual", False)),
                "tesseract_codes": list(routing.get("language_codes", usable_codes)),
            }
        return {"language": "und", "script": "Unknown", "confidence": 0.0,
                "multilingual": False, "tesseract_codes": list(usable_codes)}

    @staticmethod
    def _pdf_page_numbers(pdf_path: str) -> List[int]:
        try:
            import pymupdf as fitz
            with fitz.open(pdf_path) as doc:
                return list(range(1, len(doc) + 1))
        except Exception:
            return []

    @staticmethod
    def _render_pdf_page_image(pdf_path: str, page_num: int) -> Optional[Image.Image]:
        try:
            import io as _io
            import pymupdf as fitz
            with fitz.open(pdf_path) as doc:
                if page_num > len(doc):
                    return None
                pix = doc[page_num - 1].get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            return Image.open(_io.BytesIO(pix.tobytes("png"))).convert("RGB")
        except Exception as exc:
            logger.warning("PDF rasterization failed: %s", type(exc).__name__)
            return None

    def _ocr_pdf_page(
        self, pdf_path: str, pdf_page_num: int, page_counter: int,
        original_path: Optional[str], active_language: str,
        engine_statuses: Dict[str, str],
        run_layout: bool, run_artifacts: bool, table_aware: bool,
        tesseract_psm: Optional[int], preprocess: bool,
        surya_block: Dict[str, Any], roboflow_block: Dict[str, Any],
        record_id: str,
    ) -> PageOCRResult:
        """Native-text PDF pages use coordinates-preserving extraction (no
        rasterization); scanned pages render to image and join the pipeline."""
        has_native, _ = _try_native_pdf_text(pdf_path, pdf_page_num)
        if has_native:
            text, raw = native_pdf_page_words(pdf_path, pdf_page_num)
            words = words_to_objects(raw, page=page_counter,
                                     region="FULL_PAGE", engine="native_pdf")
            lines = build_lines(words, page_counter)
            confs = [w.confidence for w in words if w.confidence is not None]
            mean_conf = sum(confs) / len(confs) if confs else 0.0
            return PageOCRResult(
                page_number=page_counter, text="\n".join(l.text for l in lines),
                words=words, lines=lines, mean_confidence=mean_conf,
                word_count=len(words), character_count=len(text),
                native_text_used=True, native_text=text,
                status=OCRStatus.SUCCESS if words else OCRStatus.NO_TEXT_DETECTED,
                table_structure_status="UNRESOLVED",
                numeric_tokens=numeric_tokens(words),
                scripts_present=scripts_present(words),
                input_path=pdf_path, layout_source="native_pdf",
            )
        rendered = self._render_pdf_page_image(pdf_path, pdf_page_num)
        if rendered is None:
            return self._failed_page(page_counter, pdf_path, "INVALID_PDF",
                                     f"Cannot render scanned PDF page {pdf_page_num}")
        return self._ocr_pil_page(
            rendered, pdf_path, page_counter, active_language,
            engine_statuses, run_layout, run_artifacts, table_aware,
            tesseract_psm, preprocess, surya_block, roboflow_block,
            record_id_hint=record_id)

    def _ocr_image_page(
        self, image_path: str, page_counter: int, active_language: str,
        engine_statuses: Dict[str, str],
        run_layout: bool, run_artifacts: bool, table_aware: bool,
        tesseract_psm: Optional[int], preprocess: bool,
        surya_block: Dict[str, Any], roboflow_block: Dict[str, Any],
        record_id: str,
    ) -> PageOCRResult:
        try:
            pil_img = Image.open(image_path)
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
        except Exception as exc:
            return self._failed_page(page_counter, image_path, "INVALID_IMAGE",
                                     f"Cannot decode image: {exc}")
        # Phase 03 owns preprocessing: never re-enhance here. The legacy
        # `preprocess` flag is honored only when explicitly requested.
        if preprocess:
            try:
                pil_img = ImagePreprocessor.preprocess_for_ocr(image_path)
            except Exception as exc:
                logger.warning("Legacy in-OCR preprocessing failed, using raw: %s", exc)
        record_id = record_id or self._record_hint_from_path(image_path)
        return self._ocr_pil_page(
            pil_img, image_path, page_counter, active_language,
            engine_statuses, run_layout, run_artifacts, table_aware,
            tesseract_psm, preprocess, surya_block, roboflow_block,
            record_id_hint=record_id)

    @staticmethod
    def _record_hint_from_path(image_path: str) -> Optional[str]:
        try:
            parent = Path(image_path).parent.name
            if parent.startswith("LR-"):
                return parent
        except Exception:
            pass
        return None

    def _ocr_pil_page(
        self, pil_img: Image.Image, image_path: str, page_counter: int,
        active_language: str, engine_statuses: Dict[str, str],
        run_layout: bool, run_artifacts: bool, table_aware: bool,
        tesseract_psm: Optional[int], preprocess: bool,
        surya_block: Dict[str, Any], roboflow_block: Dict[str, Any],
        record_id_hint: Optional[str],
    ) -> PageOCRResult:
        """Region-aware OCR for one raster page image."""
        width, height = pil_img.size
        if width < 10 or height < 10:
            return self._failed_page(page_counter, image_path, "INVALID_IMAGE",
                                     "Image dimensions too small for OCR")

        # ---- layout: Surya > Phase 03 regions > geometry priors ----
        surya_out = surya_layout(image_path, width, height) if run_layout else {
            "status": "UNAVAILABLE", "reason": "layout_disabled",
            "regions": [], "reading_order": []}
        if surya_out.get("status") == "SUCCESS":
            engine_statuses["surya"] = "SUCCESS"
            surya_block.update({"status": "SUCCESS",
                                "regions": len(surya_out.get("regions", []))})
        else:
            surya_block.update({"status": "UNAVAILABLE",
                                "reason": surya_out.get("reason")})
        # ---- Surya local recognition (opt-in ZAMEENAI_SURYA_LOCAL=1) ----
        # Genuine Surya-2 OCR via the native llamacpp backend (no Docker).
        # Output feeds regions (precedence) + candidate_texts evidence + the
        # result.surya block. The Tesseract word stream is untouched, so
        # Phase 07 consumes exactly what it did before.
        surya_local: Dict[str, Any] = {"status": "UNAVAILABLE",
                                       "reason": "disabled"}
        surya_local_regions: List[Dict[str, Any]] = []
        surya_candidates: List[CandidateText] = []
        if run_layout and is_surya_local_enabled():
            surya_input_path: Optional[str] = None
            if (image_path
                    and not str(image_path).lower().endswith(".pdf")
                    and Path(str(image_path)).exists()):
                surya_input_path = str(image_path)
            tmp_surya_path: Optional[str] = None
            try:
                if surya_input_path is None:
                    tmp_surya_path = save_pil_to_temp(pil_img)
                    surya_input_path = tmp_surya_path
                surya_local = run_surya_local(surya_input_path)
            finally:
                if tmp_surya_path:
                    try:
                        os.remove(tmp_surya_path)
                    except OSError:
                        pass
            if surya_local.get("status") == "SUCCESS":
                engine_statuses["surya"] = "SUCCESS"
                surya_local_regions = map_blocks_to_regions(
                    surya_local.get("blocks", []), width, height)
                for block in surya_local.get("blocks", []):
                    text = str(block.get("text", "") or "").strip()
                    if not text or block.get("skipped") or block.get("error"):
                        continue
                    region_type = SURYA_LABEL_TO_REGION.get(
                        str(block.get("label", "")), "METADATA")
                    surya_candidates.append(CandidateText(
                        text=text,
                        engine="surya",
                        confidence=float(block.get("confidence", 0.0) or 0.0),
                        region=region_type,
                        page=page_counter,
                    ))
                surya_block.pop("reason", None)
                surya_block.update({
                    "status": "SUCCESS",
                    "backend": surya_local.get("backend"),
                    "model": surya_local.get("model"),
                    "device": surya_local.get("device"),
                    "blocks": len(surya_local.get("blocks", [])),
                    "regions": len(surya_local_regions),
                    "mean_confidence": surya_local.get("mean_confidence"),
                    "timings": surya_local.get("timings"),
                    "candidate_texts": len(surya_candidates),
                })
            else:
                surya_block.update({"status": "UNAVAILABLE",
                                    "reason": surya_local.get("reason"),
                                    "backend": surya_local.get("backend", "llamacpp")})
        phase03_regions: List[Dict[str, Any]] = []
        if record_id_hint:
            phase03_regions, _ = phase03_page_data(record_id_hint)
        regions, layout_source = resolve_regions(
            width, height, page_counter,
            surya_local_regions or (surya_out.get("regions", []) if run_layout else []),
            phase03_regions)

        # ---- artifacts: Roboflow recognizer (+ Phase 03 emblem fallback) ----
        artifacts: List[ArtifactDetection] = []
        if run_artifacts:
            status, found, info = detect_artifacts(
                image_path, width, height, page_counter)
            if status == "SUCCESS":
                engine_statuses["roboflow"] = "SUCCESS"
            roboflow_block.update({"status": status, **info,
                                   "artifacts": len(found)})
            artifacts.extend(found)
            if not found:
                page_area = max(1, width * height)
                for item in phase03_regions:
                    if (str(item.get("type", "")) == "EMBLEM_OR_STAMP"
                            and int(item.get("page", page_counter)) == page_counter
                            and isinstance(item.get("bbox"), list)
                            and len(item["bbox"]) == 4):
                        x1, y1, x2, y2 = (int(v) for v in item["bbox"])
                        box_area = max(0, x2 - x1) * max(0, y2 - y1)
                        if box_area <= 0 or box_area / page_area > 0.40:
                            continue  # whole-page blobs are detector noise, not seals
                        artifacts.append(ArtifactDetection(
                            artifact_type="seal", confidence=float(
                                item.get("confidence", 0.6) or 0.6),
                            bbox=OCRBoundingBox(x=x1, y=y1,
                                                width=max(1, x2 - x1),
                                                height=max(1, y2 - y1)),
                            page=page_counter, source="phase03_layout"))
        ocr_view, masked_info = mask_artifact_regions(
            pil_img, [a for a in artifacts if a.source == "roboflow"])
        gray_full = cv2.cvtColor(np.array(pil_img.convert("RGB")),
                                 cv2.COLOR_RGB2GRAY)

        # ---- region OCR (single engine pass per region; table cells instead
        # of a duplicated whole-table pass) ----
        # Single primary full-page character pass (complete coverage, one
        # engine call): regions then provide STRUCTURE by containment, never
        # by fragmenting recognition. Gap crops below use region PSMs only
        # where the primary pass found nothing.
        all_words: List[OCRWord] = []
        tables: List[TableData] = []
        table_status = "UNRESOLVED"
        table_index = 0
        full_psm = (tesseract_psm if tesseract_psm is not None
                    else REGION_PSM.get("FULL_PAGE", 6))
        try:
            with _TessdataEnv():
                configure_tesseract()
                raw_full = run_ocr_with_data(
                    ocr_view.convert("RGB"),
                    language=active_language, psm=full_psm)
        except Exception as exc:
            logger.exception("Tesseract OCR failed on page %s", page_counter)
            engine_statuses["tesseract"] = "FAILED"
            return PageOCRResult(
                page_number=page_counter, text="", words=[], lines=[],
                mean_confidence=0.0, word_count=0, character_count=0,
                status=OCRStatus.FAILED,
                error_message=f"TESSERACT_FAILED: {exc}",
                regions=regions, artifacts=artifacts,
                table_structure_status=table_status,
                input_path=image_path, layout_source=layout_source,
            )
        all_words = words_to_objects(
            raw_full, page=page_counter, region="FULL_PAGE",
            engine="tesseract", line_prefix=f"{page_counter}-FULL")
        tagged_counts = _tag_words_by_region(all_words, regions, page_counter)

        # Gap-fill: kept regions where the primary pass found nothing get one
        # targeted crop with their region-specific PSM (bounded, justified).
        try:
            with _TessdataEnv():
                configure_tesseract()
                for seg_idx, region in enumerate(regions):
                    if region.type not in {r for r in REGION_ORDER}:
                        continue
                    if region.type == "MAIN_TABLE" or tagged_counts[seg_idx] > 0:
                        continue
                    box = region.bbox
                    pad = 6
                    rx1 = max(0, box.x - pad)
                    ry1 = max(0, box.y - pad)
                    rx2 = min(width, box.x + box.width + pad)
                    ry2 = min(height, box.y + box.height + pad)
                    if rx2 - rx1 < 10 or ry2 - ry1 < 10:
                        continue
                    psm = (tesseract_psm if tesseract_psm is not None
                           else REGION_PSM.get(region.type,
                                               REGION_PSM["FULL_PAGE"]))
                    crop = ocr_view.crop((rx1, ry1, rx2, ry2))
                    raw = run_ocr_with_data(
                        crop.convert("RGB"),
                        language=active_language, psm=psm)
                    gap_words = words_to_objects(
                        raw, page=page_counter, region=region.type,
                        engine="tesseract", offset_x=rx1, offset_y=ry1,
                        line_prefix=f"{page_counter}-GAP-{seg_idx}")
                    if gap_words:
                        logger.info("Phase 06 gap-fill: region %s recovered %d words",
                                    region.type, len(gap_words))
                    all_words.extend(gap_words)
        except Exception as exc:
            logger.warning("Region gap-fill failed (primary evidence kept): %s",
                           type(exc).__name__)

        # Table structure: ruling-line grid geometry + tight glyph-box cell
        # OCR (full grid cells misread: whitespace breaks Tesseract). Cell
        # reads replace full-page fragments in their cell; empty tight cells
        # keep full-page evidence. Deduped below — no duplicated evidence.
        table_view_used = False
        table_regions = [r for r in regions if r.type == "MAIN_TABLE"]
        if table_regions and table_aware:
            table_box = max(
                table_regions,
                key=lambda r: r.bbox.width * r.bbox.height).bbox
            tx1, ty1 = max(0, table_box.x), max(0, table_box.y)
            tx2 = min(width, table_box.x + table_box.width)
            ty2 = min(height, table_box.y + table_box.height)
            cells = detect_table_grid(gray_full, (tx1, ty1, tx2, ty2))
            if cells:
                rows, words_to_add, dropped = _ocr_table_tight(
                    ocr_view, gray_full, cells,
                    active_language, page_counter, all_words)
                if words_to_add:
                    table_view_used = True
                    drop_ids = {id(w) for w in dropped}
                    all_words = [w for w in all_words if id(w) not in drop_ids]
                    all_words.extend(words_to_add)
                table_index += 1
                tables.append(TableData(
                    table_index=table_index,
                    bbox=OCRBoundingBox(x=tx1, y=ty1,
                                        width=max(1, tx2 - tx1),
                                        height=max(1, ty2 - ty1)),
                    rows=rows, structure_status="RESOLVED",
                    source="ruling_line_grid",
                    page=page_counter))
                table_status = "RESOLVED"
            else:
                table_status = "UNRESOLVED"

        all_words = suppress_duplicate_words(all_words)
        lines = build_lines(all_words, page_counter)
        text = "\n".join(line.text for line in lines)
        confs = [w.confidence for w in all_words if w.confidence is not None]
        mean_conf = sum(confs) / len(confs) if confs else 0.0
        header_text = " ".join(l.text for l in lines if l.region == "HEADER")
        footer_text = " ".join(l.text for l in lines if l.region == "FOOTER")
        emblem = any(a.source == "phase03_layout" for a in artifacts)
        govt = government_evidence(header_text, footer_text, artifacts, emblem)

        return PageOCRResult(
            page_number=page_counter, text=text, words=all_words,
            lines=lines, mean_confidence=mean_conf,
            word_count=len(all_words), character_count=len(text),
            status=OCRStatus.SUCCESS if all_words else OCRStatus.NO_TEXT_DETECTED,
            regions=regions, tables=tables,
            table_structure_status=table_status if tables else "UNRESOLVED",
            table_view_used=table_view_used,
            artifacts=artifacts, government_document_evidence=govt,
            candidate_texts=surya_candidates,
            numeric_tokens=numeric_tokens(all_words),
            scripts_present=scripts_present(all_words),
            input_path=image_path, layout_source=layout_source,
        )

    def _save_ocr_result(self, result: OCRResult) -> None:
        """Save OCR result to storage."""
        output_dir = self.storage_dir / result.record_id
        output_dir.mkdir(parents=True, exist_ok=True)

        output_file = output_dir / f"{result.document_id}_ocr.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

        text_file = output_dir / f"{result.document_id}_ocr_text.txt"
        with open(text_file, "w", encoding="utf-8") as f:
            f.write(result.full_text)

        evidence_file = output_dir / f"{result.document_id}_ocr_evidence.json"
        with open(evidence_file, "w", encoding="utf-8") as f:
            json.dump({
                "phase": result.phase,
                "record_id": result.record_id,
                "document_id": result.document_id,
                "input": result.input,
                "language": result.language_info,
                "engines": result.engines,
                "surya": result.surya,
                "roboflow": result.roboflow,
                "qr_status": result.qr_status,
                "warnings": result.warnings,
                "pages": [{
                    "page_number": p.page_number,
                    "layout_source": p.layout_source,
                    "table_structure_status": p.table_structure_status,
                    "government_document_evidence": (
                        p.government_document_evidence.to_dict()
                        if p.government_document_evidence else {}),
                } for p in result.pages],
            }, f, indent=2, ensure_ascii=False)

def perform_ocr(
    *,
    record_id: str,
    document_id: str,
    ingestion_id: str,
    engine: str = "TESSERACT",
    language: str = "eng",
    input_source: str = "PREPROCESSED_IMAGE",
    input_paths: Optional[List[str]] = None,
    native_pdf_text_attempt: bool = False,
    table_aware: bool = True,
    tesseract_psm: Optional[int] = None,
    tesseract_oem: int = 3,
    preprocess: bool = False,
    language_detection: Optional[Dict[str, Any]] = None,
    document_type: Optional[str] = None,
    run_layout: bool = True,
    run_artifacts: bool = True,
) -> OCRResult:
    """Convenience function for multi-engine OCR (Phase 03 output in)."""
    service = OCRService()
    return service.perform_ocr(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
        engine=engine,
        language=language,
        input_source=input_source,
        input_paths=input_paths,
        native_pdf_text_attempt=native_pdf_text_attempt,
        table_aware=table_aware,
        tesseract_psm=tesseract_psm,
        tesseract_oem=tesseract_oem,
        preprocess=preprocess,
        language_detection=language_detection,
        document_type=document_type,
        run_layout=run_layout,
        run_artifacts=run_artifacts,
    )
