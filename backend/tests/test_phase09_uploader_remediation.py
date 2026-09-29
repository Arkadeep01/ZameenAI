"""
Phase 09 Uploader Remediation tests.

Covers src/phase09_uploader_remediation.py:
- build_remediation_issues: issue creation from Phase 08 assessment
- decide_remediation: policy engine (trigger statuses, force, REVIEW_REQUIRED rules)
- UploaderRemediationService: session lifecycle, submission, duplicate guards
- API endpoints: POST /remediation, GET /remediation/<record_id>, POST .../submit
- Phase 10 handoff shape
"""

import json
import io
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from src.phase09_uploader_remediation import (
    build_remediation_issues,
    decide_remediation,
    UploaderRemediationService,
    RemediationStatus,
    RemediationDecisionStatus,
    RemediationErrorCode,
    Severity,
    MAX_UPLOAD_SIZE_MB,
    MAX_FILES_PER_SUBMIT,
)


# ---------------------------------------------------------------------------
# Helpers — synthetic Phase 08 output dicts
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


def _phase08_with_missing(field_name="owner.name", priority="IMPORTANT"):
    p = _phase08_base()
    p["fields"][field_name] = {
        "confidence": 0.0, "value_status": "REQUIRED_BUT_MISSING", "priority": priority,
        "value": None, "raw_value": None, "source_page": None,
    }
    return p


def _phase08_with_unreadable(field_name="location.block", priority="IMPORTANT"):
    p = _phase08_base()
    p["fields"][field_name] = {
        "confidence": 0.3, "value_status": "REQUIRED_BUT_UNREADABLE", "priority": priority,
        "value": None, "raw_value": None, "source_page": 1,
    }
    return p


def _phase08_with_conflict(field_name="owner.father_husband_name", priority="IMPORTANT"):
    p = _phase08_base()
    p["fields"][field_name] = {
        "confidence": 0.6, "value_status": "CONFLICTING", "priority": priority,
        "value": "Haripada Saha", "raw_value": "Late Haripada Saha",
        "in_conflict": True, "source_page": 1,
    }
    return p


def _phase08_incomplete(completeness=0.20, critical_missing=None):
    return _phase08_base(
        status="REMEDIATION_REQUIRED",
        conf=0.40,
        completeness=completeness,
        critical_missing=critical_missing or ["owner.name", "land.plot_number"],
    )


def _phase08_review_required(conf=0.70, completeness=0.60):
    p = _phase08_base(status="REVIEW_REQUIRED", conf=conf, completeness=completeness)
    p["fields"]["owner.father_husband_name"]["in_conflict"] = True
    p["completeness"]["critical_missing"] = []
    return p


def _phase08_review_required_critical(conf=0.70, completeness=0.60):
    p = _phase08_review_required(conf=conf, completeness=completeness)
    p["completeness"]["critical_missing"] = ["land.survey_number"]
    return p


def _make_png_bytes(width=10, height=10, color=(255, 255, 255)):
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buf, format="PNG")
    return buf.getvalue()


def _corrupt_png_bytes():
    """Correct PNG magic header but broken payload -> passes MIME check,
    fails image decode (CORRUPTED_FILE)."""
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 128


# ---------------------------------------------------------------------------
# Engine tests — build_remediation_issues
# ---------------------------------------------------------------------------

