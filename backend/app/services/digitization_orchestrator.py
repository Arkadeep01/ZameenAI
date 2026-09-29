"""Authoritative backend pipeline orchestrator (Phase 01 -> Phase 11).

The frontend must NOT sequence phases itself: this service owns ordering,
persists job/phase state, records failures, preserves provenance/confidence
payloads from the real migrated services, and routes to HITL when
validation requires review. It reuses the existing phase implementations
verbatim — no new OCR logic lives here.
"""
from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Phase labels in execution order (file-module convention preserved).
PHASES = [
    "DOCUMENT_INGESTION",
    "DOCUMENT_QUALITY_COMPLETENESS_CHECK",
    "AI_DOCUMENT_PREPROCESSING",
    "DOCUMENT_CLASSIFICATION",
    "LANGUAGE_SCRIPT_DETECTION",
    "OCR_CONFIGURATION",
    "OCR_VISUAL_TEXT_RECOGNITION",
    "SEMANTIC_FIELD_EXTRACTION",
    "CONFIDENCE_COMPLETENESS",
    "AUTOMATED_VALIDATION",
    "ANOMALY_DUPLICATE_DETECTION",
    "HITL_VERIFICATION",
]


def _payload(result: Any) -> dict[str, Any]:
    if result is None:
        return {"status": "FAILED", "error_code": "NULL_RESULT"}
    if isinstance(result, dict):
        return result
    to_dict = getattr(result, "to_dict", None)
    if callable(to_dict):
        try:
            data = to_dict()
            return data if isinstance(data, dict) else {"status": "UNKNOWN", "raw": str(data)}
        except Exception as exc:
            return {"status": "FAILED", "error_code": "SERIALIZE_ERROR", "message": str(exc)}
    return {"status": "UNKNOWN", "raw": str(result)}


def _phase_ok(payload: dict[str, Any]) -> bool:
    status = str(payload.get("status", "")).upper()
    return status not in ("FAILED", "INVALID_PARAMETERS", "EXTRACTION_ERROR", "") or False


def _success_like(payload: dict[str, Any]) -> bool:
    status = str(payload.get("status", "")).upper()
    # Preprocessing may legitimately return PARTIAL/REJECTED; classification
    # always 200; confidence uses RecordStatus names.
    return status in ("SUCCESS", "PARTIAL", "REJECTED", "COMPLETED", "REVIEW_REQUIRED",
                      "NEEDS_REVIEW", "CLEAR", "FLAGGED", "READY_FOR_HITL", "UNDER_REVIEW",
                      "AUTO_APPROVED", "PASSED", "WARNING", "OPEN", "CREATED",
                      "PARTIAL_SUCCESS", "READY_FOR_VALIDATION", "REMEDIATION_REQUIRED",
                      "INCOMPLETE", "DETECTED", "MULTILINGUAL", "UNCERTAIN",
                      "ANOMALY_DETECTED", "DUPLICATE_SUSPECTED", "VALIDATION_FAILED",
                      "BLOCKED", "NO_TEXT_DETECTED")


def _phase_ok(phase: str, payload: dict[str, Any]) -> bool:
    """Per-service success predicate (each migrated service has its own
    status vocabulary; a missing generic 'status' key must not fail a phase
    that actually succeeded, e.g. classification)."""
    if not isinstance(payload, dict):
        return False
    if phase == "DOCUMENT_CLASSIFICATION":
        return bool(payload.get("predicted_document_type") or payload.get("document_type"))
    status = str(payload.get("status", "")).upper()
    if status in ("FAILED", "INVALID_PARAMETERS", "EXTRACTION_ERROR", ""):
        return False
    if phase == "OCR_CONFIGURATION":
        return status in ("SUCCESS", "PARTIAL")
    return _success_like(payload)


def _classification_doctype(payload: dict[str, Any]) -> Optional[str]:
    return payload.get("document_type") or payload.get("predicted_document_type")


