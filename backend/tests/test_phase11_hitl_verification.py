"""
Phase 11 — HITL-1 Digitization Verification tests.

Covers the mandatory human-review lifecycle: open from a real validation
run, field verify/correct/unresolved with original-value preservation,
reviewer notes, guarded submit (VERIFIED needs all flagged fields
dispositioned; CORRECTION_REQUIRED/REJECTED need reasons; reviewer always
required), terminal-state immutability, persistence round-trips, and the
HTTP API. No AI output ever auto-decides.
"""

import json
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.hitl.models import FieldReviewAction, Hitl1Status
from app.ocr.hitl.service import Hitl1Service, get_hitl1_service


def _svc(tmp_path=None):
    if tmp_path is None:
        tmp_path = Path(tempfile.mkdtemp())
    return Hitl1Service(storage_dir=Path(tmp_path) / "hitl_1")


def _real_validation_run_id():
    runs = sorted(
        (Path(__file__).parent.parent / "uploads" / "processing" / "phase_12").glob(
            "LR-2026-000002/*.json"
        )
    )
    if not runs:
        return None
    data = json.loads(runs[0].read_text(encoding="utf-8"))
    return data.get("validation_run_id")


def _open_real(svc):
    vid = _real_validation_run_id()
    if not vid:
        pytest.skip("no real validation run on disk")
    session = svc.open_session(vid, reviewer="reviewer-1")
    assert session.error_code is None
    return session