class TestBuildRemediationIssues:
    """Pure function: build_remediation_issues(phase08_result, ...) -> List[RemediationIssue]"""

    def test_no_issues_on_ready_for_validation(self):
        issues = build_remediation_issues(_phase08_base(status="READY_FOR_VALIDATION"))
        assert issues == []

    def test_issues_on_remediation_required(self):
        p = _phase08_with_unreadable(field_name="owner.name")
        p["status"] = "REMEDIATION_REQUIRED"
        issues = build_remediation_issues(p)
        assert len(issues) >= 1
        assert any(i.field == "owner.name" for i in issues)

    def test_missing_field_creates_field_missing_issue(self):
        p = _phase08_with_missing("land.survey_number", "OPTIONAL")
        issues = build_remediation_issues(p)
        issue = [i for i in issues if i.field == "land.survey_number"][0]
        assert issue.issue_type.value == "FIELD_MISSING"
        assert issue.severity == Severity.MEDIUM  # OPTIONAL priority

    def test_unreadable_field_creates_field_unreadable_issue(self):
        issues = build_remediation_issues(_phase08_with_unreadable())
        issue = [i for i in issues if i.field == "location.block"][0]
        assert issue.issue_type.value == "FIELD_UNREADABLE"
        assert issue.severity == Severity.HIGH  # IMPORTANT priority

    def test_conflict_creates_field_conflict_issue(self):
        issues = build_remediation_issues(_phase08_with_conflict())
        issue = [i for i in issues if i.field == "owner.father_husband_name"][0]
        assert issue.issue_type.value == "FIELD_CONFLICT"
        assert issue.severity == Severity.HIGH

    def test_incomplete_document_when_low_completeness(self):
        p = _phase08_incomplete(completeness=0.20)
        issues = build_remediation_issues(p)
        doc_issues = [i for i in issues if i.scope.value == "DOCUMENT"]
        assert len(doc_issues) >= 1
        assert doc_issues[0].issue_type.value == "INCOMPLETE_DOCUMENT"

    def test_no_document_issue_above_score_threshold(self):
        p = _phase08_incomplete(completeness=0.50)
        issues = build_remediation_issues(p)
        doc_issues = [i for i in issues if i.scope.value == "DOCUMENT"]
        assert doc_issues == []

    def test_critical_priority_yields_critical_severity(self):
        p = _phase08_with_missing("owner.name", "CRITICAL")
        issues = build_remediation_issues(p)
        issue = [i for i in issues if i.field == "owner.name"][0]
        assert issue.severity == Severity.CRITICAL

    def test_missing_page_has_none_page_reference(self):
        p = _phase08_with_missing("owner.name", "IMPORTANT")
        del p["fields"]["owner.name"]["source_page"]
        issues = build_remediation_issues(p)
        issue = [i for i in issues if i.field == "owner.name"][0]
        assert issue.page is None

    def test_page_referenced_issue_preserves_page(self):
        issues = build_remediation_issues(_phase08_with_conflict())
        issue = [i for i in issues if i.field == "owner.father_husband_name"][0]
        assert issue.page == 1

    def test_optional_field_not_present_no_issue(self):
        p = _phase08_base()
        p["fields"]["additional.remarks"] = {
            "confidence": 0.0, "value_status": "NOT_PRESENT", "priority": "OPTIONAL",
            "value": None, "raw_value": None,
        }
        issues = build_remediation_issues(p)
        assert not any(i.field == "additional.remarks" for i in issues)

    def test_not_applicable_field_no_issue(self):
        p = _phase08_base()
        p["fields"]["registration.document_number"] = {
            "confidence": 1.0, "value_status": "NOT_APPLICABLE", "priority": "OPTIONAL",
            "value": None, "raw_value": None,
        }
        issues = build_remediation_issues(p)
        assert not any(i.field == "registration.document_number" for i in issues)

    def test_severity_override_applies(self):
        p = _phase08_with_missing("location.block", "OPTIONAL")
        issues = build_remediation_issues(p, severity_override={"location.block": "CRITICAL"})
        issue = [i for i in issues if i.field == "location.block"][0]
        assert issue.severity == Severity.CRITICAL


# ---------------------------------------------------------------------------
# Engine tests — decide_remediation
# ---------------------------------------------------------------------------

class TestDecideRemediation:
    """Pure function: decide_remediation(phase08_result, ...) -> (bool, reason)"""

    def test_remediation_required_returns_true(self):
        ok, reason = decide_remediation(_phase08_base(status="REMEDIATION_REQUIRED"))
        assert ok is True
        assert "REMEDIATION_REQUIRED" in reason

    def test_incomplete_returns_true(self):
        ok, reason = decide_remediation(_phase08_base(status="INCOMPLETE"))
        assert ok is True
        assert "INCOMPLETE" in reason

    def test_ready_for_validation_returns_false(self):
        ok, reason = decide_remediation(_phase08_base(status="READY_FOR_VALIDATION"))
        assert ok is False
        assert "READY_FOR_VALIDATION" in reason

    def test_review_required_returns_false_by_default(self):
        ok, reason = decide_remediation(_phase08_review_required())
        assert ok is False
        assert "REVIEW_REQUIRED" in reason

    def test_review_required_with_critical_triggers(self):
        # critical_missing present -> remediation triggers even on REVIEW_REQUIRED
        ok, reason = decide_remediation(_phase08_review_required_critical())
        assert ok is True
        assert reason == "critical_missing"

    def test_review_required_force_returns_true(self):
        ok, reason = decide_remediation(_phase08_review_required(), force=True)
        assert ok is True

    def test_force_overrides_any_status(self):
        ok, reason = decide_remediation(_phase08_base(status="READY_FOR_VALIDATION"), force=True)
        assert ok is True

    def test_custom_trigger_statuses(self):
        ok, reason = decide_remediation(
            _phase08_base(status="REVIEW_REQUIRED"),
            trigger_statuses=("REVIEW_REQUIRED",),
        )
        assert ok is True

    def test_no_remediation_for_success(self):
        ok, reason = decide_remediation(_phase08_base(status="SUCCESS"))
        assert ok is False


