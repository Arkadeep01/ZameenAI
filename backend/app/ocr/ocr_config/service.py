"""Decomposed from phase05_ocr_configuration.py: service. (Authoritative implementation; verbatim move.)"""
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
from .models import *
from .probes import *

import logging
logger = logging.getLogger(__name__)

class OCRConfigurationService:
    """Main service for Phase 05 OCR Configuration."""

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or OCR_CONFIGURATION_STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def get_document_type(
        self,
        record_id: str,
        document_id: str,
        storage_path: Optional[Path] = None,
    ) -> str:
        """Determine document type from classification result stored by Phase 04.

        Args:
            record_id: The record ID (used to locate the classification file)
            document_id: The document ID (part of the filename)
            storage_path: Optional override for the storage base path

        Returns:
            The predicted document type or 'UNKNOWN' if not found.
        """
        from src.phase04_document_classification import CLASSIFICATION_STORAGE_DIR

        base_path = storage_path or CLASSIFICATION_STORAGE_DIR
        classification_path = base_path / record_id / f"{document_id}_classification.json"

        if classification_path.exists():
            import json
            with open(classification_path, encoding="utf-8") as f:
                data = json.load(f)
                return data.get("predicted_document_type", "UNKNOWN")
        return "UNKNOWN"

    def get_preprocessed_paths(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
    ) -> List[str]:
        """Get the list of preprocessed image paths from Phase 03.

        Reads the Phase 03 ``preprocessing_result.json`` decision record
        (``pages[].output_files.processed``) so the resolved files are exactly
        what Phase 03 selected — never a stale glob. Falls back to
        ``page_*_processed.png`` / ``page_*_upscaled.png`` when the decision
        record is absent (older Phase 03 outputs).
        """
        from src.phase03_ai_document_preprocessing import PROCESSING_STORAGE_DIR

        processed_dir = PROCESSING_STORAGE_DIR / record_id
        if not processed_dir.exists():
            return []

        paths: List[str] = []
        result_json = processed_dir / "preprocessing_result.json"
        if result_json.exists():
            try:
                import json
                with open(result_json, encoding="utf-8") as handle:
                    data = json.load(handle)
                for page in data.get("pages", []) or []:
                    processed = (page.get("output_files", {}) or {}).get("processed")
                    if processed and Path(processed).exists():
                        paths.append(str(processed))
                    elif page.get("decision") == "REJECT":
                        continue
                if paths:
                    return sorted(set(paths))
            except Exception as exc:
                logger.warning("Could not read Phase 03 decision record: %s", exc)

        for pattern in ("page_*_processed.png", "page_*_upscaled.png"):
            for found in sorted(processed_dir.glob(pattern)):
                if found.is_file():
                    paths.append(str(found))
            if paths:
                break
        return sorted(set(paths))

    def get_original_path(
        self,
        record_id: str,
        ingestion_id: str,
    ) -> Optional[str]:
        """Get the original document path from Phase 01."""
        from src import phase01_ingestion

        original_dir = Path(
            getattr(
                phase01_ingestion,
                "INGESTION_STORAGE_DIR",
                APP_DIR / "uploads" / "ingestion",
            )
        )

        if not original_dir.exists():
            return None

        for ext in [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"]:
            path = original_dir / f"{ingestion_id}{ext}"
            if path.exists():
                return str(path)

        return None

    def determine_input_source(
        self,
        original_path: Optional[str],
        preprocessed_paths: List[str],
        document_type: str,
    ) -> tuple[str, List[str]]:
        """Determine the best input source for OCR."""
        file_ext = Path(original_path).suffix.lower() if original_path else ""

        if file_ext == ".pdf":
            return InputSource.RENDERED_PDF_PAGE.value, preprocessed_paths if preprocessed_paths else []
        elif preprocessed_paths:
            return InputSource.PREPROCESSED_IMAGE.value, preprocessed_paths
        elif original_path:
            return InputSource.ORIGINAL_DOCUMENT.value, [original_path]
        else:
            return InputSource.PREPROCESSED_IMAGE.value, []

    def determine_tesseract_psm(self, document_type: str, has_tables: bool = False) -> int:
        """Determine Tesseract page segmentation mode based on document type."""
        if has_tables:
            return 6
        if document_type in {"LAND_MAP_REFERENCE", "SURVEY_RECORD"}:
            return 6
        if document_type in {"RECORD_OF_RIGHTS", "KHATIAN", "MUTATION_RECORD", "LAND_REGISTRATION_DOCUMENT"}:
            return 6
        return 6

    def determine_page_mode(
        self,
        preprocessed_paths: List[str],
        has_tables: bool = False,
    ) -> str:
        """Determine page OCR mode."""
        if len(preprocessed_paths) > 1:
            return PageOCRMode.MULTI_PAGE_SEQUENTIAL.value
        if has_tables:
            return PageOCRMode.TABLE_AWARE.value
        return PageOCRMode.SINGLE_PAGE.value

    def configure_ocr(
        self,
        *,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        document_type: Optional[str] = None,
        classification_confidence: float = 0.0,
        classification_status: Optional[str] = None,
        preprocessed_paths: Optional[List[str]] = None,
        original_path: Optional[str] = None,
        is_native_pdf: bool = False,
        has_tables: bool = True,
        # Phase 05 language/script evidence (BCP-47; multilingual supported).
        language: str = "en",
        script: Optional[str] = None,
        language_confidence: float = 0.0,
        languages: Optional[List[str]] = None,
        language_detection: Optional[Dict[str, Any]] = None,
        regions_override: Optional[Dict[str, bool]] = None,
    ) -> OCRConfigurationResult:
        """Determine multi-engine OCR configuration based on document evidence.

        Consumes Phase 04 classification (document_type, untouched semantics)
        and Phase 05 language/script evidence (explicit args or a
        ``language_detection`` result dict). This is the main entry point for
        Phase 05.
        """
        started_at = datetime.now().isoformat()

        result = OCRConfigurationResult(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            document_type=document_type or "UNKNOWN",
            classification_confidence=classification_confidence,
            classification_status=classification_status or "UNKNOWN",
            timestamps={"started_at": started_at},
        )

        try:
            # ---- language / script evidence (Phase 05 output, never guessed) ----
            detected_langs, detected_script, detected_conf = self._extract_language_evidence(
                language, script, language_confidence, languages, language_detection
            )
            codes, missing, pack_status = resolve_ocr_languages(detected_langs)

            input_source, input_paths = self.determine_input_source(
                original_path, preprocessed_paths or [], document_type or "UNKNOWN"
            )

            tesseract_psm = self.determine_tesseract_psm(document_type or "UNKNOWN", has_tables)
            page_mode = self.determine_page_mode(input_paths, has_tables)

            # Missing packs are reported, never silently replaced by English.
            if pack_status == LanguagePackStatus.UNAVAILABLE.value:
                result.status = ConfigurationStatus.FAILED
                result.error_code = "OCR_LANGUAGE_UNAVAILABLE"
                result.error_message = (
                    f"No Tesseract pack installed for detected language(s) "
                    f"{detected_langs}; missing={missing}"
                )
                result.language = detected_langs[0] if detected_langs else "und"
                result.script = detected_script
                result.language_confidence = detected_conf
                result.next_phase = None
                result.timestamps["completed_at"] = datetime.now().isoformat()
                logger.warning(
                    "OCR_LANGUAGE_UNAVAILABLE for %s: detected=%s missing=%s",
                    document_id, detected_langs, missing,
                )
                return result

            tesseract_lang = "+".join(codes)
            warnings: List[str] = []
            if pack_status == LanguagePackStatus.PARTIAL.value:
                warnings.append(
                    f"Partial language coverage: missing packs {missing}; "
                    f"proceeding with installed subset [{tesseract_lang}]"
                )

            if is_native_pdf:
                config = OCRConfiguration(
                    engine=OCREngine.TESSERACT_THEN_NATIVE.value,
                    language=tesseract_lang,
                    page_mode=page_mode,
                    input_source=InputSource.ORIGINAL_DOCUMENT.value,
                    input_paths=[original_path] if original_path else [],
                    native_pdf_text_attempt=True,
                    table_aware=has_tables,
                    preserve_layout=True,
                    fallback_enabled=True,
                    tesseract_psm=tesseract_psm,
                    tesseract_oem=3,
                )
                routing = OCRRouting(
                    primary=OCREngine.NATIVE_PDF_TEXT.value,
                    fallback=OCREngine.TESSERACT.value,
                    fallback_enabled=True,
                )
            else:
                config = OCRConfiguration(
                    engine=OCREngine.TESSERACT.value,
                    language=tesseract_lang,
                    page_mode=page_mode,
                    input_source=input_source,
                    input_paths=input_paths,
                    native_pdf_text_attempt=False,
                    table_aware=has_tables,
                    preserve_layout=True,
                    fallback_enabled=True,
                    tesseract_psm=tesseract_psm,
                    tesseract_oem=3,
                )
                routing = OCRRouting(
                    primary=OCREngine.TESSERACT.value,
                    fallback=None,
                    fallback_enabled=False,
                )

            config.detected_language = detected_langs[0] if detected_langs else "und"
            config.detected_script = detected_script
            config.language_confidence = detected_conf
            config.requested_languages = list(detected_langs)
            config.available_languages = list(codes)
            config.language_status = pack_status
            if regions_override:
                for key in config.regions:
                    if key in regions_override:
                        config.regions[key] = bool(regions_override[key])

            roboflow_model, _ = read_roboflow_model_id()
            result.configuration = config
            result.routing = routing
            result.status = ConfigurationStatus.SUCCESS
            result.next_phase = "PHASE_06_OCR"
            result.language = config.detected_language
            result.script = config.detected_script
            result.language_confidence = detected_conf
            result.surya_available = is_surya_available()
            result.roboflow_configured = is_roboflow_configured()
            result.roboflow_model = roboflow_model
            result.warnings = warnings
            if not result.surya_available:
                warnings.append("Surya layout engine not installed: Phase 06 "
                                "falls back to Phase 03 regions, then page geometry")
            if not result.roboflow_configured:
                warnings.append("Roboflow artifact detection not configured "
                                "(SDK, API key, or model missing): Phase 06 "
                                "continues with Tesseract + layout evidence")

            completed_at = datetime.now().isoformat()
            result.timestamps["completed_at"] = completed_at
            result.processing_time_seconds = 0.0

            logger.info(
                f"OCR configuration completed for {document_id}: "
                f"engine={config.engine}, lang={tesseract_lang}, "
                f"pack_status={pack_status}, source={config.input_source}, "
                f"paths={len(config.input_paths)}"
            )

        except Exception as e:
            logger.exception(f"OCR configuration failed for {document_id}: {e}")
            result.status = ConfigurationStatus.FAILED
            result.error_code = "CONFIGURATION_ERROR"
            result.error_message = str(e)
            result.next_phase = None

        return result

    @staticmethod
    def _extract_language_evidence(
        language: str,
        script: Optional[str],
        language_confidence: float,
        languages: Optional[List[str]],
        language_detection: Optional[Dict[str, Any]],
    ) -> Tuple[List[str], str, float]:
        """Normalize Phase 05 language evidence to (langs, script, conf).

        Accepts the Phase 05 language-detection result dict
        (``language.primary`` / ``detected_languages`` / ``script.primary``)
        or explicit BCP-47 arguments. Never invents a language: empty
        evidence resolves to ``["en"]`` only as the documented Tesseract
        default, flagged with 0.0 confidence.
        """
        detected: List[str] = []
        detected_script = script or "Latin"
        detected_conf = float(language_confidence or 0.0)
        if language_detection and isinstance(language_detection, dict):
            # Authoritative first: Phase 05's own OCR routing decision
            # (thresholded multilingual verdict). The raw detected_languages
            # list also carries trace-level scripts and must not widen the
            # request on its own.
            routing = language_detection.get("ocr_routing", {}) or {}
            reverse_map = {v: k for k, v in TESSERACT_LANG_MAP.items() if v}
            for code in routing.get("language_codes", []) or []:
                lang = reverse_map.get(str(code).lower())
                if lang and lang not in detected:
                    detected.append(lang)
            lang_block = language_detection.get("language", {}) or {}
            if not detected:
                # No authoritative routing present (older payload): fall back
                # to primary + detected languages.
                if lang_block.get("primary"):
                    detected.append(str(lang_block["primary"]).lower())
                for item in language_detection.get("detected_languages", []) or []:
                    code = str(item.get("language", "")).lower()
                    if code and code not in detected:
                        detected.append(code)
            elif lang_block.get("primary"):
                primary = str(lang_block["primary"]).lower()
                if primary not in detected:
                    detected.insert(0, primary)
            script_block = language_detection.get("script", {}) or {}
            if script_block.get("primary"):
                detected_script = str(script_block["primary"])
            detected_conf = float(lang_block.get("confidence", detected_conf) or 0.0)
        if languages:
            for code in languages:
                code = str(code).lower()
                if code and code not in detected:
                    detected.append(code)
        explicit = str(language or "").lower()
        if detected:
            # Real evidence wins: the bare "en" default must not silently
            # join an explicitly evidenced language list.
            if explicit and explicit != "en" and explicit not in detected:
                detected.insert(0, explicit)
        elif explicit:
            detected = [explicit]
        if not detected:
            detected = ["en"]
        return detected, detected_script, detected_conf

def create_configuration(
    *,
    record_id: str,
    document_id: str,
    ingestion_id: str,
    document_type: Optional[str] = None,
    classification_confidence: float = 0.0,
    classification_status: Optional[str] = None,
    preprocessed_paths: Optional[List[str]] = None,
    original_path: Optional[str] = None,
    is_native_pdf: bool = False,
    has_tables: bool = True,
    language: str = "en",
    script: Optional[str] = None,
    language_confidence: float = 0.0,
    languages: Optional[List[str]] = None,
    language_detection: Optional[Dict[str, Any]] = None,
    regions_override: Optional[Dict[str, bool]] = None,
) -> OCRConfigurationResult:
    """Convenience function to create OCR configuration."""
    service = OCRConfigurationService()
    return service.configure_ocr(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
        document_type=document_type,
        classification_confidence=classification_confidence,
        classification_status=classification_status,
        preprocessed_paths=preprocessed_paths,
        original_path=original_path,
        is_native_pdf=is_native_pdf,
        has_tables=has_tables,
        language=language,
        script=script,
        language_confidence=language_confidence,
        languages=languages,
        language_detection=language_detection,
        regions_override=regions_override,
    )
