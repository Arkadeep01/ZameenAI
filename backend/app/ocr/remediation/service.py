"""Decomposed from phase09_uploader_remediation.py: service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import hashlib
import json
import logging
import re
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .models import *
from .issues import *
from app.ocr.utils.hashing import sha256_bytes as _canonical_sha256_bytes
from app.ocr.utils.hashing import sha256_file as _canonical_sha256_file
from .issues import (_new_id, _now_iso)

import logging
logger = logging.getLogger(__name__)

class UploaderRemediationService:
    """Manage remediation sessions derived from persisted Phase 08 results."""

    def __init__(
        self,
        storage_dir: Optional[Path] = None,
        phase08_dir: Optional[Path] = None,
        originals_dir: Optional[Path] = None,
    ) -> None:
        self.storage_dir = storage_dir or PHASE_09_STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.phase08_dir = phase08_dir or PHASE_08_STORAGE_DIR
        self.originals_dir = originals_dir or PHASE_01_ORIGINALS_DIR

    # -- persistence -------------------------------------------------------

    def _session_path(self, record_id: str, remediation_id: str) -> Path:
        return self.storage_dir / record_id / f"{remediation_id}.json"

    def _load_session(self, record_id: str, remediation_id: str) -> Optional[Dict[str, Any]]:
        path = self._session_path(record_id, remediation_id)
        if not path.is_file():
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _save_session(self, session: Dict[str, Any]) -> None:
        out_dir = self.storage_dir / session["record_id"]
        out_dir.mkdir(parents=True, exist_ok=True)
        path = self._session_path(session["record_id"], session["remediation_id"])
        tmp = out_dir / f"{session['remediation_id']}.json.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(session, f, indent=2, ensure_ascii=False)
        tmp.replace(path)

    def _list_sessions(self, record_id: str) -> List[Dict[str, Any]]:
        out_dir = self.storage_dir / record_id
        if not out_dir.is_dir():
            return []
        sessions = []
        for path in sorted(out_dir.glob("*.json")):
            if path.name.endswith(".tmp"):
                continue
            with open(path, encoding="utf-8") as f:
                sessions.append(json.load(f))
        return sessions

    # -- Phase 08 loading --------------------------------------------------

    def _load_phase08_result(self, record_id: str, document_id: str) -> Optional[Dict[str, Any]]:
        path = self.phase08_dir / record_id / f"{document_id}_confidence_completeness.json"
        if not path.is_file():
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _evaluate_phase08(self, record_id: str, document_id: str, ingestion_id: str) -> Dict[str, Any]:
        from ..confidence.service import ConfidenceCompletenessService

        result = ConfidenceCompletenessService().evaluate(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
        )
        return result.to_dict()

    # -- original preservation ---------------------------------------------

    def _capture_original_submission(
        self, record_id: str, document_id: str, ingestion_id: str
    ) -> Dict[str, Any]:
        captured: Dict[str, Any] = {
            "kind": "original_submission",
            "document_id": document_id,
            "ingestion_id": ingestion_id,
            "captured_at": _now_iso(),
            "note": "Original uploaded document preserved by Phase 01; never overwritten.",
        }
        candidate = None
        if ingestion_id:
            for ext in (
                ".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp",
            ):
                probe = self.originals_dir / f"{ingestion_id}{ext}"
                if probe.is_file():
                    candidate = probe
                    break
        if candidate is not None:
            captured["original_filename"] = candidate.name
            captured["sha256"] = _sha256_of(candidate)
            captured["file_size_bytes"] = candidate.stat().st_size
        return captured

    # -- creation ----------------------------------------------------------

    def create_remediation(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str = "",
        created_by: str = "",
        force: bool = False,
        trigger_statuses: Optional[Tuple[str, ...]] = None,
        severity_override: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        t0 = time.time()

        phase08 = self._load_phase08_result(record_id, document_id)
        if phase08 is None:
            try:
                phase08 = self._evaluate_phase08(record_id, document_id, ingestion_id)
            except Exception as exc:  # pragma: no cover - defensive
                logger.exception("Phase 08 evaluation failed")
                return {
                    "phase": "UPLOADER_REMEDIATION",
                    "status": RemediationDecisionStatus.UNKNOWN_ERROR.value,
                    "error_code": RemediationErrorCode.PHASE_08_RESULT_NOT_FOUND.value,
                    "error_message": f"Phase 08 result not found and re-evaluation failed: {exc}",
                    "record_id": record_id,
                    "document_id": document_id,
                }

        if phase08.get("status") == "EXTRACTION_ERROR":
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": RemediationDecisionStatus.PHASE_08_FAILED.value,
                "error_code": phase08.get("error_code", "PHASE_08_FAILED"),
                "error_message": phase08.get("error_message", "Phase 08 did not produce a usable assessment."),
                "record_id": record_id,
                "document_id": document_id,
            }

        # Duplicate remediation guard: an active (non-terminal) session exists.
        existing = self._find_active_session(record_id, document_id)
        if existing is not None and not force:
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": RemediationDecisionStatus.DUPLICATE_REMEDIATION.value,
                "error_code": RemediationErrorCode.DUPLICATE_REMEDIATION.value,
                "message": "An open remediation session already exists for this record.",
                "record_id": record_id,
                "document_id": document_id,
                "remediation_id": existing.get("remediation_id"),
                "remediation": existing,
            }

        should_create, reason = decide_remediation(
            phase08,
            trigger_statuses=trigger_statuses,
            force=force,
        )
        if not should_create:
            decision = (
                RemediationDecisionStatus.REVIEW_REQUIRED_NO_REMEDIATION.value
                if phase08.get("status") == "REVIEW_REQUIRED" and not force
                else RemediationDecisionStatus.NO_REMEDIATION_REQUIRED.value
            )
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": decision,
                "message": "No uploader remediation is required for this record at this time.",
                "reason": reason,
                "record_id": record_id,
                "document_id": document_id,
                "phase08_status": phase08.get("status"),
                "issues": [
                    i.to_dict()
                    for i in build_remediation_issues(phase08, severity_override)
                ],
                "remediation": None,
            }

        issues = build_remediation_issues(phase08, severity_override)
        requested_actions = sorted({i.required_action for i in issues})

        completeness = phase08.get("completeness") or {}
        confidence = phase08.get("confidence") or {}
        session_obj = RemediationSession(
            remediation_id=_new_id("REM"),
            record_id=record_id,
            document_id=document_id,
            document_type=phase08.get("document_type", ""),
            status=RemediationStatus.OPEN,
            created_at=_now_iso(),
            created_by=created_by or "",
            phase08_status=phase08.get("status", ""),
            overall_confidence=confidence.get("overall", 0.0),
            completeness_score=completeness.get("score", 0.0),
            issues=issues,
            requested_actions=requested_actions,
            original_submission=self._capture_original_submission(
                record_id, document_id, phase08.get("ingestion_id", ingestion_id)
            ),
            timestamps={"created_at": _now_iso()},
            processing_time_seconds=round(time.time() - t0, 4),
        )
        self._save_session(session_obj.to_dict())

        logger.info(
            "Phase 09 remediation created: remediation_id=%s record_id=%s status=%s issues=%d",
            session_obj.remediation_id,
            record_id,
            phase08.get("status"),
            len(issues),
        )

        return {
            "phase": "UPLOADER_REMEDIATION",
            "status": RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value,
            "message": "Remediation session created from Phase 08 assessment.",
            "reason": reason,
            "record_id": record_id,
            "document_id": document_id,
            "remediation_id": session_obj.remediation_id,
            "issues": [i.to_dict() for i in issues],
            "remediation": session_obj.to_public_dict(),
        }

    def _find_active_session(self, record_id: str, document_id: str) -> Optional[Dict[str, Any]]:
        for s in self._list_sessions(record_id):
            if s.get("document_id") != document_id:
                continue
            if s.get("status") in (
                RemediationStatus.OPEN.value,
                RemediationStatus.ACTION_REQUIRED.value,
                RemediationStatus.SUBMITTED.value,
                RemediationStatus.PROCESSING.value,
            ):
                return s
        return None

    # -- retrieval ---------------------------------------------------------

    def get_remediation_by_record(self, record_id: str) -> Dict[str, Any]:
        sessions = self._list_sessions(record_id)
        return {
            "phase": "UPLOADER_REMEDIATION",
            "record_id": record_id,
            "count": len(sessions),
            "remediations": [self._to_public(s) for s in sessions],
        }

    def get_remediation(self, record_id: str, remediation_id: str) -> Optional[Dict[str, Any]]:
        session = self._load_session(record_id, remediation_id)
        if session is None:
            return None
        return self._to_public(session)

    def get_remediation_internal(self, record_id: str, remediation_id: str) -> Optional[Dict[str, Any]]:
        """Full internal session dict for downstream phase consumption.

        Unlike get_remediation (API-safe), this retains on-disk evidence
        stored_filename references so Phase 10 can deterministically locate
        the uploaded bytes. Used only within phase services, never serialized
        to API responses.
        """
        return self._load_session(record_id, remediation_id)

    def set_remediation_status(
        self,
        record_id: str,
        remediation_id: str,
        new_status: str,
        note: str = "",
    ) -> bool:
        """Advance a remediation session's lifecycle status.

        Used by downstream phases (Phase 10 resubmission -> PROCESSING).
        Returns True when the update was persisted. Atomic tmp+replace write.

        RESOLVED can only be set once downstream reprocessing and a fresh
        Phase 08 assessment confirm the problem is actually gone — Phase 11
        owns that decision; this method intentionally performs no validation
        of whether resolution is warranted.
        """
        session = self._load_session(record_id, remediation_id)
        if session is None:
            return False
        session["status"] = new_status
        timestamps = session.get("timestamps") or {}
        timestamps[f"status_{new_status.lower()}"] = _now_iso()
        session["timestamps"] = timestamps
        if note:
            session["resolution_notes"] = f"{session.get('resolution_notes', '')}\n[Phase 10] {note}".strip()
        self._save_session(session)
        return True

    @staticmethod
    def _to_public(session: Dict[str, Any]) -> Dict[str, Any]:
        try:
            obj = RemediationSession(**session)
            return obj.to_public_dict()
        except Exception:  # pragma: no cover - dict-shaped sessions
            public = dict(session)
            for attempt in public.get("attempts", []):
                for sub in attempt.get("submissions", []):
                    sub.pop("stored_filename", None)
            return public

    # -- submission --------------------------------------------------------

    def submit_remediation(
        self,
        record_id: str,
        remediation_id: str,
        uploader: str = "",
        resolution_notes: str = "",
        files: Optional[List[Tuple[str, bytes]]] = None,
    ) -> Dict[str, Any]:
        """Attach uploader evidence to the remediation session.

        files: list of (original_filename, content_bytes).

        Sets status = SUBMITTED and produces the Phase 10 handoff.
        Does NOT reprocess anything and does NOT resolve the session.
        """
        session = self._load_session(record_id, remediation_id)
        if session is None:
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": "FAILED",
                "error_code": RemediationErrorCode.REMEDIATION_NOT_FOUND.value,
                "error_message": f"Remediation {remediation_id} not found for record {record_id}.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        created_by = session.get("created_by", "")
        if uploader and created_by and uploader != created_by:
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": "FAILED",
                "error_code": RemediationErrorCode.UPLOADER_MISMATCH.value,
                "error_message": "The uploader does not own this remediation session.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        status = session.get("status")
        if status not in (RemediationStatus.OPEN.value, RemediationStatus.ACTION_REQUIRED.value):
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": "FAILED",
                "error_code": RemediationErrorCode.REMEDIATION_NOT_OPEN.value
                if status != RemediationStatus.SUBMITTED.value
                else RemediationErrorCode.REMEDIATION_ALREADY_SUBMITTED.value,
                "error_message": (
                    "Remediation evidence already submitted and awaiting reprocessing."
                    if status == RemediationStatus.SUBMITTED.value
                    else "This remediation session is not open for submission."
                ),
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        files = files or []
        if not files:
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": "FAILED",
                "error_code": RemediationErrorCode.NO_FILES_PROVIDED.value,
                "error_message": "At least one evidence file is required to submit remediation.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }
        if len(files) > MAX_FILES_PER_SUBMIT:
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": "FAILED",
                "error_code": RemediationErrorCode.INVALID_FILE.value,
                "error_message": f"Up to {MAX_FILES_PER_SUBMIT} files are allowed per submission.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        known_hashes = set()
        if session.get("original_submission", {}).get("sha256"):
            known_hashes.add(session["original_submission"]["sha256"])
        for attempt in session.get("attempts", []):
            for sub in attempt.get("submissions", []):
                if sub.get("sha256"):
                    known_hashes.add(sub["sha256"])

        validated: List[RemediationEvidenceSubmission] = []
        for filename, content in files:
            check = self._validate_evidence_file(filename, content)
            if check.get("error_code"):
                return check
            sha = _sha256_bytes(content)
            if sha in known_hashes:
                return {
                    "phase": "UPLOADER_REMEDIATION",
                    "status": "FAILED",
                    "error_code": RemediationErrorCode.DUPLICATE_EVIDENCE.value,
                    "error_message": f"'{filename}' is identical to previously submitted evidence; no new information.",
                    "record_id": record_id,
                    "remediation_id": remediation_id,
                }
            known_hashes.add(sha)
            validated.append(
                RemediationEvidenceSubmission(
                    submission_id=_new_id("SUB"),
                    kind=self._remediation_kind_hint(filename),
                    original_filename=filename,
                    sha256=sha,
                    file_size_bytes=len(content),
                    mime_type=check["mime_type"],
                    page_count=check["page_count"],
                    uploader=uploader or created_by,
                    uploaded_at=_now_iso(),
                    stored_filename=str(check["stored_path"].relative_to(self.storage_dir))
                    if "stored_path" in check else "",
                    resolution_notes=resolution_notes,
                )
            )

        next_attempt = session.get("attempt_number", 0) + 1
        attempt = {
            "attempt_number": next_attempt,
            "status": RemediationStatus.SUBMITTED.value,
            "issues": session.get("issues", []),
            "submissions": [s.to_internal_dict() for s in validated],
            "opened_at": _now_iso(),
            "submitted_at": _now_iso(),
            "resolution_notes": resolution_notes,
        }
        session["attempts"].append(attempt)
        session["attempt_number"] = next_attempt
        session["status"] = RemediationStatus.SUBMITTED.value
        session["submitted_at"] = _now_iso()
        session["resolution_notes"] = resolution_notes
        session["handoff"] = {
            "record_id": record_id,
            "remediation_id": remediation_id,
            "submission_id": validated[0].submission_id,
            "new_evidence_available": True,
            "next_phase": "PHASE_10_RESUBMISSION",
        }
        self._save_session(session)

        logger.info(
            "Phase 09 remediation submitted: remediation_id=%s attempt=%d files=%d",
            remediation_id,
            next_attempt,
            len(validated),
        )

        return {
            "phase": "UPLOADER_REMEDIATION",
            "status": "SUBMITTED",
            "message": "Remediation evidence submitted. The record will be reprocessed through Phase 10/11.",
            "record_id": record_id,
            "remediation_id": remediation_id,
            "attempt_number": next_attempt,
            "submissions": [s.to_dict() for s in validated],
            "handoff": session["handoff"],
        }

    def _remediation_kind_hint(self, filename: str) -> str:
        name = filename.lower()
        if "page" in name:
            return "replaced_page"
        if "support" in name or "additional" in name:
            return "supporting_document"
        if "full" in name or "complete" in name:
            return "complete_document"
        return "remediation_submission"

    def _validate_evidence_file(self, filename: str, content: bytes) -> Dict[str, Any]:
        """Validate an uploaded remediation evidence file.

        Checks: extension, size, MIME magic header, readability, PDF/image
        decode + page count. Duplicate detection is handled by the caller.
        """
        from ..ingestion.validators import FileValidator, PDFValidator, ImageValidator

        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_UPLOAD_EXTENSIONS:
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": "FAILED",
                "error_code": RemediationErrorCode.UNSUPPORTED_FILE_TYPE.value,
                "error_message": f"Unsupported remediation evidence type: {ext or 'none'}. Supported: {sorted(SUPPORTED_UPLOAD_EXTENSIONS)}",
            }
        if len(content) == 0:
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": "FAILED",
                "error_code": RemediationErrorCode.FILE_UNREADABLE.value,
                "error_message": f"'{filename}' is empty.",
            }
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            return {
                "phase": "UPLOADER_REMEDIATION",
                "status": "FAILED",
                "error_code": RemediationErrorCode.FILE_TOO_LARGE.value,
                "error_message": f"'{filename}' exceeds the {MAX_UPLOAD_SIZE_MB}MB limit.",
            }

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / f"evidence{ext}"
            try:
                tmp_path.write_bytes(content)
            except Exception:
                return {
                    "phase": "UPLOADER_REMEDIATION",
                    "status": "FAILED",
                    "error_code": RemediationErrorCode.FILE_UNREADABLE.value,
                    "error_message": f"Could not write '{filename}' for validation.",
                }

            is_readable, _ = FileValidator.validate_readable(tmp_path)
            if not is_readable:
                return {
                    "phase": "UPLOADER_REMEDIATION",
                    "status": "FAILED",
                    "error_code": RemediationErrorCode.FILE_UNREADABLE.value,
                    "error_message": f"'{filename}' could not be read.",
                }
            is_valid, _ = FileValidator.validate_mime_type(tmp_path, ext)
            if not is_valid:
                return {
                    "phase": "UPLOADER_REMEDIATION",
                    "status": "FAILED",
                    "error_code": RemediationErrorCode.INVALID_FILE.value,
                    "error_message": f"'{filename}' content does not match its file type.",
                }

            mime_type = "application/pdf" if ext == ".pdf" else _mime_for_ext(ext)
            page_count: Optional[int] = None
            try:
                if ext == ".pdf":
                    ok, count, _, _ = PDFValidator.validate_pdf(tmp_path)
                    if not ok or count == 0:
                        return {
                            "phase": "UPLOADER_REMEDIATION",
                            "status": "FAILED",
                            "error_code": RemediationErrorCode.CORRUPTED_FILE.value,
                            "error_message": f"'{filename}' is a corrupted or empty PDF.",
                        }
                    page_count = count
                else:
                    ok, _, _, _, _ = ImageValidator.validate_image(tmp_path)
                    if not ok:
                        return {
                            "phase": "UPLOADER_REMEDIATION",
                            "status": "FAILED",
                            "error_code": RemediationErrorCode.CORRUPTED_FILE.value,
                            "error_message": f"'{filename}' is a corrupted or unreadable image.",
                        }
                    page_count = 1
            except Exception:
                return {
                    "phase": "UPLOADER_REMEDIATION",
                    "status": "FAILED",
                    "error_code": RemediationErrorCode.CORRUPTED_FILE.value,
                    "error_message": f"'{filename}' could not be decoded.",
                }

            # Persist the validated evidence before returning.
            try:
                record_id_lookup = None
                stored_rel = f"evidence_{uuid.uuid4().hex[:12]}{ext}"
                out_dir = self.storage_dir / "_evidence" / stored_rel[:2]
                out_dir.mkdir(parents=True, exist_ok=True)
                stored_path = out_dir / stored_rel
                stored_path.write_bytes(content)
            except Exception:
                return {
                    "phase": "UPLOADER_REMEDIATION",
                    "status": "FAILED",
                    "error_code": RemediationErrorCode.STORAGE_ERROR.value,
                    "error_message": "Could not persist remediation evidence.",
                }

        return {
            "mime_type": mime_type,
            "page_count": page_count,
            "stored_path": stored_path,
        }

def _mime_for_ext(ext: str) -> str:
    mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
        ".bmp": "image/bmp",
        ".webp": "image/webp",
    }
    return mime.get(ext, "application/octet-stream")

def _sha256_of(path: Path) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.hashing.sha256_file."""
    return _canonical_sha256_file(path)

def _sha256_bytes(content: bytes) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.hashing.sha256_bytes."""
    return _canonical_sha256_bytes(content)

def get_uploader_remediation_service() -> UploaderRemediationService:
    return UploaderRemediationService()
