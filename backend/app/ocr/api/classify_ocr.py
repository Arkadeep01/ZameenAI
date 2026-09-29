"""Decomposed from flask_api_reference.py: classify_ocr. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import logging
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
from app.ocr.classification.models import (
    ClassificationStatus,
)
from app.ocr.classification.service import (
    DocumentClassificationService,
)
from app.ocr.confidence.models import (
    RecordStatus,
)
from app.ocr.confidence.service import (
    ConfidenceCompletenessService,
)
from app.ocr.extraction.models import (
    ExtractionStatus,
)
from app.ocr.extraction.pipeline import (
    SemanticExtractionService,
)
from app.ocr.language.capability import (
    build_capability_matrix, probe_tesseract_installed,
)
from app.ocr.language.lang_models import (
    APIStatus as LanguageDetectionAPIStatus,
)
from app.ocr.language.lang_service import (
    LanguageAndScriptDetectionService,
)
from app.ocr.language.registry import (
    SCHEDULED_LANGUAGES,
)
from app.ocr.ocr_config.models import (
    ConfigurationStatus,
)
from app.ocr.ocr_config.service import (
    OCRConfigurationService,
)
from app.ocr.recognition.service import (
    OCRService,
)
from .app_factory import *

import logging
logger = logging.getLogger(__name__)

@app.route("/api/digitization/classify", methods=["POST"])
def classify_document():
    """Phase 04 - Document Classification endpoint.

    Expects JSON with record_id, document_id, ingestion_id.
    Optionally accepts ocr_text, title_or_header, and layout_regions for classification evidence.

    Returns classification result with predicted_document_type, confidence,
    classification_status, and evidence.
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "phase": "DOCUMENT_CLASSIFICATION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")

    if not all([record_id, document_id, ingestion_id]):
        return jsonify({
            "phase": "DOCUMENT_CLASSIFICATION",
            "status": "FAILED",
            "error_code": "MISSING_PARAMETERS",
            "message": "record_id, document_id, and ingestion_id are required",
        }), 400

    logger.info(
        f"Classification requested for document_id={document_id}, "
        f"ingestion_id={ingestion_id}"
    )

    service = DocumentClassificationService()
    result = service.classify(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
        ocr_text=data.get("ocr_text"),
        title_or_header=data.get("title_or_header"),
        layout_regions=data.get("layout_regions"),
    )

    status_code = 200 if result.classification_status in (
        ClassificationStatus.HIGH_CONFIDENCE,
        ClassificationStatus.REVIEW_REQUIRED,
    ) else 200
    return jsonify(result.to_dict()), status_code

@app.route("/api/digitization/ocr-config", methods=["POST"])
def ocr_config():
    """Phase 06 - OCR Configuration endpoint.

    Expects JSON with record_id, document_id, ingestion_id.
    Optionally accepts classification result, preprocessed paths, and document metadata.

    Returns OCR configuration for Phase 06.
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "phase": "OCR_CONFIGURATION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")

    if not all([record_id, document_id, ingestion_id]):
        return jsonify({
            "phase": "OCR_CONFIGURATION",
            "status": "FAILED",
            "error_code": "MISSING_PARAMETERS",
            "message": "record_id, document_id, and ingestion_id are required",
        }), 400

    logger.info(
        f"OCR configuration requested for document_id={document_id}, "
        f"ingestion_id={ingestion_id}"
    )

    service = OCRConfigurationService()
    result = service.configure_ocr(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
        document_type=data.get("document_type"),
        classification_confidence=data.get("classification_confidence", 0.0),
        classification_status=data.get("classification_status"),
        preprocessed_paths=data.get("preprocessed_paths"),
        original_path=data.get("original_path"),
        is_native_pdf=data.get("is_native_pdf", False),
        has_tables=data.get("has_tables", True),
    )

    status_code = 200 if result.status == ConfigurationStatus.SUCCESS else 400
    return jsonify(result.to_dict()), status_code

@app.route("/api/digitization/language-capabilities", methods=["GET"])
def language_capabilities():
    """Multilingual capability matrix (honest CONFIGURED != VERIFIED)."""
    try:
        tesseract_installed = probe_tesseract_installed()
        matrix = build_capability_matrix(
            tesseract_installed=tesseract_installed,
            ollama_models=[],
        )
        return jsonify({
            "status": "SUCCESS",
            "scheduled_languages": SCHEDULED_LANGUAGES,
            "tesseract_installed": tesseract_installed.get("merged", []),
            "verified_languages": sorted(tesseract_installed.get("merged", [])),
            "capabilities": matrix,
        }), 200
    except Exception as exc:  # pragma: no cover - defensive boundary
        return jsonify({
            "status": "FAILED",
            "error_code": "CAPABILITY_MATRIX_ERROR",
            "message": str(exc),
        }), 500

@app.route("/api/digitization/language-detection", methods=["POST"])
def language_detection():
    """Phase 05 - Language & Script Detection endpoint.

    Expects JSON with record_id, document_id.
    Optionally accepts classification_id, ingestion_id, document_type,
    classification_confidence, ocr_text / provisional_text.

    Returns language + script + OCR routing for Phase 06.
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "phase": "PHASE_05_LANGUAGE_SCRIPT_DETECTION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")

    if not all([record_id, document_id]):
        return jsonify({
            "phase": "PHASE_05_LANGUAGE_SCRIPT_DETECTION",
            "status": "FAILED",
            "error_code": "MISSING_PARAMETERS",
            "message": "record_id and document_id are required",
        }), 400

    logger.info(
        f"Language detection requested for document_id={document_id}, "
        f"record_id={record_id}"
    )

    try:
        service = LanguageAndScriptDetectionService()
        result = service.detect(
            record_id=record_id,
            document_id=document_id,
            classification_id=data.get("classification_id"),
            ingestion_id=data.get("ingestion_id"),
            document_type=data.get("document_type"),
            classification_confidence=data.get("classification_confidence", 0.0),
            ocr_text=data.get("ocr_text"),
            provisional_text=data.get("provisional_text"),
            use_gemini=bool(data.get("use_gemini", False)),
            force=bool(data.get("force", False)),
        )
    except ValueError as exc:
        return jsonify({
            "phase": "PHASE_05_LANGUAGE_SCRIPT_DETECTION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": str(exc),
        }), 400

    status_code = 200 if result.status == LanguageDetectionAPIStatus.SUCCESS else 400
    return jsonify(result.to_dict()), status_code

