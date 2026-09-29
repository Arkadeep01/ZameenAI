"""Phase 11 - Post-submission reprocessing engine tests.

Coverage (each spec category mapped to a test class):
  enrollment / eligibility / idempotency / in-progress guard
  run record model / synthetic scope / original preservation
  versioned new result / field-level comparison / regression guard
  issue resolution / decisions A B C D / max-attempts manual review
  retry (transient only) / no-retry for defect / no-retry for completed
  quality/preprocessing/extraction failure recovery (remediation signals)
  page assembly (KEPT/REPLACED/ADDED/SUPPORTING/COMPLETE_DOCUMENT_REPLACEMENT)
  evidence missing / stale data never reused for replaced evidence
  retrieval API + history
  Flask API contract (reprocess/get/history/retry)
  full regression of the frontend-visible public shape (no internal paths)
  Real RoR LR-2026-000002 end-to-end: corrected evidence -> re-run Phases
  03..08 -> improved affected fields reflected in fresh Phase 08 result.
"""

import hashlib
import io
import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.reprocessing.service import ReprocessingService
from app.ocr.reprocessing.models import ReprocessingStatus, ReprocessingDecision, ErrorCategory, ReprocessingErrorCode
from app.ocr.remediation.service import UploaderRemediationService
from app.ocr.remediation.models import RemediationStatus
from app.ocr.resubmission.service import ResubmissionService
from app.ocr.resubmission.models import SubmissionStatus, SubmissionType

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sha(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _make_png_bytes(width=80, height=120, color=(245, 245, 245)) -> bytes:
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (width, height), color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([6, 6, width - 6, height - 6], outline=(40, 40, 40), width=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_pdf_bytes(page_specs) -> bytes:
    """page_specs: list of (width, height, fill_color) tuples."""
    import pymupdf as fitz
    from PIL import Image
    doc = fitz.open()
    for width, height, color in page_specs:
        img = Image.new("RGB", (width, height), color)
        pdf_page = doc.new_page(width=width, height=height)
        png_buf = io.BytesIO()
        img.save(png_buf, format="PNG")
        pdf_page.insert_image(fitz.Rect(0, 0, width, height), stream=png_buf.getvalue())
    buf = io.BytesIO()
    doc.save(buf, deflate=True, garbage=3)
    doc.close()
    return buf.getvalue()


def _phase08_old(record_id="LR-2026-TEST"):
    """REVIEW_REQUIRED with the classic page-1 unreadable issues."""
    return {
        "record_id": record_id,
        "document_id": "DOC-2026-000002",
        "ingestion_id": "ING-2026-000002",
        "document_type": "RECORD_OF_RIGHTS",
        "status": "REVIEW_REQUIRED",
        "confidence": {"overall": 0.60, "band": "MEDIUM"},
        "completeness": {
            "score": 0.70, "band": "MEDIUM", "critical_missing": ["owner.name"],
            "applicable": 25, "present": 14, "missing": 9, "unreadable": 2,
            "not_applicable": 3,
        },
        "fields": {
            "owner.name": {"confidence": 0.0, "value_status": "REQUIRED_BUT_UNREADABLE",
                           "priority": "CRITICAL", "value": None, "source_page": 1},
            "owner.father_husband_name": {"confidence": 0.85, "value_status": "CONFLICTING",
                                          "priority": "CRITICAL", "value": "Haripada Saha",
                                          "in_conflict": True, "source_page": 1},
            "location.block": {"confidence": 0.1, "value_status": "REQUIRED_BUT_UNREADABLE",
                               "priority": "IMPORTANT", "value": None, "source_page": 1},
            "land.plot_number": {"confidence": 0.96, "value_status": "REQUIRED_AND_PRESENT",
                                 "priority": "CRITICAL", "value": "112", "source_page": 1},
        },
        "extracted_record": {
            "owner": {"recorded_tenant": "Ramesh Chandra Saha"},
            "location": {"mouza": "Krishnanagar"},
        },
        "remediation": {"required": True,
                        "reasons": [
                            {"field": "owner.name", "reason": "UNREADABLE_FIELD"},
                            {"field": "location.block", "reason": "UNREADABLE_FIELD"},
                        ]},
    }


def _new_phase08(status="READY_FOR_VALIDATION", extra=None):
    result = {
        "record_id": "LR-2026-TEST-COMPLETE",
        "document_id": "DOC-REP-SUB-x",
        "ingestion_id": "ING-REP-SUB-x",
        "document_type": "RECORD_OF_RIGHTS",
        "status": status,
        "confidence": {"overall": 0.93, "band": "HIGH"},
        "completeness": {
            "score": 0.95, "band": "HIGH", "critical_missing": [],
            "applicable": 25, "present": 24, "missing": 0, "unreadable": 0,
            "not_applicable": 3,
        },
        "fields": {
            "owner.name": {"confidence": 0.98, "value_status": "REQUIRED_AND_PRESENT",
                           "priority": "CRITICAL", "value": "Ramesh Chandra Saha",
                           "source_page": 1},
            "owner.father_husband_name": {"confidence": 0.92, "value_status": "REQUIRED_AND_PRESENT",
                                          "priority": "CRITICAL", "value": "Late Haripada Saha",
                                          "in_conflict": False, "source_page": 1},
            "location.block": {"confidence": 0.94, "value_status": "REQUIRED_AND_PRESENT",
                               "priority": "IMPORTANT", "value": "Krishnanagar",
                               "source_page": 1},
            "land.plot_number": {"confidence": 0.96, "value_status": "REQUIRED_AND_PRESENT",
                                 "priority": "CRITICAL", "value": "112", "source_page": 1},
        },
        "extracted_record": {
            "owner": {"recorded_tenant": "Ramesh Chandra Saha"},
            "location": {"mouza": "Krishnanagar"},
        },
        "remediation": {"required": False, "reasons": []},
    }
    if extra:
        result = json.loads(json.dumps(result))
        for key, value in extra.items():
            result[key] = value
    return result


class _Enroll:
    """Build a real Phase 09 -> Phase 10 chain in temp dirs and return the
    wire objects needed by the engine (dirs, ids, services)."""

    def __init__(self, tmp_path, record_id="LR-2026-TEST",
                 document_id="DOC-2026-000002", ingestion_id="ING-2026-000002",
                 old_phase08=None, evidence=None, use_pdf_evidence=False,
                 submission_type=None):
        self.tmp = Path(tmp_path)
        p09 = self.tmp / "phase09"
        p10 = self.tmp / "phase10"
        p08 = self.tmp / "phase08"
        p07 = self.tmp / "phase07"
        p11 = self.tmp / "phase11"
        originals = self.tmp / "originals"
        for d in (p09, p10, p08, p07, p11, originals):
            d.mkdir(parents=True, exist_ok=True)

        self.record_id = record_id
        self.document_id = document_id
        self.ingestion_id = ingestion_id

        old = old_phase08 or _phase08_old(record_id)
        (p08 / record_id).mkdir(parents=True, exist_ok=True)
        (p08 / record_id / f"{document_id}_confidence_completeness.json").write_text(
            json.dumps(old, indent=2), encoding="utf-8")

        # original source registered under originals (page assembly source)
        self.original_bytes = _make_png_bytes(200, 260, (220, 230, 240))
        (originals / f"{ingestion_id}.png").write_bytes(self.original_bytes)
        self.original_sha = _sha(self.original_bytes)

        if evidence is None:
            self.evidence_bytes = _make_png_bytes(300, 380, (190, 255, 190))
        else:
            self.evidence_bytes = evidence

        self.phase09 = UploaderRemediationService(
            storage_dir=p09, phase08_dir=p08, originals_dir=originals)
        self.phase10 = ResubmissionService(
            storage_dir=p10, phase09_dir=p09, originals_dir=originals)

        created = self.phase09.create_remediation(
            record_id, document_id, ingestion_id, created_by="system@test", force=True)
        assert created.get("status") in (
            "REMEDIATION_SESSION_CREATED", "SUCCESS",
        ), created
        self.remediation_id = created["remediation_id"]

        ev_name = "corrected_page.pdf" if use_pdf_evidence else "corrected_page.png"
        submitted = self.phase09.submit_remediation(
            record_id, self.remediation_id, uploader="system@test",
            files=[(ev_name, self.evidence_bytes)])
        assert submitted.get("status") == RemediationStatus.SUBMITTED.value, submitted

        resub = self.phase10.create_resubmission(
            record_id, self.remediation_id, document_id,
            submission_type=submission_type, created_by="system@test")
        assert resub.get("status") == "QUEUED_FOR_REPROCESSING", resub
        self.submission_id = resub["submission_id"]

        self.phase09_dir = p09
        self.phase10_dir = p10
        self.phase08_dir = p08
        self.phase07_dir = p07
        self.phase11_dir = p11
        self.originals_dir = originals

    def engine(self, max_attempts=3):
        return ReprocessingService(
            storage_dir=self.phase11_dir,
            phase10_dir=self.phase10_dir,
            phase09_dir=self.phase09_dir,
            phase08_dir=self.phase08_dir,
            phase07_dir=self.phase07_dir,
            originals_dir=self.originals_dir,
            max_attempts=max_attempts,
        )


@pytest.fixture()
def enroll(tmp_path):
    return _Enroll(tmp_path)


# ---------------------------------------------------------------------------
# 1. Enrollment, eligibility, idempotency
# ---------------------------------------------------------------------------

class TestEnrollmentAndIdempotency:
    def test_reprocess_runs_to_terminal_and_returns_public_model(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.COMPLETED.value
        assert r.get("error") is None
        assert r["submission_id"] == enroll.submission_id
        assert r["reprocessing_id"].startswith("REP-")
        assert r["attempt_number"] >= 1
        assert r["version"] >= 1
        assert r["current_phase"] == ReprocessingStatus.PHASE_08.value
        assert r["next_phase"] == "PHASE_12_AUTOMATED_VALIDATION"
        assert r["decision"] == ReprocessingDecision.CASE_A_READY_FOR_VALIDATION.value
        assert r["progress"] == 100
        assert r["created_at"] and r["started_at"] and r["completed_at"]
        assert "phases" in r and "result" in r

    def test_reprocess_submission_not_found(self, enroll):
        engine = enroll.engine()
        r = engine.reprocess("SUB-NOPE")
        assert r["status"] == "FAILED"
        assert r["error_code"] == ReprocessingErrorCode.SUBMISSION_NOT_FOUND.value

    def test_reprocess_record_mismatch(self, enroll):
        engine = enroll.engine()
        r = engine.reprocess(enroll.submission_id, record_id="LR-OTHER")
        assert r["status"] == "FAILED"
        assert r["error_code"] == ReprocessingErrorCode.RECORD_MISMATCH.value

    def test_reprocess_is_idempotent_for_terminal_run(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        first = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        second = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert second["reprocessing_id"] == first["reprocessing_id"]
        assert second["status"] == first["status"]

    def test_reprocess_in_progress_submission_blocked(self, enroll, monkeypatch, tmp_path):
        engine = enroll.engine()
        # seed an in-progress run record so the idempotency guard blocks a
        # second enrollment for the same submission
        sub = engine._get_submission_internal(enroll.submission_id)
        from app.ocr.reprocessing.file_helpers import new_run_record
        run = new_run_record(
            reprocessing_id="REP-INPROGRESS-xx",
            submission=sub,
            scope=engine._scope_for_submission(sub),
            by="SYSTEM",
        )
        run["status"] = ReprocessingStatus.RUNNING.value
        runs_dir = engine.storage_dir / enroll.record_id / enroll.submission_id / "runs"
        runs_dir.mkdir(parents=True, exist_ok=True)
        (runs_dir / "REP-INPROGRESS-xx.json").write_text(
            json.dumps(run, indent=2), encoding="utf-8")
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == "FAILED"
        assert r["error_code"] == ReprocessingErrorCode.SUBMISSION_ALREADY_PROCESSED.value


# ---------------------------------------------------------------------------
# 2. Run record model, synthetic scope, original preservation
# ---------------------------------------------------------------------------

class TestRunModelScopeAndPreservation:
    def test_run_records_synthetic_scope(self, enroll, monkeypatch):
        captured = {}
        engine = enroll.engine()

        def fake_pipeline(self, submission, run, scope):
            captured["scope"] = scope
            captured["phases"] = list(run["phases"])
            return {"error": None, "phase08_dict": _new_phase08()}

        monkeypatch.setattr(ReprocessingService, "_run_pipeline", fake_pipeline)
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)

        scope = captured["scope"]
        assert scope["record_id"].startswith(f"{enroll.record_id}~REP-")
        assert scope["document_id"].startswith("DOC-REP-")
        assert scope["ingestion_id"].startswith("ING-REP-")
        # page assembly must have run BEFORE the pipeline
        assert [p["phase"] for p in captured["phases"]] == ["PAGE_ASSEMBLY"]
        # composite registered under originals so phase02/03/06 find it
        composite = enroll.originals_dir / f"{scope['ingestion_id']}.pdf"
        assert composite.is_file()

    def test_original_source_never_overwritten(self, enroll, monkeypatch):
        original_path = enroll.originals_dir / f"{enroll.ingestion_id}.png"
        before = original_path.read_bytes()
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert original_path.read_bytes() == before
        assert _sha(before) == enroll.original_sha

    def test_phase_two_fresh_and_remediation_signal(self, enroll, monkeypatch):
        # a quality failure must stop reprocessing and never auto-resolve
        engine = enroll.engine()

        def driver(self, submission, run, scope):
            result = self._phase02(scope["record_id"], scope["document_id"],
                                   scope["ingestion_id"])
            if result.get("error"):
                return result
            return {"error": None, "phase08_dict": _new_phase08()}

        def bad_phase02(self, scope_record, scope_doc, scope_ing):
            return {"error": True, "failed_phase": "PHASE_02",
                    "category": ErrorCategory.DOCUMENT_DEFECT.value,
                    "code": ReprocessingErrorCode.QUALITY_REJECTED.value,
                    "message": "Corrected document is too blurry."}

        monkeypatch.setattr(ReprocessingService, "_phase02", bad_phase02)
        monkeypatch.setattr(ReprocessingService, "_run_pipeline", driver)
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.FAILED.value
        assert r["error"]["failed_phase"] == "PHASE_02"
        assert r["error"]["code"] == ReprocessingErrorCode.QUALITY_REJECTED.value
        assert r["error"]["category"] == ErrorCategory.DOCUMENT_DEFECT.value
        # remediation must remain actionable, not resolved
        session = engine._get_remediation_internal(enroll.record_id, enroll.remediation_id)
        assert session["status"] == RemediationStatus.ACTION_REQUIRED.value

    def test_public_shape_never_leaks_internal_paths(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        dump = json.dumps(r)
        for internal in ("scope", "stored_filename", "replacement_sha256", "originals/",
                         "phase10_dir", "phase09_dir", "phase11_dir"):
            assert internal not in dump, f"internal leak: {internal}"


# ---------------------------------------------------------------------------
# 3. Versioned new result + field-level comparison
# ---------------------------------------------------------------------------

class TestComparisonAndVersioning:
    def test_new_result_versioned_with_old_result_kept(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        result = r["result"]
        assert result["old_result"]["status"] == "REVIEW_REQUIRED"
        assert result["new_result"]["status"] == "READY_FOR_VALIDATION"
        # old artifact still on disk untouched
        old_file = enroll.phase08_dir / enroll.record_id / \
            f"{enroll.document_id}_confidence_completeness.json"
        assert old_file.is_file()
        assert json.loads(old_file.read_text(encoding="utf-8"))["status"] == "REVIEW_REQUIRED"

    def test_field_level_changes_are_captured(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        changes = {c["field"]: c for c in r["result"]["field_changes"]}
        assert "owner.name" in changes
        assert changes["owner.name"]["old_status"] == "REQUIRED_BUT_UNREADABLE"
        assert changes["owner.name"]["new_status"] == "REQUIRED_AND_PRESENT"
        assert changes["owner.name"]["old_confidence"] < changes["owner.name"]["new_confidence"]
        assert changes["location.block"]["new_confidence"] > 0.9
        # conflict cleared on father/husband
        assert changes["owner.father_husband_name"]["old_conflict"] is True
        assert changes["owner.father_husband_name"]["new_conflict"] is False
        assert r["result"]["confidence_changes"]["overall"]["delta"] > 0
        assert r["result"]["regression_detected"] is False

    def test_issue_resolution_computed_against_remediation_issues(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        resolutions = {res["field"]: res for res in r["result"]["issue_resolution"]}
        assert "owner.name" in resolutions
        assert resolutions["owner.name"]["resolved"] is True
        assert resolutions["owner.name"]["improved"] is True
        assert resolutions["location.block"]["resolved"] is True

    def test_regression_detected_never_silently_accepted(self, enroll, monkeypatch):
        engine = enroll.engine()
        regress = _new_phase08(status="REVIEW_REQUIRED")
        regress["fields"]["land.plot_number"] = {
            "confidence": 0.0, "value_status": "REQUIRED_BUT_UNREADABLE",
            "priority": "CRITICAL", "value": None, "source_page": 1}
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": regress})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["result"]["regression_detected"] is True
        lost = [c for c in r["result"]["field_changes"] if c.get("regression")]
        assert [c["field"] for c in lost] == ["land.plot_number"]
        assert r["decision"] == ReprocessingDecision.CASE_B_REVIEW_REQUIRED.value
        assert r["review_required"] is True
        # remediation stays under review - never resolved
        session = engine._get_remediation_internal(enroll.record_id, enroll.remediation_id)
        assert session["status"] == RemediationStatus.PROCESSING.value


# ---------------------------------------------------------------------------
# 4. Decisions A/B/C/D + max attempts
# ---------------------------------------------------------------------------

class TestDecisions:
    def test_case_a_resolves_remediation(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["decision"] == ReprocessingDecision.CASE_A_READY_FOR_VALIDATION.value
        assert r["review_required"] is False
        session = engine._get_remediation_internal(enroll.record_id, enroll.remediation_id)
        assert session["status"] == RemediationStatus.RESOLVED.value
        # submission reached its terminal COMPLETED state
        sub = engine._get_submission_internal(enroll.submission_id)
        assert sub["status"] == SubmissionStatus.COMPLETED.value

    def test_case_b_review_retained_no_auto_bypass(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None,
                             "phase08_dict": _new_phase08(status="REVIEW_REQUIRED")})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.COMPLETED.value
        assert r["decision"] == ReprocessingDecision.CASE_B_REVIEW_REQUIRED.value
        assert r["review_required"] is True
        assert r["next_phase"] == "MANUAL_REVIEW"
        session = engine._get_remediation_internal(enroll.record_id, enroll.remediation_id)
        assert session["status"] == RemediationStatus.PROCESSING.value  # never resolved

    def test_case_c_remediation_still_required(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None,
                             "phase08_dict": _new_phase08(status="REMEDIATION_REQUIRED")})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.COMPLETED_WITH_REMEDIATION_REQUIRED.value
        assert r["decision"] == ReprocessingDecision.CASE_C_REMEDIATION_REQUIRED.value
        assert r["next_phase"] == "PHASE_09_UPLOADER_REMEDIATION"
        session = engine._get_remediation_internal(enroll.record_id, enroll.remediation_id)
        assert session["status"] == RemediationStatus.ACTION_REQUIRED.value
        # submission COMPLETED so the loop can re-open via Phase 09

    def test_case_d_extraction_error_never_resolves(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None,
                             "phase08_dict": _new_phase08(status="EXTRACTION_ERROR")})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.FAILED.value
        assert r["decision"] == ReprocessingDecision.CASE_D_EXTRACTION_ERROR.value
        assert r["error"]["category"] == ErrorCategory.DOCUMENT_DEFECT.value
        session = engine._get_remediation_internal(enroll.record_id, enroll.remediation_id)
        assert session["status"] == RemediationStatus.ACTION_REQUIRED.value

    def test_max_attempts_triggers_manual_review(self, enroll, monkeypatch):
        engine = enroll.engine(max_attempts=1)
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None,
                             "phase08_dict": _new_phase08(status="REMEDIATION_REQUIRED")})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.MANUAL_REVIEW_REQUIRED.value
        assert r["attempts_exhausted"] is True
        assert r["error"]["code"] == ReprocessingErrorCode.MAXIMUM_ATTEMPTS_REACHED.value
        session = engine._get_remediation_internal(enroll.record_id, enroll.remediation_id)
        assert session["status"] == RemediationStatus.PROCESSING.value
        sub = engine._get_submission_internal(enroll.submission_id)
        assert sub["status"] == SubmissionStatus.FAILED.value


# ---------------------------------------------------------------------------
# 5. Retry semantics
# ---------------------------------------------------------------------------

class TestRetry:
    def test_retry_transient_failure_creates_new_run(self, enroll, monkeypatch):
        engine = enroll.engine()
        calls = {"n": 0}

        def flaky(self, submission, run, scope):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("OOM during OCR")  # TRANSIENT
            return {"error": None, "phase08_dict": _new_phase08()}

        monkeypatch.setattr(ReprocessingService, "_run_pipeline", flaky)
        first = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert first["status"] == ReprocessingStatus.FAILED.value
        assert first["error"]["category"] == ErrorCategory.TRANSIENT.value
        assert first["error"]["code"] == ReprocessingErrorCode.UNKNOWN_ERROR.value

        retried = engine.retry(first["reprocessing_id"], by="SYSTEM")
        assert retried["status"] == ReprocessingStatus.COMPLETED.value
        assert retried["retry_of"] == first["reprocessing_id"]
        assert retried["reprocessing_id"] != first["reprocessing_id"]
        # old run flagged superseded
        old = engine.get_reprocessing(first["reprocessing_id"])
        assert old["superseded_by"] == retried["reprocessing_id"]

    def test_retry_not_allowed_for_document_defect(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": True, "failed_phase": "PHASE_07",
                             "category": ErrorCategory.DOCUMENT_DEFECT.value,
                             "code": ReprocessingErrorCode.EXTRACTION_FAILED.value,
                             "message": "Extraction failed."})
        first = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert first["status"] == ReprocessingStatus.FAILED.value
        retried = engine.retry(first["reprocessing_id"])
        assert retried["status"] == "FAILED"
        assert retried["error_code"] == ReprocessingErrorCode.RETRY_NOT_ALLOWED.value

    def test_retry_not_allowed_for_completed_run(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        first = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert first["status"] == ReprocessingStatus.COMPLETED.value
        retried = engine.retry(first["reprocessing_id"])
        assert retried["status"] == "FAILED"
        assert retried["error_code"] == ReprocessingErrorCode.RETRY_NOT_ALLOWED.value

    def test_retry_unknown_run(self, enroll):
        r = enroll.engine().retry("REP-NOPE")
        assert r["status"] == "FAILED"
        assert r["error_code"] == ReprocessingErrorCode.RUN_NOT_FOUND.value


# ---------------------------------------------------------------------------
# 6. Pipeline failure recovery across phases
# ---------------------------------------------------------------------------

class TestPipelineFailureRecovery:
    def test_preprocessing_reject_marks_remediation(self, enroll, monkeypatch):
        engine = enroll.engine()

        def driver(self, submission, run, scope):
            q = self._phase02(scope["record_id"], scope["document_id"],
                              scope["ingestion_id"])
            if q.get("error"):
                return q
            return self._phase03(scope["record_id"], scope["document_id"],
                                 scope["ingestion_id"], q["quality_dict"])

        def ok_phase02(self, scope_record, scope_doc, scope_ing):
            return {"status": "SUCCESS", "phase": "PHASE_02", "quality_dict": {}}

        def reject_phase03(self, scope_record, scope_doc, scope_ing, quality_dict):
            return {"error": True, "failed_phase": "PHASE_03",
                    "category": ErrorCategory.DOCUMENT_DEFECT.value,
                    "code": ReprocessingErrorCode.PREPROCESSING_REJECTED.value,
                    "message": "REJECT: corrected document unreadable.",
                    "rejection_reasons": ["SEVERE_BLUR"]}

        monkeypatch.setattr(ReprocessingService, "_phase02", ok_phase02)
        monkeypatch.setattr(ReprocessingService, "_phase03", reject_phase03)
        monkeypatch.setattr(ReprocessingService, "_run_pipeline", driver)
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.FAILED.value
        assert r["error"]["failed_phase"] == "PHASE_03"
        assert r["error"]["category"] == ErrorCategory.DOCUMENT_DEFECT.value
        session = engine._get_remediation_internal(enroll.record_id, enroll.remediation_id)
        assert session["status"] == RemediationStatus.ACTION_REQUIRED.value
        sub = engine._get_submission_internal(enroll.submission_id)
        assert sub["status"] == SubmissionStatus.FAILED.value

    def test_phase_steps_run_in_order_on_success(self, enroll, monkeypatch):
        engine = enroll.engine()
        # exercise the REAL driver orchestration by mocking every leaf phase
        monkeypatch.setattr(ReprocessingService, "_phase02",
                            lambda self, a, b, c: {"status": "SUCCESS", "phase": "PHASE_02",
                                                   "quality_dict": {"quality": {}}})
        monkeypatch.setattr(ReprocessingService, "_phase03",
                            lambda self, a, b, c, q: {"status": "SUCCESS", "phase": "PHASE_03"})
        monkeypatch.setattr(ReprocessingService, "_phase04",
                            lambda self, a, b, c, fallback_document_type=None:
                            {"status": "SUCCESS", "phase": "PHASE_04",
                             "document_type": fallback_document_type or "RECORD_OF_RIGHTS",
                             "classification_status": "CLASSIFIED",
                             "classification_confidence": 0.9})
        monkeypatch.setattr(ReprocessingService, "_phase05",
                            lambda self, a, b, c, dt, conf: {"status": "SUCCESS",
                                                             "phase": "PHASE_05",
                                                             "language_detection": {"language": "eng"}})
        monkeypatch.setattr(ReprocessingService, "_phase06",
                            lambda self, a, b, c, dt, cs, conf, lang:
                            {"status": "SUCCESS", "phase": "PHASE_06"})
        monkeypatch.setattr(ReprocessingService, "_phase07",
                            lambda self, a, b, c: {"status": "SUCCESS", "phase": "PHASE_07"})
        monkeypatch.setattr(ReprocessingService, "_phase08",
                            lambda self, a, b, c: {"status": "SUCCESS", "phase": "PHASE_08",
                                                   "phase08_dict": _new_phase08()})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.COMPLETED.value
        phases = [p["phase"] for p in r["phases"]]
        assert phases[0] == "PAGE_ASSEMBLY"
        assert phases[1:] == list(("PHASE_02", "PHASE_03", "PHASE_04", "PHASE_05",
                                   "PHASE_06", "PHASE_07", "PHASE_08")), phases
        for p in r["phases"]:
            assert p["status"] == "SUCCESS"


# ---------------------------------------------------------------------------
# 7. Page assembly
# ---------------------------------------------------------------------------

class TestPageAssembly:
    def test_page_provenance_composition(self, enroll, monkeypatch, tmp_path):
        evidence = _make_png_bytes(300, 380, (60, 200, 60))

        # multi-page PDF original + new evidence; rebuild enrollment for it
        replaced = _Enroll(tmp_path, evidence=evidence)
        (replaced.originals_dir / f"{replaced.ingestion_id}.png").unlink()
        (replaced.originals_dir / f"{replaced.ingestion_id}.pdf").write_bytes(
            _make_pdf_bytes([(400, 500, (200, 60, 60)), (400, 500, (60, 60, 200))]))
        sub_file = replaced.phase10_dir / replaced.record_id / \
            f"{replaced.submission_id}.json"
        sub = json.loads(sub_file.read_text(encoding="utf-8"))
        sha = sub["evidence"][0]["sha256"]
        sub["pages"] = [
            {"page_number": 2, "action": "KEPT"},
            {"page_number": 1, "action": "REPLACED", "replacement_sha256": sha},
            {"page_number": None, "action": "ADDED", "replacement_sha256": sha},
            {"page_number": None, "action": "SUPPORTING", "replacement_sha256": sha},
        ]
        sub_file.write_text(json.dumps(sub, indent=2), encoding="utf-8")

        engine = replaced.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        r = engine.reprocess(replaced.submission_id, record_id=replaced.record_id)
        assert r["status"] == ReprocessingStatus.COMPLETED.value

        composite = replaced.originals_dir / \
            f"ING-REP-{replaced.submission_id}.pdf"
        assert composite.is_file()

        import pymupdf as fitz
        colors = []
        with fitz.open(str(composite)) as doc:
            assert len(doc) == 4
            for page in doc:
                pix = page.get_pixmap(matrix=fitz.Matrix(1, 1), colorspace=fitz.csRGB)
                colors.append(pix.pixel(10, 10))
        # page order: KEPT page2 (blue), REPLACED page1 (evidence green),
        # ADDED (evidence green), SUPPORTING appended last (evidence green)
        assert colors[0] == (60, 60, 200), colors
        assert colors[1][:3] == (60, 200, 60) or colors[1] == (60, 200, 60)
        assert colors[2] == colors[1]
        assert colors[3] == colors[1]

    def test_complete_document_replacement_copies_pdf(self, tmp_path):
        replaced = _Enroll(tmp_path,
                           evidence=_make_pdf_bytes(
                               [(300, 400, (240, 240, 240)), (300, 400, (230, 230, 230))]),
                           use_pdf_evidence=True,
                           submission_type=SubmissionType.COMPLETE_DOCUMENT_REPLACEMENT.value)
        sub_file = replaced.phase10_dir / replaced.record_id / \
            f"{replaced.submission_id}.json"
        sub = json.loads(sub_file.read_text(encoding="utf-8"))
        sub["submission_type"] = SubmissionType.COMPLETE_DOCUMENT_REPLACEMENT.value
        sub["pages"] = [
            {"page_number": 1, "action": "REPLACED_BY_COMPLETE_DOCUMENT",
             "replacement_sha256": sub["evidence"][0]["sha256"]},
        ]
        sub_file.write_text(json.dumps(sub, indent=2), encoding="utf-8")

        engine = replaced.engine()
        with patch.object(ReprocessingService, "_run_pipeline",
                          lambda self, submission, run, scope:
                          {"error": None, "phase08_dict": _new_phase08()}):
            r = engine.reprocess(replaced.submission_id, record_id=replaced.record_id)
        assert r["status"] == ReprocessingStatus.COMPLETED.value
        scope_ing = f"ING-REP-{replaced.submission_id}"
        target = replaced.originals_dir / f"{scope_ing}.pdf"
        assert target.is_file()
        assert target.read_bytes().startswith(b"%PDF")

    def test_missing_evidence_fails_cleanly(self, enroll, monkeypatch):
        engine = enroll.engine()
        # wipe evidence store so the replacement page cannot be located
        evidence_root = enroll.phase10_dir / enroll.record_id / "evidence"
        import shutil
        if evidence_root.exists():
            shutil.rmtree(evidence_root)
        monkeypatch.setattr(ReprocessingService, "_run_pipeline", lambda *a, **k: {})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.FAILED.value
        assert r["error"]["code"] == ReprocessingErrorCode.EVIDENCE_NOT_FOUND.value

    def test_original_ingestion_missing_fails_cleanly(self, enroll, monkeypatch):
        engine = enroll.engine()
        (enroll.originals_dir / f"{enroll.ingestion_id}.png").unlink()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline", lambda *a, **k: {})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.FAILED.value
        assert r["error"]["code"] == ReprocessingErrorCode.PAGE_ASSEMBLY_ERROR.value


# ---------------------------------------------------------------------------
# 8. Stale data never reused for replaced evidence
# ---------------------------------------------------------------------------

class TestNoStaleReuse:
    def test_replaced_evidence_reruns_phases_in_scope(self, enroll, monkeypatch):
        engine = enroll.engine()

        def fake_pipeline(self, submission, run, scope):
            # prove the pipeline is re-invoked against the NEW synthetic scope
            assert scope["ingestion_id"].startswith("ING-REP-")
            assert scope["document_id"].startswith("DOC-REP-")
            assert "~REP-" in scope["record_id"]
            return {"error": None, "phase08_dict": _new_phase08()}

        monkeypatch.setattr(ReprocessingService, "_run_pipeline", fake_pipeline)
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)
        assert r["status"] == ReprocessingStatus.COMPLETED.value
        # no artifacts written into the ORIGINAL record's phase07 dir
        original_p07 = enroll.phase07_dir / enroll.record_id
        assert not original_p07.exists()


# ---------------------------------------------------------------------------
# 9. Retrieval + history
# ---------------------------------------------------------------------------

class TestRetrievalAndHistory:
    def test_get_reprocessing_and_record_history(self, enroll, monkeypatch):
        engine = enroll.engine()
        monkeypatch.setattr(ReprocessingService, "_run_pipeline",
                            lambda self, submission, run, scope:
                            {"error": None, "phase08_dict": _new_phase08()})
        r = engine.reprocess(enroll.submission_id, record_id=enroll.record_id)

        got = engine.get_reprocessing(r["reprocessing_id"])
        assert got["reprocessing_id"] == r["reprocessing_id"]
        assert got["status"] == r["status"]

        history = engine.get_record_reprocessing_history(enroll.record_id)
        assert history["record_id"] == enroll.record_id
        assert history["count"] == 1
        assert history["runs"][0]["reprocessing_id"] == r["reprocessing_id"]

    def test_get_reprocessing_unknown_returns_none(self, enroll):
        assert enroll.engine().get_reprocessing("REP-NOPE") is None


# ---------------------------------------------------------------------------
# 10. Flask API contract
# ---------------------------------------------------------------------------

class TestFlaskAPI:
    @pytest.fixture()
    def client(self, monkeypatch):
        import app.ocr.api.workflow as server_module
        from app.ocr.api.app_factory import app as flask_app
        flask_app.config["TESTING"] = True
        orig = server_module.get_reprocessing_service
        monkeypatch.setattr(server_module, "get_reprocessing_service", orig)
        return server_module, flask_app.test_client()

    def test_api_reprocess_missing_body(self, client):
        server_module, c = client
        r = c.post("/api/digitization/reprocess", json=None)
        assert r.status_code == 400
        assert r.get_json()["error_code"] == ReprocessingErrorCode.INVALID_REQUEST.value

    def test_api_reprocess_missing_params(self, client):
        _, c = client
        r = c.post("/api/digitization/reprocess", json={"record_id": "LR-X"})
        assert r.status_code == 400
        assert r.get_json()["error_code"] == ReprocessingErrorCode.MISSING_PARAMETERS.value

    def test_api_reprocess_runs_synchronously(self, client):
        server_module, c = client
        class FakeService:
            def reprocess(self, submission_id, by, record_id):
                return {"phase": "REPROCESSING", "status": "COMPLETED",
                        "reprocessing_id": "REP-1", "submission_id": submission_id,
                        "record_id": record_id, "decision": "CASE_A_READY_FOR_VALIDATION"}
        server_module.get_reprocessing_service = lambda: FakeService()
        r = c.post("/api/digitization/reprocess",
                   json={"record_id": "LR-X", "submission_id": "SUB-X", "by": "tester"})
        assert r.status_code == 200
        body = r.get_json()
        assert body["status"] == "COMPLETED"
        assert body["submission_id"] == "SUB-X"
        assert body["record_id"] == "LR-X"

    def test_api_get_reprocessing_and_404(self, client):
        server_module, c = client
        r = c.get("/api/digitization/reprocess/REP-1")
        assert r.status_code == 404
        assert r.get_json()["error_code"] == ReprocessingErrorCode.RUN_NOT_FOUND.value
        class FakeService:
            def get_reprocessing(self, reprocessing_id):
                if reprocessing_id == "REP-1":
                    return {"phase": "REPROCESSING", "status": "COMPLETED",
                            "reprocessing_id": "REP-1"}
                return None
        server_module.get_reprocessing_service = lambda: FakeService()
        r = c.get("/api/digitization/reprocess/REP-1")
        assert r.status_code == 200
        assert r.get_json()["reprocessing_id"] == "REP-1"

    def test_api_record_history_endpoint(self, client):
        server_module, c = client
        class FakeService:
            def get_record_reprocessing_history(self, record_id):
                return {"phase": "REPROCESSING", "record_id": record_id,
                        "count": 2, "runs": [{"reprocessing_id": "REP-2"}]}
        server_module.get_reprocessing_service = lambda: FakeService()
        r = c.get("/api/digitization/records/LR-X/reprocessing-history")
        assert r.status_code == 200
        body = r.get_json()
        assert body["count"] == 2
        assert body["runs"][0]["reprocessing_id"] == "REP-2"

    def test_api_retry_endpoint(self, client):
        server_module, c = client
        class FakeService:
            def retry(self, reprocessing_id, by):
                if reprocessing_id == "REP-BROKEN":
                    return {"phase": "REPROCESSING", "status": "FAILED",
                            "error_code": ReprocessingErrorCode.RETRY_NOT_ALLOWED.value,
                            "reprocessing_id": reprocessing_id}
                return {"phase": "REPROCESSING", "status": "COMPLETED",
                        "reprocessing_id": reprocessing_id, "retry_of": "REP-FAILED"}
        server_module.get_reprocessing_service = lambda: FakeService()

        r = c.post("/api/digitization/reprocess/REP-FAILED/retry",
                   json={"by": "tester"})
        assert r.status_code == 200
        assert r.get_json()["retry_of"] == "REP-FAILED"

        r = c.post("/api/digitization/reprocess/REP-BROKEN/retry",
                   json={"by": "tester"})
        assert r.status_code == 400
        assert r.get_json()["error_code"] == ReprocessingErrorCode.RETRY_NOT_ALLOWED.value


# ---------------------------------------------------------------------------
# 11. Real RoR LR-2026-000002 end-to-end
# ---------------------------------------------------------------------------

def _corrected_ror_evidence_bytes():
    """2.5x upscale + contrast stretch of the real scan -> readable values."""
    from PIL import Image, ImageEnhance
    src = Image.open(r"uploads/originals/ING-2026-000002.png").convert("RGB")
    w, h = src.size
    up = src.resize((int(w * 2.5), int(h * 2.5)), Image.LANCZOS)
    gray = up.convert("L")
    gray = ImageEnhance.Contrast(gray).enhance(1.6)
    buf = io.BytesIO()
    gray.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.skipif(
    not Path("uploads/originals/ING-2026-000002.png").is_file()
    or not Path("uploads/processing/phase_08/LR-2026-000002/"
                "DOC-2026-000002_confidence_completeness.json").is_file(),
    reason="real RoR fixture files are environment-provided",
)
class TestRealRoRE2E:
    def test_corrected_evidence_improves_affected_fields(self, tmp_path):
        RECORD = "LR-2026-000002"
        DOC = "DOC-2026-000002"
        ING = "ING-2026-000002"

        # --- clean this record's prior E2E artifacts so the chain re-runs
        #     fresh (repeatable); pipeline leaf phases still hit real stores.
        import shutil
        from app.ocr.reprocessing.models import PHASE_09_STORAGE_DIR, PHASE_10_STORAGE_DIR, PHASE_11_STORAGE_DIR
        for root in (PHASE_09_STORAGE_DIR, PHASE_10_STORAGE_DIR, PHASE_11_STORAGE_DIR):
            rec_dir = root / RECORD
            if rec_dir.exists():
                shutil.rmtree(rec_dir)
            ev_root = root / "_evidence"
            if ev_root.exists():
                shutil.rmtree(ev_root)

        # --- realise the full Phase 09 -> 10 -> 11 chain against real stores
        phase09 = UploaderRemediationService()
        created = phase09.create_remediation(RECORD, DOC, ING,
                                             created_by="test-runner", force=True)
        assert created.get("status") == "REMEDIATION_SESSION_CREATED", created
        remediation_id = created["remediation_id"]

        evidence = _corrected_ror_evidence_bytes()
        submitted = phase09.submit_remediation(
            RECORD, remediation_id, uploader="test-runner",
            files=[("corrected_ror.png", evidence)])
        assert submitted.get("status") == RemediationStatus.SUBMITTED.value, submitted

        phase10 = ResubmissionService()
        resub = phase10.create_resubmission(
            RECORD, remediation_id, DOC, submission_type=None,
            created_by="test-runner")
        assert resub.get("status") == "QUEUED_FOR_REPROCESSING", resub
        submission_id = resub["submission_id"]

        engine = ReprocessingService()
        result = engine.reprocess(submission_id, record_id=RECORD, by="test-runner")

        # --- the run must genuinely re-run phases and reach a terminal verdict
        assert result["status"] != ReprocessingStatus.FAILED.value, result.get("error")
        assert result["status"] in (
            ReprocessingStatus.COMPLETED.value,
            ReprocessingStatus.COMPLETED_WITH_REMEDIATION_REQUIRED.value,
        )
        assert result.get("error") is None
        phases = [p["phase"] for p in result["phases"]]
        assert "PAGE_ASSEMBLY" in phases
        for expected in ("PHASE_02", "PHASE_03", "PHASE_04", "PHASE_05",
                         "PHASE_06", "PHASE_07", "PHASE_08"):
            assert expected in phases, f"missing {expected}: {phases}"
        assert result["result"]["new_result"]["status"] is not None

        # --- affected fields must improve relative to the original assessment
        changes = {c["field"]: c for c in result["result"]["field_changes"]}
        # location.block was UNREADABLE in the old assessment and is readable
        # on the corrected evidence (REQUIRED_AND_PRESENT) -> improvement.
        assert changes["location.block"]["old_status"] == "REQUIRED_BUT_UNREADABLE"
        assert changes["location.block"]["new_status"] in (
            "REQUIRED_AND_PRESENT", "OPTIONAL_AND_PRESENT")
        assert changes["location.block"]["new_confidence"] > \
            changes["location.block"]["old_confidence"]
        # owner.father_husband_name was CONFLICTING; now single-value, conflict gone.
        fb = changes["owner.father_husband_name"]
        assert fb["old_conflict"] is True
        assert fb["new_conflict"] is False
        assert fb["new_status"] in ("REQUIRED_AND_PRESENT", "OPTIONAL_AND_PRESENT")
        # owner.name stays honestly UNREADABLE in the pipeline re-OCR (label and
        # value fall on different lines); the run must surface it, not claim success.
        assert changes["owner.name"]["old_status"] == "REQUIRED_BUT_UNREADABLE"
        assert changes["owner.name"]["new_status"] == "REQUIRED_BUT_UNREADABLE"

        resolutions = {res["field"]: res for res in result["result"]["issue_resolution"]}
        assert resolutions["location.block"]["resolved"] is True
        assert resolutions["owner.name"]["resolved"] is False

        # --- fresh phase08 verdict wired into the run / next-phase
        fresh_status = result["result"]["final_phase08_status"]
        decision = result["decision"]
        if fresh_status == "READY_FOR_VALIDATION":
            assert decision == ReprocessingDecision.CASE_A_READY_FOR_VALIDATION.value
            assert result["next_phase"] == "PHASE_12_AUTOMATED_VALIDATION"
        elif fresh_status == "REVIEW_REQUIRED":
            assert decision == ReprocessingDecision.CASE_B_REVIEW_REQUIRED.value
            assert result["review_required"] is True
        else:  # REMEDIATION_REQUIRED / INCOMPLETE
            assert decision == ReprocessingDecision.CASE_C_REMEDIATION_REQUIRED.value
            assert result["next_phase"] == "PHASE_09_UPLOADER_REMEDIATION"

        session = engine._get_remediation_internal(RECORD, remediation_id)
        assert session["status"] != RemediationStatus.ACTION_REQUIRED.value
        # REVIEW_REQUIRED -> CASE_B: reprocessing completed, review gate kept,
        # remediation parked at PROCESSING (never RESOLVED, never auto-bypassed).
        assert session["status"] == RemediationStatus.PROCESSING.value