class TestOpen:
    def test_open_unknown_run_fails_honestly(self, tmp_path):
        svc = _svc(tmp_path)
        session = svc.open_session("VLD-20990101-deadbeef00", reviewer="r")
        assert session.error_code == "VALIDATION_RUN_NOT_FOUND"

    def test_open_requires_reviewer(self, tmp_path):
        vid = _real_validation_run_id()
        if not vid:
            pytest.skip("no real validation run on disk")
        svc = _svc(tmp_path)
        session = svc.open_session(vid, reviewer="")
        assert session.error_code == "INVALID_REQUEST"

    def test_open_real_run_ready_for_hitl(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        assert session.status == Hitl1Status.READY_FOR_HITL.value
        assert session.hitl1_id.startswith("HITL1-")
        assert session.record_id == "LR-2026-000002"
        assert len(session.flagged_fields) > 0
        assert session.evidence.get("validation_decision")
        # Round-trip.
        stored = svc.get_session(session.hitl1_id)
        assert stored is not None
        assert stored["hitl1_id"] == session.hitl1_id

    def test_get_unknown_session_is_none(self, tmp_path):
        assert _svc(tmp_path).get_session("HITL1-20990101-deadbeef00") is None


class TestFieldReview:
    def test_verify_moves_to_under_review(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        field = session.flagged_fields[0]
        updated = svc.review_field(
            session.hitl1_id, field=field, action="VERIFY", reviewer="reviewer-1")
        assert updated.error_code is None
        assert updated.status == Hitl1Status.UNDER_REVIEW.value
        assert updated.field_reviews[field]["action"] == "VERIFY"

    def test_correct_preserves_original(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        field = session.flagged_fields[0]
        original = (session.field_snapshot.get(field) or {}).get("value")
        updated = svc.review_field(
            session.hitl1_id, field=field, action="CORRECT",
            value="Corrected Value", note="fixing OCR", reviewer="reviewer-1")
        assert updated.error_code is None
        review = updated.field_reviews[field]
        assert review["value"] == "Corrected Value"
        assert review["original_value"] == original

    def test_correct_requires_value(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        updated = svc.review_field(
            session.hitl1_id, field=session.flagged_fields[0],
            action="CORRECT", reviewer="reviewer-1")
        assert updated.error_code == "INVALID_REQUEST"

    def test_bad_action_rejected(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        updated = svc.review_field(
            session.hitl1_id, field="owner.name", action="APPROVE",
            reviewer="reviewer-1")
        assert updated.error_code == "INVALID_REQUEST"

    def test_unresolved_allowed(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        updated = svc.review_field(
            session.hitl1_id, field=session.flagged_fields[0],
            action="UNRESOLVED", note="illegible scan", reviewer="reviewer-1")
        assert updated.error_code is None
        assert updated.field_reviews[session.flagged_fields[0]]["action"] == "UNRESOLVED"


class TestSubmit:
    def _review_all_flagged(self, svc, session, reviewer="reviewer-1"):
        for fn in session.flagged_fields:
            updated = svc.review_field(
                session.hitl1_id, field=fn, action="VERIFY", reviewer=reviewer)
            assert updated.error_code is None
        return svc.get_session(session.hitl1_id)

    def test_verified_blocked_until_flags_dispositioned(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        result = svc.submit(session.hitl1_id, decision="VERIFIED", reviewer="reviewer-1")
        assert result.error_code == "FIELD_REVIEW_INCOMPLETE"
        assert result.status == Hitl1Status.READY_FOR_HITL.value

    def test_verified_after_all_reviews(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        self._review_all_flagged(svc, session)
        result = svc.submit(session.hitl1_id, decision="VERIFIED", reviewer="reviewer-1")
        assert result.error_code is None
        assert result.status == Hitl1Status.VERIFIED.value

    def test_correction_required_needs_reason(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        result = svc.submit(
            session.hitl1_id, decision="CORRECTION_REQUIRED", reviewer="reviewer-1")
        assert result.error_code == "REASON_REQUIRED"

    def test_correction_required_with_reason(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        result = svc.submit(
            session.hitl1_id, decision="CORRECTION_REQUIRED",
            reviewer="reviewer-1", notes="owner name illegible; rescan needed")
        assert result.error_code is None
        assert result.status == Hitl1Status.CORRECTION_REQUIRED.value

    def test_rejected_with_reason(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        result = svc.submit(
            session.hitl1_id, decision="REJECTED",
            reviewer="reviewer-1", notes="wrong document uploaded")
        assert result.error_code is None
        assert result.status == Hitl1Status.REJECTED.value

    def test_reviewer_always_required(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        result = svc.submit(session.hitl1_id, decision="REJECTED",
                            reviewer="", notes="reason")
        assert result.error_code == "INVALID_REQUEST"

    def test_terminal_state_immutable(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        decided = svc.submit(
            session.hitl1_id, decision="REJECTED",
            reviewer="reviewer-1", notes="reason")
        assert decided.status == Hitl1Status.REJECTED.value
        again = svc.review_field(
            session.hitl1_id, field="owner.name", action="VERIFY",
            reviewer="reviewer-1")
        assert again.error_code == "SESSION_TERMINAL"
        resubmit = svc.submit(session.hitl1_id, decision="VERIFIED", reviewer="reviewer-1")
        assert resubmit.error_code == "SESSION_TERMINAL"

    def test_bad_decision_rejected(self, tmp_path):
        svc = _svc(tmp_path)
        session = _open_real(svc)
        result = svc.submit(session.hitl1_id, decision="APPROVED", reviewer="reviewer-1")
        assert result.error_code == "INVALID_REQUEST"


class TestHitl1API:
    def test_api_open_get_decide(self, client):
        vid = _real_validation_run_id()
        if not vid:
            pytest.skip("no real validation run on disk")
        opened = client.post(
            "/api/digitization/hitl-1/open",
            json={"validation_run_id": vid, "reviewer": "api-reviewer"},
        )
        assert opened.status_code == 200
        body = opened.get_json()
        assert body["status"] == "READY_FOR_HITL"
        hitl1_id = body["hitl1_id"]

        fetched = client.get(f"/api/digitization/hitl-1/{hitl1_id}")
        assert fetched.status_code == 200
        assert fetched.get_json()["hitl1_id"] == hitl1_id

        field = body["flagged_fields"][0]
        reviewed = client.post(
            f"/api/digitization/hitl-1/{hitl1_id}/review-field",
            json={"field": field, "action": "VERIFY", "reviewer": "api-reviewer"},
        )
        assert reviewed.status_code == 200
        assert reviewed.get_json()["status"] == "UNDER_REVIEW"

        for fn in body["flagged_fields"][1:]:
            r = client.post(
                f"/api/digitization/hitl-1/{hitl1_id}/review-field",
                json={"field": fn, "action": "UNRESOLVED",
                      "note": "api check", "reviewer": "api-reviewer"},
            )
            assert r.status_code == 200

        decided = client.post(
            f"/api/digitization/hitl-1/{hitl1_id}/submit",
            json={"decision": "VERIFIED", "reviewer": "api-reviewer"},
        )
        assert decided.status_code == 200
        assert decided.get_json()["status"] == "VERIFIED"

    def test_api_open_unknown_run_is_404(self, client):
        resp = client.post(
            "/api/digitization/hitl-1/open",
            json={"validation_run_id": "VLD-20990101-deadbeef00", "reviewer": "r"},
        )
        assert resp.status_code == 404

    def test_api_unknown_session_is_404(self, client):
        assert client.get("/api/digitization/hitl-1/HITL1-20990101-deadbeef00").status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