class DigitizationOrchestrator:
    """Runs the real migrated services in order; persists job metadata."""

    def __init__(self, db=None):
        self.db = db
        self._job_repo = None
        if db is not None:
            from app.repositories.document_repository import DocumentRepository
            self._job_repo = DocumentRepository(db)

    # ------------------------------------------------------------------
    # job creation
    # ------------------------------------------------------------------
    def start_job(self, file_content: bytes, filename: str,
                  created_by: Optional[str] = None,
                  run_pipeline: bool = True) -> dict[str, Any]:
        from app.ocr.ingestion.service import get_ingestion_service

        ingestion = get_ingestion_service().ingest(file_content, filename or "document")
        data = _payload(ingestion)
        if str(data.get("status", "")).upper() != "SUCCESS":
            return {"job_id": None, "status": "FAILED", "phase": "DOCUMENT_INGESTION",
                    "ingestion": data, "error_code": data.get("error_code"),
                    "message": "Ingestion failed; pipeline not started."}
        record_id = data.get("record_id", "")
        document_id = data.get("document_id", "")
        ingestion_id = data.get("ingestion_id", "")
        job_id = f"JOB-{uuid.uuid4().hex[:12].upper()}"
        self._persist_new_job(job_id, record_id, document_id, ingestion_id,
                              filename, data, created_by)
        self._audit(created_by, "DIGITIZATION_START", "digitization_job", job_id,
                    new_state="QUEUED", meta={"record_id": record_id})
        if not run_pipeline:
            return {"job_id": job_id, "record_id": record_id, "document_id": document_id,
                    "ingestion_id": ingestion_id, "status": "QUEUED",
                    "current_phase": "DOCUMENT_INGESTION"}
        return self.run_pipeline(job_id=job_id, record_id=record_id,
                                 document_id=document_id, ingestion_id=ingestion_id,
                                 created_by=created_by)

    # ------------------------------------------------------------------
    # full run
    # ------------------------------------------------------------------
    def run_pipeline(self, *, job_id: Optional[str] = None,
                     record_id: str = "", document_id: str = "", ingestion_id: str = "",
                     created_by: Optional[str] = None,
                     from_phase: Optional[str] = None) -> dict[str, Any]:
        job = self._load_job(job_id, record_id)
        if job is not None:
            # Prefer explicit ids (start_job passes them); fall back to DB.
            record_id = record_id or job["record_id"]
            document_id = document_id or job["document_id"]
            ingestion_id = ingestion_id or job["ingestion_id"]
            job_id = job["job_id"]
        if not (record_id and document_id and ingestion_id):
            return {"status": "FAILED", "error_code": "MISSING_PARAMETERS",
                    "message": "record_id, document_id, ingestion_id (or job_id) required"}
        self._mark_job(job_id, status="RUNNING", current_phase=from_phase or "DOCUMENT_QUALITY_COMPLETENESS_CHECK")

        results: dict[str, Any] = {}
        ctx: dict[str, Any] = {"record_id": record_id, "document_id": document_id,
                               "ingestion_id": ingestion_id}
        ordered = self._ordered_from(from_phase)

        # Phase 02 — quality
        if "DOCUMENT_QUALITY_COMPLETENESS_CHECK" in ordered:
            from app.ocr.quality.service import get_quality_service
            payload = _payload(get_quality_service().check_quality(record_id, document_id, ingestion_id))
            results["quality"] = payload
            self._record_phase(job_id, "DOCUMENT_QUALITY_COMPLETENESS_CHECK", payload)
            if not _phase_ok("DOCUMENT_QUALITY_COMPLETENESS_CHECK", payload):
                return self._fail(job_id, "DOCUMENT_QUALITY_COMPLETENESS_CHECK", payload, results, ctx)
            ctx["quality"] = payload

        # Phase 03 — preprocessing
        if "AI_DOCUMENT_PREPROCESSING" in ordered:
            from app.ocr.preprocessing.ai_service import get_preprocessing_service
            payload = _payload(get_preprocessing_service().preprocess_document(
                record_id=record_id, document_id=document_id, ingestion_id=ingestion_id))
            results["preprocessing"] = payload
            self._record_phase(job_id, "AI_DOCUMENT_PREPROCESSING", payload)
            if not _phase_ok("AI_DOCUMENT_PREPROCESSING", payload):
                return self._fail(job_id, "AI_DOCUMENT_PREPROCESSING", payload, results, ctx)

        # Phase 04 — classification
        classification_dict: dict[str, Any] = {}
        if "DOCUMENT_CLASSIFICATION" in ordered:
            from app.ocr.classification.service import DocumentClassificationService
            payload = _payload(DocumentClassificationService().classify(
                record_id=record_id, document_id=document_id, ingestion_id=ingestion_id))
            results["classification"] = payload
            self._record_phase(job_id, "DOCUMENT_CLASSIFICATION", payload)
            if not _phase_ok("DOCUMENT_CLASSIFICATION", payload):
                return self._fail(job_id, "DOCUMENT_CLASSIFICATION", payload, results, ctx)
            classification_dict = payload

        # Phase 05a — language/script detection
        language_dict: dict[str, Any] = {}
        if "LANGUAGE_SCRIPT_DETECTION" in ordered:
            from app.ocr.language.lang_service import LanguageAndScriptDetectionService
            try:
                result = LanguageAndScriptDetectionService().detect(
                    record_id=record_id, document_id=document_id, ingestion_id=ingestion_id,
                    document_type=_classification_doctype(classification_dict),
                    classification_confidence=float(classification_dict.get("confidence", 0.0) or 0.0))
                payload = _payload(result)
            except ValueError as exc:
                payload = {"status": "FAILED", "error_code": "INVALID_REQUEST", "message": str(exc)}
            results["language_detection"] = payload
            self._record_phase(job_id, "LANGUAGE_SCRIPT_DETECTION", payload)
            if not _phase_ok("LANGUAGE_SCRIPT_DETECTION", payload):
                return self._fail(job_id, "LANGUAGE_SCRIPT_DETECTION", payload, results, ctx)
            language_dict = payload

        # Phase 05b — OCR configuration
        ocr_config: dict[str, Any] = {}
        if "OCR_CONFIGURATION" in ordered:
            from app.ocr.ocr_config.service import OCRConfigurationService
            result = OCRConfigurationService().configure_ocr(
                record_id=record_id, document_id=document_id, ingestion_id=ingestion_id,
                document_type=_classification_doctype(classification_dict),
                classification_confidence=float(classification_dict.get("confidence", 0.0) or 0.0),
                classification_status=classification_dict.get("classification_status") or classification_dict.get("status"),
                language_detection=language_dict or None)
            payload = _payload(result)
            results["ocr_config"] = payload
            self._record_phase(job_id, "OCR_CONFIGURATION", payload)
            if not _phase_ok("OCR_CONFIGURATION", payload):
                return self._fail(job_id, "OCR_CONFIGURATION", payload, results, ctx)
            ocr_config = payload.get("ocr_config", payload) if isinstance(payload, dict) else {}
            # Authoritative OCR config nests tesseract codes under
            # ``configuration`` (e.g. language "eng"); the top-level
            # ``language`` is BCP-47 ("en") and must never be passed to
            # Tesseract (it would fail with OCR_LANGUAGE_UNAVAILABLE).
            if isinstance(payload, dict) and isinstance(payload.get("configuration"), dict):
                ocr_config = payload["configuration"]

        # Phase 06 — OCR recognition (real provider; explicit unavailable state)
        if "OCR_VISUAL_TEXT_RECOGNITION" in ordered:
            from app.ocr.recognition.service import OCRService
            cfg = ocr_config if isinstance(ocr_config, dict) else {}
            payload = _payload(OCRService().perform_ocr(
                record_id=record_id, document_id=document_id, ingestion_id=ingestion_id,
                engine=cfg.get("engine", "TESSERACT"), language=cfg.get("language", "eng"),
                input_source=cfg.get("input_source", "PREPROCESSED_IMAGE"),
                input_paths=cfg.get("input_paths"),
                table_aware=cfg.get("table_aware", True),
                tesseract_psm=cfg.get("tesseract_psm", 6),
                tesseract_oem=cfg.get("tesseract_oem", 3),
                language_detection=language_dict or None,
                document_type=_classification_doctype(classification_dict)))
            results["ocr"] = payload
            self._record_phase(job_id, "OCR_VISUAL_TEXT_RECOGNITION", payload)
            if not _phase_ok("OCR_VISUAL_TEXT_RECOGNITION", payload):
                return self._fail(job_id, "OCR_VISUAL_TEXT_RECOGNITION", payload, results, ctx)

        # Phase 07 — semantic extraction
        if "SEMANTIC_FIELD_EXTRACTION" in ordered:
            from app.ocr.extraction.pipeline import SemanticExtractionService
            payload = _payload(SemanticExtractionService().extract_fields(
                record_id=record_id, document_id=document_id, ingestion_id=ingestion_id))
            results["extraction"] = payload
            self._record_phase(job_id, "SEMANTIC_FIELD_EXTRACTION", payload)
            if not _phase_ok("SEMANTIC_FIELD_EXTRACTION", payload):
                return self._fail(job_id, "SEMANTIC_FIELD_EXTRACTION", payload, results, ctx)

        # Phase 08 — confidence/completeness
        if "CONFIDENCE_COMPLETENESS" in ordered:
            from app.ocr.confidence.service import ConfidenceCompletenessService
            payload = _payload(ConfidenceCompletenessService().evaluate(
                record_id=record_id, document_id=document_id, ingestion_id=ingestion_id))
            results["confidence"] = payload
            self._record_phase(job_id, "CONFIDENCE_COMPLETENESS", payload)
            if not _phase_ok("CONFIDENCE_COMPLETENESS", payload):
                return self._fail(job_id, "CONFIDENCE_COMPLETENESS", payload, results, ctx)

        # Phase 09 — automated validation
        validation_run_id: Optional[str] = None
        if "AUTOMATED_VALIDATION" in ordered:
            from app.ocr.validation.service import get_automated_validation_service
            payload = _payload(get_automated_validation_service().evaluate(
                record_id=record_id, document_id=document_id, ingestion_id=ingestion_id))
            results["validation"] = payload
            self._record_phase(job_id, "AUTOMATED_VALIDATION", payload)
            if not _phase_ok("AUTOMATED_VALIDATION", payload):
                return self._fail(job_id, "AUTOMATED_VALIDATION", payload, results, ctx)
            validation_run_id = payload.get("validation_run_id")

        # Phase 10 — anomaly/duplicate
        if "ANOMALY_DUPLICATE_DETECTION" in ordered:
            from app.ocr.anomaly.stage import get_anomaly_duplicate_stage_service
            svc = get_anomaly_duplicate_stage_service()
            if validation_run_id:
                payload = _payload(svc.create_from_validation_run(validation_run_id))
            else:
                payload = _payload(svc.create_standalone(record_id, document_id, ingestion_id))
            results["anomaly_duplicate"] = payload
            self._record_phase(job_id, "ANOMALY_DUPLICATE_DETECTION", payload)
            if not _phase_ok("ANOMALY_DUPLICATE_DETECTION", payload):
                return self._fail(job_id, "ANOMALY_DUPLICATE_DETECTION", payload, results, ctx)

        # Phase 11 — HITL routing (open a session when review is required;
        # never fabricate a verification decision)
        hitl_session: Optional[dict[str, Any]] = None
        if "HITL_VERIFICATION" in ordered and validation_run_id:
            from app.ocr.hitl.service import get_hitl1_service
            needs_review = str((results.get("validation") or {}).get("decision", "")).upper() != "AUTO_APPROVED"
            if needs_review:
                session = get_hitl1_service().open_session(
                    validation_run_id=validation_run_id, reviewer=created_by or "system")
                hitl_session = _payload(session) if hasattr(session, "to_dict") else dict(session or {})
                results["hitl"] = hitl_session
                self._record_phase(job_id, "HITL_VERIFICATION",
                                   {"status": "SUCCESS" if not (session.error_code if hasattr(session, "error_code") else None) else "FAILED",
                                    "hitl": hitl_session})
                self._persist_hitl(hitl_session)
            else:
                results["hitl"] = {"status": "SKIPPED", "reason": "AUTO_APPROVED"}
                self._record_phase(job_id, "HITL_VERIFICATION", {"status": "SUCCESS", "skipped": True})

        self._mark_job(job_id, status="AWAITING_HITL" if hitl_session else "COMPLETED",
                       current_phase="HITL_VERIFICATION")
        self._audit(created_by, "PIPELINE_COMPLETED", "digitization_job", job_id or "",
                    new_state="AWAITING_HITL" if hitl_session else "COMPLETED",
                    meta={"record_id": record_id})
        out = {"job_id": job_id, "record_id": record_id, "document_id": document_id,
               "ingestion_id": ingestion_id,
               "status": "AWAITING_HITL" if hitl_session else "COMPLETED",
               "current_phase": "HITL_VERIFICATION",
               "validation_run_id": validation_run_id,
               "hitl_id": (hitl_session or {}).get("hitl1_id"),
               "results": results}
        return out

    # ------------------------------------------------------------------
    # status / retry
    # ------------------------------------------------------------------
    def get_status(self, *, job_id: Optional[str] = None, record_id: str = "") -> dict[str, Any]:
        job = self._load_job(job_id, record_id)
        if not job:
            return {"status": "FAILED", "error_code": "JOB_NOT_FOUND",
                    "message": f"Job {job_id or record_id} not found."}
        phases = self._list_phases(job["job_id"])
        return {**job, "phases": phases}

    # ------------------------------------------------------------------
    # internals: persistence is best-effort (file artifacts are truth)
    # ------------------------------------------------------------------
    def _ordered_from(self, from_phase: Optional[str]) -> list[str]:
        if not from_phase or from_phase not in PHASES:
            return list(PHASES[1:])  # ingestion already done in start_job
        return PHASES[PHASES.index(from_phase):]

    def _persist_new_job(self, job_id, record_id, document_id, ingestion_id, filename, data, created_by) -> None:
        if self._job_repo is None:
            return
        try:
            from app.database.models.document import DigitizationJob, Document, PipelinePhaseExecution
            self._job_repo.save_document(Document(
                id=document_id, record_id=record_id, ingestion_id=ingestion_id,
                filename=filename, sha256=(data.get("source") or {}).get("sha256"),
                size_bytes=(data.get("source") or {}).get("file_size_bytes"),
                mime_type=(data.get("source") or {}).get("mime_type"),
                created_by=created_by))
            self._job_repo.save_job(DigitizationJob(
                id=job_id, record_id=record_id, document_id=document_id,
                ingestion_id=ingestion_id, status="QUEUED",
                current_phase="DOCUMENT_INGESTION", created_by=created_by))
            self._job_repo.record_phase(PipelinePhaseExecution(
                job_id=job_id, phase="DOCUMENT_INGESTION", status="SUCCESS", attempt=1))
        except Exception:
            logger.warning("DB persist new job failed (file artifacts remain truth)", exc_info=True)
            try:
                self.db.rollback()
            except Exception:
                pass

    def _load_job(self, job_id: Optional[str], record_id: str) -> Optional[dict[str, Any]]:
        if self._job_repo is None:
            return None
        try:
            job = None
            if job_id:
                job = self._job_repo.get_job(job_id)
            elif record_id:
                job = self._job_repo.get_job_by_record(record_id)
            if job is None:
                return None
            return {"job_id": job.id, "record_id": job.record_id,
                    "document_id": job.document_id, "ingestion_id": job.ingestion_id,
                    "status": job.status, "current_phase": job.current_phase}
        except Exception:
            return None

    def _list_phases(self, job_id: str) -> list[dict[str, Any]]:
        if self._job_repo is None or not job_id:
            return []
        try:
            return [{"phase": p.phase, "status": p.status, "attempt": p.attempt,
                     "error_code": p.error_code, "error_message": p.error_message}
                    for p in self._job_repo.list_phases(job_id)]
        except Exception:
            return []

    def _mark_job(self, job_id: Optional[str], **fields) -> None:
        if self._job_repo is None or not job_id:
            return
        try:
            job = self._job_repo.get_job(job_id)
            if job:
                self._job_repo.update_job(job, **fields)
        except Exception:
            try:
                self.db.rollback()
            except Exception:
                pass

    def _record_phase(self, job_id: Optional[str], phase: str, payload: dict[str, Any]) -> None:
        if self._job_repo is None or not job_id:
            return
        try:
            from app.database.models.document import PipelinePhaseExecution
            status = str(payload.get("status", "UNKNOWN")).upper()
            ok = _success_like(payload) or bool(payload.get("predicted_document_type"))
            self._job_repo.record_phase(PipelinePhaseExecution(
                job_id=job_id, phase=phase, status="SUCCESS" if ok else status,
                error_code=payload.get("error_code"), error_message=payload.get("message") or payload.get("error_message")))
            self._mark_job(job_id, current_phase=phase)
        except Exception:
            try:
                self.db.rollback()
            except Exception:
                pass

    def _persist_hitl(self, session_dict: dict[str, Any]) -> None:
        if self.db is None or not session_dict.get("hitl1_id"):
            return
        try:
            import json as _json
            from app.database.models.hitl_review import HitlReview
            from app.repositories.domain_repositories import HitlRepository
            HitlRepository(self.db).upsert(HitlReview(
                id=session_dict["hitl1_id"], record_id=session_dict.get("record_id", ""),
                document_id=session_dict.get("document_id", ""),
                validation_run_id=session_dict.get("validation_run_id"),
                status=session_dict.get("status", ""), reviewer=None,
                field_reviews=_json.dumps(session_dict.get("field_reviews", {})),
                notes=_json.dumps(session_dict.get("notes", []))))
        except Exception:
            try:
                self.db.rollback()
            except Exception:
                pass

    def _fail(self, job_id: Optional[str], phase: str, payload: dict[str, Any],
              results: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
        self._mark_job(job_id, status="FAILED", current_phase=phase,
                       error_code=payload.get("error_code"),
                       error_message=payload.get("message") or payload.get("error_message"))
        return {"job_id": job_id, **ctx, "status": "FAILED", "current_phase": phase,
                "error_code": payload.get("error_code"),
                "message": payload.get("message") or payload.get("error_message") or f"{phase} failed.",
                "results": results}

    def _audit(self, actor, action, entity_type, entity_id, **kw) -> None:
        if self.db is None:
            return
        try:
            from app.services.audit_notification_service import AuditService
            AuditService(self.db).log(actor_id=actor, actor_role=None, action=action,
                                      entity_type=entity_type, entity_id=entity_id, **kw)
        except Exception:
            pass


def get_orchestrator(db=None) -> DigitizationOrchestrator:
    return DigitizationOrchestrator(db)
