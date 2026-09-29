"""Decomposed from phase11_reprocessing.py: service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import hashlib
import io
import json
import os
import shutil
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .models import *
from .file_helpers import *
from .file_helpers import (_atomic_write_json, _flatten_record, _gen_reprocessing_id, _now_iso, _read_json, _sha256_path)
from .models import (_PHASE_LABELS, _PHASE_PROGRESS, _PRESENT_STATUSES)

import logging
logger = logging.getLogger(__name__)

class ReprocessingService:
    """Orchestrates the Phase 11 reprocessing pipeline for one submission."""

    def __init__(
        self,
        storage_dir: Optional[Path] = None,
        phase10_dir: Optional[Path] = None,
        phase09_dir: Optional[Path] = None,
        phase08_dir: Optional[Path] = None,
        phase07_dir: Optional[Path] = None,
        originals_dir: Optional[Path] = None,
        max_attempts: int = MAX_ATTEMPTS,
    ):
        self.storage_dir = storage_dir or PHASE_11_STORAGE_DIR
        self.phase10_dir = phase10_dir or PHASE_10_STORAGE_DIR
        self.phase09_dir = phase09_dir or PHASE_09_STORAGE_DIR
        self.phase08_dir = phase08_dir or PHASE_08_STORAGE_DIR
        self.phase07_dir = phase07_dir or PHASE_07_STORAGE_DIR
        self.originals_dir = originals_dir or ORIGINALS_STORAGE_DIR
        self.max_attempts = max_attempts or MAX_ATTEMPTS

    # -- run store ----------------------------------------------------------

    def _runs_dir(self, submission_id: str) -> Path:
        # runs are stored per record; locate the record by scanning.
        record_id = self._record_of_submission(submission_id)
        return self.storage_dir / record_id / submission_id / "runs"

    def _record_of_submission(self, submission_id: str) -> str:
        """Find the record dir that owns a submission (fallback 'UNKNOWN')."""
        if not self.storage_dir.exists():
            return "UNKNOWN"
        for record_dir in self.storage_dir.iterdir():
            if not record_dir.is_dir():
                continue
            if (record_dir / submission_id / "runs").exists():
                return record_dir.name
            if (record_dir / submission_id).exists():
                return record_dir.name
        return "UNKNOWN"

    def _run_path(self, submission_id: str, reprocessing_id: str) -> Path:
        return self._runs_dir(submission_id) / f"{reprocessing_id}.json"

    def _list_runs(self, submission_id: str) -> List[Dict[str, Any]]:
        runs_dir = self._runs_dir(submission_id)
        found: List[Dict[str, Any]] = []
        if runs_dir.is_dir():
            for path in sorted(runs_dir.glob("REP-*.json")):
                run = _read_json(path)
                if run:
                    found.append(run)
        return found

    def get_reprocessing(self, reprocessing_id: str) -> Optional[Dict[str, Any]]:
        """Public (path-safe) run record for the API."""
        run = self._load_run(reprocessing_id)
        if run is None:
            return None
        return self._to_public(run)

    def _load_run(self, reprocessing_id: str) -> Optional[Dict[str, Any]]:
        if not self.storage_dir.exists():
            return None
        for record_dir in self.storage_dir.iterdir():
            if not record_dir.is_dir():
                continue
            for submission_dir in record_dir.iterdir():
                if not submission_dir.is_dir():
                    continue
                path = submission_dir / "runs" / f"{reprocessing_id}.json"
                if path.is_file():
                    return _read_json(path)
        return None

    def get_record_reprocessing_history(self, record_id: str) -> Dict[str, Any]:
        runs: List[Dict[str, Any]] = []
        record_dir = self.storage_dir / record_id
        if record_dir.is_dir():
            for submission_dir in sorted(record_dir.iterdir()):
                runs_dir = submission_dir / "runs"
                if not runs_dir.is_dir():
                    continue
                for path in sorted(runs_dir.glob("REP-*.json")):
                    run = _read_json(path)
                    if run:
                        runs.append(run)
        runs.sort(key=lambda r: r.get("timestamps", {}).get("created_at", ""), reverse=True)
        return {
            "phase": "REPROCESSING",
            "record_id": record_id,
            "count": len(runs),
            "runs": [self._to_public(r) for r in runs],
        }

    # -- public entry points ------------------------------------------------

    def reprocess(
        self,
        submission_id: str,
        *,
        by: str = "SYSTEM",
        record_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Reprocess a Phase 10 validated resubmission (idempotent).

        A terminal run for the same submission is returned as-is; a run that
        is already IN_PROGRESS cannot be re-enrolled.
        """
        submission = self._get_submission_internal(submission_id)
        if submission is None:
            return self._error(
                ReprocessingErrorCode.SUBMISSION_NOT_FOUND.value,
                f"Resubmission {submission_id} not found.",
                submission_id=submission_id,
            )

        if record_id and submission.get("record_id") != record_id:
            return self._error(
                ReprocessingErrorCode.RECORD_MISMATCH.value,
                f"Resubmission {submission_id} belongs to record "
                f"{submission.get('record_id')}, not {record_id}.",
                submission_id=submission_id,
            )

        existing = self._list_runs(submission_id)
        if existing:
            latest = existing[-1]
            status = latest.get("status")
            terminal = {
                ReprocessingStatus.COMPLETED.value,
                ReprocessingStatus.COMPLETED_WITH_REMEDIATION_REQUIRED.value,
                ReprocessingStatus.FAILED.value,
                ReprocessingStatus.MANUAL_REVIEW_REQUIRED.value,
            }
            if status in terminal:
                return self._to_public(latest)
            if status != ReprocessingStatus.QUEUED.value:
                return self._error(
                    ReprocessingErrorCode.SUBMISSION_ALREADY_PROCESSED.value,
                    f"A reprocessing run is already in progress for {submission_id}.",
                    submission_id=submission_id,
                )

        scope = self._scope_for_submission(submission)
        reprocessing_id = _gen_reprocessing_id()
        run = new_run_record(
            reprocessing_id=reprocessing_id,
            submission=submission,
            scope=scope,
            by=by,
        )
        run["timestamps"]["started_at"] = _now_iso()
        self._persist_run(submission_id, run)
        return self._execute(submission, run)

    def retry(self, reprocessing_id: str, *, by: str = "SYSTEM") -> Dict[str, Any]:
        """Retry a FAILED run whose error was TRANSIENT (technical failure)."""
        run = self._load_run(reprocessing_id)
        if run is None:
            return self._error(
                ReprocessingErrorCode.RUN_NOT_FOUND.value,
                f"Reprocessing run {reprocessing_id} not found.",
            )

        if run.get("status") != ReprocessingStatus.FAILED.value:
            return self._error(
                ReprocessingErrorCode.RETRY_NOT_ALLOWED.value,
                f"Only FAILED runs can be retried; {reprocessing_id} is "
                f"{run.get('status')}.",
                reprocessing_id=reprocessing_id,
            )

        category = (run.get("error") or {}).get("category", "")
        if category not in RETRYABLE_CATEGORIES:
            return self._error(
                ReprocessingErrorCode.RETRY_NOT_ALLOWED.value,
                f"Run {reprocessing_id} failed with category {category or 'UNKNOWN'}; "
                f"document defects must go through remediation, not technical retry.",
                reprocessing_id=reprocessing_id,
            )

        submission_id = run.get("submission_id", "")
        submission = self._get_submission_internal(submission_id)
        if submission is None:
            return self._error(
                ReprocessingErrorCode.SUBMISSION_NOT_FOUND.value,
                f"Resubmission {submission_id} not found for retry.",
            )

        # FAILED -> QUEUED_FOR_REPROCESSING -> PROCESSING (allowed transitions).
        from src.phase10_resubmission import ResubmissionService
        rsvc = ResubmissionService(
            storage_dir=self.phase10_dir, phase09_dir=self.phase09_dir,
        )
        rsvc.update_resubmission_status(
            submission_id, "QUEUED_FOR_REPROCESSING", by=by,
            note=f"Phase 11 technical retry of {reprocessing_id}.",
        )
        rsvc.update_resubmission_status(
            submission_id, "PROCESSING", by=by,
            note=f"Phase 11 retry running for {reprocessing_id}.",
        )

        scope = self._scope_for_submission(submission)
        new_id = _gen_reprocessing_id()
        new_run = new_run_record(
            reprocessing_id=new_id,
            submission=submission,
            scope=scope,
            by=by,
        )
        new_run["retry_of"] = reprocessing_id
        new_run["timestamps"]["started_at"] = _now_iso()
        run["superseded_by"] = new_id
        run["error"] = dict(run["error"] or {})
        run["error"]["retried_at"] = _now_iso()
        self._persist_run(submission_id, run)
        self._persist_run(submission_id, new_run)
        return self._execute(submission, new_run)

    # -- submission / remediation wiring ------------------------------------

    def _get_submission_internal(self, submission_id: str) -> Optional[Dict[str, Any]]:
        from src.phase10_resubmission import ResubmissionService
        return ResubmissionService(
            storage_dir=self.phase10_dir, phase09_dir=self.phase09_dir,
        ).get_submission_internal(submission_id)

    def _advance_submission(self, submission_id: str, status: str, note: str, by: str) -> None:
        from src.phase10_resubmission import ResubmissionService
        ResubmissionService(
            storage_dir=self.phase10_dir, phase09_dir=self.phase09_dir,
        ).update_resubmission_status(submission_id, status, by=by, note=note)

    def _set_remediation(self, record_id: str, remediation_id: str, status: str, note: str) -> None:
        from src.phase09_uploader_remediation import UploaderRemediationService
        UploaderRemediationService(
            storage_dir=self.phase09_dir, phase08_dir=self.phase08_dir,
        ).set_remediation_status(record_id, remediation_id, status, note=note)

    def _get_remediation_internal(self, record_id: str, remediation_id: str) -> Optional[Dict[str, Any]]:
        from src.phase09_uploader_remediation import UploaderRemediationService
        return UploaderRemediationService(
            storage_dir=self.phase09_dir, phase08_dir=self.phase08_dir,
        ).get_remediation_internal(record_id, remediation_id)

    def _scope_for_submission(self, submission: Dict[str, Any]) -> Dict[str, str]:
        submission_id = submission.get("submission_id", "")
        return {
            "record_id": f"{submission.get('record_id', 'RECORD')}~REP-{submission_id}",
            "document_id": f"DOC-REP-{submission_id}",
            "ingestion_id": f"ING-REP-{submission_id}",
        }

    # -- execution ----------------------------------------------------------

    def _execute(self, submission: Dict[str, Any], run: Dict[str, Any]) -> Dict[str, Any]:
        submission_id = submission.get("submission_id", "")
        record_id = submission.get("record_id", "")
        remediation_id = submission.get("remediation_id", "")
        scope = run.get("scope", {})
        wall_start = time.time()

        try:
            run["status"] = ReprocessingStatus.RUNNING.value
            run["current_phase"] = ReprocessingStatus.RUNNING.value
            self._persist_run(submission_id, run)

            self._advance_submission(
                submission_id, "PROCESSING",
                f"Phase 11 reprocessing {run['reprocessing_id']} started.", "SYSTEM",
            )

            session = self._get_remediation_internal(record_id, remediation_id)
            if session is None:
                return self._fail(run, submission, "PREFLIGHT",
                                  ErrorCategory.PERMANENT.value,
                                  ReprocessingErrorCode.REMEDIATION_NOT_FOUND.value,
                                  f"Remediation session {remediation_id} not found.",
                                  submission_id, wall_start)

            # ---- assemble the corrected document (new evidence only) ----
            assembled = self._assemble_corrected_document(submission, session, scope)
            if assembled.get("error"):
                return self._fail(run, submission, "PAGE_ASSEMBLY",
                                  assembled.get("category", ErrorCategory.UNKNOWN.value),
                                  assembled.get("error_code", ReprocessingErrorCode.PAGE_ASSEMBLY_ERROR.value),
                                  assembled["error"], submission_id, wall_start)

            run["phases"].append(self._phase_summary(
                "PAGE_ASSEMBLY", "SUCCESS", assembled, wall_start))
            self._persist_run(submission_id, run)

            # ---- pipeline Phase 02 -> 08 ----
            pipeline = self._run_pipeline(submission, run, scope)
            if pipeline.get("error"):
                return self._fail(run, submission, pipeline["failed_phase"],
                                  pipeline["category"], pipeline["code"],
                                  pipeline["message"], submission_id, wall_start)

            # ---- old vs new comparison + decision ----
            new_result = pipeline["phase08_dict"]
            comparison = self._compare_results(record_id, submission.get("document_id", ""),
                                               remediation_id, new_result)
            run["result"] = comparison
            run["result"]["final_phase08_status"] = new_result.get("status")

            decision = self._decide(new_result, comparison, submission)
            run["decision"] = decision["case"]
            run["next_phase"] = decision["next_phase"]
            run["review_required"] = decision["review_required"]
            run["attempts_exhausted"] = decision["attempts_exhausted"]
            run["remediation"] = decision["remediation"]

            if decision["rerun_required"] and decision["attempts_exhausted"]:
                self._set_remediation(
                    record_id, remediation_id, "PROCESSING",
                    f"Phase 11 {run['reprocessing_id']}: manual review required after "
                    f"{run['attempt_number']} attempt(s).",)
                self._advance_submission(
                    submission_id, "FAILED",
                    f"Phase 11 manual review required after max attempts.", "SYSTEM")
                run["status"] = ReprocessingStatus.MANUAL_REVIEW_REQUIRED.value
                run["error"] = {
                    "category": ErrorCategory.PERMANENT.value,
                    "code": ReprocessingErrorCode.MAXIMUM_ATTEMPTS_REACHED.value,
                    "message": decision["message"],
                    "failed_phase": "PHASE_08",
                }
                run["current_phase"] = ReprocessingStatus.MANUAL_REVIEW_REQUIRED.value
                return self._complete(run, submission_id, wall_start)

            if decision["case"] == ReprocessingDecision.CASE_A_READY_FOR_VALIDATION.value:
                self._set_remediation(
                    record_id, remediation_id, "RESOLVED",
                    f"Phase 11 {run['reprocessing_id']}: reprocessing confirms the "
                    f"issue is resolved ({new_result.get('status')}).",)
                run["status"] = ReprocessingStatus.COMPLETED.value
                run["current_phase"] = ReprocessingStatus.PHASE_08.value
                self._advance_submission(
                    submission_id, "COMPLETED",
                    f"Phase 11 reprocessing succeeded; next phase PHASE_12.", "SYSTEM")
                return self._complete(run, submission_id, wall_start)

            if decision["case"] == ReprocessingDecision.CASE_B_REVIEW_REQUIRED.value:
                self._set_remediation(
                    record_id, remediation_id, "PROCESSING",
                    f"Phase 11 {run['reprocessing_id']}: reprocessing complete but the "
                    f"assessment still requires human review; no auto-bypass.",)
                run["status"] = ReprocessingStatus.COMPLETED.value
                run["current_phase"] = ReprocessingStatus.PHASE_08.value
                self._advance_submission(
                    submission_id, "COMPLETED",
                    f"Phase 11 reprocessing completed; review gate active.", "SYSTEM")
                return self._complete(run, submission_id, wall_start)

            if decision["case"] == ReprocessingDecision.CASE_C_REMEDIATION_REQUIRED.value:
                self._set_remediation(
                    record_id, remediation_id, "ACTION_REQUIRED",
                    f"Phase 11 {run['reprocessing_id']}: reprocessing still reports "
                    f"remediation required; new evidence needed.",)
                run["status"] = ReprocessingStatus.COMPLETED_WITH_REMEDIATION_REQUIRED.value
                run["current_phase"] = ReprocessingStatus.PHASE_08.value
                self._advance_submission(
                    submission_id, "COMPLETED",
                    f"Phase 11 reprocessing completed; remediation still required.", "SYSTEM")
                return self._complete(run, submission_id, wall_start)

            # CASE D — extraction/model error
            if decision["category"] == ErrorCategory.DOCUMENT_DEFECT.value:
                self._set_remediation(
                    record_id, remediation_id, "ACTION_REQUIRED",
                    f"Phase 11 {run['reprocessing_id']}: extraction failed on the "
                    f"corrected evidence; document defect.",)
            self._advance_submission(
                submission_id, "FAILED",
                f"Phase 11 extraction/model failure: {decision['message']}", "SYSTEM")
            return self._fail(run, submission, "PHASE_07", decision["category"],
                              decision["code"], decision["message"],
                              submission_id, wall_start)

        except Exception as exc:  # never leave a run half-written
            return self._fail(run, submission, "UNKNOWN", ErrorCategory.TRANSIENT.value,
                              ReprocessingErrorCode.UNKNOWN_ERROR.value, str(exc),
                              submission_id, wall_start)

    # -- pipeline -----------------------------------------------------------

    def _run_pipeline(self, submission: Dict[str, Any], run: Dict[str, Any],
                      scope: Dict[str, str]) -> Dict[str, Any]:
        record_id = submission.get("record_id", "")
        scope_record = scope["record_id"]
        scope_doc = scope["document_id"]
        scope_ing = scope["ingestion_id"]

        # ---- Phase 02 ----
        phase_result = self._phase02(scope_record, scope_doc, scope_ing)
        if phase_result.get("error"):
            return phase_result
        quality_dict = phase_result["quality_dict"]
        self._record_phase(run, submission["submission_id"], "PHASE_02", phase_result)

        # ---- Phase 03 ----
        phase_result = self._phase03(scope_record, scope_doc, scope_ing, quality_dict)
        if phase_result.get("error"):
            return phase_result
        self._record_phase(run, submission["submission_id"], "PHASE_03", phase_result)

        # ---- Phase 04 ----
        # An ambiguous Phase 04 is NOT a defect: reprocessing re-assesses the
        # same document class as the original submission (Phase 07 resolves
        # ambiguity later from OCR evidence). Carry the original document type.
        old_p08 = self._old_phase08_result(
            record_id, submission.get("document_id", "")) or {}
        fallback_type = old_p08.get("document_type")
        phase_result = self._phase04(
            scope_record, scope_doc, scope_ing, fallback_document_type=fallback_type)
        if phase_result.get("error"):
            return phase_result
        document_type = phase_result["document_type"]
        classification_status = phase_result["classification_status"]
        classification_confidence = phase_result["classification_confidence"]
        self._record_phase(run, submission["submission_id"], "PHASE_04", {
            "status": "SUCCESS", "phase": "PHASE_04",
            "summary": {"document_type": document_type,
                        "classification_status": classification_status,
                        "classification_confidence": classification_confidence},
        })

        # ---- Phase 05 ----
        phase_result = self._phase05(scope_record, scope_doc, scope_ing,
                                     document_type, classification_confidence)
        language_detection = phase_result.get("language_detection") or {}
        if phase_result.get("error"):
            self._record_phase(run, submission["submission_id"], "PHASE_05", phase_result)
            language_detection = {}
        else:
            self._record_phase(run, submission["submission_id"], "PHASE_05", phase_result)

        # ---- Phase 06 (config -> OCR) ----
        phase_result = self._phase06(scope_record, scope_doc, scope_ing,
                                     document_type, classification_status,
                                     classification_confidence, language_detection)
        if phase_result.get("error"):
            self._record_phase(run, submission["submission_id"], "PHASE_06", phase_result)
            return phase_result
        self._record_phase(run, submission["submission_id"], "PHASE_06", phase_result)

        # ---- Phase 07 ----
        phase_result = self._phase07(scope_record, scope_doc, scope_ing)
        if phase_result.get("error"):
            self._record_phase(run, submission["submission_id"], "PHASE_07", phase_result)
            category = phase_result.get("category", ErrorCategory.DOCUMENT_DEFECT.value)
            if phase_result.get("code") == ReprocessingErrorCode.EXTRACTION_FAILED.value:
                phase_result["category"] = category
            return phase_result
        self._record_phase(run, submission["submission_id"], "PHASE_07", phase_result)

        # ---- Phase 08 ----
        phase_result = self._phase08(scope_record, scope_doc, scope_ing)
        if phase_result.get("error"):
            self._record_phase(run, submission["submission_id"], "PHASE_08", phase_result)
            return phase_result
        self._record_phase(run, submission["submission_id"], "PHASE_08", phase_result)

        return {"error": None, "phase08_dict": phase_result["phase08_dict"]}

    def _phase02(self, scope_record: str, scope_doc: str, scope_ing: str) -> Dict[str, Any]:
        try:
            from src.phase02_quality_check import DocumentQualityCheckService
            result = DocumentQualityCheckService().check_quality(
                scope_record, scope_doc, scope_ing).to_dict()
        except Exception as exc:
            return {"error": True, "failed_phase": "PHASE_02", "category": ErrorCategory.TRANSIENT.value,
                    "code": ReprocessingErrorCode.UNKNOWN_ERROR.value, "message": str(exc)}
        if result.get("status") != "SUCCESS":
            return {"error": True, "failed_phase": "PHASE_02",
                    "category": ErrorCategory.DOCUMENT_DEFECT.value,
                    "code": ReprocessingErrorCode.QUALITY_REJECTED.value,
                    "message": (result.get("message") or result.get("error_message")
                                or "Phase 02 could not assess the corrected document.")}
        quality = result.get("quality", {})
        if quality.get("processing_readiness") in ("BLOCKED", None) and not quality:
            return {"error": True, "failed_phase": "PHASE_02",
                    "category": ErrorCategory.DOCUMENT_DEFECT.value,
                    "code": ReprocessingErrorCode.QUALITY_REJECTED.value,
                    "message": "Phase 02 returned no usable quality assessment."}
        return {"status": "SUCCESS", "phase": "PHASE_02",
                "summary": {"processing_readiness": quality.get("processing_readiness"),
                            "quality_score": quality.get("quality_score"),
                            "overall_status": quality.get("overall_status")},
                "quality_dict": result}

    def _phase03(self, scope_record: str, scope_doc: str, scope_ing: str,
                 quality_dict: Dict[str, Any]) -> Dict[str, Any]:
        try:
            from src.phase03_ai_document_preprocessing import AIDocumentPreprocessingService
            result = AIDocumentPreprocessingService().preprocess_document(
                record_id=scope_record, document_id=scope_doc,
                ingestion_id=scope_ing, quality_result=quality_dict, force=True).to_dict()
        except Exception as exc:
            return {"error": True, "failed_phase": "PHASE_03", "category": ErrorCategory.TRANSIENT.value,
                    "code": ReprocessingErrorCode.UNKNOWN_ERROR.value, "message": str(exc)}
        status = result.get("status", "")
        if status == "REJECTED":
            return {"error": True, "failed_phase": "PHASE_03",
                    "category": ErrorCategory.DOCUMENT_DEFECT.value,
                    "code": ReprocessingErrorCode.PREPROCESSING_REJECTED.value,
                    "message": (f"Preprocessing rejected the corrected document: "
                                f"{'; '.join(result.get('rejection_reasons', []) or [])}"),
                    "rejection_reasons": result.get("rejection_reasons", [])}
        if status == "FAILED":
            category = (ErrorCategory.DOCUMENT_DEFECT.value
                        if result.get("error_code") != "SOURCE_NOT_FOUND"
                        else ErrorCategory.UNKNOWN.value)
            return {"error": True, "failed_phase": "PHASE_03", "category": category,
                    "code": ReprocessingErrorCode.PREPROCESSING_REJECTED.value,
                    "message": result.get("error_message") or "Phase 03 failed."}
        return {"status": status, "phase": "PHASE_03",
                "summary": {"decision": result.get("decision"),
                            "preprocessing_mode": result.get("preprocessing_mode"),
                            "pages": len(result.get("pages", []))}}

    def _phase04(self, scope_record: str, scope_doc: str, scope_ing: str,
                 fallback_document_type: Optional[str] = None) -> Dict[str, Any]:
        try:
            from src.phase04_document_classification import DocumentClassificationService
            result = DocumentClassificationService().classify(
                record_id=scope_record, document_id=scope_doc,
                ingestion_id=scope_ing).to_dict()
        except Exception as exc:
            return {"error": True, "failed_phase": "PHASE_04", "category": ErrorCategory.TRANSIENT.value,
                    "code": ReprocessingErrorCode.UNKNOWN_ERROR.value, "message": str(exc)}
        document_type = result.get("predicted_document_type") or result.get("document_type")
        if not document_type or document_type == "UNKNOWN":
            if not fallback_document_type:
                return {"error": True, "failed_phase": "PHASE_04",
                        "category": ErrorCategory.DOCUMENT_DEFECT.value,
                        "code": ReprocessingErrorCode.CLASSIFICATION_FAILED.value,
                        "message": "Phase 04 could not classify the corrected document."}
            # Same document class as the original submission; Phase 07 keeps
            # the honest ambiguity for field evidence but downstream phases
            # need a concrete type to configure OCR/extraction.
            document_type = fallback_document_type
            classification_status = "FALLBACK_TO_ORIGINAL_DOCUMENT_TYPE"
            classification_confidence = 0.0
        else:
            classification_status = result.get("classification_status", "")
            classification_confidence = float(result.get("confidence", 0.0) or 0.0)
        return {"status": "SUCCESS", "phase": "PHASE_04",
                "document_type": document_type,
                "classification_status": classification_status,
                "classification_confidence": classification_confidence,
                "summary": {"document_type": document_type,
                            "classification_status": classification_status}}

    def _phase05(self, scope_record: str, scope_doc: str, scope_ing: str,
                 document_type: str, classification_confidence: float) -> Dict[str, Any]:
        try:
            from src.phase05_language_and_script_detection import LanguageAndScriptDetectionService
            result = LanguageAndScriptDetectionService().detect(
                record_id=scope_record, document_id=scope_doc,
                classification_id=None, ingestion_id=scope_ing,
                document_type=document_type,
                classification_confidence=classification_confidence,
                force=True).to_dict()
        except Exception as exc:
            return {"error": True, "failed_phase": "PHASE_05", "category": ErrorCategory.TRANSIENT.value,
                    "code": ReprocessingErrorCode.UNKNOWN_ERROR.value, "message": str(exc)}
        language_detection = result if result.get("status") != "FAILED" else {}
        status = "SUCCESS" if language_detection else "FAILED"
        return {"status": status, "phase": "PHASE_05",
                "language_detection": language_detection,
                "summary": {"detected_language": result.get("detected_language"),
                            "detected_script": result.get("detected_script"),
                            "status": status}}

    def _phase06(self, scope_record: str, scope_doc: str, scope_ing: str,
                 document_type: str, classification_status: str,
                 classification_confidence: float,
                 language_detection: Dict[str, Any]) -> Dict[str, Any]:
        try:
            from src.phase05_ocr_configuration import OCRConfigurationService, ConfigurationStatus
            config = OCRConfigurationService().configure_ocr(
                record_id=scope_record, document_id=scope_doc,
                ingestion_id=scope_ing, document_type=document_type,
                classification_confidence=classification_confidence,
                classification_status=classification_status,
                language_detection=language_detection,
                has_tables=True,
            ).to_dict()
        except Exception as exc:
            return {"error": True, "failed_phase": "PHASE_06", "category": ErrorCategory.TRANSIENT.value,
                    "code": ReprocessingErrorCode.UNKNOWN_ERROR.value, "message": str(exc)}
        if config.get("status") == "FAILED":
            return {"error": True, "failed_phase": "PHASE_06",
                    "category": ErrorCategory.DOCUMENT_DEFECT.value,
                    "code": ReprocessingErrorCode.OCR_CONFIG_FAILED.value,
                    "message": (config.get("error_message")
                                or "Phase 06 could not build an OCR configuration.")}
        configuration = config.get("configuration", {})
        language = configuration.get("language") or "eng"
        tesseract_psm = configuration.get("tesseract_psm")
        tesseract_oem = configuration.get("tesseract_oem") or 3
        table_aware = configuration.get("table_aware", True)
        input_source = configuration.get("input_source", "PREPROCESSED_IMAGE")
        input_paths = configuration.get("input_paths") or None

        try:
            from src.phase06_ocr_visual_text_recognition import OCRService, OCRStatus
            result = OCRService().perform_ocr(
                record_id=scope_record, document_id=scope_doc,
                ingestion_id=scope_ing, engine="TESSERACT",
                language=language, input_source=input_source,
                input_paths=input_paths, native_pdf_text_attempt=False,
                table_aware=table_aware, tesseract_psm=tesseract_psm,
                tesseract_oem=tesseract_oem,
                language_detection=language_detection or None,
                document_type=document_type,
            ).to_dict()
        except Exception as exc:
            return {"error": True, "failed_phase": "PHASE_06", "category": ErrorCategory.TRANSIENT.value,
                    "code": ReprocessingErrorCode.UNKNOWN_ERROR.value, "message": str(exc)}
        status = result.get("status", "")
        if status == "FAILED":
            code = result.get("error_code")
            category = (ErrorCategory.TRANSIENT.value
                        if code == "TESSERACT_FAILED"
                        else ErrorCategory.DOCUMENT_DEFECT.value)
            return {"error": True, "failed_phase": "PHASE_06", "category": category,
                    "code": ReprocessingErrorCode.OCR_FAILED.value,
                    "message": result.get("error_message") or "Phase 06 OCR failed."}
        return {"status": status, "phase": "PHASE_06",
                "summary": {"words": result.get("metrics", {}).get("total_words") if result.get("metrics") else None,
                            "pages": len(result.get("pages", [])),
                            "language": language}}

    def _phase07(self, scope_record: str, scope_doc: str, scope_ing: str) -> Dict[str, Any]:
        try:
            from src.phase07_semantic_field_extraction import SemanticExtractionService
            result = SemanticExtractionService().extract_fields(
                record_id=scope_record, document_id=scope_doc,
                ingestion_id=scope_ing).to_dict()
        except Exception as exc:
            return {"error": True, "failed_phase": "PHASE_07", "category": ErrorCategory.TRANSIENT.value,
                    "code": ReprocessingErrorCode.UNKNOWN_ERROR.value, "message": str(exc)}
        status = result.get("status", "")
        if status in ("FAILED", "NO_FIELDS_EXTRACTED"):
            category = ErrorCategory.DOCUMENT_DEFECT.value
            if "indicbart" in str(result.get("error_message", "")).lower() or \
               "mistral" in str(result.get("error_message", "")).lower():
                category = ErrorCategory.PERMANENT.value
            return {"error": True, "failed_phase": "PHASE_07", "category": category,
                    "code": ReprocessingErrorCode.EXTRACTION_FAILED.value,
                    "message": result.get("error_message") or f"Phase 07 extraction {status.lower()}.",
                    "status": status}
        return {"status": status, "phase": "PHASE_07",
                "summary": {"fields_extracted": result.get("fields_extracted"),
                            "fields_missing": result.get("fields_missing"),
                            "needs_review": result.get("needs_review"),
                            "conflicts": len(result.get("conflicts", []))}}

    def _phase08(self, scope_record: str, scope_doc: str, scope_ing: str) -> Dict[str, Any]:
        try:
            from src.phase08_confidence_completeness import ConfidenceCompletenessService
            result = ConfidenceCompletenessService().evaluate(
                record_id=scope_record, document_id=scope_doc,
                ingestion_id=scope_ing).to_dict()
        except Exception as exc:
            return {"error": True, "failed_phase": "PHASE_08", "category": ErrorCategory.TRANSIENT.value,
                    "code": ReprocessingErrorCode.UNKNOWN_ERROR.value, "message": str(exc)}
        status = result.get("status", "")
        if status in ("EXTRACTION_ERROR",):
            message = result.get("error_message") or result.get("message") or "Phase 08 extraction error."
            category = ErrorCategory.DOCUMENT_DEFECT.value
            if "model" in message.lower() or "indicbart" in message.lower() or "mistral" in message.lower():
                category = ErrorCategory.PERMANENT.value
            return {"error": True, "failed_phase": "PHASE_08", "category": category,
                    "code": ReprocessingErrorCode.EXTRACTION_FAILED.value,
                    "message": message}
        return {"status": "SUCCESS", "phase": "PHASE_08", "phase08_dict": result,
                "summary": {"status": status,
                            "overall_confidence": result.get("confidence", {}).get("overall"),
                            "completeness": result.get("completeness", {}).get("score")}}

    # -- bookkeeping --------------------------------------------------------

    _STATUS_BY_PHASE = {
        "PHASE_02": ReprocessingStatus.PHASE_02,
        "PHASE_03": ReprocessingStatus.PHASE_03,
        "PHASE_04": ReprocessingStatus.PHASE_04,
        "PHASE_05": ReprocessingStatus.PHASE_05,
        "PHASE_06": ReprocessingStatus.PHASE_06,
        "PHASE_07": ReprocessingStatus.PHASE_07,
        "PHASE_08": ReprocessingStatus.PHASE_08,
        "PAGE_ASSEMBLY": ReprocessingStatus.RUNNING,
        "PREFLIGHT": ReprocessingStatus.RUNNING,
        "UNKNOWN": ReprocessingStatus.RUNNING,
    }

    def _record_phase(self, run: Dict[str, Any], submission_id: str,
                      phase: str, phase_result: Dict[str, Any]) -> None:
        run["current_phase"] = phase
        run["status"] = self._STATUS_BY_PHASE.get(phase, ReprocessingStatus.RUNNING).value
        run["progress"] = _PHASE_PROGRESS.get(phase, run.get("progress", 0))
        run["phases"].append(self._phase_summary(phase, "SUCCESS", phase_result))
        self._persist_run(submission_id, run)

    def _phase_summary(self, phase: str, status: str, payload: Dict[str, Any],
                       wall_start: Optional[float] = None) -> Dict[str, Any]:
        return {
            "phase": phase,
            "label": _PHASE_LABELS.get(phase, phase),
            "status": payload.get("status", status),
            "started_at": payload.get("started_at") or _now_iso(),
            "completed_at": _now_iso(),
            "duration_seconds": round((time.time() - wall_start), 4) if wall_start else None,
            "summary": payload.get("summary") or {},
            "error_code": payload.get("code"),
            "error_message": payload.get("message"),
            "next_phase": payload.get("next_phase"),
        }

    def _fail(self, run: Dict[str, Any], submission: Dict[str, Any], failed_phase: str,
              category: str, code: str, message: str, submission_id: str,
              wall_start: float) -> Dict[str, Any]:
        try:
            self._advance_submission(submission_id, "FAILED",
                                     f"Phase 11 {run['reprocessing_id']} failed: {message}", "SYSTEM")
        except Exception:
            pass
        # a document defect in the corrected evidence must re-open the
        # remediation loop (ACTION_REQUIRED) — never leave it parked.
        if category == ErrorCategory.DOCUMENT_DEFECT.value:
            try:
                self._set_remediation(
                    submission.get("record_id", ""), submission.get("remediation_id", ""),
                    "ACTION_REQUIRED",
                    f"Phase 11 {run['reprocessing_id']}: reprocessing failed with a "
                    f"document defect; further evidence is required.")
            except Exception:
                pass
        run["status"] = ReprocessingStatus.FAILED.value
        run["current_phase"] = failed_phase
        run["error"] = {
            "category": category,
            "code": code,
            "message": message,
            "failed_phase": failed_phase,
        }
        return self._complete(run, submission_id, wall_start)

    def _complete(self, run: Dict[str, Any], submission_id: str, wall_start: float) -> Dict[str, Any]:
        run["duration_seconds"] = round(time.time() - wall_start, 4)
        run["timestamps"]["completed_at"] = _now_iso()
        run["progress"] = 100 if run["status"] in (
            ReprocessingStatus.COMPLETED.value,
            ReprocessingStatus.COMPLETED_WITH_REMEDIATION_REQUIRED.value,
            ReprocessingStatus.MANUAL_REVIEW_REQUIRED.value,
        ) else run.get("progress", 0)
        self._persist_run(submission_id, run)
        return self._to_public(run)

    def _persist_run(self, submission_id: str, run: Dict[str, Any]) -> None:
        record_id = run.get("record_id", self._record_of_submission(submission_id))
        runs_dir = self.storage_dir / record_id / submission_id / "runs"
        runs_dir.mkdir(parents=True, exist_ok=True)
        _atomic_write_json(runs_dir / f"{run['reprocessing_id']}.json", run)

    # -- comparison & decision ---------------------------------------------

    def _old_phase08_result(self, record_id: str, document_id: str) -> Optional[Dict[str, Any]]:
        path = self.phase08_dir / record_id / f"{document_id}_confidence_completeness.json"
        return _read_json(path)

    def _old_phase07_metadata(self, record_id: str, document_id: str) -> Optional[Dict[str, Any]]:
        path = self.phase07_dir / record_id / f"{document_id}_extraction_metadata.json"
        return _read_json(path)

    def _compare_results(self, record_id: str, document_id: str,
                         remediation_id: str, new_result: Dict[str, Any]) -> Dict[str, Any]:
        old_p08 = self._old_phase08_result(record_id, document_id) or {}
        old_p07 = self._old_phase07_metadata(record_id, document_id) or {}
        old_fields = old_p08.get("fields", {})
        old_extracted = _flatten_record(old_p07.get("extracted_record"))
        new_fields = new_result.get("fields", {})
        new_extracted = _flatten_record(new_result.get("extracted_record"))

        field_changes: List[Dict[str, Any]] = []
        regression_detected = False
        for field_name in sorted(set(old_fields) | set(new_fields)):
            old_f = old_fields.get(field_name, {})
            new_f = new_fields.get(field_name, {})
            old_value = old_f.get("value", old_extracted.get(field_name))
            new_value = new_f.get("value", new_extracted.get(field_name))
            old_status = old_f.get("value_status")
            new_status = new_f.get("value_status")
            old_conf = float(old_f.get("confidence", 0.0) or 0.0)
            new_conf = float(new_f.get("confidence", 0.0) or 0.0)
            old_conflict = bool(old_f.get("in_conflict", False))
            new_conflict = bool(new_f.get("in_conflict", False))

            value_changed = (old_value or None) != (new_value or None)
            was_present = old_status in _PRESENT_STATUSES
            now_present = new_status in _PRESENT_STATUSES
            class_changed = old_status != new_status
            field_regression = bool(was_present and not now_present)

            status = "UNCHANGED"
            if not old_f and new_f:
                status = "ADDED"
            elif old_f and not new_f:
                status = "REMOVED"
                field_regression = True
            elif value_changed or class_changed or old_conflict != new_conflict:
                status = "CHANGED"

            regression_detected = regression_detected or field_regression

            field_changes.append({
                "field": field_name,
                "field_status": status,
                "old_value": old_value,
                "new_value": new_value,
                "old_status": old_status,
                "new_status": new_status,
                "old_confidence": round(old_conf, 4),
                "new_confidence": round(new_conf, 4),
                "confidence_delta": round(new_conf - old_conf, 4),
                "old_conflict": old_conflict,
                "new_conflict": new_conflict,
                "regression": field_regression,
            })

        old_overall = float((old_p08.get("confidence") or {}).get("overall", 0.0) or 0.0)
        new_overall = float((new_result.get("confidence") or {}).get("overall", 0.0) or 0.0)
        old_completeness = float((old_p08.get("completeness") or {}).get("score", 0.0) or 0.0)
        new_completeness = float((new_result.get("completeness") or {}).get("score", 0.0) or 0.0)

        return {
            "old_result": old_p08,
            "new_result": new_result,
            "old_extraction": old_extracted,
            "new_extraction": new_extracted,
            "field_changes": field_changes,
            "changed_fields": [c for c in field_changes if c["field_status"] != "UNCHANGED"],
            "confidence_changes": {
                "overall": {"old": round(old_overall, 4), "new": round(new_overall, 4),
                            "delta": round(new_overall - old_overall, 4)},
                "completeness": {"old": round(old_completeness, 4),
                                 "new": round(new_completeness, 4),
                                 "delta": round(new_completeness - old_completeness, 4)},
            },
            "regression_detected": regression_detected,
            "issue_resolution": self._assess_issues(
                record_id, remediation_id, old_fields, new_fields),
        }

    def _assess_issues(self, record_id: str, remediation_id: str,
                       old_fields: Dict[str, Any], new_fields: Dict[str, Any]) -> List[Dict[str, Any]]:
        from src.phase09_uploader_remediation import UploaderRemediationService
        svc = UploaderRemediationService(
            storage_dir=self.phase09_dir, phase08_dir=self.phase08_dir,
        )
        issues: List[Dict[str, Any]] = []
        session = svc.get_remediation_internal(record_id, remediation_id)
        if session:
            issues = session.get("issues", []) or []
        resolutions = []
        for issue in issues:
            field = issue.get("field")
            if not field:
                continue
            old_f = old_fields.get(field, {})
            new_f = new_fields.get(field, {})
            old_conf = float(old_f.get("confidence", 0.0) or 0.0)
            new_conf = float(new_f.get("confidence", 0.0) or 0.0)
            old_status = old_f.get("value_status")
            new_status = new_f.get("value_status")
            issue_type = issue.get("issue_type", "")

            if issue_type == "FIELD_CONFLICT":
                resolved = bool(not new_f.get("in_conflict", False)
                                and new_status in _PRESENT_STATUSES)
            elif issue_type in ("FIELD_UNREADABLE", "PAGE_UNREADABLE", "TABLE_UNREADABLE",
                                "LOW_IMAGE_QUALITY", "LOW_RESOLUTION", "SEVERE_BLUR"):
                resolved = bool(new_status in _PRESENT_STATUSES
                                or new_status == "NOT_APPLICABLE")
            elif issue_type in ("FIELD_MISSING", "PAGE_MISSING", "INCOMPLETE_DOCUMENT",
                                "ADDITIONAL_EVIDENCE_REQUIRED"):
                resolved = bool(new_status in _PRESENT_STATUSES)
            else:
                resolved = bool(new_status in _PRESENT_STATUSES
                                or new_status == "NOT_APPLICABLE")
            resolutions.append({
                "field": field,
                "issue_type": issue_type,
                "old_status": old_status,
                "new_status": new_status,
                "old_confidence": round(old_conf, 4),
                "new_confidence": round(new_conf, 4),
                "confidence_delta": round(new_conf - old_conf, 4),
                "resolved": resolved,
                "improved": new_conf > old_conf + 1e-9,
            })
        return resolutions

    def _decide(self, new_result: Dict[str, Any], comparison: Dict[str, Any],
                submission: Dict[str, Any]) -> Dict[str, Any]:
        status = new_result.get("status", "")
        attempt_number = int(submission.get("attempt_number", 0))
        attempts_exhausted = attempt_number >= self.max_attempts
        regression = bool(comparison.get("regression_detected"))
        message = f"Fresh Phase 08 verdict after reprocessing: {status}."

        if status in ("EXTRACTION_ERROR", "MODEL_UNAVAILABLE"):
            category = ErrorCategory.PERMANENT.value
            if status == "EXTRACTION_ERROR":
                category = ErrorCategory.DOCUMENT_DEFECT.value
            return {
                "case": ReprocessingDecision.CASE_D_EXTRACTION_ERROR.value,
                "category": category,
                "code": ReprocessingErrorCode.EXTRACTION_FAILED.value,
                "next_phase": "MANUAL_REVIEW",
                "review_required": True,
                "attempts_exhausted": attempts_exhausted,
                "rerun_required": True,
                "message": f"{message} The extraction could not be completed.",
                "remediation": {"session_status": "PROCESSING", "note": "Preserved for manual disposition."},
            }

        if regression:
            regression_fields = [
                c["field"] for c in comparison.get("field_changes", []) if c.get("regression")
            ]
            return {
                "case": ReprocessingDecision.CASE_B_REVIEW_REQUIRED.value,
                "category": ErrorCategory.DOCUMENT_DEFECT.value,
                "code": ReprocessingErrorCode.REGRESSION_DETECTED.value,
                "next_phase": "PHASE_09_UPLOADER_REMEDIATION",
                "review_required": True,
                "attempts_exhausted": attempts_exhausted,
                "rerun_required": True,
                "message": (f"Regression detected on {regression_fields}; needs review, "
                            f"never silently accepted."),
                "remediation": {"session_status": "PROCESSING",
                                "note": "Regression detected; human review required."},
            }

        if status == "READY_FOR_VALIDATION":
            return {
                "case": ReprocessingDecision.CASE_A_READY_FOR_VALIDATION.value,
                "category": ErrorCategory.TRANSIENT.value,
                "code": None,
                "next_phase": "PHASE_12_AUTOMATED_VALIDATION",
                "review_required": False,
                "attempts_exhausted": attempts_exhausted,
                "rerun_required": False,
                "message": message,
                "remediation": {"session_status": "RESOLVED", "note": "Issue verified resolved."},
            }

        if status == "REVIEW_REQUIRED":
            return {
                "case": ReprocessingDecision.CASE_B_REVIEW_REQUIRED.value,
                "category": ErrorCategory.DOCUMENT_DEFECT.value,
                "code": None,
                "next_phase": "MANUAL_REVIEW",
                "review_required": True,
                "attempts_exhausted": attempts_exhausted,
                "rerun_required": True,
                "message": message,
                "remediation": {"session_status": "PROCESSING",
                                "note": "Reprocessing complete; review retained."},
            }

        # REMEDIATION_REQUIRED / INCOMPLETE
        return {
            "case": ReprocessingDecision.CASE_C_REMEDIATION_REQUIRED.value,
            "category": ErrorCategory.DOCUMENT_DEFECT.value,
            "code": ReprocessingErrorCode.QUALITY_REJECTED.value,
            "next_phase": "PHASE_09_UPLOADER_REMEDIATION",
            "review_required": False,
            "attempts_exhausted": attempts_exhausted,
            "rerun_required": True,
            "message": message,
            "remediation": {"session_status": "ACTION_REQUIRED", "note": "Further evidence required."},
        }

    # -- document assembly --------------------------------------------------

    def _assemble_corrected_document(self, submission: Dict[str, Any],
                                     session: Dict[str, Any],
                                     scope: Dict[str, str]) -> Dict[str, Any]:
        """Rebuild the corrected document from page provenance + evidence.

        KEPT pages come from the original source document; REPLACED/ADDED/
        SUPPORTING pages come from the Phase 10 evidence store. The composite
        is registered as a new original ingestion under ``originals`` so every
        downstream phase resolves it by its synthetic ingestion id.
        """
        try:
            import pymupdf as fitz  # packaging name for PyMuPDF
        except ImportError:
            import fitz  # pragma: no cover - legacy import name

        submission_type = submission.get("submission_type", "")
        scope_ing = scope["ingestion_id"]
        original_ing = (session.get("original_submission") or {}).get("ingestion_id")
        if not original_ing:
            return {"error": "Original ingestion id unavailable from remediation session.",
                    "category": ErrorCategory.PERMANENT.value,
                    "error_code": ReprocessingErrorCode.PAGE_ASSEMBLY_ERROR.value}
        original_path, original_ext = self._find_original(original_ing)
        if original_path is None:
            return {"error": f"Original source {original_ing} not found.",
                    "category": ErrorCategory.PERMANENT.value,
                    "error_code": ReprocessingErrorCode.PAGE_ASSEMBLY_ERROR.value}

        evidence_by_sha: Dict[str, Path] = {}
        for ev in submission.get("evidence", []):
            path = self._locate_submission_evidence(ev, submission.get("record_id", ""),
                                                    submission.get("submission_id", ""))
            if path is not None:
                evidence_by_sha[ev.get("sha256", "")] = path

        pages = submission.get("pages", [])
        replacement_actions = {"REPLACED", "ADDED", "SUPPORTING"}
        if any(p.get("action") in replacement_actions for p in pages):
            if not evidence_by_sha:
                return {"error": "Corrected evidence files could not be located.",
                        "category": ErrorCategory.PERMANENT.value,
                        "error_code": ReprocessingErrorCode.EVIDENCE_NOT_FOUND.value}

        # Complete-document replacement: the evidence IS the document.
        if submission_type == "COMPLETE_DOCUMENT_REPLACEMENT" and pages:
            evidence = submission.get("evidence", [])
            if evidence:
                path = evidence_by_sha.get(evidence[0].get("sha256", ""))
                if path is not None:
                    target = self.originals_dir / f"{scope_ing}{path.suffix.lower()}"
                    shutil.copyfile(path, target)
                    return {"status": "SUCCESS", "source_path": str(target),
                            "page_count": self._page_count_of(path),
                            "note": "Complete-document replacement registered."}

        # Page-level provenance composition into a single PDF.
        # Supporting evidence has no primary page slot and is appended after
        # the document pages (it is still processed — never silently dropped).
        ordered: List[Tuple[int, str, Optional[int], Optional[Path]]] = []
        supporting: List[Tuple[int, str, Optional[int], Optional[Path]]] = []
        for p in pages:
            page_number = p.get("page_number")
            action = p.get("action", "KEPT")
            if action == "KEPT":
                ordered.append((len(ordered), "KEPT", page_number, None))
            elif action == "REPLACED_BY_COMPLETE_DOCUMENT":
                continue  # handled above
            else:
                sha = p.get("replacement_sha256")
                path = evidence_by_sha.get(sha or "")
                entry = (len(ordered), action, page_number, path)
                if action == "SUPPORTING":
                    supporting.append(entry)
                else:
                    ordered.append(entry)

        ordered.extend(supporting)
        if not ordered:
            return {"error": "No pages to reprocess.", "category": ErrorCategory.UNKNOWN.value,
                    "error_code": ReprocessingErrorCode.PAGE_ASSEMBLY_ERROR.value}

        output_path = self.originals_dir / f"{scope_ing}.pdf"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        if output_path.exists():
            # retry-safe idempotency: the assembled artifact for this submission
            # is deterministic; reuse it when the sha matches the provenance set.
            return {"status": "SUCCESS", "source_path": str(output_path),
                    "page_count": self._page_count_of(output_path),
                    "note": "Reused previously assembled composite."}

        try:
            doc = fitz.open()
            page_map: List[Dict[str, Any]] = []
            insertion_dead = set()
            for index, action, page_number, ev_path in ordered:
                temp_img = None
                if action == "KEPT":
                    temp_img = self._render_original_page(
                        original_path, original_ext, int(page_number or 1))
                else:
                    if ev_path is None:
                        raise ValueError(f"No bytes for {action} page {page_number}")
                    temp_img = self._evidence_to_image(ev_path)
                if temp_img is None:
                    raise ValueError(f"Could not render page for {action} page {page_number}")
                width, height = temp_img.size
                pdf_page = doc.new_page(width=width, height=height)
                png_buf = io.BytesIO()
                temp_img.save(png_buf, format="PNG")
                pdf_page.insert_image(fitz.Rect(0, 0, width, height), stream=png_buf.getvalue())
                page_map.append({"page_number": page_number, "action": action})
            doc.save(str(output_path), deflate=True, garbage=3)
            doc.close()
        except Exception as exc:
            return {"error": f"Page assembly failed: {exc}",
                    "category": ErrorCategory.TRANSIENT.value,
                    "error_code": ReprocessingErrorCode.PAGE_ASSEMBLY_ERROR.value}

        return {"status": "SUCCESS", "source_path": str(output_path),
                "page_count": len(page_map), "page_map": page_map,
                "note": "Composite corrected document registered."}

    # -- source helpers -----------------------------------------------------

    def _find_original(self, ingestion_id: str) -> Tuple[Optional[Path], Optional[str]]:
        for ext in (".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"):
            path = self.originals_dir / f"{ingestion_id}{ext}"
            if path.is_file():
                return path, ext
        return None, None

    def _original_page_count(self, path: Path, ext: Optional[str]) -> int:
        if ext == ".pdf":
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz
            with fitz.open(str(path)) as doc:
                return len(doc)
        return 1

    @staticmethod
    def _page_count_of(path: Path) -> int:
        if path.suffix.lower() == ".pdf":
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz
            with fitz.open(str(path)) as doc:
                return len(doc)
        return 1

    def _render_original_page(self, path: Path, ext: Optional[str], page_number: int):
        from PIL import Image
        if ext == ".pdf":
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz
            with fitz.open(str(path)) as doc:
                if page_number > len(doc):
                    return None
                pix = doc[page_number - 1].get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            return Image.open(__import__("io").BytesIO(pix.tobytes("png"))).convert("RGB")
        if page_number != 1:
            return None
        return Image.open(str(path)).convert("RGB")

    def _evidence_to_image(self, path: Path):
        from PIL import Image
        if path.suffix.lower() == ".pdf":
            try:
                import pymupdf as fitz
            except ImportError:
                import fitz
            with fitz.open(str(path)) as doc:
                pix = doc[0].get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            return Image.open(__import__("io").BytesIO(pix.tobytes("png"))).convert("RGB")
        return Image.open(str(path)).convert("RGB")

    def _locate_submission_evidence(self, ev: Dict[str, Any], record_id: str,
                                    submission_id: str) -> Optional[Path]:
        stored = ev.get("stored_filename") or ""
        if stored:
            candidate = self.phase10_dir / stored
            if candidate.is_file() and _sha256_path(candidate) == ev.get("sha256"):
                return candidate
        evidence_root = self.phase10_dir / record_id / "evidence" / submission_id
        if evidence_root.is_dir():
            for path in sorted(evidence_root.rglob("*")):
                if path.is_file() and _sha256_path(path) == ev.get("sha256"):
                    return path
        # fallback: hash scan across the whole record's phase_10 evidence tree
        record_root = self.phase10_dir / record_id
        if record_root.is_dir():
            for path in sorted(record_root.rglob("*")):
                if path.is_file() and _sha256_path(path) == ev.get("sha256"):
                    return path
        return None

    # -- public formatting --------------------------------------------------

    @staticmethod
    def _error(code: str, message: str, **extra: Any) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "phase": "REPROCESSING",
            "status": "FAILED",
            "error_code": code,
            "message": message,
        }
        payload.update(extra)
        return payload

    @staticmethod
    def _to_public(run: Dict[str, Any]) -> Dict[str, Any]:
        public = {
            "phase": "REPROCESSING",
            "reprocessing_id": run.get("reprocessing_id"),
            "record_id": run.get("record_id"),
            "document_id": run.get("document_id"),
            "parent_document_id": run.get("parent_document_id"),
            "parent_submission_id": run.get("parent_submission_id"),
            "submission_id": run.get("submission_id"),
            "remediation_id": run.get("remediation_id"),
            "attempt_number": run.get("attempt_number"),
            "version": run.get("version"),
            "submission_type": run.get("submission_type"),
            "retry_of": run.get("retry_of"),
            "superseded_by": run.get("superseded_by"),
            "status": run.get("status"),
            "current_phase": run.get("current_phase"),
            "progress": run.get("progress"),
            "phases": [
                {
                    "phase": p.get("phase"),
                    "label": p.get("label", p.get("phase")),
                    "status": p.get("status"),
                    "duration_seconds": p.get("duration_seconds"),
                    "error_code": p.get("error_code"),
                    "error_message": p.get("error_message"),
                    "summary": p.get("summary", {}),
                }
                for p in run.get("phases", [])
            ],
            "result": run.get("result"),
            "decision": run.get("decision"),
            "next_phase": run.get("next_phase"),
            "review_required": run.get("review_required"),
            "attempts_exhausted": run.get("attempts_exhausted"),
            "remediation": run.get("remediation"),
            "error": run.get("error"),
            "created_at": (run.get("timestamps") or {}).get("created_at"),
            "started_at": (run.get("timestamps") or {}).get("started_at"),
            "completed_at": (run.get("timestamps") or {}).get("completed_at"),
            "duration_seconds": run.get("duration_seconds"),
            "created_by": run.get("created_by"),
        }
        return {k: v for k, v in public.items() if v is not None}

def get_reprocessing_service() -> ReprocessingService:
    return ReprocessingService()
