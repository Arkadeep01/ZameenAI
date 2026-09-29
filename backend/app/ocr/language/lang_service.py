"""Decomposed from phase05_language_and_script_detection.py: lang_service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
from ..paths import (resolve_project_tessdata_dir as _canonical_tessdata_dir)
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

from .lang_models import *
from .script_detection import *
from .providers import *
from .script_detection import (_parse_json_payload)

import logging
logger = logging.getLogger(__name__)

def _candidate_image_paths(
    record_id: str, document_id: str, ingestion_id: Optional[str]
) -> List[Path]:
    from src.phase03_ai_document_preprocessing import PROCESSING_STORAGE_DIR

    project_root = APP_DIR
    candidates: List[Path] = []

    original_paths: List[Path] = []
    if ingestion_id:
        originals_dir = project_root / "uploads" / "originals"
        for ext in (".png", ".jpg", ".jpeg", ".tiff", ".tif", ".pdf"):
            path = originals_dir / f"{ingestion_id}{ext}"
            if path.exists():
                original_paths.append(path)

    processed_dir = PROCESSING_STORAGE_DIR / record_id
    if processed_dir.exists():
        for pattern in (
            "page_001_original.*", "page_001_upscaled.*", "*.png",
            "*.jpg", "*.jpeg", "*.tiff", "*.tif",
        ):
            for path in sorted(processed_dir.glob(pattern)):
                if not path.is_file() or path in candidates:
                    continue
                if not _derivative_matches_instance(
                    path,
                    document_id,
                    [p.stat().st_mtime for p in original_paths],
                ):
                    continue
                candidates.append(path)

    for path in original_paths:
        if path not in candidates:
            candidates.append(path)
    return candidates

def _derivative_matches_instance(
    path: Path, document_id: str, original_stamps: List[float]
) -> bool:
    """A Phase 03 derivative is reusable only when it belongs to THIS document
    instance. Record IDs are seeded from disk and can be recycled across
    sessions, so a leftover derivative must never shadow a fresh upload.

    Guards (any miss and the derivative is excluded):
    - metadata: ``preprocessing_result.json`` document_id must match when it
      records one (hard mismatch).
    - timing: when the current document's Phase 01 original is known, the
      derivative must have been written at/after that original (soft guard).
    Legacy derivatives with no original on record remain usable.
    """
    meta = path.parent / "preprocessing_result.json"
    if meta.exists():
        try:
            data = json.loads(meta.read_text(encoding="utf-8"))
        except Exception:
            data = {}
        meta_doc = data.get("document_id") or ""
        if meta_doc and meta_doc != document_id:
            return False
    if original_stamps:
        try:
            return path.stat().st_mtime >= max(original_stamps)
        except OSError:
            return False
    return True

def _project_tessdata_dir() -> Optional[Path]:
    """Project-local tessdata (hin/ben/eng/osd) used when present.

    An explicitly configured ``TESSDATA_PREFIX`` always wins; this is only
    a fallback so Hindi/Bengali provisional previews work on machines whose
    system Tesseract ships English only. Returns None when unusable.

    Compatibility wrapper; authoritative impl: app.ocr.paths.resolve_project_tessdata_dir.
    """
    if os.getenv("TESSDATA_PREFIX"):
        return None
    return _canonical_tessdata_dir()

def _available_tesseract_langs() -> List[str]:
    try:
        env = None
        tessdata = _project_tessdata_dir()
        if tessdata is not None:
            env = {**os.environ, "TESSDATA_PREFIX": str(tessdata)}
        proc = subprocess.run(
            ["tesseract", "--list-langs"],
            capture_output=True, text=True, timeout=15, env=env,
        )
        langs = [
            line.strip()
            for line in (proc.stdout or "").splitlines()
            if line.strip() and not line.strip().startswith("List")
        ]
        return langs or ["eng"]
    except Exception:
        return ["eng"]

def _provisional_ocr_text(image_path: Path) -> Tuple[str, str]:
    """Best-effort provisional OCR preview via the SHARED ``src.ocr`` helper.

    This is evidence gathering, not Phase 06 OCR: a short preview string
    used only for script statistics. Returns (text, langs_used).
    """
    try:
        from PIL import Image  # type: ignore
        from src.ocr import run_real_ocr  # reuse — never duplicate OCR code
    except ImportError:
        return "", ""
    try:
        installed = set(_available_tesseract_langs())
        wanted = [c for c in ("eng", "hin", "ben") if c in installed] or ["eng"]
        langs_used = "+".join(wanted)
        tessdata = _project_tessdata_dir()
        previous = os.environ.get("TESSDATA_PREFIX")
        try:
            # pytesseract runs in-process: expose project tessdata (which the
            # lang listing above already validated) for the preview call only.
            if tessdata is not None:
                os.environ["TESSDATA_PREFIX"] = str(tessdata)
            with Image.open(image_path) as img:
                preview = img.copy()
                preview.thumbnail((2200, 2200))
                text = run_real_ocr(preview, language=langs_used, psm=6)
        finally:
            if tessdata is not None:
                if previous is None:
                    os.environ.pop("TESSDATA_PREFIX", None)
                else:
                    os.environ["TESSDATA_PREFIX"] = previous
        return (text or "").strip(), langs_used
    except Exception as exc:
        logger.warning("Provisional OCR preview failed: %s", type(exc).__name__)
        return "", ""

class LanguageAndScriptDetectionService:
    """Phase 05 service: evidence fusion -> language/script -> OCR routing."""

    def __init__(
        self,
        storage_dir: Optional[Path] = None,
        providers: Optional[List[LanguageDetectionProvider]] = None,
    ) -> None:
        self.storage_dir = storage_dir or LANGUAGE_DETECTION_STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.local_detector = LocalScriptDetector()
        self.gemini_document_provider = GeminiDocumentLanguageProvider()
        self.live_translate_provider = GeminiLiveTranslateProvider()
        self.providers: List[LanguageDetectionProvider] = (
            providers or [self.local_detector]
        )

    # -- persistence ------------------------------------------------------
    def _result_path(self, record_id: str, document_id: str) -> Path:
        return self.storage_dir / record_id / f"{document_id}_language_detection.json"

    def _metadata_path(self, record_id: str, document_id: str) -> Path:
        return (
            self.storage_dir / record_id / f"{document_id}_language_detection_metadata.json"
        )

    def _save(
        self, result: LanguageDetectionResult, image_path: Optional[str]
    ) -> None:
        out_dir = self.storage_dir / result.record_id
        out_dir.mkdir(parents=True, exist_ok=True)
        with open(self._result_path(result.record_id, result.document_id),
                  "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
        metadata = {
            "phase": PHASE_NAME,
            "record_id": result.record_id,
            "document_id": result.document_id,
            "image_path": image_path,
            "detection_status": result.detection_status.value,
            "providers": [p.name for p in self.providers],
            "gemini_live_translate_model": GEMINI_LIVE_TRANSLATE_MODEL,
            "gemini_live_translate_note": (
                "Audio-only modality; NOT_APPLICABLE_FOR_DOCUMENT_INPUT — "
                "never invoked with document images."
            ),
            "saved_at": datetime.now().isoformat(),
        }
        with open(
            self._metadata_path(result.record_id, result.document_id),
            "w", encoding="utf-8",
        ) as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

    def _load_cached(
        self, record_id: str, document_id: str
    ) -> Optional[LanguageDetectionResult]:
        path = self._result_path(record_id, document_id)
        if not path.exists():
            return None
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            result = LanguageDetectionResult.from_dict(data)
            if "idempotent_replay" not in result.warnings:
                result.warnings.append("idempotent_replay")
            return result
        except Exception:
            return None

    # -- main entry --------------------------------------------------------
    def detect(
        self,
        *,
        record_id: str,
        document_id: str,
        classification_id: Optional[str] = None,
        ingestion_id: Optional[str] = None,
        document_type: Optional[str] = None,
        classification_confidence: float = 0.0,
        ocr_text: Optional[str] = None,
        provisional_text: Optional[str] = None,
        use_gemini: bool = False,
        force: bool = False,
    ) -> LanguageDetectionResult:
        """Run Phase 05 language + script detection.

        Raises:
            ValueError: if required identifiers are missing/empty.
        """
        started = datetime.now()
        if not record_id:
            raise ValueError("record_id is required for language detection")
        if not document_id:
            raise ValueError("document_id is required for language detection")

        if not force:
            cached = self._load_cached(record_id, document_id)
            if cached is not None:
                return cached

        result = LanguageDetectionResult(
            record_id=record_id,
            document_id=document_id,
            classification_id=classification_id,
            ingestion_id=ingestion_id,
            document_type=document_type,
            classification_confidence=float(classification_confidence or 0.0),
            timestamps={"started_at": started.isoformat()},
        )

        try:
            # 1. Locate the document (Phase 03 derivatives preferred,
            #    else Phase 01 originals). Never re-upload, never copy.
            candidates = _candidate_image_paths(record_id, document_id, ingestion_id)
            image_path = str(candidates[0]) if candidates else None
            if image_path and Path(image_path).suffix.lower() == ".pdf":
                image_path = None  # provisional preview needs raster images

            # 2. Gather text evidence: caller-supplied preview wins, else run
            #    a lightweight provisional preview via shared src.ocr helper.
            supplied = (ocr_text or provisional_text or "").strip()
            preview_langs = ""
            if supplied:
                text_evidence = supplied
                preview_source = "caller_supplied"
            elif image_path:
                text_evidence, preview_langs = _provisional_ocr_text(Path(image_path))
                preview_source = f"provisional_ocr[{preview_langs}]" if text_evidence else "provisional_ocr_empty"
            else:
                text_evidence, preview_source = "", "none"

            evidence: List[Evidence] = []

            # 3a. Visual evidence: the located image itself (properties only —
            #     script verdict always comes from text statistics below).
            if image_path:
                try:
                    from PIL import Image  # type: ignore
                    with Image.open(image_path) as img:
                        width, height = img.size
                    evidence.append(Evidence(
                        source="document_visual_analysis",
                        language="und",
                        script="Unknown",
                        confidence=0.0,
                        sample=Path(image_path).name,
                        detail=(
                            f"image_located size={width}x{height} "
                            f"preview={preview_source}"
                        ),
                    ))
                except Exception:
                    evidence.append(Evidence(
                        source="document_visual_analysis",
                        language="und",
                        script="Unknown",
                        confidence=0.0,
                        sample=Path(image_path).name,
                        detail="image_unreadable",
                    ))

            # 3b. Local provider evidence (primary, offline-capable).
            local_out = self.local_detector.detect_language(text=text_evidence or None)
            for item in local_out.get("evidence", []):
                if item.get("source") == "unicode_script_analysis":
                    item["source"] = (
                        "ocr_preview" if supplied else "unicode_script_analysis"
                    )
                evidence.append(Evidence(
                    source=str(item.get("source", "")),
                    language=str(item.get("language", "und")),
                    script=str(item.get("script", "Unknown")),
                    confidence=float(item.get("confidence", 0.0)),
                    sample=str(item.get("sample", "")),
                    detail=str(item.get("detail", "")),
                ))

            # 3c. Optional Gemini document provider (opt-in, never required).
            if use_gemini and image_path:
                gem_out = self.gemini_document_provider.detect_language(
                    image_path=image_path,
                    text=text_evidence or None,
                )
                for item in gem_out.get("evidence", []):
                    evidence.append(Evidence(
                        source=str(item.get("source", "")),
                        language=str(item.get("language", "und")),
                        script=str(item.get("script", "Unknown")),
                        confidence=float(item.get("confidence", 0.0)),
                        sample=str(item.get("sample", "")),
                        detail=str(item.get("detail", "")),
                    ))
                if gem_out.get("status") != "ok":
                    result.warnings.append(
                        f"gemini_document_provider:{gem_out.get('reason', 'unavailable')}"
                    )

            # 3d. Classification context — ZERO weight, audit trail only.
            #     (Proves document_type never decides the language.)
            if document_type:
                evidence.append(Evidence(
                    source="classification_context",
                    language="und",
                    script="Unknown",
                    confidence=0.0,
                    sample=str(document_type),
                    detail="zero_weight_context_only",
                ))

            # 4. Fuse: decision comes ONLY from script statistics.
            counts, total = analyze_unicode_text(text_evidence)
            hits = terminology_hits(text_evidence)
            (status, primary, primary_script, conf,
             detected, lang_alts, script_alts) = fuse_evidence(counts, hits)

            if image_path is None and not supplied:
                status = DetectionStatus.FAILED
                result.status = APIStatus.FAILED
                result.error_code = "DOCUMENT_NOT_FOUND"
                result.error_message = (
                    "No Phase 03 derivative or Phase 01 original found and no "
                    "OCR preview text supplied; cannot detect language."
                )
                result.next_phase = None
            elif status == DetectionStatus.FAILED:
                result.status = APIStatus.FAILED
                result.error_code = "DETECTION_FAILED"
                result.error_message = "Detection failed unexpectedly."
                result.next_phase = None
            else:
                result.status = APIStatus.SUCCESS
                if status == DetectionStatus.UNCERTAIN:
                    result.warnings.append("insufficient_text_evidence")
                elif status == DetectionStatus.UNSUPPORTED:
                    result.warnings.append("unsupported_script_needs_review")

            result.detection_status = status
            result.primary_language = primary
            result.language_confidence = conf
            result.language_alternatives = lang_alts
            result.primary_script = primary_script
            result.script_confidence = conf
            result.script_alternatives = script_alts
            result.multilingual = status == DetectionStatus.MULTILINGUAL
            result.detected_languages = detected
            result.ocr_routing = build_ocr_routing(
                status, primary, primary_script, detected, result.multilingual
            )
            result.evidence = evidence

            # Backfill visual-evidence verdict now that fusion is known (keeps
            # the audit trail consistent without letting pixels vote twice).
            for item in result.evidence:
                if item.source == "document_visual_analysis" and detected:
                    item.language = primary
                    item.script = primary_script
                    item.confidence = conf
                    item.detail += f" fused={primary}/{primary_script}"

            finished = datetime.now()
            result.timestamps["completed_at"] = finished.isoformat()
            result.processing_time_seconds = (finished - started).total_seconds()
            if result.status == APIStatus.SUCCESS:
                self._save(result, image_path)
            return result

        except Exception as exc:  # technical failure -> FAILED, never fake English
            logger.exception("Phase 05 detection failed for %s: %s", document_id, exc)
            finished = datetime.now()
            result.status = APIStatus.FAILED
            result.detection_status = DetectionStatus.FAILED
            result.error_code = "DETECTION_EXCEPTION"
            result.error_message = str(exc)
            result.next_phase = None
            result.timestamps["completed_at"] = finished.isoformat()
            result.processing_time_seconds = (finished - started).total_seconds()
            return result

def get_language_detection_service(
    storage_dir: Optional[Path] = None,
) -> LanguageAndScriptDetectionService:
    return LanguageAndScriptDetectionService(storage_dir=storage_dir)

__all__ = [
    "PHASE_NAME",
    "NEXT_PHASE",
    "GEMINI_LIVE_TRANSLATE_MODEL",
    "GEMINI_DOCUMENT_MODEL",
    "LANGUAGE_DETECTION_STORAGE_DIR",
    "LANGUAGE_REGISTRY",
    "MVP_LANGUAGES",
    "DetectionStatus",
    "APIStatus",
    "Evidence",
    "DetectedLanguage",
    "OCRRouting",
    "LanguageDetectionResult",
    "LanguageDetectionProvider",
    "LocalScriptDetector",
    "GeminiDocumentLanguageProvider",
    "GeminiLiveTranslateProvider",
    "LanguageAndScriptDetectionService",
    "get_language_detection_service",
    "count_scripts",
    "analyze_unicode_text",
    "terminology_hits",
    "fuse_evidence",
    "build_ocr_routing",
]
