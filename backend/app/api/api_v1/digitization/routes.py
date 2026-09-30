"""FastAPI bridge for the digitization pipeline (Phase 3 of integration).

Mirrors the Flask contract in app.ocr.api.* 1:1 (same services, same
payloads via to_dict(), same error_code envelopes and status codes)
so the SPA can consume the real pipeline over /api/digitization/*
through the served FastAPI app. No processing logic lives here:
every handler delegates to the decomposed service layer.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user

from app.ocr.anomaly.stage import get_anomaly_duplicate_stage_service
from app.ocr.classification.service import DocumentClassificationService
from app.ocr.confidence.models import RecordStatus
from app.ocr.confidence.service import ConfidenceCompletenessService
from app.ocr.extraction.models import ExtractionStatus
from app.ocr.extraction.pipeline import SemanticExtractionService
from app.ocr.hitl.service import get_hitl1_service
from app.ocr.ingestion.models import IngestionStatus
from app.ocr.ingestion.service import get_ingestion_service
from app.ocr.language.capability import build_capability_matrix, probe_tesseract_installed
from app.ocr.language.lang_models import APIStatus as LanguageDetectionAPIStatus
from app.ocr.language.lang_service import LanguageAndScriptDetectionService
from app.ocr.language.registry import SCHEDULED_LANGUAGES
from app.ocr.ocr_config.models import ConfigurationStatus
from app.ocr.ocr_config.service import OCRConfigurationService
from app.ocr.preprocessing.ai_service import get_preprocessing_service
from app.ocr.quality.service import get_quality_service
from app.ocr.recognition.service import OCRService
from app.ocr.remediation.models import RemediationErrorCode
from app.ocr.remediation.service import get_uploader_remediation_service
from app.ocr.reprocessing.models import ReprocessingErrorCode
from app.ocr.reprocessing.service import get_reprocessing_service
from app.ocr.resubmission.models import ResubmissionErrorCode
from app.ocr.resubmission.service import get_resubmission_service
from app.ocr.validation.models import ValidationErrorCode
from app.ocr.validation.service import get_automated_validation_service

from .schemas import (
    AnomalyDuplicateRequest,
    AutomatedValidationRequest,
    ClassifyRequest,
    ConfidenceRequest,
    ExtractRequest,
    HitlReviewRequest,
    HitlSubmitRequest,
    IngestDemoRequest,
    LanguageDetectionRequest,
    OcrConfigRequest,
    OcrRequest,
    OpenHitlRequest,
    PreprocessRequest,
    QualityRequest,
    RemediationRequest,
    ReprocessRequest,
    ResubmissionRequest,
    RetryRequest,
)

router = APIRouter(prefix="/digitization", tags=["digitization"],
                     dependencies=[Depends(get_current_user)])


def _need(user: dict, *permissions: str, request: Request | None = None) -> None:
    """Canonical permission gate (any-of allow-list)."""
    from app.core.permissions import has_permission, is_known_permission
    from fastapi import HTTPException

    for p in permissions:
        if not is_known_permission(p):
            raise HTTPException(status_code=500, detail={
                "code": "UNKNOWN_PERMISSION", "message": f"Unknown permission: {p}",
                "request_id": getattr(getattr(request, "state", None),
                                      "request_id", None)})
    if not any(has_permission(user.get("role", ""), p) for p in permissions):
        raise HTTPException(status_code=403, detail={
            "code": "PERMISSION_DENIED",
            "message": f"Missing one of permissions: {', '.join(permissions)}",
            "request_id": getattr(getattr(request, "state", None),
                                  "request_id", None)})


def _audit(request: Request | None, user: dict, action: str,
           entity_type: str = "", entity_id: str = "",
           new_state: str = "", meta: dict | None = None) -> None:
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        db = _SessionFactory()
        try:
            AuditService(db).log(
                actor_id=user.get("id"), actor_role=user.get("role"), action=action,
                entity_type=entity_type or None, entity_id=entity_id or None,
                new_state=new_state or None,
                request_id=getattr(getattr(request, "state", None), "request_id", None),
                ip_address=request.client.host if request and request.client else None,
                meta=meta or {})
        finally:
            db.close()
    except Exception as exc:
        from app.services.audit_notification_service import report_audit_failure

        report_audit_failure(action, entity_type or "unknown", entity_id or "unknown", exc)


def _missing(*values: Any) -> bool:
    return not all(values)


# ---------------------------------------------------------------------------
# Window 1 — ingestion
# ---------------------------------------------------------------------------


@router.post("/ingest")
def ingest_document(request: Request, file: UploadFile = File(...),
                    user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DOCUMENT.UPLOAD", request=request)
    try:
        content = file.file.read()
    except Exception:
        return JSONResponse({"phase": "DOCUMENT_INGESTION", "status": "FAILED",
                             "error_code": "FILE_UNREADABLE",
                             "message": "Could not read the uploaded file.",
                             "details": {"filename": file.filename}}, status_code=400)
    result = get_ingestion_service().ingest(content, file.filename or "document")
    body = result.to_dict()
    _audit(request, user, "DOCUMENT_UPLOADED", "document",
           str(body.get("document_id", "")), meta={"record_id": body.get("record_id")})
    return JSONResponse(body,
                        status_code=200 if result.status == IngestionStatus.SUCCESS else 400)


@router.post("/ingest/demo")
def ingest_demo(payload: IngestDemoRequest, request: Request,
                user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DOCUMENT.UPLOAD", request=request)
    from app.ocr.api.ingest_quality import DEMO_SAMPLES, _demo_sample_path
    sample = (payload.sample or "clear").strip().lower()
    if sample not in DEMO_SAMPLES:
        return JSONResponse({"phase": "DOCUMENT_INGESTION", "status": "FAILED",
                             "error_code": "UNKNOWN_DEMO_SAMPLE",
                             "message": f"Unknown demo sample: {sample!r}.",
                             "details": {"supported_samples": sorted(DEMO_SAMPLES)}},
                            status_code=400)
    sample_path = _demo_sample_path(DEMO_SAMPLES[sample])
    if not sample_path.exists():
        return JSONResponse({"phase": "DOCUMENT_INGESTION", "status": "FAILED",
                             "error_code": "DEMO_SAMPLE_MISSING",
                             "message": f"Demo sample file not found: {sample}.",
                             "details": {}}, status_code=400)
    result = get_ingestion_service().ingest(sample_path.read_bytes(), sample_path.name)
    body = result.to_dict()
    body["demo"] = True
    body["sample"] = sample
    return JSONResponse(body,
                        status_code=200 if result.status == IngestionStatus.SUCCESS else 400)


# ---------------------------------------------------------------------------
# Windows 2–4 — quality / preprocessing / classification
# ---------------------------------------------------------------------------


@router.post("/quality-check")
def quality_check(payload: QualityRequest, request: Request,
                  user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.PROCESS", "DIGITIZATION.RUN", request=request)
    if _missing(payload.record_id, payload.document_id, payload.ingestion_id):
        return JSONResponse({"phase": "DOCUMENT_QUALITY_COMPLETENESS_CHECK",
                             "status": "FAILED", "error_code": "MISSING_PARAMETERS",
                             "message": "record_id, document_id, and ingestion_id are required"},
                            status_code=400)
    result = get_quality_service().check_quality(
        payload.record_id, payload.document_id, payload.ingestion_id)
    return JSONResponse(result.to_dict(),
                        status_code=200 if result.status == "SUCCESS" else 400)


@router.post("/preprocess")
def preprocess_document(payload: PreprocessRequest, request: Request,
                        user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.PROCESS", "DIGITIZATION.RUN", request=request)
    if _missing(payload.record_id, payload.document_id, payload.ingestion_id):
        return JSONResponse({"phase": "AI_DOCUMENT_PREPROCESSING", "status": "FAILED",
                             "error_code": "MISSING_PARAMETERS",
                             "message": "record_id, document_id, and ingestion_id are required"},
                            status_code=400)
    result = get_preprocessing_service().preprocess_document(
        record_id=payload.record_id, document_id=payload.document_id,
        ingestion_id=payload.ingestion_id)
    ok = result.status.value in ("SUCCESS", "PARTIAL", "REJECTED")
    return JSONResponse(result.to_dict(), status_code=200 if ok else 400)


@router.post("/classify")
def classify_document(payload: ClassifyRequest, request: Request,
                      user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.PROCESS", "DIGITIZATION.RUN", request=request)
    if _missing(payload.record_id, payload.document_id, payload.ingestion_id):
        return JSONResponse({"phase": "DOCUMENT_CLASSIFICATION", "status": "FAILED",
                             "error_code": "MISSING_PARAMETERS",
                             "message": "record_id, document_id, and ingestion_id are required"},
                            status_code=400)
    result = DocumentClassificationService().classify(
        record_id=payload.record_id, document_id=payload.document_id,
        ingestion_id=payload.ingestion_id, ocr_text=payload.ocr_text,
        title_or_header=payload.title_or_header, layout_regions=payload.layout_regions)
    return JSONResponse(result.to_dict(), status_code=200)


# ---------------------------------------------------------------------------
# Window 5 — language / OCR config / OCR
# ---------------------------------------------------------------------------


@router.get("/language-capabilities")
def language_capabilities(request: Request,
                          user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.READ", "DIGITIZATION.READ", request=request)
    try:
        installed = probe_tesseract_installed()
        matrix = build_capability_matrix(tesseract_installed=installed, ollama_models=[])
        return JSONResponse({"status": "SUCCESS", "scheduled_languages": SCHEDULED_LANGUAGES,
                             "tesseract_installed": installed.get("merged", []),
                             "verified_languages": sorted(installed.get("merged", [])),
                             "capabilities": matrix}, status_code=200)
    except Exception as exc:
        return JSONResponse({"status": "FAILED", "error_code": "CAPABILITY_MATRIX_ERROR",
                             "message": str(exc)}, status_code=500)


@router.post("/language-detection")
def language_detection(payload: LanguageDetectionRequest, request: Request,
                       user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.PROCESS", "DIGITIZATION.RUN", request=request)
    if _missing(payload.record_id, payload.document_id):
        return JSONResponse({"phase": "PHASE_05_LANGUAGE_SCRIPT_DETECTION",
                             "status": "FAILED", "error_code": "MISSING_PARAMETERS",
                             "message": "record_id and document_id are required"},
                            status_code=400)
    try:
        result = LanguageAndScriptDetectionService().detect(
            record_id=payload.record_id, document_id=payload.document_id,
            classification_id=payload.classification_id, ingestion_id=payload.ingestion_id,
            document_type=payload.document_type,
            classification_confidence=payload.classification_confidence or 0.0,
            ocr_text=payload.ocr_text, provisional_text=payload.provisional_text,
            use_gemini=bool(payload.use_gemini), force=bool(payload.force))
    except ValueError as exc:
        return JSONResponse({"phase": "PHASE_05_LANGUAGE_SCRIPT_DETECTION",
                             "status": "FAILED", "error_code": "INVALID_REQUEST",
                             "message": str(exc)}, status_code=400)
    ok = result.status == LanguageDetectionAPIStatus.SUCCESS
    return JSONResponse(result.to_dict(), status_code=200 if ok else 400)


@router.post("/ocr-config")
def ocr_config(payload: OcrConfigRequest, request: Request,
               user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.PROCESS", "DIGITIZATION.RUN", request=request)
    if _missing(payload.record_id, payload.document_id, payload.ingestion_id):
        return JSONResponse({"phase": "OCR_CONFIGURATION", "status": "FAILED",
                             "error_code": "MISSING_PARAMETERS",
                             "message": "record_id, document_id, and ingestion_id are required"},
                            status_code=400)
    result = OCRConfigurationService().configure_ocr(
        record_id=payload.record_id, document_id=payload.document_id,
        ingestion_id=payload.ingestion_id, document_type=payload.document_type,
        classification_confidence=payload.classification_confidence or 0.0,
        classification_status=payload.classification_status,
        preprocessed_paths=payload.preprocessed_paths, original_path=payload.original_path,
        is_native_pdf=bool(payload.is_native_pdf), has_tables=payload.has_tables
        if payload.has_tables is not None else True)
    ok = result.status == ConfigurationStatus.SUCCESS
    return JSONResponse(result.to_dict(), status_code=200 if ok else 400)


@router.post("/ocr")
def perform_ocr(payload: OcrRequest, request: Request,
                user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.PROCESS", "DIGITIZATION.RUN", request=request)
    _audit(request, user, "OCR_PROCESSED", "document",
           str(payload.document_id or ""), meta={"record_id": payload.record_id})
    if _missing(payload.record_id, payload.document_id, payload.ingestion_id):
        return JSONResponse({"phase": "OCR", "status": "FAILED",
                             "error_code": "MISSING_PARAMETERS",
                             "message": "record_id, document_id, and ingestion_id are required"},
                            status_code=400)
    cfg = payload.ocr_config or {}
    result = OCRService().perform_ocr(
        record_id=payload.record_id, document_id=payload.document_id,
        ingestion_id=payload.ingestion_id, engine=cfg.get("engine", "TESSERACT"),
        language=cfg.get("language", "eng"),
        input_source=cfg.get("input_source", "PREPROCESSED_IMAGE"),
        input_paths=cfg.get("input_paths"),
        native_pdf_text_attempt=cfg.get("native_pdf_text_attempt", False),
        table_aware=cfg.get("table_aware", True),
        tesseract_psm=cfg.get("tesseract_psm", 6),
        tesseract_oem=cfg.get("tesseract_oem", 3),
        language_detection=payload.language_detection,
        document_type=payload.document_type or cfg.get("document_type"))
    return JSONResponse(result.to_dict(), status_code=200)


# ---------------------------------------------------------------------------
# Windows 6–7 — extraction / confidence / validation / anomaly / HITL
# ---------------------------------------------------------------------------


@router.post("/extract")
def extract_fields(payload: ExtractRequest, request: Request,
                   user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "EXTRACTION.UPDATE", "DIGITIZATION.RUN", request=request)
    if _missing(payload.record_id, payload.document_id, payload.ingestion_id):
        return JSONResponse({"phase": "SEMANTIC_FIELD_EXTRACTION", "status": "FAILED",
                             "error_code": "MISSING_PARAMETERS",
                             "message": "record_id, document_id, and ingestion_id are required"},
                            status_code=400)
    result = SemanticExtractionService().extract_fields(
        record_id=payload.record_id, document_id=payload.document_id,
        ingestion_id=payload.ingestion_id)
    return JSONResponse(result.to_dict(),
                        status_code=200 if result.status != ExtractionStatus.FAILED else 400)


@router.post("/confidence-completeness")
def confidence_completeness(payload: ConfidenceRequest, request: Request,
                            user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.VALIDATE", "DIGITIZATION.RUN", "DIGITIZATION.READ", request=request)
    if _missing(payload.record_id, payload.document_id, payload.ingestion_id):
        return JSONResponse({"phase": "CONFIDENCE_COMPLETENESS", "status": "FAILED",
                             "error_code": "MISSING_PARAMETERS",
                             "message": "record_id, document_id, and ingestion_id are required"},
                            status_code=400)
    result = ConfidenceCompletenessService().evaluate(
        record_id=payload.record_id, document_id=payload.document_id,
        ingestion_id=payload.ingestion_id)
    return JSONResponse(result.to_dict(),
                        status_code=200
                        if result.status != RecordStatus.EXTRACTION_ERROR else 400)


@router.post("/automated-validation")
def automated_validation(payload: AutomatedValidationRequest, request: Request,
                         user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "LAND_RECORD.VALIDATE", "OCR.VALIDATE", "DIGITIZATION.RUN", request=request)
    if _missing(payload.record_id, payload.document_id, payload.ingestion_id):
        return JSONResponse({"phase": "AUTOMATED_VALIDATION", "status": "FAILED",
                             "error_code": "MISSING_PARAMETERS",
                             "message": "record_id, document_id, and ingestion_id are required"},
                            status_code=400)
    result = get_automated_validation_service().evaluate(
        record_id=payload.record_id, document_id=payload.document_id,
        ingestion_id=payload.ingestion_id, reprocessing_id=payload.reprocessing_id,
        classification=payload.classification)
    ok = result.status not in ("FAILED", "INVALID_PARAMETERS")
    return JSONResponse(result.to_dict(), status_code=200 if ok else 400)


@router.get("/validation/{validation_run_id}")
def get_validation_run(validation_run_id: str, request: Request,
                       user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.READ", "OCR.READ", request=request)
    result = get_automated_validation_service().get_validation_run(validation_run_id)
    if result is None:
        return JSONResponse({"phase": "AUTOMATED_VALIDATION", "status": "FAILED",
                             "error_code": ValidationErrorCode.RUN_NOT_FOUND.value,
                             "message": f"Validation run {validation_run_id} not found."},
                            status_code=404)
    return JSONResponse(result, status_code=200)


@router.get("/records/{record_id}/validations")
def get_record_validations(record_id: str, request: Request,
                           user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.READ", "OCR.READ", request=request)
    from app.core.scopes import ScopeService
    ScopeService.check(user, record_id=record_id, request=request)
    return JSONResponse(
        get_automated_validation_service().get_record_validations(record_id),
        status_code=200)


@router.post("/anomaly-duplicate")
def anomaly_duplicate_stage(payload: AnomalyDuplicateRequest, request: Request,
                            user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "OCR.VALIDATE", "DIGITIZATION.RUN", request=request)
    service = get_anomaly_duplicate_stage_service()
    if payload.validation_run_id:
        result = service.create_from_validation_run(payload.validation_run_id)
    else:
        result = service.create_standalone(
            record_id=payload.record_id or "", document_id=payload.document_id or "",
            ingestion_id=payload.ingestion_id or "")
    if result.status == "SUCCESS":
        return JSONResponse(result.to_dict(), status_code=200)
    if result.error_code in ("VALIDATION_RUN_NOT_FOUND", "PHASE_08_RESULT_NOT_FOUND"):
        return JSONResponse(result.to_dict(), status_code=404)
    return JSONResponse(result.to_dict(), status_code=400)


@router.get("/anomaly-duplicate/{stage_id}")
def get_anomaly_duplicate_stage(stage_id: str, request: Request,
                                user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.READ", "OCR.READ", request=request)
    result = get_anomaly_duplicate_stage_service().get_stage(stage_id)
    if result is None:
        return JSONResponse({"phase": "ANOMALY_DUPLICATE_DETECTION", "status": "FAILED",
                             "error_code": "STAGE_NOT_FOUND",
                             "message": f"Anomaly/duplicate stage {stage_id} not found."},
                            status_code=404)
    return JSONResponse(result, status_code=200)


@router.post("/hitl-1/open")
def hitl1_open(payload: OpenHitlRequest, request: Request,
               user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "HITL.REVIEW", "LAND_RECORD.VALIDATE", request=request)
    session = get_hitl1_service().open_session(
        validation_run_id=payload.validation_run_id or "",
        reviewer=payload.reviewer or "")
    body = session.to_dict()
    if session.error_code:
        code = 404 if session.error_code == "VALIDATION_RUN_NOT_FOUND" else 400
        return JSONResponse({"phase": "HITL_1_VERIFICATION", "status": "FAILED",
                             "error_code": body.get("error_code"),
                             "error_message": body.get("error_message")},
                            status_code=code)
    return JSONResponse(body, status_code=200)


@router.get("/hitl-1/{hitl1_id}")
def hitl1_get(hitl1_id: str, request: Request,
              user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "HITL.REVIEW", "DIGITIZATION.READ", request=request)
    result = get_hitl1_service().get_session(hitl1_id)
    if result is None:
        return JSONResponse({"phase": "HITL_1_VERIFICATION", "status": "FAILED",
                             "error_code": "SESSION_NOT_FOUND",
                             "message": f"HITL-1 session {hitl1_id} not found."},
                            status_code=404)
    return JSONResponse(result, status_code=200)


@router.post("/hitl-1/{hitl1_id}/review-field")
def hitl1_review_field(hitl1_id: str, payload: HitlReviewRequest, request: Request,
                       user: dict = Depends(get_current_user)) -> JSONResponse:
    # Field-level review is part of the HITL decision flow: same guard as the
    # canonical decision endpoint so the open path cannot bypass authorization.
    _need(user, "HITL.REVIEW", request=request)
    from app.workflow.authorization import WorkflowAuthorizationService
    # review-field moves session toward UNDER_REVIEW decisions; authorize the
    # implied field-review step for this role before touching file truth.
    WorkflowAuthorizationService.authorize(source="READY_FOR_HITL", target="UNDER_REVIEW",
                                           role=user.get("role", ""), request=request)
    session = get_hitl1_service().review_field(
        hitl1_id=hitl1_id, field=payload.field or "", action=payload.action or "",
        value=payload.value, note=payload.note or "", reviewer=payload.reviewer or "")
    body = session.to_dict()
    if session.error_code:
        code = 404 if session.error_code == "SESSION_NOT_FOUND" else 400
        return JSONResponse({"phase": "HITL_1_VERIFICATION", "status": "FAILED",
                             "error_code": body.get("error_code"),
                             "error_message": body.get("error_message")},
                            status_code=code)
    return JSONResponse(body, status_code=200)


@router.post("/hitl-1/{hitl1_id}/submit")
def hitl1_submit(hitl1_id: str, payload: HitlSubmitRequest, request: Request,
                 user: dict = Depends(get_current_user)) -> JSONResponse:
    # CLOSED BYPASS: route every HITL verdict through the canonical
    # WorkflowService (permission + scope + state + role + audit). Direct
    # file-truth mutation without authorization is no longer possible here.
    _need(user, "HITL.REVIEW", request=request)
    from app.database.session import _SessionFactory
    from app.services.workflow_service import WorkflowService

    db = _SessionFactory()
    try:
        svc = WorkflowService(db)
        result = svc.hitl_decision(
            hitl_id=hitl1_id, decision=payload.decision or "",
            reviewer=user.get("username", ""), notes=payload.notes or "",
            actor_role=user.get("role", ""), request_id=getattr(
                getattr(request, "state", None), "request_id", None),
            ip_address=request.client.host if request.client else None)
    finally:
        db.close()
    if result.get("status") == "SUCCESS":
        return JSONResponse({"phase": "HITL_1_VERIFICATION", "status": "SUCCESS",
                             "hitl": result.get("hitl")}, status_code=200)
    code = 404 if result.get("error_code") == "SESSION_NOT_FOUND" else 400
    if result.get("error_code") == "INVALID_TRANSITION":
        code = 422
    return JSONResponse({"phase": "HITL_1_VERIFICATION", "status": "FAILED",
                         "error_code": result.get("error_code"),
                         "error_message": result.get("message")},
                        status_code=code)


# ---------------------------------------------------------------------------
# Correction loop — remediation / resubmission / reprocessing
# ---------------------------------------------------------------------------


@router.post("/remediation")
def create_remediation(payload: RemediationRequest, request: Request,
                       user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "WORKFLOW.RETURN", "LAND_RECORD.VALIDATE", request=request)
    if _missing(payload.record_id, payload.document_id):
        return JSONResponse({"phase": "UPLOADER_REMEDIATION", "status": "FAILED",
                             "error_code": RemediationErrorCode.MISSING_PARAMETERS.value,
                             "message": "record_id and document_id are required"},
                            status_code=400)
    result = get_uploader_remediation_service().create_remediation(
        record_id=payload.record_id, document_id=payload.document_id,
        ingestion_id=payload.ingestion_id or "", created_by=payload.created_by or "",
        force=bool(payload.force),
        trigger_statuses=tuple(payload.trigger_statuses)
        if isinstance(payload.trigger_statuses, list) else None,
        severity_override=payload.severity_override)
    return JSONResponse(result, status_code=200 if result.get("status") != "FAILED" else 400)


@router.get("/remediation/{record_id}")
def get_remediation_by_record(record_id: str, request: Request,
                              user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.READ", request=request)
    from app.core.scopes import ScopeService
    ScopeService.check(user, record_id=record_id, request=request)
    return JSONResponse(
        get_uploader_remediation_service().get_remediation_by_record(record_id),
        status_code=200)


@router.post("/remediation/{remediation_id}/submit")
def submit_remediation(remediation_id: str, request: Request, record_id: str = Form(""),
                       uploader: str = Form(""), resolution_notes: str = Form(""),
                       files: List[UploadFile] = File([]),
                       user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DOCUMENT.UPLOAD", request=request)
    from app.core.scopes import ScopeService
    ScopeService.check(user, record_id=record_id or None, request=request)
    if not record_id:
        return JSONResponse({"phase": "UPLOADER_REMEDIATION", "status": "FAILED",
                             "error_code": RemediationErrorCode.MISSING_PARAMETERS.value,
                             "message": "record_id is required in the form data"},
                            status_code=400)
    uploads = [(f.filename or "evidence", f.file.read()) for f in files if f.filename]
    if not uploads:
        return JSONResponse({"phase": "UPLOADER_REMEDIATION", "status": "FAILED",
                             "error_code": RemediationErrorCode.NO_FILES_PROVIDED.value,
                             "message": "At least one evidence file must be attached."},
                            status_code=400)
    result = get_uploader_remediation_service().submit_remediation(
        record_id=record_id, remediation_id=remediation_id, uploader=uploader,
        resolution_notes=resolution_notes, files=uploads)
    return JSONResponse(result, status_code=200 if result.get("status") != "FAILED" else 400)


@router.post("/resubmission")
def create_resubmission(payload: ResubmissionRequest, request: Request,
                        user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "FIELD_VERIFICATION.SUBMIT", "DOCUMENT.UPLOAD", "DIGITIZATION.RUN",
          request=request)
    from app.core.scopes import ScopeService
    from app.workflow.authorization import WorkflowAuthorizationService
    ScopeService.check(user, record_id=payload.record_id or None, request=request)
    WorkflowAuthorizationService.authorize(source="CORRECTION_REQUIRED",
                                           target="RESUBMITTED",
                                           role=user.get("role", ""), request=request)
    if _missing(payload.record_id, payload.document_id, payload.remediation_id):
        return JSONResponse({"phase": "RESUBMISSION", "status": "FAILED",
                             "error_code": ResubmissionErrorCode.MISSING_PARAMETERS.value,
                             "message": "record_id, document_id and remediation_id are required"},
                            status_code=400)
    result = get_resubmission_service().create_resubmission(
        record_id=payload.record_id, document_id=payload.document_id,
        remediation_id=payload.remediation_id, submission_type=payload.submission_type,
        created_by=payload.created_by or "", page_assignments=payload.page_assignments,
        notes=payload.notes)
    return JSONResponse(result, status_code=200 if result.get("status") != "FAILED" else 400)


@router.get("/resubmission/{submission_id}")
def get_resubmission(submission_id: str, request: Request,
                     user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.READ", request=request)
    result = get_resubmission_service().get_submission(submission_id)
    if result is None:
        return JSONResponse({"phase": "RESUBMISSION", "status": "FAILED",
                             "error_code": ResubmissionErrorCode.SUBMISSION_NOT_FOUND.value,
                             "message": f"Resubmission {submission_id} not found."},
                            status_code=404)
    return JSONResponse(result, status_code=200)


@router.get("/records/{record_id}/submissions")
def get_record_submissions(record_id: str, request: Request,
                           user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.READ", request=request)
    from app.core.scopes import ScopeService
    ScopeService.check(user, record_id=record_id, request=request)
    return JSONResponse(
        get_resubmission_service().get_record_submissions(record_id), status_code=200)


@router.post("/reprocess")
def reprocess_submission(payload: ReprocessRequest, request: Request,
                         user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.RUN", "OCR.PROCESS", request=request)
    from app.core.scopes import ScopeService
    from app.workflow.authorization import WorkflowAuthorizationService
    ScopeService.check(user, record_id=payload.record_id or None, request=request)
    WorkflowAuthorizationService.authorize(source="RESUBMITTED", target="REPROCESSING",
                                           role=user.get("role", ""), request=request)
    if _missing(payload.record_id, payload.submission_id):
        return JSONResponse({"phase": "REPROCESSING", "status": "FAILED",
                             "error_code": ReprocessingErrorCode.MISSING_PARAMETERS.value,
                             "message": "record_id and submission_id are required"},
                            status_code=400)
    result = get_reprocessing_service().reprocess(
        submission_id=payload.submission_id, by=payload.by or "SYSTEM",
        record_id=payload.record_id)
    return JSONResponse(result, status_code=200 if result.get("status") != "FAILED" else 400)


@router.get("/reprocess/{reprocessing_id}")
def get_reprocessing(reprocessing_id: str, request: Request,
                     user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.READ", request=request)
    result = get_reprocessing_service().get_reprocessing(reprocessing_id)
    if result is None:
        return JSONResponse({"phase": "REPROCESSING", "status": "FAILED",
                             "error_code": ReprocessingErrorCode.RUN_NOT_FOUND.value,
                             "message": f"Reprocessing run {reprocessing_id} not found."},
                            status_code=404)
    return JSONResponse(result, status_code=200)


@router.get("/records/{record_id}/reprocessing-history")
def get_record_reprocessing_history(record_id: str, request: Request,
                                    user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.READ", request=request)
    from app.core.scopes import ScopeService
    ScopeService.check(user, record_id=record_id, request=request)
    return JSONResponse(
        get_reprocessing_service().get_record_reprocessing_history(record_id),
        status_code=200)


@router.post("/reprocess/{reprocessing_id}/retry")
def retry_reprocessing(reprocessing_id: str, payload: RetryRequest, request: Request,
                       user: dict = Depends(get_current_user)) -> JSONResponse:
    _need(user, "DIGITIZATION.RUN", "OCR.PROCESS", request=request)
    result = get_reprocessing_service().retry(
        reprocessing_id=reprocessing_id, by=(payload.by if payload else None) or "SYSTEM")
    return JSONResponse(result, status_code=200 if result.get("status") != "FAILED" else 400)