# ---------------------------------------------------------------------------
# Service tests — UploaderRemediationService
# ---------------------------------------------------------------------------

class TestUploaderRemediationService:
    """Session lifecycle, submission, guards."""

    @pytest.fixture()
    def svc(self, tmp_path):
        return UploaderRemediationService(storage_dir=tmp_path / "phase09")

    @pytest.fixture()
    def p08_ror(self):
        return _phase08_base(status="REMEDIATION_REQUIRED", conf=0.50, completeness=0.40,
                             critical_missing=["owner.name"])

    def test_create_session_created(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-001", "DOC-001", "ING-001")
        assert r["status"] == RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value
        assert r["remediation_id"].startswith("REM-")
        assert r["remediation"]["status"] == "OPEN"

    def test_create_no_remediation_ready(self, svc):
        with patch.object(svc, "_load_phase08_result",
                          return_value=_phase08_base(status="READY_FOR_VALIDATION")):
            r = svc.create_remediation("LR-002", "DOC-002", "ING-002")
        # READY_FOR_VALIDATION → NO_REMEDIATION_REQUIRED
        assert r["status"] == RemediationDecisionStatus.NO_REMEDIATION_REQUIRED.value
        assert r["remediation"] is None

    def test_create_review_required_no_remediation(self, svc):
        # Inject phase08 mock
        with patch.object(svc, "_load_phase08_result", return_value=_phase08_review_required()):
            r = svc.create_remediation("LR-003", "DOC-003", "ING-003")
        assert r["status"] == RemediationDecisionStatus.REVIEW_REQUIRED_NO_REMEDIATION.value

    def test_create_review_required_force_creates(self, svc):
        with patch.object(svc, "_load_phase08_result", return_value=_phase08_review_required()):
            r = svc.create_remediation("LR-004", "DOC-004", "ING-004", force=True)
        assert r["status"] == RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value

    def test_duplicate_guard(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r1 = svc.create_remediation("LR-005", "DOC-005", "ING-005")
            assert r1["status"] == RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value
            r2 = svc.create_remediation("LR-005", "DOC-005", "ING-005")
        assert r2["status"] == RemediationDecisionStatus.DUPLICATE_REMEDIATION.value

    def test_duplicate_guard_force_overrides(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            svc.create_remediation("LR-006", "DOC-006", "ING-006")
            r2 = svc.create_remediation("LR-006", "DOC-006", "ING-006", force=True)
        assert r2["status"] == RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value

    def test_submit_valid_file(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-007", "DOC-007", "ING-007")
        rid = r["remediation_id"]
        png = _make_png_bytes()
        s = svc.submit_remediation("LR-007", rid, uploader="u@t", files=[("scan.png", png)])
        assert s["status"] == RemediationStatus.SUBMITTED.value
        assert s["attempt_number"] == 1
        assert len(s["submissions"]) == 1

    def test_submit_duplicate_evidence(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-008", "DOC-008", "ING-008")
        rid = r["remediation_id"]
        png = _make_png_bytes()
        # Two identical files in one submission: second is a duplicate.
        s = svc.submit_remediation("LR-008", rid, files=[("a.png", png), ("b.png", png)])
        assert s["error_code"] == RemediationErrorCode.DUPLICATE_EVIDENCE.value

    def test_submit_corrupted_file(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-009", "DOC-009", "ING-009")
        rid = r["remediation_id"]
        s = svc.submit_remediation("LR-009", rid, files=[("bad.png", _corrupt_png_bytes())])
        assert s["error_code"] == RemediationErrorCode.CORRUPTED_FILE.value

    def test_submit_already_submitted(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-010", "DOC-010", "ING-010")
        rid = r["remediation_id"]
        svc.submit_remediation("LR-010", rid, files=[("a.png", _make_png_bytes())])
        s2 = svc.submit_remediation("LR-010", rid, files=[("b.png", _make_png_bytes(20, 20))])
        assert s2["error_code"] == RemediationErrorCode.REMEDIATION_ALREADY_SUBMITTED.value

    def test_submit_no_files(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-011", "DOC-011", "ING-011")
        rid = r["remediation_id"]
        s = svc.submit_remediation("LR-011", rid, files=[])
        assert s["error_code"] == RemediationErrorCode.NO_FILES_PROVIDED.value

    def test_original_submission_preserved(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-012", "DOC-012", "ING-012")
        orig = r["remediation"]["original_submission"]
        assert orig["kind"] == "original_submission"
        assert orig["document_id"] == "DOC-012"
        assert orig["ingestion_id"] == "ING-TEST"  # from base fixture

    def test_phase10_handoff_shape(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-013", "DOC-013", "ING-013")
        rid = r["remediation_id"]
        s = svc.submit_remediation("LR-013", rid, files=[("scan.png", _make_png_bytes())])
        h = s["handoff"]
        assert h["new_evidence_available"] is True
        assert h["next_phase"] == "PHASE_10_RESUBMISSION"
        assert h["record_id"] == "LR-013"
        assert h["remediation_id"] == rid
        assert "submission_id" in h

    def test_get_remediation_by_record(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            svc.create_remediation("LR-014", "DOC-014", "ING-014")
        r = svc.get_remediation_by_record("LR-014")
        assert r["count"] == 1
        assert r["remediations"][0]["record_id"] == "LR-014"

    def test_get_remediation_by_record_empty(self, svc):
        r = svc.get_remediation_by_record("LR-NONEXISTENT")
        assert r["count"] == 0
        assert r["remediations"] == []

    def test_get_remediation_not_found(self, svc):
        r = svc.get_remediation("LR-NONEXISTENT", "REM-FAKE")
        assert r is None

    def test_multiple_attempts_accumulate(self, svc, p08_ror):
        with patch.object(svc, "_load_phase08_result", return_value=p08_ror):
            r = svc.create_remediation("LR-015", "DOC-015", "ING-015")
        rid = r["remediation_id"]
        svc.submit_remediation("LR-015", rid, files=[("a.png", _make_png_bytes())])
        s2 = svc.submit_remediation("LR-015", rid, files=[("b.png", _make_png_bytes(20, 20))])
        assert s2["error_code"] == RemediationErrorCode.REMEDIATION_ALREADY_SUBMITTED.value
        # Check that the session has 1 attempt recorded
        loaded = svc.get_remediation("LR-015", rid)
        assert loaded["attempt_number"] == 1


class TestRealRor:
    """Real end-to-end run against LR-2026-000002 (same convention as Phase 08 tests)."""

    def test_real_ror_build_issues(self):
        p08_path = (
            Path(__file__).parent.parent
            / "uploads" / "processing" / "phase_08" / "LR-2026-000002"
            / "DOC-2026-000002_confidence_completeness.json"
        )
        if not p08_path.exists():
            pytest.skip("Real Phase 08 output for LR-2026-000002 not present")

        phase08 = json.loads(p08_path.read_text(encoding="utf-8"))
        assert phase08["status"] == "REVIEW_REQUIRED"

        issues = build_remediation_issues(phase08)
        assert any(i.field == "owner.name" for i in issues)
        assert any(i.field == "owner.father_husband_name" for i in issues)
        assert any(i.field == "location.block" for i in issues)
        # REVIEW_REQUIRED without force -> no remediation by default.
        ok, _ = decide_remediation(phase08)
        assert ok is False
        ok, _ = decide_remediation(phase08, force=True)
        assert ok is True

    def test_real_ror_service_force_creates(self, tmp_path):
        p08_path = (
            Path(__file__).parent.parent
            / "uploads" / "processing" / "phase_08" / "LR-2026-000002"
            / "DOC-2026-000002_confidence_completeness.json"
        )
        if not p08_path.exists():
            pytest.skip("Real Phase 08 output for LR-2026-000002 not present")

        svc = UploaderRemediationService(storage_dir=tmp_path / "phase09_real")
        with patch.object(svc, "_load_phase08_result",
                          return_value=json.loads(p08_path.read_text(encoding="utf-8"))):
            r = svc.create_remediation("LR-2026-000002", "DOC-2026-000002", "ING-2026-000002", force=True)
        assert r["status"] == RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value
        assert r["remediation"]["document_type"] == "RECORD_OF_RIGHTS"
        assert r["remediation"]["original_submission"]["ingestion_id"] == "ING-2026-000002"


# ---------------------------------------------------------------------------
# API tests
# ---------------------------------------------------------------------------

class TestPhase09API:
    """Flask endpoint integration tests.

    The app-level `get_uploader_remediation_service` factory is patched with a
    service backed by a temp storage dir and a stubbed Phase 08 loader, so
    endpoint tests are hermetic (no dependence on on-disk processing outputs).
    """

    @pytest.fixture()
    def api_svc(self, tmp_path):
        svc = UploaderRemediationService(storage_dir=tmp_path / "phase09_api")
        with patch.object(svc, "_load_phase08_result",
                          return_value=_phase08_base(status="REMEDIATION_REQUIRED",
                                                     conf=0.5, completeness=0.4,
                                                     critical_missing=["owner.name"])):
            yield svc

    @pytest.fixture()
    def patched_client(self, client, api_svc):
        with patch("app.ocr.api.workflow.get_uploader_remediation_service", return_value=api_svc):
            yield client

    def test_create_remediation_success(self, patched_client):
        r = patched_client.post("/api/digitization/remediation", json={
            "record_id": "LR-API-001",
            "document_id": "DOC-API-001",
            "ingestion_id": "ING-API-001",
        })
        assert r.status_code == 200
        d = r.get_json()
        assert d["phase"] == "UPLOADER_REMEDIATION"
        assert d["status"] == RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value
        assert d["remediation_id"].startswith("REM-")

    def test_create_remediation_missing_record_id(self, patched_client):
        r = patched_client.post("/api/digitization/remediation", json={
            "document_id": "DOC-API-001",
        })
        assert r.status_code == 400
        assert r.get_json()["error_code"] == RemediationErrorCode.MISSING_PARAMETERS.value

    def test_create_remediation_no_json(self, patched_client):
        r = patched_client.post("/api/digitization/remediation", content_type="text/plain")
        assert r.status_code == 400

    def test_create_remediation_force_flag(self, patched_client):
        r = patched_client.post("/api/digitization/remediation", json={
            "record_id": "LR-API-002",
            "document_id": "DOC-API-002",
            "force": True,
        })
        assert r.status_code == 200
        assert r.get_json()["status"] == RemediationDecisionStatus.REMEDIATION_SESSION_CREATED.value

    def test_get_by_record(self, patched_client):
        created = patched_client.post("/api/digitization/remediation", json={
            "record_id": "LR-API-003", "document_id": "DOC-API-003",
        })
        assert created.status_code == 200
        rid = created.get_json()["remediation_id"]
        r = patched_client.get("/api/digitization/remediation/LR-API-003")
        assert r.status_code == 200
        body = r.get_json()
        assert body["count"] == 1
        assert body["remediations"][0]["remediation_id"] == rid

    def test_get_by_record_empty(self, patched_client):
        r = patched_client.get("/api/digitization/remediation/LR-API-NOPE")
        assert r.status_code == 200
        assert r.get_json()["count"] == 0

    def test_submit_remediation_endpoint(self, patched_client):
        created = patched_client.post("/api/digitization/remediation", json={
            "record_id": "LR-API-004", "document_id": "DOC-API-004",
        })
        rid = created.get_json()["remediation_id"]

        data = {
            "record_id": "LR-API-004",
            "uploader": "uploader@test",
            "resolution_notes": "clean rescan attached",
        }
        r = patched_client.post(
            f"/api/digitization/remediation/{rid}/submit",
            data=data,
            content_type="multipart/form-data",
            buffered=True,
            follow_redirects=True,
        )
        # no file attached -> 400 no files provided
        assert r.status_code == 400
        assert r.get_json()["error_code"] == RemediationErrorCode.NO_FILES_PROVIDED.value

    def test_submit_missing_record_id(self, patched_client):
        r = patched_client.post(
            "/api/digitization/remediation/REM-API-FAKE/submit",
            data={},
            content_type="multipart/form-data",
        )
        assert r.status_code == 400
        assert r.get_json()["error_code"] == RemediationErrorCode.MISSING_PARAMETERS.value