@app.route("/api/digitization/ocr", methods=["POST"])
def perform_ocr():
    """Phase 06 - OCR endpoint.

    Expects JSON with record_id, document_id, ingestion_id, and ocr_config.

    Returns OCR result with text, words, bounding boxes, and confidence.
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "phase": "OCR",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")
    ocr_config = data.get("ocr_config", {})

    if not all([record_id, document_id, ingestion_id]):
        return jsonify({
            "phase": "OCR",
            "status": "FAILED",
            "error_code": "MISSING_PARAMETERS",
            "message": "record_id, document_id, and ingestion_id are required",
        }), 400

    logger.info(
        f"OCR requested for document_id={document_id}, "
        f"ingestion_id={ingestion_id}"
    )

    service = OCRService()
    result = service.perform_ocr(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
        engine=ocr_config.get("engine", "TESSERACT"),
        language=ocr_config.get("language", "eng"),
        input_source=ocr_config.get("input_source", "PREPROCESSED_IMAGE"),
        input_paths=ocr_config.get("input_paths"),
        native_pdf_text_attempt=ocr_config.get("native_pdf_text_attempt", False),
        table_aware=ocr_config.get("table_aware", True),
        tesseract_psm=ocr_config.get("tesseract_psm", 6),
        tesseract_oem=ocr_config.get("tesseract_oem", 3),
        language_detection=data.get("language_detection"),
        document_type=data.get("document_type") or ocr_config.get("document_type"),
    )

    status_code = 200
    return jsonify(result.to_dict()), status_code

@app.route("/api/digitization/extract", methods=["POST"])
def extract_fields():
    """Phase 07 - Semantic Field Extraction endpoint.

    Expects JSON with record_id, document_id, ingestion_id.

    Returns extracted semantic fields with confidence and evidence.
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "phase": "SEMANTIC_FIELD_EXTRACTION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")

    if not all([record_id, document_id, ingestion_id]):
        return jsonify({
            "phase": "SEMANTIC_FIELD_EXTRACTION",
            "status": "FAILED",
            "error_code": "MISSING_PARAMETERS",
            "message": "record_id, document_id, and ingestion_id are required",
        }), 400

    logger.info(
        f"Extraction requested for document_id={document_id}, "
        f"ingestion_id={ingestion_id}"
    )

    service = SemanticExtractionService()
    result = service.extract_fields(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
    )

    status_code = 200 if result.status != ExtractionStatus.FAILED else 400
    return jsonify(result.to_dict()), status_code

@app.route("/api/digitization/confidence-completeness", methods=["POST"])
def confidence_completeness():
    """Phase 08 - Confidence & Completeness Check endpoint.

    Expects JSON with record_id, document_id, ingestion_id.

    Evaluates Phase 07 extraction quality: per-field confidence,
    document-type-aware completeness, missing/unreadable distinction,
    conflict surfacing, remediation signals for Phase 09.
    """
    data = request.get_json()

    if data is None:
        return jsonify({
            "phase": "CONFIDENCE_COMPLETENESS",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")

    if not all([record_id, document_id, ingestion_id]):
        return jsonify({
            "phase": "CONFIDENCE_COMPLETENESS",
            "status": "FAILED",
            "error_code": "MISSING_PARAMETERS",
            "message": "record_id, document_id, and ingestion_id are required",
        }), 400

    logger.info(
        f"Confidence & completeness check requested for document_id={document_id}, "
        f"record_id={record_id}"
    )

    service = ConfidenceCompletenessService()
    result = service.evaluate(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
    )

    status_code = 200 if result.status != RecordStatus.EXTRACTION_ERROR else 400
    return jsonify(result.to_dict()), status_code
