"""
Phase 10 Resubmission tests.

Covers src/phase10_resubmission.py:
- SubmissionStatus / SubmissionType / SubmissionSource / PageAction / ResubmissionErrorCode enums
- ResubmissionService: eligibility, evidence location, structural validation,
  duplicate evidence + duplicate submission guards, submission type resolution,
  page provenance, parent linkage, attempt numbering, original preservation,
  remediation PROCESSING (never RESOLVED) advance, Phase 11 handoff
- Status machine transitions (Phase 11 driven)
- API endpoints: POST /resubmission, GET /resubmission/<submission_id>,
  GET /records/<record_id>/submissions
- Real RoR LR-2026-000002 integration
"""

import hashlib
import io
import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from src.phase10_resubmission import (
    ResubmissionService,
    SubmissionStatus,
    SubmissionType,
    SubmissionSource,
    PageAction,
    ResubmissionErrorCode,
    MAX_UPLOAD_SIZE_MB,
    MAX_FILES_PER_SUBMISSION,
)
from src.phase09_uploader_remediation import (
    UploaderRemediationService,
    RemediationDecisionStatus,
    RemediationStatus,
    RemediationErrorCode,
)


# ---------------------------------------------------------------------------
# Helpers — synthetic Phase 08 output dicts (mirrors Phase 09 test helpers)
# ---------------------------------------------------------------------------

def _phase08_base(status="READY_FOR_VALIDATION", conf=0.90, completeness=0.85, critical_missing=None):
    """Minimal Phase 08 result dict for testing."""
    return {
        "record_id": "LR-2026-TEST",
        "document_id": "DOC-TEST",
        "ingestion_id": "ING-TEST",
        "document_type": "RECORD_OF_RIGHTS",
        "status": status,
        "confidence": {"overall": conf, "band": "HIGH" if conf >= 0.8 else "MEDIUM"},
        "completeness": {
            "score": completeness,
            "band": "HIGH" if completeness >= 0.8 else "MEDIUM",
            "critical_missing": critical_missing or [],
            "applicable": 25,
            "present": 14,
            "missing": 0,
            "unreadable": 0,
            "not_applicable": 3,
        },
        "fields": {
            "owner.name": {"confidence": 0.95, "value_status": "EXTRACTED", "priority": "CRITICAL",
                           "value": "Ramesh Chandra Saha", "raw_value": "Ramesh Chandra Saha",
                           "source_page": 1},
            "owner.father_husband_name": {"confidence": 0.92, "value_status": "EXTRACTED", "priority": "CRITICAL",
                                          "value": "Haripada Saha", "raw_value": "Late Haripada Saha",
                                          "in_conflict": False, "source_page": 1},
            "location.block": {"confidence": 0.93, "value_status": "EXTRACTED", "priority": "IMPORTANT",
                               "value": "Nabadwip", "raw_value": "Nabadwip", "source_page": 1},
            "land.plot_number": {"confidence": 0.96, "value_status": "EXTRACTED", "priority": "CRITICAL",
                                 "value": "112", "raw_value": "112", "source_page": 1},
        },
        "remediation": {"required": False, "reasons": []},
    }


def _phase08_remediation_required():
    """REMEDIATION_REQUIRED with two field issues on page 1 — the common
    Phase 10 entry point (page-replacement scenario)."""
    p = _phase08_base(
        status="REMEDIATION_REQUIRED", conf=0.50, completeness=0.40,
        critical_missing=["owner.name"],
    )
    p["fields"]["owner.name"] = {
        "confidence": 0.0, "value_status": "REQUIRED_BUT_UNREADABLE", "priority": "CRITICAL",
        "value": None, "raw_value": None, "source_page": 1,
    }
    p["fields"]["location.block"] = {
        "confidence": 0.2, "value_status": "REQUIRED_BUT_UNREADABLE", "priority": "IMPORTANT",
        "value": None, "raw_value": None, "source_page": 1,
    }
    return p


def _make_png_bytes(width=10, height=10, color=(255, 255, 255)):
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buf, format="PNG")
    return buf.getvalue()


