"""Decomposed from flask_api_reference.py: workflow. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import logging
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename
from app.ocr.remediation.models import (
    RemediationErrorCode,
)
from app.ocr.remediation.service import (
    get_uploader_remediation_service,
)
from app.ocr.reprocessing.models import (
    ReprocessingErrorCode,
)
from app.ocr.reprocessing.service import (
    get_reprocessing_service,
)
from app.ocr.resubmission.models import (
    ResubmissionErrorCode,
)
from app.ocr.resubmission.service import (
    get_resubmission_service,
)
from app.ocr.validation.models import (
    ValidationErrorCode,
)
from app.ocr.validation.service import (
    get_automated_validation_service,
)
from .app_factory import *

import logging
logger = logging.getLogger(__name__)

@app.route("/api/digitization/remediation", methods=["POST"])
def create_remediation():
    """Phase 09 - Uploader Remediation session creation.

    Expects JSON with record_id, document_id, ingestion_id.
    Optionally accepts created_by, force, trigger_statuses, severity_override.

    Converts the Phase 08 assessment into an actionable remediation workflow.
    """
    data = request.get_json(silent=True)

    if data is None:
        return jsonify({
            "phase": "UPLOADER_REMEDIATION",
            "status": "FAILED",
            "error_code": RemediationErrorCode.INVALID_REQUEST.value,
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")

    if not all([record_id, document_id]):
        return jsonify({
            "phase": "UPLOADER_REMEDIATION",
            "status": "FAILED",
            "error_code": RemediationErrorCode.MISSING_PARAMETERS.value,
            "message": "record_id and document_id are required",
        }), 400

    logger.info(f"Remediation requested for document_id={document_id}, record_id={record_id}")

    service = get_uploader_remediation_service()
    result = service.create_remediation(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id or "",
        created_by=data.get("created_by", ""),
        force=bool(data.get("force", False)),
        trigger_statuses=tuple(data.get("trigger_statuses", []))
        if isinstance(data.get("trigger_statuses"), list) else None,
        severity_override=data.get("severity_override"),
    )

    status_code = 200 if result.get("status") != "FAILED" else 400
    return jsonify(result), status_code

@app.route("/api/digitization/remediation/<record_id>", methods=["GET"])
def get_remediation_by_record(record_id):
    """Phase 09 - List remediation sessions for a record."""
    service = get_uploader_remediation_service()
    result = service.get_remediation_by_record(record_id)
    return jsonify(result), 200

@app.route("/api/digitization/remediation/<remediation_id>/submit", methods=["POST"])
def submit_remediation(remediation_id):
    """Phase 09 - Submit uploader evidence for a remediation session.

    multipart/form-data:
        files: one or more evidence files (PDF/PNG/JPG/TIFF...)
        record_id (form field)
        uploader (form field, optional)
        resolution_notes (form field, optional)
    """
    form = request.form
    record_id = form.get("record_id", "")

    if not record_id:
        return jsonify({
            "phase": "UPLOADER_REMEDIATION",
            "status": "FAILED",
            "error_code": RemediationErrorCode.MISSING_PARAMETERS.value,
            "message": "record_id is required in the form data",
        }), 400

    files = [
        (f.filename, f.read())
        for f in request.files.getlist("files") if f and f.filename
    ]
    if not files:
        return jsonify({
            "phase": "UPLOADER_REMEDIATION",
            "status": "FAILED",
            "error_code": RemediationErrorCode.NO_FILES_PROVIDED.value,
            "message": "At least one evidence file must be attached.",
        }), 400

    logger.info(f"Remediation evidence submitted: remediation_id={remediation_id}, record_id={record_id}")

    service = get_uploader_remediation_service()
    result = service.submit_remediation(
        record_id=record_id,
        remediation_id=remediation_id,
        uploader=form.get("uploader", ""),
        resolution_notes=form.get("resolution_notes", ""),
        files=files,
    )

    status_code = 200 if result.get("status") != "FAILED" else 400
    return jsonify(result), status_code

@app.route("/api/digitization/resubmission", methods=["POST"])
def create_resubmission():
    """Phase 10 - Register a resubmission for a remediation session.

    JSON body:
        record_id (required), document_id (required), remediation_id (required)
        submission_type (optional, override inference)
        page_assignments (optional, dict evidence_submission_id -> page)
        notes (optional)
        created_by (optional)

    Phase 09 must be SUBMITTED (evidence already attached). Phase 10
    validates the evidence set structurally, registers an immutable
    submission, advances the remediation to PROCESSING and hands off
    to Phase 11 for actual reprocessing.
    """
    data = request.get_json(silent=True)

    if data is None:
        return jsonify({
            "phase": "RESUBMISSION",
            "status": "FAILED",
            "error_code": ResubmissionErrorCode.INVALID_REQUEST.value,
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    remediation_id = data.get("remediation_id")

    if not all([record_id, document_id, remediation_id]):
        return jsonify({
            "phase": "RESUBMISSION",
            "status": "FAILED",
            "error_code": ResubmissionErrorCode.MISSING_PARAMETERS.value,
            "message": "record_id, document_id and remediation_id are required",
        }), 400

    logger.info(f"Resubmission registered for remediation_id={remediation_id}, record_id={record_id}")

    service = get_resubmission_service()
    result = service.create_resubmission(
        record_id=record_id,
        document_id=document_id,
        remediation_id=remediation_id,
        submission_type=data.get("submission_type"),
        created_by=data.get("created_by", ""),
        page_assignments=data.get("page_assignments"),
        notes=data.get("notes"),
    )

    status_code = 200 if result.get("status") != "FAILED" else 400
    return jsonify(result), status_code

@app.route("/api/digitization/resubmission/<submission_id>", methods=["GET"])
def get_resubmission(submission_id):
    """Phase 10 - Fetch a single resubmission by id."""
    service = get_resubmission_service()
    result = service.get_submission(submission_id)
    if result is None:
        return jsonify({
            "phase": "RESUBMISSION",
            "status": "FAILED",
            "error_code": ResubmissionErrorCode.SUBMISSION_NOT_FOUND.value,
            "message": f"Resubmission {submission_id} not found.",
        }), 404
    return jsonify(result), 200

@app.route("/api/digitization/records/<record_id>/submissions", methods=["GET"])
def get_record_submissions(record_id):
    """Phase 10 - List all resubmissions for a record."""
    service = get_resubmission_service()
    result = service.get_record_submissions(record_id)
    return jsonify(result), 200

@app.route("/api/digitization/reprocess", methods=["POST"])
def reprocess_submission():
    """Phase 11 - Reprocess a Phase 10 validated resubmission.

    JSON body:
        record_id (required), submission_id (required), by (optional)

    Re-runs the pipeline Phase 02 -> 08 against the corrected evidence in a
    per-submission scope, never overwriting the original record outputs, and
    returns a run record with the fresh Phase 08 verdict + field changes.
    """
    data = request.get_json(silent=True)

    if data is None:
        return jsonify({
            "phase": "REPROCESSING",
            "status": "FAILED",
            "error_code": ReprocessingErrorCode.INVALID_REQUEST.value,
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    submission_id = data.get("submission_id")

    if not all([record_id, submission_id]):
        return jsonify({
            "phase": "REPROCESSING",
            "status": "FAILED",
            "error_code": ReprocessingErrorCode.MISSING_PARAMETERS.value,
            "message": "record_id and submission_id are required",
        }), 400

    logger.info(f"Phase 11 reprocessing requested for submission_id={submission_id}, record_id={record_id}")

    service = get_reprocessing_service()
    result = service.reprocess(
        submission_id=submission_id,
        by=data.get("by", "SYSTEM"),
        record_id=record_id,
    )

    status_code = 200 if result.get("status") != "FAILED" else 400
    return jsonify(result), status_code

@app.route("/api/digitization/reprocess/<reprocessing_id>", methods=["GET"])
def get_reprocessing(reprocessing_id):
    """Phase 11 - Fetch a single reprocessing run by id."""
    service = get_reprocessing_service()
    result = service.get_reprocessing(reprocessing_id)
    if result is None:
        return jsonify({
            "phase": "REPROCESSING",
            "status": "FAILED",
            "error_code": ReprocessingErrorCode.RUN_NOT_FOUND.value,
            "message": f"Reprocessing run {reprocessing_id} not found.",
        }), 404
    return jsonify(result), 200

@app.route("/api/digitization/records/<record_id>/reprocessing-history", methods=["GET"])
def get_record_reprocessing_history(record_id):
    """Phase 11 - List all reprocessing runs for a record."""
    service = get_reprocessing_service()
    result = service.get_record_reprocessing_history(record_id)
    return jsonify(result), 200

@app.route("/api/digitization/reprocess/<reprocessing_id>/retry", methods=["POST"])
def retry_reprocessing(reprocessing_id):
    """Phase 11 - Retry a FAILED run whose error was TRANSIENT."""
    data = request.get_json(silent=True) or {}
    service = get_reprocessing_service()
    result = service.retry(
        reprocessing_id=reprocessing_id,
        by=data.get("by", "SYSTEM"),
    )
    status_code = 200 if result.get("status") != "FAILED" else 400
    return jsonify(result), status_code

@app.route("/api/digitization/automated-validation", methods=["POST"])
def automated_validation():
    """Phase 09 - Automated Data Validation gate.

    Expects JSON with record_id, document_id, ingestion_id.
    Optionally accepts reprocessing_id (validates the fresh Phase 08 snapshot
    from a specific legacy reprocessing run) and classification (Phase 04 result).

    Runs deterministic rule-based checks on Phase 08 fields, scans the local
    dataset for anomalies and duplicate records, and hands off to
    Phase 10 (Anomaly & Duplicate Detection) with a decision. It never approves a record.
    """
    data = request.get_json(silent=True)

    if data is None:
        return jsonify({
            "phase": "AUTOMATED_VALIDATION",
            "status": "FAILED",
            "error_code": ValidationErrorCode.INVALID_REQUEST.value,
            "message": "Request body must be JSON",
        }), 400

    record_id = data.get("record_id")
    document_id = data.get("document_id")
    ingestion_id = data.get("ingestion_id")

    if not all([record_id, document_id, ingestion_id]):
        return jsonify({
            "phase": "AUTOMATED_VALIDATION",
            "status": "FAILED",
            "error_code": ValidationErrorCode.MISSING_PARAMETERS.value,
            "message": "record_id, document_id, and ingestion_id are required",
        }), 400

    logger.info(
        f"Automated validation requested for document_id={document_id}, "
        f"record_id={record_id}"
    )

    service = get_automated_validation_service()
    result = service.evaluate(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
        reprocessing_id=data.get("reprocessing_id"),
        classification=data.get("classification"),
    )

    status_code = 200 if result.status not in (
        "FAILED", "INVALID_PARAMETERS"
    ) else 400
    return jsonify(result.to_dict()), status_code

@app.route("/api/digitization/validation/<validation_run_id>", methods=["GET"])
def get_validation_run(validation_run_id):
    """Phase 09 - Fetch a single validation run by id."""
    service = get_automated_validation_service()
    result = service.get_validation_run(validation_run_id)
    if result is None:
        return jsonify({
            "phase": "AUTOMATED_VALIDATION",
            "status": "FAILED",
            "error_code": ValidationErrorCode.RUN_NOT_FOUND.value,
            "message": f"Validation run {validation_run_id} not found.",
        }), 404
    return jsonify(result), 200

@app.route("/api/digitization/records/<record_id>/validations", methods=["GET"])
def get_record_validations(record_id):
    """Phase 09 - List all validation runs for a record."""
    service = get_automated_validation_service()
    result = service.get_record_validations(record_id)
    return jsonify(result), 200

@app.route("/api/digitization/anomaly-duplicate", methods=["POST"])
def anomaly_duplicate_stage():
    """Phase 10 - Anomaly & Duplicate Detection stage.

    Chains off a Phase 09 run (validation_run_id) or runs the engines
    standalone on the Phase 08 assessment (record_id/document_id/
    ingestion_id). Never fabricates; failures are explicit.
    """
    from ..anomaly.stage import get_anomaly_duplicate_stage_service

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "phase": "ANOMALY_DUPLICATE_DETECTION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    service = get_anomaly_duplicate_stage_service()
    if data.get("validation_run_id"):
        result = service.create_from_validation_run(data["validation_run_id"])
    else:
        result = service.create_standalone(
            record_id=data.get("record_id", ""),
            document_id=data.get("document_id", ""),
            ingestion_id=data.get("ingestion_id", ""),
        )

    status_code = 200 if result.status == "SUCCESS" else (
        404 if result.error_code == "VALIDATION_RUN_NOT_FOUND"
        or result.error_code == "PHASE_08_RESULT_NOT_FOUND" else 400
    )
    return jsonify(result.to_dict()), status_code

@app.route("/api/digitization/anomaly-duplicate/<stage_id>", methods=["GET"])
def get_anomaly_duplicate_stage(stage_id):
    """Phase 10 - Fetch an anomaly/duplicate stage record by id."""
    from ..anomaly.stage import get_anomaly_duplicate_stage_service

    service = get_anomaly_duplicate_stage_service()
    result = service.get_stage(stage_id)
    if result is None:
        return jsonify({
            "phase": "ANOMALY_DUPLICATE_DETECTION",
            "status": "FAILED",
            "error_code": "STAGE_NOT_FOUND",
            "message": f"Anomaly/duplicate stage {stage_id} not found.",
        }), 404
    return jsonify(result), 200

@app.route("/api/digitization/hitl-1/open", methods=["POST"])
def hitl1_open():
    """Phase 11 - Open an HITL-1 verification session from a validation run."""
    from ..hitl.service import get_hitl1_service

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "phase": "HITL_1_VERIFICATION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    service = get_hitl1_service()
    session = service.open_session(
        validation_run_id=data.get("validation_run_id", ""),
        reviewer=data.get("reviewer", ""),
    )
    body = session.to_dict()
    if session.error_code:
        status_code = 404 if session.error_code == "VALIDATION_RUN_NOT_FOUND" else 400
        return jsonify({
            "phase": "HITL_1_VERIFICATION",
            "status": "FAILED",
            **{k: v for k, v in body.items() if k in ("error_code", "error_message")},
        }), status_code
    return jsonify(body), 200

@app.route("/api/digitization/hitl-1/<hitl1_id>", methods=["GET"])
def hitl1_get(hitl1_id):
    """Phase 11 - Fetch an HITL-1 session by id."""
    from ..hitl.service import get_hitl1_service

    service = get_hitl1_service()
    result = service.get_session(hitl1_id)
    if result is None:
        return jsonify({
            "phase": "HITL_1_VERIFICATION",
            "status": "FAILED",
            "error_code": "SESSION_NOT_FOUND",
            "message": f"HITL-1 session {hitl1_id} not found.",
        }), 404
    return jsonify(result), 200

@app.route("/api/digitization/hitl-1/<hitl1_id>/review-field", methods=["POST"])
def hitl1_review_field(hitl1_id):
    """Phase 11 - Record one field review (VERIFY/CORRECT/UNRESOLVED)."""
    from ..hitl.service import get_hitl1_service

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "phase": "HITL_1_VERIFICATION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    service = get_hitl1_service()
    session = service.review_field(
        hitl1_id=hitl1_id,
        field=data.get("field", ""),
        action=data.get("action", ""),
        value=data.get("value"),
        note=data.get("note", ""),
        reviewer=data.get("reviewer", ""),
    )
    body = session.to_dict()
    if session.error_code:
        status_code = 404 if session.error_code == "SESSION_NOT_FOUND" else 400
        return jsonify({
            "phase": "HITL_1_VERIFICATION",
            "status": "FAILED",
            **{k: v for k, v in body.items() if k in ("error_code", "error_message")},
        }), status_code
    return jsonify(body), 200

@app.route("/api/digitization/hitl-1/<hitl1_id>/submit", methods=["POST"])
def hitl1_submit(hitl1_id):
    """Phase 11 - Submit the human HITL-1 decision.

    Only an explicit human submit with a reviewer identity decides.
    VERIFIED requires all flagged fields dispositioned; CORRECTION_REQUIRED
    and REJECTED require a reason.
    """
    from ..hitl.service import get_hitl1_service

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "phase": "HITL_1_VERIFICATION",
            "status": "FAILED",
            "error_code": "INVALID_REQUEST",
            "message": "Request body must be JSON",
        }), 400

    service = get_hitl1_service()
    session = service.submit(
        hitl1_id=hitl1_id,
        decision=data.get("decision", ""),
        reviewer=data.get("reviewer", ""),
        notes=data.get("notes", ""),
    )
    body = session.to_dict()
    if session.error_code:
        status_code = 404 if session.error_code == "SESSION_NOT_FOUND" else 400
        return jsonify({
            "phase": "HITL_1_VERIFICATION",
            "status": "FAILED",
            **{k: v for k, v in body.items() if k in ("error_code", "error_message")},
        }), status_code
    return jsonify(body), 200
