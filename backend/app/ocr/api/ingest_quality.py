"""Decomposed from flask_api_reference.py: ingest_quality. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR, BACKEND_DIR, OCR_DIR)
import logging
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
from app.ocr.ingestion.models import (
    IngestionStatus,
)
from app.ocr.ingestion.service import (
    get_ingestion_service,
)
from app.ocr.preprocessing.ai_service import (
    get_preprocessing_service,
)
from app.ocr.quality.service import (
    get_quality_service,
)
from .app_factory import *

import logging
logger = logging.getLogger(__name__)

@app.route("/api/digitization/ingest", methods=["POST"])
def ingest_document():
    if "file" not in request.files:
        return jsonify({
            "phase": "DOCUMENT_INGESTION",
            "status": "FAILED",
            "error_code": "NO_FILE_PROVIDED",
            "message": "No file was uploaded.",
            "details": {}
        }), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({
            "phase": "DOCUMENT_INGESTION",
            "status": "FAILED",
            "error_code": "NO_FILE_PROVIDED",
            "message": "No file was selected.",
            "details": {}
        }), 400

    try:
        file_content = file.read()
    except Exception as e:
        logger.exception("Failed to read uploaded file")
        return jsonify({
            "phase": "DOCUMENT_INGESTION",
            "status": "FAILED",
            "error_code": "FILE_UNREADABLE",
            "message": "Could not read the uploaded file.",
            "details": {"filename": file.filename}
        }), 400

    original_filename = file.filename

    ingestion_service = get_ingestion_service()
    result = ingestion_service.ingest(file_content, original_filename)

    status_code = 200 if result.status == IngestionStatus.SUCCESS else 400
    return jsonify(result.to_dict()), status_code

def _demo_sample_path(relative: str) -> Path:
    """Locate a bundled demo sample.

    Probes the legacy ``app/ocr/uploads`` location first, then the
    migrated ``backend/app/uploads`` and ``backend/uploads`` trees where
    the sample scans actually live in ZameenAI.
    """
    for base in (OCR_DIR, APP_DIR, BACKEND_DIR):
        candidate = base / relative
        if candidate.is_file():
            return candidate
    return OCR_DIR / relative

DEMO_SAMPLES = {
    "clear": "uploads/samples/test sample english enhanced.png",
    "medium": "uploads/samples/test sample english medium.png",
    "low": "uploads/samples/test sample english low.png",
    "hindi": "uploads/test sample hindi enhanced.png",
    "bengali": "uploads/test sample bengali enhanced.png",
}

@app.route("/api/digitization/ingest/demo", methods=["POST"])
def ingest_demo():
    """Isolated demo ingestion: ingest a bundled repo sample (no upload).

    Runs the real Phase 01 service on real sample bytes and returns the
    standard ingestion payload plus demo/sample markers. Accepts JSON
    {"sample": "<key>"} (default "clear"). Unknown keys and missing sample
    files are explicit 400s — nothing is fabricated.
    """
    data = request.get_json(silent=True) or {}
    sample = str(data.get("sample", "clear") or "clear").strip().lower()

    if sample not in DEMO_SAMPLES:
        return jsonify({
            "phase": "DOCUMENT_INGESTION",
            "status": "FAILED",
            "error_code": "UNKNOWN_DEMO_SAMPLE",
            "message": f"Unknown demo sample: {sample!r}.",
            "details": {"supported_samples": sorted(DEMO_SAMPLES)},
        }), 400

    sample_path = _demo_sample_path(DEMO_SAMPLES[sample])
    if not sample_path.exists():
        return jsonify({
            "phase": "DOCUMENT_INGESTION",
            "status": "FAILED",
            "error_code": "DEMO_SAMPLE_MISSING",
            "message": f"Demo sample file not found: {sample}.",
            "details": {},
        }), 400

    try:
        file_content = sample_path.read_bytes()
    except Exception as e:
        logger.exception("Failed to read demo sample file")
        return jsonify({
            "phase": "DOCUMENT_INGESTION",
            "status": "FAILED",
            "error_code": "FILE_UNREADABLE",
            "message": "Could not read the demo sample file.",
            "details": {"filename": sample_path.name},
        }), 400

    ingestion_service = get_ingestion_service()
    result = ingestion_service.ingest(file_content, sample_path.name)

    payload = result.to_dict()
    payload["demo"] = True
    payload["sample"] = sample
    status_code = 200 if result.status == IngestionStatus.SUCCESS else 400
    return jsonify(payload), status_code

@app.route("/api/digitization/quality-check", methods=["POST"])
def quality_check():
    data = request.get_json()

    if not data:
        return jsonify({
            "phase": "DOCUMENT_QUALITY_COMPLETENESS_CHECK",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")

    if not all([record_id, document_id, ingestion_id]):
        return jsonify({
            "phase": "DOCUMENT_QUALITY_COMPLETENESS_CHECK",
            "status": "FAILED",
            "error_code": "MISSING_PARAMETERS",
            "message": "record_id, document_id, and ingestion_id are required",
        }), 400

    logger.info(f"Quality check requested for document_id={document_id}, ingestion_id={ingestion_id}")

    quality_service = get_quality_service()
    result = quality_service.check_quality(record_id, document_id, ingestion_id)

    status_code = 200 if result.status == "SUCCESS" else 400
    return jsonify(result.to_dict()), status_code

@app.route("/api/digitization/preprocess", methods=["POST"])
def preprocess_document():
    data = request.get_json()

    if not data:
        return jsonify({
            "phase": "AI_DOCUMENT_PREPROCESSING",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")

    if not all([record_id, document_id, ingestion_id]):
        return jsonify({
            "phase": "AI_DOCUMENT_PREPROCESSING",
            "status": "FAILED",
            "error_code": "MISSING_PARAMETERS",
            "message": "record_id, document_id, and ingestion_id are required",
        }), 400

    logger.info(f"Preprocessing requested for document_id={document_id}, ingestion_id={ingestion_id}")

    preprocessing_service = get_preprocessing_service()
    result = preprocessing_service.preprocess_document(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
    )

    # REJECTED and PARTIAL are structured business outcomes (M12): the
    # frontend displays the rejection payload instead of treating it as a
    # crash. Only FAILED is a transport-level error.
    status_code = 200 if result.status.value in ("SUCCESS", "PARTIAL", "REJECTED") else 400
    return jsonify(result.to_dict()), status_code
