"""Decomposed from phase10_resubmission.py: service. (Authoritative implementation; verbatim move.)"""
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
from .file_helpers import *
from .file_helpers import (_combined_sha256, _mime_for_ext, _new_id, _now_iso, _sanitize_filename, _sha256_bytes, _sha256_of)
from .models import (_SUBMISSION_TRANSITIONS)

import logging
logger = logging.getLogger(__name__)

class ResubmissionService:
    """Register remediation evidence as a formal, immutable resubmission."""

    def __init__(
        self,
        storage_dir: Optional[Path] = None,
        phase09_dir: Optional[Path] = None,
        originals_dir: Optional[Path] = None,
        phase09_service: Optional[Any] = None,
    ) -> None:
        from ..remediation.service import UploaderRemediationService

        self.storage_dir = storage_dir or PHASE_10_STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.phase09_dir = phase09_dir or PHASE_09_STORAGE_DIR
        self.originals_dir = originals_dir or PHASE_01_ORIGINALS_DIR
        self._phase09_service = phase09_service or UploaderRemediationService(
            storage_dir=self.phase09_dir,
            originals_dir=self.originals_dir,
        )

    # -- Phase 09 access ---------------------------------------------------

    def _load_phase09_session(self, record_id: str, remediation_id: str) -> Optional[Dict[str, Any]]:
        """Load the full internal Phase 09 session (includes stored_filename)."""
        session = self._phase09_service.get_remediation_internal(record_id, remediation_id)
        return session

    # -- Persistence -------------------------------------------------------

    def _submission_path(self, record_id: str, submission_id: str) -> Path:
        return self.storage_dir / record_id / f"{submission_id}.json"

    def _save_submission(self, submission: Resubmission) -> None:
        out_dir = self.storage_dir / submission.record_id
        out_dir.mkdir(parents=True, exist_ok=True)
        path = self._submission_path(submission.record_id, submission.submission_id)
        tmp = out_dir / f"{submission.submission_id}.json.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(submission.to_internal_dict(), f, indent=2, ensure_ascii=False)
        tmp.replace(path)

    def _load_submission(self, record_id: str, submission_id: str) -> Optional[Dict[str, Any]]:
        path = self._submission_path(record_id, submission_id)
        if not path.is_file():
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _list_submissions(self, record_id: str) -> List[Dict[str, Any]]:
        out_dir = self.storage_dir / record_id
        if not out_dir.is_dir():
            return []
        subs = []
        for path in sorted(out_dir.glob("*.json")):
            if path.name.endswith(".tmp"):
                continue
            with open(path, encoding="utf-8") as f:
                subs.append(json.load(f))
        return subs

    def _find_submission_by_id(self, submission_id: str) -> Optional[Dict[str, Any]]:
        if not self.storage_dir.is_dir():
            return None
        for record_dir in sorted(self.storage_dir.iterdir()):
            if not record_dir.is_dir():
                continue
            found = self._load_submission(record_dir.name, submission_id)
            if found is not None:
                return found
        return None

    def _find_existing_for_remediation(
        self, record_id: str, remediation_id: str, attempt_number: int
    ) -> Optional[Dict[str, Any]]:
        for sub in self._list_submissions(record_id):
            if sub.get("remediation_id") != remediation_id:
                continue
            if sub.get("attempt_number") != attempt_number:
                continue
            if sub.get("status") in (
                SubmissionStatus.RECEIVED.value,
                SubmissionStatus.VALIDATED.value,
                SubmissionStatus.QUEUED_FOR_REPROCESSING.value,
                SubmissionStatus.PROCESSING.value,
                SubmissionStatus.COMPLETED.value,
            ):
                return sub
        return None

    # -- Structural validation of evidence bytes ---------------------------

    def _validate_evidence_bytes(self, filename: str, content: bytes) -> Optional[Dict[str, Any]]:
        """Structural validation only (Phase 02 owns quality).

        Returns dict with mime_type/page_count on success or None on failure
        coupled with an error_code via the caller's re-check.
        """
        from ..ingestion.validators import FileValidator, PDFValidator, ImageValidator

        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_UPLOAD_EXTENSIONS:
            return None
        if len(content) == 0:
            return None
        if len(content) > MAX_UPLOAD_SIZE_BYTES:
            return None

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir) / f"evidence{ext}"
            try:
                tmp_path.write_bytes(content)
            except Exception:
                return None

            is_readable, _ = FileValidator.validate_readable(tmp_path)
            if not is_readable:
                return None
            is_valid, _ = FileValidator.validate_mime_type(tmp_path, ext)
            if not is_valid:
                return None

            mime_type = _mime_for_ext(ext)
            page_count: Optional[int] = None
            try:
                if ext == ".pdf":
                    ok, count, _, _ = PDFValidator.validate_pdf(tmp_path)
                    if not ok or count == 0:
                        return None
                    page_count = count
                else:
                    ok, _, _, _, _ = ImageValidator.validate_image(tmp_path)
                    if not ok:
                        return None
                    page_count = 1
            except Exception:
                return None

        return {"mime_type": mime_type, "page_count": page_count}

    def _evidence_error(self, filename: str, kind: str) -> Dict[str, Any]:
        code = ResubmissionErrorCode.INVALID_FILE.value
        message = f"'{filename}' is not structurally valid evidence."
        if kind == "unsupported":
            code = ResubmissionErrorCode.UNSUPPORTED_FILE_TYPE.value
            message = f"Unsupported evidence type for '{filename}'."
        elif kind == "empty" or kind == "unreadable":
            code = ResubmissionErrorCode.FILE_UNREADABLE.value
            message = f"'{filename}' is empty or unreadable."
        elif kind == "large":
            code = ResubmissionErrorCode.FILE_TOO_LARGE.value
            message = f"'{filename}' exceeds the {MAX_UPLOAD_SIZE_MB}MB limit."
        elif kind == "corrupt":
            code = ResubmissionErrorCode.CORRUPTED_FILE.value
            message = f"'{filename}' is a corrupted or undecodable file."
        return {
            "phase": "RESUBMISSION",
            "status": "FAILED",
            "error_code": code,
            "error_message": message,
        }

    def _locate_evidence_bytes(self, session: Dict[str, Any], ev: Dict[str, Any]) -> Optional[bytes]:
        """Find evidence bytes from the Phase 09 store.

        Tried in order:
          1. persisted relative stored_filename (fast, deterministic)
          2. hash scan of phase_09/_evidence/** (falls back when a legacy
             session lacks the stored path)
        """
        stored_rel = ev.get("stored_filename") or ""
        if stored_rel:
            candidate = (self.phase09_dir / stored_rel)
            try:
                if candidate.is_file():
                    content = candidate.read_bytes()
                    if _sha256_bytes(content) == ev.get("sha256"):
                        return content
            except Exception:
                pass

        evidence_root = self.phase09_dir / "_evidence"
        if evidence_root.is_dir():
            for path in sorted(evidence_root.rglob("*")):
                if not path.is_file():
                    continue
                try:
                    if _sha256_of(path) == ev.get("sha256"):
                        return path.read_bytes()
                except Exception:
                    continue
        return None

    def _evidence_page_number(
        self,
        ev: Dict[str, Any],
        page_assignments: Optional[Dict[str, int]],
        target_pages: List[int],
        assigned_page_numbers: Dict[str, int],
        index: int,
    ) -> Optional[int]:
        sub_id = ev.get("submission_id", "")
        if page_assignments and sub_id in page_assignments:
            return page_assignments[sub_id]
        if sub_id in assigned_page_numbers:
            return assigned_page_numbers[sub_id]
        # Deterministic inference: assign evidence in order to the pages the
        # remediation flagged as needing replacement.
        used = set(assigned_page_numbers.values())
        for page in target_pages:
            if page not in used:
                assigned_page_numbers[sub_id] = page
                return page
        return None

    # -- Eligibility -------------------------------------------------------

    def evaluate_submission_eligibility(
        self, record_id: str, remediation_id: str, document_id: str = ""
    ) -> Tuple[bool, str, str]:
        """Whether a remediation submission can be registered as a resubmission.

        Returns (eligible, reason_code, status_or_reason).
        """
        session = self._load_phase09_session(record_id, remediation_id)
        if session is None:
            return False, ResubmissionErrorCode.REMEDIATION_NOT_FOUND.value, "remediation not found"
        if document_id and session.get("document_id") and document_id != session["document_id"]:
            return False, ResubmissionErrorCode.DOCUMENT_MISMATCH.value, "document mismatch"

        status = session.get("status", "")
        if status == SubmissionStatus.QUEUED_FOR_REPROCESSING.value:
            return False, ResubmissionErrorCode.REMEDIATION_ALREADY_PROCESSING.value, "already queued"
        if status not in COMPARABLE_STATUSES:
            return False, ResubmissionErrorCode.REMEDIATION_NOT_ELIGIBLE.value, f"remediation status {status}"

        attempts = session.get("attempts", [])
        latest = attempts[-1] if attempts else {}
        evidence_docs = latest.get("submissions", []) if isinstance(latest, dict) else []
        if not evidence_docs:
            return False, ResubmissionErrorCode.NO_EVIDENCE_FOUND.value, "no evidence submitted"

        attempt_number = latest.get("attempt_number", session.get("attempt_number", 0))
        existing = self._find_existing_for_remediation(record_id, remediation_id, attempt_number)
        if existing is not None:
            return False, ResubmissionErrorCode.SUBMISSION_ALREADY_REGISTERED.value, (
                f"resubmission {existing.get('submission_id')} already registered"
            )

        return True, "ok", "eligible"

    # -- Resubmission creation ---------------------------------------------

    def create_resubmission(
        self,
        record_id: str,
        remediation_id: str,
        document_id: str = "",
        submission_type: Optional[str] = None,
        created_by: str = "",
        page_assignments: Optional[Dict[str, int]] = None,
        notes: str = "",
    ) -> Dict[str, Any]:
        t0 = time.time()
        session = self._load_phase09_session(record_id, remediation_id)
        if session is None:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.REMEDIATION_NOT_FOUND.value,
                "error_message": f"Remediation {remediation_id} not found for record {record_id}.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        session_doc_id = session.get("document_id", "")
        if document_id and session_doc_id and document_id != session_doc_id:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.DOCUMENT_MISMATCH.value,
                "error_message": "The document_id does not match the remediation session.",
                "record_id": record_id,
                "remediation_id": remediation_id,
                "document_id": document_id,
            }
        document_id = document_id or session_doc_id

        created_by_session = session.get("created_by", "") or ""
        if not created_by_session:
            # Session-level creator may be unset (default ""); fall back to the
            # uploader who actually attached the evidence.
            latest_attempts = session.get("attempts") or []
            if latest_attempts:
                for sub in latest_attempts[-1].get("submissions", []):
                    if sub.get("uploader"):
                        created_by_session = sub["uploader"]
                        break
        if created_by and created_by_session and created_by != created_by_session:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.UPLOADER_MISMATCH.value,
                "error_message": "The uploader is not authorized for this remediation session.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        eligible, reason, status_detail = self.evaluate_submission_eligibility(
            record_id, remediation_id, document_id
        )
        if not eligible:
            code = reason
            message = f"Remediation submission is not eligible for resubmission: {status_detail}."
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": code,
                "error_message": message,
                "record_id": record_id,
                "remediation_id": remediation_id,
                "document_id": document_id,
            }

        attempts = session.get("attempts", [])
        latest = attempts[-1] if attempts else {}
        evidence_docs = latest.get("submissions", []) if isinstance(latest, dict) else []
        attempt_number = latest.get("attempt_number", session.get("attempt_number", 0))

        # -- Re-validate + duplicate evidence detection ----------------------

        known_hashes = set()
        if session.get("original_submission", {}).get("sha256"):
            known_hashes.add(session["original_submission"]["sha256"])
        prior_evidence_ids: List[str] = []
        for attempt in attempts[:-1]:
            for sub in attempt.get("submissions", []):
                if sub.get("sha256"):
                    known_hashes.add(sub["sha256"])
                if sub.get("submission_id"):
                    prior_evidence_ids.append(sub["submission_id"])

        issues = session.get("issues", [])
        reasons = []
        for issue in issues:
            if isinstance(issue, dict):
                label = issue.get("field") or issue.get("field_label") or ""
                if label:
                    reasons.append(f"{label}: {issue.get('issue_type', '')}")
                else:
                    reasons.append(issue.get("issue_type", ""))

        remediation_reasons: List[str] = list(reasons)
        if not remediation_reasons:
            for r in (session.get("remediation_reasons") or []):
                if isinstance(r, dict):
                    remediation_reasons.append(f"{r.get('field', '')}: {r.get('reason', '')}")
                else:
                    remediation_reasons.append(str(r))

        scene_issues = self._materialize_issues(issues)

        # Resolve target page numbers from the remediation issues.
        target_pages = sorted(
            {
                i.get("page")
                for i in scene_issues
                if i.get("page") is not None
                and i.get("issue_type") in PAGE_REPLACEMENT_ISSUE_TYPES
            }
        )

        evidence_entries: List[ResubmissionEvidence] = []
        located_bytes: List[Tuple[Dict[str, Any], bytes]] = []

        if len(evidence_docs) > MAX_FILES_PER_SUBMISSION:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.INVALID_FILE.value,
                "error_message": f"Up to {MAX_FILES_PER_SUBMISSION} evidence files allowed per resubmission.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        sub_ids = {ev.get("submission_id") for ev in evidence_docs if ev.get("submission_id")}
        invalid_assignments = set(page_assignments or {}).difference(sub_ids)
        if invalid_assignments:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.PAGE_MISMATCH.value,
                "error_message": f"page_assignments reference unknown evidence: {sorted(invalid_assignments)}",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        assigned_page_numbers: Dict[str, int] = {}
        for index, ev in enumerate(evidence_docs):
            filename = ev.get("original_filename", "evidence")
            content = self._locate_evidence_bytes(session, ev)
            if content is None:
                return {
                    "phase": "RESUBMISSION",
                    "status": "FAILED",
                    "error_code": ResubmissionErrorCode.EVIDENCE_NOT_FOUND.value,
                    "error_message": f"Could not locate evidence bytes for '{filename}' (sha256 {ev.get('sha256','')[:12]}…).",
                    "record_id": record_id,
                    "remediation_id": remediation_id,
                }
            located_bytes.append((ev, content))

            check = self._validate_evidence_bytes(filename, content)
            if check is None:
                ext = Path(filename).suffix.lower()
                kind = (
                    "unsupported" if ext not in SUPPORTED_UPLOAD_EXTENSIONS
                    else "empty" if len(content) == 0
                    else "large" if len(content) > MAX_UPLOAD_SIZE_BYTES
                    else "corrupt"
                )
                return self._evidence_error(filename, kind)

            sha = ev.get("sha256") or _sha256_bytes(content)
            if sha in known_hashes:
                return {
                    "phase": "RESUBMISSION",
                    "status": "FAILED",
                    "error_code": ResubmissionErrorCode.DUPLICATE_EVIDENCE.value,
                    "error_message": f"'{filename}' duplicates previously registered evidence; no new information.",
                    "record_id": record_id,
                    "remediation_id": remediation_id,
                }
            known_hashes.add(sha)

            page_number = self._evidence_page_number(
                ev, page_assignments, target_pages, assigned_page_numbers, index
            )

            evidence_entries.append(
                ResubmissionEvidence(
                    evidence_submission_id=ev.get("submission_id", _new_id("SUB")),
                    kind=ev.get("kind", "remediation_submission"),
                    original_filename=filename,
                    sha256=sha,
                    file_size_bytes=len(content),
                    mime_type=check["mime_type"],
                    page_count=check["page_count"],
                    page_number=page_number,
                    source="PHASE_09_EVIDENCE",
                )
            )

        # Combined integrity for the submission.
        combined_sha = _combined_sha256([e.sha256 for e in evidence_entries])
        combined_size = sum(e.file_size_bytes for e in evidence_entries)

        # Duplicate-submission detection against previously registered
        # resubmissions for the same remediation/attempt plus exact evidence
        # sets for the record.
        prior_submissions = self._list_submissions(record_id)
        for prior in prior_submissions:
            if prior.get("submission_id") == "_ignore":
                continue
            prior_ev = [e.get("sha256") for e in prior.get("evidence", [])]
            if prior_ev and sorted(prior_ev) == sorted(e.sha256 for e in evidence_entries):
                return {
                    "phase": "RESUBMISSION",
                    "status": "FAILED",
                    "error_code": ResubmissionErrorCode.DUPLICATE_SUBMISSION.value,
                    "error_message": "Identical evidence set was already registered as a resubmission.",
                    "record_id": record_id,
                    "remediation_id": remediation_id,
                    "duplicate_of": prior.get("submission_id"),
                }

        # -- Submission type resolution --------------------------------------

        resolved_type = self._resolve_submission_type(submission_type, evidence_entries, scene_issues)
        if resolved_type is None:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.INVALID_SUBMISSION_TYPE.value,
                "error_message": f"Unknown submission type '{submission_type}'.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        # Page compatibility: a PAGE_REPLACEMENT must not silently merge an
        # incompatible multi-page replacement onto a single page.
        if resolved_type == SubmissionType.PAGE_REPLACEMENT:
            for ev_e in evidence_entries:
                if (
                    ev_e.page_count is not None and ev_e.page_count > 1
                    and ev_e.page_number is not None
                ):
                    return {
                        "phase": "RESUBMISSION",
                        "status": "FAILED",
                        "error_code": ResubmissionErrorCode.PAGE_MISMATCH.value,
                        "error_message": (
                            f"'{ev_e.original_filename}' has {ev_e.page_count} pages but is "
                            f"assigned to replace page {ev_e.page_number}. Multi-page evidence "
                            "cannot silently replace a single page."
                        ),
                        "record_id": record_id,
                        "remediation_id": remediation_id,
                    }

        # -- Page provenance -------------------------------------------------

        original_pc = session.get("original_submission", {}).get("page_count")
        pages = self._build_page_provenance(
            resolved_type,
            evidence_entries,
            target_pages,
            original_pages=original_pc,
            record_id=record_id,
            document_id=document_id,
            session=session,
        )

        # -- Create + persist ------------------------------------------------
        parent_submission_id = prior_evidence_ids[-1] if prior_evidence_ids else f"ORIG-{session.get('original_submission', {}).get('ingestion_id', '') or record_id}"
        submission_id = _new_id("SUB")
        now = _now_iso()

        submission = Resubmission(
            submission_id=submission_id,
            record_id=record_id,
            document_id=document_id,
            parent_document_id=session.get("original_submission", {}).get("document_id") or document_id,
            parent_submission_id=parent_submission_id,
            remediation_id=remediation_id,
            attempt_number=attempt_number,
            version=attempt_number,
            submission_type=resolved_type,
            status=SubmissionStatus.QUEUED_FOR_REPROCESSING,
            source=SubmissionSource.UPLOADER,
            created_at=now,
            created_by=created_by or created_by_session,
            remediation_reasons=remediation_reasons,
            remediation_issues=scene_issues,
            integrity={
                "sha256": combined_sha,
                "file_size": combined_size,
                "evidence_files": len(evidence_entries),
            },
            evidence=evidence_entries,
            pages=pages,
            original_preserved=True,
            notes=notes or "",
            status_history=[
                {"status": SubmissionStatus.RECEIVED.value, "at": now, "by": created_by or "system"},
                {"status": SubmissionStatus.VALIDATED.value, "at": now, "by": created_by or "system"},
                {"status": SubmissionStatus.QUEUED_FOR_REPROCESSING.value, "at": now, "by": created_by or "system"},
            ],
            timestamps={
                "received_at": now,
                "validated_at": now,
                "queued_at": now,
            },
            processing_time_seconds=round(time.time() - t0, 4),
        )
        submission.handoff = {
            "phase": 10,
            "status": SubmissionStatus.QUEUED_FOR_REPROCESSING.value,
            "record_id": record_id,
            "submission_id": submission_id,
            "document_id": document_id,
            "parent_submission_id": parent_submission_id,
            "remediation_id": remediation_id,
            "attempt_number": attempt_number,
            "next_phase": "PHASE_11_REPROCESSING",
        }

        # Persist evidence bytes under the resubmission (immutable copy).
        ev_dir = self.storage_dir / record_id / "evidence" / submission_id
        try:
            ev_dir.mkdir(parents=True, exist_ok=True)
            for ev_e, (_, content) in zip(evidence_entries, located_bytes):
                safe_name = _sanitize_filename(ev_e.original_filename)
                dest = ev_dir / f"{ev_e.sha256[:16]}-{safe_name}"
                if not dest.exists():
                    dest.write_bytes(content)
                ev_e.stored_filename = str(dest.relative_to(self.storage_dir))
        except Exception:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.STORAGE_ERROR.value,
                "error_message": "Could not persist resubmission evidence.",
                "record_id": record_id,
                "remediation_id": remediation_id,
            }

        self._save_submission(submission)

        # -- Advance the remediation session (PROCESSING, not RESOLVED) ------
        advanced = self._phase09_service.set_remediation_status(
            record_id, remediation_id, "PROCESSING", note=f"resubmission {submission_id} registered"
        )
        if not advanced:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.REMEDIATION_NOT_FOUND.value,
                "error_message": "Resubmission registered but remediation status could not be advanced.",
                "record_id": record_id,
                "remediation_id": remediation_id,
                "submission_id": submission_id,
            }

        logger.info(
            "Phase 10 resubmission registered: submission=%s record=%s remediation=%s type=%s attempt=%d evidence=%d sha256=%s",
            submission_id,
            record_id,
            remediation_id,
            resolved_type.value,
            attempt_number,
            len(evidence_entries),
            combined_sha[:16],
        )

        public = submission.to_public_dict()
        return {
            "phase": "RESUBMISSION",
            "status": SubmissionStatus.QUEUED_FOR_REPROCESSING.value,
            "message": "Corrected evidence registered as a new submission; record queued for reprocessing.",
            "record_id": record_id,
            "submission_id": submission_id,
            "document_id": document_id,
            "parent_document_id": public["parent_document_id"],
            "parent_submission_id": parent_submission_id,
            "remediation_id": remediation_id,
            "attempt_number": attempt_number,
            "submission_type": resolved_type.value,
            "integrity": public["integrity"],
            "evidence": public["evidence"],
            "pages": public["pages"],
            "submission": public,
            "handoff": submission.handoff,
        }

    @staticmethod
    def _materialize_issues(issues: List[Any]) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for issue in issues:
            if isinstance(issue, dict):
                out.append(issue)
            elif hasattr(issue, "to_dict"):
                out.append(issue.to_dict())
        return out

    def _resolve_submission_type(
        self,
        requested: Optional[str],
        evidence_entries: List[ResubmissionEvidence],
        issues: List[Dict[str, Any]],
    ) -> Optional[SubmissionType]:
        if requested:
            try:
                return SubmissionType(requested)
            except ValueError:
                return None

        # Deterministic inference that mirrors Phase 09's correction taxonomy.
        # Whole-document replacement dominates (subsumes every page fix),
        # then page-level replacement (RE_UPLOAD_CLEARER_SCAN / REPLACE_PAGE),
        # and only falls back to supporting / missing-page evidence.
        corrections = {
            c for i in issues for c in (i.get("correction_types") or [])
        }
        kinds = {e.kind for e in evidence_entries}

        if "REPLACE_COMPLETE_DOCUMENT" in corrections or "complete_document" in kinds:
            return SubmissionType.COMPLETE_DOCUMENT_REPLACEMENT
        if (
            {"REPLACE_PAGE", "RE_UPLOAD_CLEARER_SCAN"} & corrections
            or "page_replacement" in kinds
        ):
            return SubmissionType.PAGE_REPLACEMENT
        return SubmissionType.ADDITIONAL_EVIDENCE

    def _build_page_provenance(
        self,
        submission_type: SubmissionType,
        evidence_entries: List[ResubmissionEvidence],
        target_pages: List[int],
        original_pages: Optional[int],
        record_id: str,
        document_id: str,
        session: Dict[str, Any],
    ) -> List[PageProvenance]:
        original_session = session.get("original_submission", {})
        origin_source = f"original:{record_id}:{document_id}:ing={original_session.get('ingestion_id') or '?'}"

        if submission_type == SubmissionType.COMPLETE_DOCUMENT_REPLACEMENT:
            return [
                PageProvenance(
                    page_number=None,
                    action=PageAction.REPLACED_BY_COMPLETE_DOCUMENT,
                    original_page_source=origin_source,
                    replacement_sha256=evidence_entries[0].sha256 if evidence_entries else None,
                    replacement_filename=evidence_entries[0].original_filename if evidence_entries else "",
                    note="Entire document replaced; original preserved.",
                )
            ]

        pages: List[PageProvenance] = []
        evidenced_pages = {
            e.page_number for e in evidence_entries if e.page_number is not None
        }
        kept_upper = original_pages or (max(target_pages) if target_pages else 1)

        for page in range(1, kept_upper + 1):
            if page in evidenced_pages:
                entry = next(e for e in evidence_entries if e.page_number == page)
                pages.append(
                    PageProvenance(
                        page_number=page,
                        action=PageAction.REPLACED,
                        original_page_source=f"{origin_source}:page{page}",
                        replacement_sha256=entry.sha256,
                        replacement_filename=entry.original_filename,
                        note="Page replaced by remediation evidence.",
                    )
                )
            else:
                pages.append(
                    PageProvenance(
                        page_number=page,
                        action=PageAction.KEPT,
                        original_page_source=f"{origin_source}:page{page}",
                        note="Original page preserved.",
                    )
                )

        for e in evidence_entries:
            if e.page_number is None or e.page_number > kept_upper:
                action = PageAction.SUPPORTING if submission_type == SubmissionType.ADDITIONAL_EVIDENCE else PageAction.ADDED
                pages.append(
                    PageProvenance(
                        page_number=e.page_number,
                        action=action,
                        original_page_source=origin_source,
                        replacement_sha256=e.sha256,
                        replacement_filename=e.original_filename,
                        note=(
                            "New page added beyond the original page extent."
                            if e.page_number is not None
                            else "Supporting / additional evidence registered."
                        ),
                    )
                )
        return pages

    # -- Retrieval ----------------------------------------------------------

    @staticmethod
    def _to_public(raw: Dict[str, Any]) -> Dict[str, Any]:
        """Strip internal on-disk paths before returning through the API."""
        public = dict(raw)
        public["evidence"] = [
            {k: v for k, v in e.items() if k != "stored_filename"}
            for e in public.get("evidence", [])
        ]
        return public

    def get_submission(self, submission_id: str) -> Optional[Dict[str, Any]]:
        found = self._find_submission_by_id(submission_id)
        if found is None:
            return None
        return self._to_public(found)

    def get_submission_internal(self, submission_id: str) -> Optional[Dict[str, Any]]:
        """Full internal submission dict for downstream phase consumption.

        Unlike get_submission (API-safe), this retains on-disk evidence
        ``stored_filename`` references so Phase 11 can deterministically
        locate the corrected bytes. Used only within phase services, never
        serialized to API responses.
        """
        return self._find_submission_by_id(submission_id)

    def get_record_submissions(self, record_id: str) -> Dict[str, Any]:
        subs = self._list_submissions(record_id)
        return {
            "phase": "RESUBMISSION",
            "record_id": record_id,
            "count": len(subs),
            "submissions": [self._to_public(s) for s in subs],
        }

    # -- Status transitions (Phase 11 driven) -------------------------------

    def update_resubmission_status(
        self,
        submission_id: str,
        new_status: str,
        by: str = "SYSTEM",
        note: str = "",
    ) -> Dict[str, Any]:
        found = self._find_submission_by_id(submission_id)
        if found is None:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.SUBMISSION_NOT_FOUND.value,
                "error_message": f"Resubmission {submission_id} not found.",
                "submission_id": submission_id,
            }

        current = found.get("status", "")
        allowed = _SUBMISSION_TRANSITIONS.get(current, ())
        if new_status not in allowed:
            return {
                "phase": "RESUBMISSION",
                "status": "FAILED",
                "error_code": ResubmissionErrorCode.INVALID_REQUEST.value,
                "error_message": f"Status transition {current} -> {new_status} is not allowed.",
                "submission_id": submission_id,
                "submission": found,
            }

        now = _now_iso()
        found["status"] = new_status
        history = found.get("status_history") or []
        history.append({"status": new_status, "at": now, "by": by, "note": note or ""})
        found["status_history"] = history
        found["timestamps"] = found.get("timestamps") or {}
        found["timestamps"][f"{new_status.lower().replace(' ', '_')}_at"] = now
        if note:
            found["notes"] = f"{found.get('notes', '')}\n[{now}] {note}".strip()

        submission = Resubmission(**self._hydrate(found))
        self._save_submission(submission)
        return {
            "phase": "RESUBMISSION",
            "status": new_status,
            "message": f"Resubmission {submission_id} advanced to {new_status}.",
            "submission_id": submission_id,
            "record_id": found.get("record_id", ""),
            "submission": submission.to_public_dict(),
        }

    @staticmethod
    def _hydrate(raw: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a persisted Phase 10 dict back into Resubmission kwargs.

        Supplements fields that were stored as raw dictionaries back into
        typed dataclass instances so re-persistence stays consistent.
        """
        data = dict(raw)
        data.pop("phase", None)
        data["submission_type"] = SubmissionType(data.get("submission_type", SubmissionType.REMEDIATION_RESUBMISSION.value))
        data["status"] = SubmissionStatus(data.get("status", SubmissionStatus.QUEUED_FOR_REPROCESSING.value))
        data["source"] = SubmissionSource(data.get("source", SubmissionSource.UPLOADER.value))
        evidence = []
        for e in data.get("evidence", []):
            evidence.append(ResubmissionEvidence(**e))
        data["evidence"] = evidence
        pages = []
        for p in data.get("pages", []):
            pages.append(
                PageProvenance(
                    page_number=p.get("page_number"),
                    action=PageAction(p.get("action", PageAction.KEPT.value)),
                    original_page_source=p.get("original_page_source", ""),
                    replacement_sha256=p.get("replacement_sha256"),
                    replacement_filename=p.get("replacement_filename", ""),
                    note=p.get("note", ""),
                )
            )
        data["pages"] = pages
        return data

def get_resubmission_service() -> ResubmissionService:
    return ResubmissionService()
