"""Decomposed from flask_api_reference.py: app_factory. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (OCR_DIR)
import logging
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename


import logging
logger = logging.getLogger(__name__)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = Flask(__name__)

CORS(app, origins=["http://localhost:3005", "http://127.0.0.1:3005"], supports_credentials=True)

if not os.getenv("FLASK_SECRET_KEY"):
    logger.warning(
        "FLASK_SECRET_KEY is not set; using an insecure dev fallback. "
        "Set FLASK_SECRET_KEY in .env for any non-local use."
    )

app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-in-production")

app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_FILE_SIZE_MB", 50)) * 1024 * 1024

UPLOAD_FOLDER = OCR_DIR / "uploads"

UPLOAD_FOLDER.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".tiff",
    ".tif",
    ".webp",
}

def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

def _safe_name(value: str, fallback: str = "document") -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", value or "").strip("._-")
    return cleaned or fallback

@app.route("/")
def index():
    return jsonify({
        "service": "ZameenAI Land Record Digitization API",
        "version": "1.4.0",
        "phase": "01-11 Document Processing, Resubmission & Reprocessing",
        "status": "OPERATIONAL",
        "endpoints": {
            "POST /api/digitization/ingest": {
                "description": "Phase 01 - Document ingestion",
                "request": "multipart/form-data with 'file' field",
                "supported_types": [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"]
            },
            "POST /api/digitization/ingest/demo": {
                "description": "Phase 01 - Isolated demo ingestion of a bundled sample (no upload)",
                "request": "JSON with optional sample: clear/medium/low/hindi/bengali"
            },
            "POST /api/digitization/quality-check": {
                "description": "Phase 02 - Document quality check",
                "request": "JSON with record_id, document_id, ingestion_id"
            },
            "POST /api/digitization/preprocess": {
                "description": "Phase 03 - AI document preprocessing",
                "request": "JSON with record_id, document_id, ingestion_id"
            },
            "POST /api/digitization/classify": {
                "description": "Phase 04 - Document classification",
                "request": "JSON with record_id, document_id, ingestion_id"
            },
            "POST /api/digitization/ocr-config": {
                "description": "Phase 06 - OCR configuration",
                "request": "JSON with record_id, document_id, ingestion_id"
            },
            "GET /api/digitization/language-capabilities": {
                "description": "Multilingual capability matrix (22 scheduled languages; honest VERIFIED/UNAVAILABLE/NOT_VERIFIED)",
                "request": "GET"
            },
            "POST /api/digitization/language-detection": {
                "description": "Phase 05 - Language & script detection",
                "request": "JSON with record_id, document_id, classification_id/document_type"
            },
            "POST /api/digitization/ocr": {
                "description": "Phase 06 - OCR and text recognition",
                "request": "JSON with record_id, document_id, ingestion_id, ocr_config"
            },
            "POST /api/digitization/extract": {
                "description": "Phase 07 - Semantic field extraction",
                "request": "JSON with record_id, document_id, ingestion_id"
            },
            "POST /api/digitization/confidence-completeness": {
                "description": "Phase 08 - Confidence & completeness check",
                "request": "JSON with record_id, document_id, ingestion_id"
            },
            "POST /api/digitization/automated-validation": {
                "description": "Phase 09 - Automated data validation gate (deterministic rules)",
                "request": "JSON with record_id, document_id, ingestion_id, optional reprocessing_id/classification"
            },
            "GET /api/digitization/validation/<validation_run_id>": {
                "description": "Phase 09 - Fetch a single validation run by id",
                "request": "No body; validation_run_id in path"
            },
            "GET /api/digitization/records/<record_id>/validations": {
                "description": "Phase 09 - List validation runs for a record",
                "request": "No body; record_id in path"
            },
            "POST /api/digitization/anomaly-duplicate": {
                "description": "Phase 10 - Anomaly & duplicate detection stage for a validation run",
                "request": "JSON with validation_run_id, or record_id/document_id/ingestion_id"
            },
            "GET /api/digitization/anomaly-duplicate/<stage_id>": {
                "description": "Phase 10 - Fetch an anomaly/duplicate stage record by id",
                "request": "No body; stage_id in path"
            },
            "POST /api/digitization/hitl-1/open": {
                "description": "Phase 11 - Open an HITL-1 verification session for a validation run",
                "request": "JSON with validation_run_id, reviewer"
            },
            "GET /api/digitization/hitl-1/<hitl1_id>": {
                "description": "Phase 11 - Fetch an HITL-1 session by id",
                "request": "No body; hitl1_id in path"
            },
            "POST /api/digitization/hitl-1/<hitl1_id>/review-field": {
                "description": "Phase 11 - Record a field review (verify/correct/unresolved + note)",
                "request": "JSON with field, action, value?, note?"
            },
            "POST /api/digitization/hitl-1/<hitl1_id>/submit": {
                "description": "Phase 11 - Submit the HITL-1 decision (VERIFIED/CORRECTION_REQUIRED/REJECTED)",
                "request": "JSON with decision, reviewer, notes?"
            },
            "POST /api/digitization/remediation": {
                "description": "Legacy remediation loop (preserved for future Phase 12; not part of the 01-11 production path) - Create uploader remediation session from Phase 08 assessment",
                "request": "JSON with record_id, document_id, ingestion_id, optional force/severity_override"
            },
            "GET /api/digitization/remediation/<record_id>": {
                "description": "Legacy remediation loop - List remediation sessions for a record",
                "request": "No body; record_id in path"
            },
            "POST /api/digitization/remediation/<remediation_id>/submit": {
                "description": "Legacy remediation loop - Submit uploader evidence for a remediation session",
                "request": "multipart/form-data with files + uploader + resolution_notes"
            },
            "POST /api/digitization/resubmission": {
                "description": "Legacy remediation loop - Register a resubmission for a remediation session",
                "request": "JSON with record_id, document_id, remediation_id, optional submission_type/page_assignments/notes"
            },
            "GET /api/digitization/resubmission/<submission_id>": {
                "description": "Legacy remediation loop - Fetch a resubmission by id",
                "request": "No body; submission_id in path"
            },
            "GET /api/digitization/records/<record_id>/submissions": {
                "description": "Legacy remediation loop - List resubmissions for a record",
                "request": "No body; record_id in path"
            },
            "POST /api/digitization/reprocess": {
                "description": "Legacy remediation loop - Reprocess a validated resubmission (Phase 03 -> 08)",
                "request": "JSON with record_id, submission_id, optional by"
            },
            "GET /api/digitization/reprocess/<reprocessing_id>": {
                "description": "Legacy remediation loop - Fetch a reprocessing run by id",
                "request": "No body; reprocessing_id in path"
            },
            "GET /api/digitization/records/<record_id>/reprocessing-history": {
                "description": "Legacy remediation loop - List reprocessing runs for a record",
                "request": "No body; record_id in path"
            },
            "POST /api/digitization/reprocess/<reprocessing_id>/retry": {
                "description": "Legacy remediation loop - Retry a FAILED run with a TRANSIENT error",
                "request": "JSON with optional by; reprocessing_id in path"
            }
        },
        "frontend": "http://localhost:3005"
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