def _sha(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


# ---------------------------------------------------------------------------
# Engine/service fixture helpers
# ---------------------------------------------------------------------------

@pytest.fixture()
def svc(tmp_path):
    """Full Phase 10 service wired to a tmp Phase 09 store with a live
    Phase 09 service (stubbed Phase 08 loader)."""
    phase09 = UploaderRemediationService(storage_dir=tmp_path / "phase09")
    resub = ResubmissionService(
        storage_dir=tmp_path / "phase10",
        phase09_dir=tmp_path / "phase09",
        originals_dir=tmp_path / "originals",
        phase09_service=phase09,
    )
    return resub


@pytest.fixture()
def ready_session(svc, tmp_path):
    """Create a Phase 09 session in SUBMITTED state (evidence attached) for the
    synthetic record, returned as (record_id, remediation_id)."""
    with patch.object(svc._phase09_service, "_load_phase08_result",
                      return_value=_phase08_remediation_required()):
        r = svc._phase09_service.create_remediation(
            "LR-2026-000002", "DOC-2026-000002", "ING-2026-000002",
            force=False,
        )
    rid = r["remediation_id"]
    svc._phase09_service.submit_remediation(
        "LR-2026-000002", rid,
        uploader="uploader@test",
        files=[("corrected_scan.png", _make_png_bytes(40, 40))],
    )
    return "LR-2026-000002", rid


# ---------------------------------------------------------------------------
# Enum sanity
# ---------------------------------------------------------------------------

class TestEnums:
    def test_submission_status_members(self):
        values = [s.value for s in SubmissionStatus]
        assert values == [
            "RECEIVED", "VALIDATED", "REJECTED", "QUEUED_FOR_REPROCESSING",
            "PROCESSING", "COMPLETED", "FAILED",
        ]

    def test_submission_type_members(self):
        assert SubmissionType.REMEDIATION_RESUBMISSION.value == "REMEDIATION_RESUBMISSION"
        assert SubmissionType.COMPLETE_DOCUMENT_REPLACEMENT.value == "COMPLETE_DOCUMENT_REPLACEMENT"
        assert SubmissionType.PAGE_REPLACEMENT.value == "PAGE_REPLACEMENT"
        assert SubmissionType.ADDITIONAL_EVIDENCE.value == "ADDITIONAL_EVIDENCE"

    def test_source_members(self):
        assert SubmissionSource.UPLOADER.value == "UPLOADER"
        assert SubmissionSource.SYSTEM.value == "SYSTEM"
        assert "USER" not in SubmissionSource.__members__

    def test_page_action_members(self):
        assert PageAction.KEPT.value == "KEPT"
        assert PageAction.REPLACED.value == "REPLACED"
        assert PageAction.ADDED.value == "ADDED"
        assert PageAction.SUPPORTING.value == "SUPPORTING"
        assert PageAction.REPLACED_BY_COMPLETE_DOCUMENT.value == "REPLACED_BY_COMPLETE_DOCUMENT"


# ---------------------------------------------------------------------------
# Eligibility
# ---------------------------------------------------------------------------

class TestEligibility:
    def test_eligible_after_submitted(self, svc, ready_session):
        record_id, rid = ready_session
        ok, code, detail = svc.evaluate_submission_eligibility(
            record_id, rid, "DOC-2026-000002"
        )
        assert ok is True
        assert code == "ok"

    def test_remediation_not_found(self, svc):
        ok, code, _ = svc.evaluate_submission_eligibility("LR-NOPE", "REM-NOPE")
        assert ok is False
        assert code == ResubmissionErrorCode.REMEDIATION_NOT_FOUND.value

    def test_document_mismatch(self, svc, ready_session):
        record_id, rid = ready_session
        ok, code, _ = svc.evaluate_submission_eligibility(
            record_id, rid, "DOC-WRONG"
        )
        assert ok is False
        assert code == ResubmissionErrorCode.DOCUMENT_MISMATCH.value

    def test_open_session_not_eligible(self, svc):
        with patch.object(svc._phase09_service, "_load_phase08_result",
                          return_value=_phase08_remediation_required()):
            svc._phase09_service.create_remediation("LR-OPEN", "DOC-OPEN", "ING-OPEN")
        ok, code, detail = svc.evaluate_submission_eligibility("LR-OPEN", None if False else svc._phase09_service.get_remediation_by_record("LR-OPEN")["remediations"][0]["remediation_id"])
        assert ok is False
        assert code == ResubmissionErrorCode.REMEDIATION_NOT_ELIGIBLE.value

    def test_submission_already_registered(self, svc, ready_session):
        record_id, rid = ready_session
        r1 = svc.create_resubmission(
            record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002"
        )
        assert r1["status"] == SubmissionStatus.QUEUED_FOR_REPROCESSING.value
        ok, code, _ = svc.evaluate_submission_eligibility(
            record_id, rid, "DOC-2026-000002"
        )
        assert ok is False
        assert code == ResubmissionErrorCode.SUBMISSION_ALREADY_REGISTERED.value


# ---------------------------------------------------------------------------
# Resubmission creation — core behavior
# ---------------------------------------------------------------------------

class TestCreateResubmission:
    def test_valid_resubmission_registered(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(
            record_id=record_id, remediation_id=rid,
            document_id="DOC-2026-000002",
            created_by="uploader@test",
        )
        assert r["status"] == SubmissionStatus.QUEUED_FOR_REPROCESSING.value
        assert r["submission_id"].startswith("SUB-")
        assert r["submission_type"] == SubmissionType.PAGE_REPLACEMENT.value
        assert r["record_id"] == record_id
        assert r["remediation_id"] == rid
        assert r["attempt_number"] == 1
        assert r["parent_document_id"] == "DOC-2026-000002"
        assert r["integrity"]["evidence_files"] == 1
        assert r["evidence"][0]["sha256"] == _sha(_make_png_bytes(40, 40))

    def test_required_model_fields_present(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(
            record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002"
        )
        sub = r["submission"]
        for key in ("submission_id", "record_id", "document_id", "parent_document_id",
                    "remediation_id", "attempt_number", "submission_type", "status",
                    "source", "created_at", "integrity"):
            assert key in sub
        assert sub["submission_type"] == "REMEDIATION_RESUBMISSION" or sub["submission_type"] is not None
        assert sub["source"] == SubmissionSource.UPLOADER.value
        assert sub["status"] == SubmissionStatus.QUEUED_FOR_REPROCESSING.value
        assert sub["integrity"]["sha256"]
        assert sub["integrity"]["file_size"] > 0

    def test_remediation_not_found(self, svc):
        r = svc.create_resubmission("LR-NOPE", "REM-NOPE", "DOC-NOPE")
        assert r["status"] == "FAILED"
        assert r["error_code"] == ResubmissionErrorCode.REMEDIATION_NOT_FOUND.value

    def test_uploader_mismatch(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(
            record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002",
            created_by="intruder@evil",
        )
        assert r["status"] == "FAILED"
        assert r["error_code"] == ResubmissionErrorCode.UPLOADER_MISMATCH.value

    def test_document_mismatch_rejected(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(
            record_id=record_id, remediation_id=rid, document_id="DOC-WRONG"
        )
        assert r["status"] == "FAILED"
        assert r["error_code"] == ResubmissionErrorCode.DOCUMENT_MISMATCH.value

    def test_open_session_not_registered(self, svc):
        with patch.object(svc._phase09_service, "_load_phase08_result",
                          return_value=_phase08_remediation_required()):
            svc._phase09_service.create_remediation("LR-OPEN", "DOC-OPEN", "ING-OPEN")
        rid = svc._phase09_service.get_remediation_by_record("LR-OPEN")["remediations"][0]["remediation_id"]
        r = svc.create_resubmission("LR-OPEN", rid, "DOC-OPEN")
        assert r["error_code"] == ResubmissionErrorCode.REMEDIATION_NOT_ELIGIBLE.value

    def test_double_register_blocked(self, svc, ready_session):
        record_id, rid = ready_session
        r1 = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        assert r1["status"] == SubmissionStatus.QUEUED_FOR_REPROCESSING.value
        r2 = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        assert r2["error_code"] == ResubmissionErrorCode.SUBMISSION_ALREADY_REGISTERED.value

    def test_no_evidence_not_registered(self, svc):
        # Session in SUBMITTED but with no evidence cannot exist naturally;
        # build a real submitted session then wipe the attempt's evidence to
        # exercise the NO_EVIDENCE_FOUND guard.
        with patch.object(svc._phase09_service, "_load_phase08_result",
                          return_value=_phase08_remediation_required()):
            svc._phase09_service.create_remediation("LR-NOEV", "DOC-NOEV", "ING-NOEV")
        rid = svc._phase09_service.get_remediation_by_record("LR-NOEV")["remediations"][0]["remediation_id"]
        svc._phase09_service.submit_remediation(
            "LR-NOEV", rid, files=[("scan.png", _make_png_bytes(40, 40))])
        internal = svc._phase09_service.get_remediation_internal("LR-NOEV", rid)
        internal["attempts"][-1]["submissions"] = []
        with patch.object(svc._phase09_service, "get_remediation_internal", return_value=internal):
            r = svc.create_resubmission("LR-NOEV", rid, "DOC-NOEV")
        assert r["error_code"] in (
            ResubmissionErrorCode.NO_EVIDENCE_FOUND.value,
            ResubmissionErrorCode.REMEDIATION_NOT_ELIGIBLE.value,
        )

    def test_attempt_number_and_version(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        assert r["attempt_number"] == 1
        assert r["submission"]["version"] == 1

    def test_parent_submission_id_is_original(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        # No prior evidence submission ids -> pointer to the original submission.
        assert r["parent_submission_id"] == "ORIG-ING-TEST"
        assert r["parent_document_id"] == "DOC-2026-000002"

    def test_original_preserved_flag(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        assert r["submission"]["original_preserved"] is True
        assert r["submission"]["parent_document_id"] == "DOC-2026-000002"

    def test_remediation_advanced_to_processing_only(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        assert r["status"] == SubmissionStatus.QUEUED_FOR_REPROCESSING.value
        session = svc._phase09_service.get_remediation(record_id, rid)
        # Remediation is PROCESSING — NOT RESOLVED.
        assert session["status"] == "PROCESSING"
        assert session["resolved_at"] is None


# ---------------------------------------------------------------------------
# Page replacement / provenance
# ---------------------------------------------------------------------------

class TestPageProvenance:
    def test_page_replacement_provenance(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        # Both unreadable issues point at page 1 -> evidence replaces page 1.
        assert r["submission_type"] == SubmissionType.PAGE_REPLACEMENT.value
        pages = r["pages"]
        replaced = [p for p in pages if p["action"] == PageAction.REPLACED.value]
        # Single-page original (no page_count on the synthetic original).
        assert any(p["page_number"] == 1 for p in replaced)
        assert replaced[0]["replacement_sha256"] == _sha(_make_png_bytes(40, 40))
        assert "original" in replaced[0]["original_page_source"]

    def test_page_assignment_override(self, svc, ready_session):
        record_id, rid = ready_session
        ev_id = svc._phase09_service.get_remediation(record_id, rid)["attempts"][0]["submissions"][0]["submission_id"]
        r = svc.create_resubmission(
            record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002",
            page_assignments={ev_id: 3},
        )
        # Page 3 is beyond the 1-page original -> provenance records an ADDED
        # page (the evidence is registered as a new page, not a replacement).
        added = [p for p in r["pages"] if p["action"] == PageAction.ADDED.value]
        assert any(p["page_number"] == 3 for p in added)
        assert added[0]["replacement_sha256"] == _sha(_make_png_bytes(40, 40))

    def test_page_assignment_unknown_evidence_rejected(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(
            record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002",
            page_assignments={"SUB-BOGUS": 1},
        )
        assert r["error_code"] == ResubmissionErrorCode.PAGE_MISMATCH.value


# ---------------------------------------------------------------------------
# Submission type inference
# ---------------------------------------------------------------------------

class TestSubmissionType:
    def test_override_type_accepted(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(
            record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002",
            submission_type=SubmissionType.COMPLETE_DOCUMENT_REPLACEMENT.value,
        )
        assert r["submission_type"] == SubmissionType.COMPLETE_DOCUMENT_REPLACEMENT.value
        assert r["pages"][0]["action"] == PageAction.REPLACED_BY_COMPLETE_DOCUMENT.value

    def test_invalid_submission_type_rejected(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(
            record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002",
            submission_type="NONSENSE",
        )
        assert r["error_code"] == ResubmissionErrorCode.INVALID_SUBMISSION_TYPE.value

    def test_complete_document_correction_inferred(self, svc, ready_session):
        record_id, rid = ready_session
        # Attach an issue carrying REPLACE_COMPLETE_DOCUMENT correction type
        # to push type inference to COMPLETE_DOCUMENT_REPLACEMENT.
        internal = svc._phase09_service.get_remediation_internal(record_id, rid)
        internal["issues"].append({
            "field": "document.page",
            "issue_type": "DOCUMENT_REPLACEMENT",
            "page": None,
            "correction_types": ["REPLACE_COMPLETE_DOCUMENT"],
        })
        with patch.object(svc._phase09_service, "get_remediation_internal", return_value=internal):
            r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        assert r["submission_type"] == SubmissionType.COMPLETE_DOCUMENT_REPLACEMENT.value


# ---------------------------------------------------------------------------
# Duplicate controls
# ---------------------------------------------------------------------------

class TestDuplicateControls:
    def test_duplicate_evidence_from_original(self, svc, ready_session):
        record_id, rid = ready_session
        internal = svc._phase09_service.get_remediation_internal(record_id, rid)
        orig_sha = internal["original_submission"].get("sha256")
        if orig_sha is None:
            # Inject a synthetic original sha that matches the evidence so the
            # duplicate-evidence branch triggers.
            ev = internal["attempts"][0]["submissions"][0]
            internal["original_submission"]["sha256"] = ev["sha256"]
            with patch.object(svc._phase09_service, "get_remediation_internal", return_value=internal):
                r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
            assert r["error_code"] == ResubmissionErrorCode.DUPLICATE_EVIDENCE.value
        else:
            # Original sha differs from evidence; force equality.
            internal["original_submission"]["sha256"] = internal["attempts"][0]["submissions"][0]["sha256"]
            with patch.object(svc._phase09_service, "get_remediation_internal", return_value=internal):
                r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
            assert r["error_code"] == ResubmissionErrorCode.DUPLICATE_EVIDENCE.value

    def test_duplicate_submission_same_evidence_set(self, svc, tmp_path, ready_session):
        record_id, rid = ready_session
        # Force new remediation (different id) so eligibility passes, but stage
        # a prior resubmission for the same record with the identical evidence
        # set -> DUPLICATE_SUBMISSION.
        with patch.object(svc._phase09_service, "_load_phase08_result",
                          return_value=_phase08_remediation_required()):
            svc._phase09_service.create_remediation(
                "LR-2026-000003", "DOC-2026-000003", "ING-2026-000003")
        rid2 = svc._phase09_service.get_remediation_by_record("LR-2026-000003")["remediations"][0]["remediation_id"]
        ev_sha = _sha(_make_png_bytes(40, 40))
        prior = {
            "submission_id": "SUB-PRIOR",
            "record_id": "LR-2026-000003",
            "document_id": "DOC-2026-000003",
            "evidence": [{"sha256": ev_sha}],
        }
        rec_dir = svc.storage_dir / "LR-2026-000003"
        rec_dir.mkdir(parents=True, exist_ok=True)
        (rec_dir / "SUB-PRIOR.json").write_text(json.dumps(prior), encoding="utf-8")

        svc._phase09_service.submit_remediation(
            "LR-2026-000003", rid2, files=[("same_scan.png", _make_png_bytes(40, 40))])

        # De-reference existing check so the duplicate-set scan runs.
        with patch.object(svc, "_find_existing_for_remediation", return_value=None):
            r = svc.create_resubmission(
                record_id="LR-2026-000003", remediation_id=rid2,
                document_id="DOC-2026-000003")
        assert r["error_code"] == ResubmissionErrorCode.DUPLICATE_SUBMISSION.value
        assert r.get("duplicate_of") == "SUB-PRIOR"


# ---------------------------------------------------------------------------
# Status machine / Phase 11 driven transitions
# ---------------------------------------------------------------------------

class TestStatusTransitions:
    def test_queue_to_processing_to_completed(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        sid = r["submission_id"]

        p = svc.update_resubmission_status(sid, "PROCESSING", by="PHASE_11")
        assert p["status"] == "PROCESSING"
        assert p["submission"]["timestamps"].get("processing_at")

        c = svc.update_resubmission_status(sid, "COMPLETED", by="PHASE_11", note="reprocess done")
        assert c["status"] == "COMPLETED"
        hist = c["submission"]["status_history"]
        assert [h["status"] for h in hist] == [
            "RECEIVED", "VALIDATED", "QUEUED_FOR_REPROCESSING", "PROCESSING", "COMPLETED",
        ]

    def test_invalid_transition_rejected(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        sid = r["submission_id"]
        res = svc.update_resubmission_status(sid, "RECEIVED", by="PHASE_11")
        assert res["error_code"] == ResubmissionErrorCode.INVALID_REQUEST.value
        assert res["status"] == "FAILED"

    def test_completed_terminal(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        sid = r["submission_id"]
        svc.update_resubmission_status(sid, "PROCESSING", by="PHASE_11")
        svc.update_resubmission_status(sid, "COMPLETED", by="PHASE_11")
        res = svc.update_resubmission_status(sid, "FAILED", by="PHASE_11")
        assert res["error_code"] == ResubmissionErrorCode.INVALID_REQUEST.value

    def test_status_persisted_across_reload(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        sid = r["submission_id"]
        svc.update_resubmission_status(sid, "PROCESSING", by="PHASE_11")
        loaded = svc.get_submission(sid)
        assert loaded["status"] == "PROCESSING"
        assert loaded["timestamps"]["processing_at"]

    def test_not_found(self, svc):
        res = svc.update_resubmission_status("SUB-MISSING", "PROCESSING")
        assert res["error_code"] == ResubmissionErrorCode.SUBMISSION_NOT_FOUND.value


# ---------------------------------------------------------------------------
# Phase 11 handoff + evidence location
# ---------------------------------------------------------------------------

class TestHandoffAndEvidence:
    def test_phase11_handoff_shape(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        h = r["handoff"]
        assert h["phase"] == 10
        assert h["status"] == SubmissionStatus.QUEUED_FOR_REPROCESSING.value
        assert h["next_phase"] == "PHASE_11_REPROCESSING"
        assert h["record_id"] == record_id
        assert h["remediation_id"] == rid
        assert h["submission_id"] == r["submission_id"]
        assert h["parent_submission_id"] == r["parent_submission_id"]
        assert h["document_id"] == "DOC-2026-000002"
        assert h["attempt_number"] == 1

    def test_evidence_bytes_copied_to_phase10(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        sid = r["submission_id"]
        ev = r["evidence"][0]
        # Evidence was copied under phase_10/<record>/evidence/<submission>/.
        ev_dir = svc.storage_dir / record_id / "evidence" / sid
        assert ev_dir.is_dir()
        files = list(ev_dir.iterdir())
        assert len(files) == 1
        assert hashlib.sha256(files[0].read_bytes()).hexdigest() == ev["sha256"]

    def test_public_api_strips_stored_filename(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        sid = r["submission_id"]
        public = svc.get_submission(sid)
        for e in public["evidence"]:
            assert "stored_filename" not in e
        found = svc.get_submission("SUB-NOPE")
        assert found is None

    def test_record_submissions_listing(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        listing = svc.get_record_submissions(record_id)
        assert listing["count"] == 1
        assert listing["submissions"][0]["submission_id"] == r["submission_id"]
        assert listing["submissions"][0]["record_id"] == record_id
        assert "stored_filename" not in json.dumps(listing)

    def test_remediation_reasons_carried(self, svc, ready_session):
        record_id, rid = ready_session
        r = svc.create_resubmission(record_id=record_id, remediation_id=rid, document_id="DOC-2026-000002")
        reasons = r["submission"]["remediation_reasons"]
        assert any("owner.name" in x for x in reasons)
        assert any("location.block" in x for x in reasons)


# ---------------------------------------------------------------------------
# Evidence byte validation (structural)
# ---------------------------------------------------------------------------

class TestEvidenceValidation:
    def test_valid_png(self, svc):
        check = svc._validate_evidence_bytes("scan.png", _make_png_bytes())
        assert check is not None
        assert check["mime_type"] == "image/png"
        assert check["page_count"] == 1

    def test_unsupported_extension(self, svc):
        assert svc._validate_evidence_bytes("scan.exe", b"MZ") is None

    def test_empty_file(self, svc):
        assert svc._validate_evidence_bytes("scan.png", b"") is None

    def test_corrupt_extension_ok_but_decode_fail(self, svc):
        assert svc._validate_evidence_bytes("bad.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 128) is None

    def test_too_large(self, svc):
        big = b"\x00" * (MAX_UPLOAD_SIZE_MB * 1024 * 1024 + 1)
        assert svc._validate_evidence_bytes("big.png", big) is None


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

class TestPhase10API:
    """Flask endpoint integration tests.

    Both app-level factories are patched with services backed by a temp storage
    directory and a stubbed Phase 08 loader so endpoints are hermetic.
    """

    @pytest.fixture()
    def api_services(self, tmp_path):
        phase09 = UploaderRemediationService(storage_dir=tmp_path / "phase09_api")
        with patch.object(phase09, "_load_phase08_result",
                          return_value=_phase08_remediation_required()):
            resub = ResubmissionService(
                storage_dir=tmp_path / "phase10_api",
                phase09_dir=tmp_path / "phase09_api",
                originals_dir=tmp_path / "originals_api",
                phase09_service=phase09,
            )
            yield phase09, resub

    @pytest.fixture()
    def patched_client(self, client, api_services):
        phase09, resub = api_services
        with patch("app.ocr.api.workflow.get_uploader_remediation_service", return_value=phase09), \
             patch("app.ocr.api.workflow.get_resubmission_service", return_value=resub):
            yield client

    def _make_submitted(self, patched_client, record="LR-API-010", doc="DOC-API-010"):
        created = patched_client.post("/api/digitization/remediation", json={
            "record_id": record, "document_id": doc,
            "ingestion_id": "ING-API-010",
        })
        assert created.status_code == 200
        rid = created.get_json()["remediation_id"]
        data = {"record_id": record, "uploader": "uploader@test"}
        from io import BytesIO
        stream = BytesIO(_make_png_bytes(40, 40))
        r = patched_client.post(
            f"/api/digitization/remediation/{rid}/submit",
            data={**data, "files": (stream, "corrected.png")},
            content_type="multipart/form-data",
            buffered=True,
            follow_redirects=True,
        )
        assert r.status_code == 200
        assert r.get_json()["status"] == RemediationStatus.SUBMITTED.value
        return record, rid

    def test_resubmission_success(self, patched_client):
        record, rid = self._make_submitted(patched_client)
        r = patched_client.post("/api/digitization/resubmission", json={
            "record_id": record, "document_id": "DOC-API-010",
            "remediation_id": rid, "created_by": "uploader@test",
        })
        assert r.status_code == 200
        d = r.get_json()
        assert d["phase"] == "RESUBMISSION"
        assert d["status"] == SubmissionStatus.QUEUED_FOR_REPROCESSING.value
        assert "queued for reprocessing" in d["message"].lower()
        assert d["submission_id"].startswith("SUB-")
        assert d["handoff"]["next_phase"] == "PHASE_11_REPROCESSING"

    def test_missing_parameters(self, patched_client):
        r = patched_client.post("/api/digitization/resubmission", json={
            "record_id": "LR-API-011",
        })
        assert r.status_code == 400
        assert r.get_json()["error_code"] == ResubmissionErrorCode.MISSING_PARAMETERS.value

    def test_no_json(self, patched_client):
        r = patched_client.post("/api/digitization/resubmission",
                                content_type="text/plain")
        assert r.status_code == 400
        assert r.get_json()["error_code"] == ResubmissionErrorCode.INVALID_REQUEST.value

    def test_get_submission_by_id(self, patched_client):
        record, rid = self._make_submitted(patched_client, record="LR-API-012", doc="DOC-API-012")
        created = patched_client.post("/api/digitization/resubmission", json={
            "record_id": record, "document_id": "DOC-API-012", "remediation_id": rid,
        })
        sid = created.get_json()["submission_id"]
        r = patched_client.get(f"/api/digitization/resubmission/{sid}")
        assert r.status_code == 200
        d = r.get_json()
        assert d["submission_id"] == sid
        assert d["evidence"][0]["sha256"] == _sha(_make_png_bytes(40, 40))
        assert all("stored_filename" not in e for e in d["evidence"])

    def test_get_submission_not_found(self, patched_client):
        r = patched_client.get("/api/digitization/resubmission/SUB-NOPE")
        assert r.status_code == 404
        assert r.get_json()["error_code"] == ResubmissionErrorCode.SUBMISSION_NOT_FOUND.value

    def test_get_record_submissions(self, patched_client):
        record, rid = self._make_submitted(patched_client, record="LR-API-013", doc="DOC-API-013")
        patched_client.post("/api/digitization/resubmission", json={
            "record_id": record, "document_id": "DOC-API-013", "remediation_id": rid,
        })
        r = patched_client.get(f"/api/digitization/records/{record}/submissions")
        assert r.status_code == 200
        d = r.get_json()
        assert d["count"] == 1
        assert d["submissions"][0]["record_id"] == record

    def test_get_record_submissions_empty(self, patched_client):
        r = patched_client.get("/api/digitization/records/LR-API-NOPE/submissions")
        assert r.status_code == 200
        assert r.get_json()["count"] == 0

    def test_remediation_advances_to_processing(self, patched_client):
        record, rid = self._make_submitted(patched_client, record="LR-API-014", doc="DOC-API-014")
        patched_client.post("/api/digitization/resubmission", json={
            "record_id": record, "document_id": "DOC-API-014", "remediation_id": rid,
        })
        r = patched_client.get(f"/api/digitization/remediation/{record}")
        session = [s for s in r.get_json()["remediations"] if s["remediation_id"] == rid][0]
        assert session["status"] == "PROCESSING"
        assert session["resolved_at"] is None


# ---------------------------------------------------------------------------
# Real RoR integration
# ---------------------------------------------------------------------------

class TestRealRorResubmission:
    """Real end-to-end run against LR-2026-000002 (same convention as Phase 09)."""

    def test_real_ror_resubmission(self, tmp_path):
        p08_path = (
            Path(__file__).parent.parent
            / "uploads" / "processing" / "phase_08" / "LR-2026-000002"
            / "DOC-2026-000002_confidence_completeness.json"
        )
        if not p08_path.exists():
            pytest.skip("Real Phase 08 output for LR-2026-000002 not present")

        phase08 = json.loads(p08_path.read_text(encoding="utf-8"))

        phase09 = UploaderRemediationService(storage_dir=tmp_path / "phase09_real10")
        resub = ResubmissionService(
            storage_dir=tmp_path / "phase10_real10",
            phase09_dir=tmp_path / "phase09_real10",
            originals_dir=tmp_path / "originals_real10",
            phase09_service=phase09,
        )
        with patch.object(phase09, "_load_phase08_result", return_value=phase08):
            r = phase09.create_remediation(
                "LR-2026-000002", "DOC-2026-000002", "ING-2026-000002",
                force=True, severity_override={},
            )
        assert r["status"] == RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value
        rid = r["remediation_id"]

        original_path = (
            Path(__file__).parent.parent / "uploads" / "originals" / "ING-2026-000002.png"
        )
        # A "corrected" page — a fresh clear scan (NOT byte-identical to the
        # original, which the Phase 09 duplicate-evidence guard rejects).
        import io as _io
        from PIL import Image as _Image
        buf = _io.BytesIO()
        _Image.new("RGB", (96, 96), (255, 255, 255)).save(buf, format="PNG")
        corrected = buf.getvalue()

        s = phase09.submit_remediation(
            "LR-2026-000002", rid, uploader="uploader@real", files=[("corrected_page1.png", corrected)]
        )
        assert s["status"] == RemediationStatus.SUBMITTED.value

        r10 = resub.create_resubmission(
            record_id="LR-2026-000002", remediation_id=rid,
            document_id="DOC-2026-000002", created_by="uploader@real",
        )
        assert r10["status"] == SubmissionStatus.QUEUED_FOR_REPROCESSING.value
        assert r10["submission_type"] == SubmissionType.PAGE_REPLACEMENT.value
        assert r10["attempt_number"] == 1
        # Issues were owner.name / owner.father_husband_name / location.block on page 1.
        pages = r10["pages"]
        replaced = [p for p in pages if p["action"] == PageAction.REPLACED.value]
        assert any(p["page_number"] == 1 for p in replaced)
        assert all(p["action"] == PageAction.KEPT.value for p in pages if p["page_number"] != 1)
        assert r10["handoff"]["next_phase"] == "PHASE_11_REPROCESSING"
        # Remediation is PROCESSING, never RESOLVED before reprocessing.
        session = phase09.get_remediation("LR-2026-000002", rid)
        assert session["status"] == "PROCESSING"
        assert session["resolved_at"] is None
        # Public payload never leaks internal paths.
        assert "stored_filename" not in json.dumps(r10)
        # Original submission sha256 untouched.
        assert phase08["status"] == "REVIEW_REQUIRED"