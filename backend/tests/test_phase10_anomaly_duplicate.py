"""
Phase 10 — Anomaly & Duplicate Detection stage tests.

Covers the workflow-routing decision matrix, chaining off a real Phase 09
validation run, standalone engine execution on a real Phase 08 assessment,
honest failure paths, persistence round-trips, and the HTTP API.
"""

import json
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.anomaly.stage import AnomalyDuplicateStageService, decide_workflow_state, get_anomaly_duplicate_stage_service
from app.ocr.anomaly.models import AnomalyDuplicateStageResult, StageWorkflowState


def _svc(tmp_path=None):
    if tmp_path is None:
        tmp_path = Path(tempfile.mkdtemp())
    return AnomalyDuplicateStageService(storage_dir=Path(tmp_path) / "phase_10")


class TestDecideWorkflowState:
    def test_clear_when_nothing_found(self):
        assert decide_workflow_state([], {"status": "CLEAR"}) == StageWorkflowState.CLEAR

    def test_suspected_duplicate_needs_review(self):
        state = decide_workflow_state(
            [], {"status": "SUSPECTED", "matched_records": [{"a": 1}]})
        assert state == StageWorkflowState.NEEDS_REVIEW

    def test_confirmed_duplicate_blocked(self):
        state = decide_workflow_state(
            [{"severity": "WARNING"}], {"status": "CONFIRMED"})
        assert state == StageWorkflowState.BLOCKED

    def test_any_anomaly_needs_review(self):
        state = decide_workflow_state(
            [{"severity": "INFO", "category": "UNUSUAL_BUT_VALID"}],
            {"status": "CLEAR"},
        )
        assert state == StageWorkflowState.NEEDS_REVIEW

    def test_error_anomaly_needs_review_not_blocked(self):
        state = decide_workflow_state(
            [{"severity": "ERROR", "category": "X"}], {"status": "CLEAR"})
        assert state == StageWorkflowState.NEEDS_REVIEW


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


class TestStageChained:
    def test_chain_real_validation_run(self, tmp_path):
        vid = _real_validation_run_id()
        if not vid:
            pytest.skip("no real validation run on disk")
        svc = _svc(tmp_path)
        result = svc.create_from_validation_run(vid)
        assert result.status == "SUCCESS"
        assert result.source == "VALIDATION_RUN"
        assert result.validation_run_id == vid
        assert result.workflow_state in (
            StageWorkflowState.CLEAR.value,
            StageWorkflowState.NEEDS_REVIEW.value,
            StageWorkflowState.BLOCKED.value,
        )
        assert result.next_phase == "PHASE_11_HITL_1"
        assert result.stage_id.startswith("ADP-")
        # Persisted and retrievable.
        stored = svc.get_stage(result.stage_id)
        assert stored is not None
        assert stored["stage_id"] == result.stage_id
        assert stored["workflow_state"] == result.workflow_state

    def test_chain_unknown_run_fails_honestly(self, tmp_path):
        svc = _svc(tmp_path)
        result = svc.create_from_validation_run("VLD-20990101-deadbeef00")
        assert result.status == "FAILED"
        assert result.error_code == "VALIDATION_RUN_NOT_FOUND"
        assert result.to_dict()["next_phase"] is None

    def test_chain_missing_id_rejected(self, tmp_path):
        svc = _svc(tmp_path)
        result = svc.create_from_validation_run("")
        assert result.status == "FAILED"
        assert result.error_code == "INVALID_REQUEST"


class TestStageStandalone:
    def test_standalone_real_record(self, tmp_path):
        phase08 = (
            Path(__file__).parent.parent / "uploads" / "processing" / "phase_08"
            / "LR-2026-000002"
        )
        if not list(phase08.glob("*_confidence_completeness.json")):
            pytest.skip("no real Phase 08 assessment on disk")
        svc = _svc(tmp_path)
        result = svc.create_standalone(
            "LR-2026-000002", "DOC-2026-000002", "ING-2026-000002")
        assert result.status == "SUCCESS"
        assert result.source == "STANDALONE_ASSESSMENT"
        assert result.next_phase == "PHASE_11_HITL_1"
        assert result.summary["duplicate_scope"] == "LOCAL_DATASET"

    def test_standalone_unknown_record_fails_honestly(self, tmp_path):
        svc = _svc(tmp_path)
        result = svc.create_standalone("LR-NOPE", "DOC-NOPE", "ING-NOPE")
        assert result.status == "FAILED"
        assert result.error_code == "PHASE_08_RESULT_NOT_FOUND"

    def test_standalone_missing_ids_rejected(self, tmp_path):
        svc = _svc(tmp_path)
        result = svc.create_standalone("", "", "")
        assert result.status == "FAILED"
        assert result.error_code == "INVALID_REQUEST"


class TestStageAPI:
    def test_api_chain_and_fetch(self, client):
        vid = _real_validation_run_id()
        if not vid:
            pytest.skip("no real validation run on disk")
        resp = client.post(
            "/api/digitization/anomaly-duplicate",
            json={"validation_run_id": vid},
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["status"] == "SUCCESS"
        assert body["phase"] == "ANOMALY_DUPLICATE_DETECTION"
        assert body["next_phase"] == "PHASE_11_HITL_1"

        fetched = client.get(
            f"/api/digitization/anomaly-duplicate/{body['stage_id']}")
        assert fetched.status_code == 200
        assert fetched.get_json()["stage_id"] == body["stage_id"]

    def test_api_unknown_run_is_404(self, client):
        resp = client.post(
            "/api/digitization/anomaly-duplicate",
            json={"validation_run_id": "VLD-20990101-deadbeef00"},
        )
        assert resp.status_code == 404
        assert resp.get_json()["error_code"] == "VALIDATION_RUN_NOT_FOUND"

    def test_api_unknown_stage_is_404(self, client):
        resp = client.get("/api/digitization/anomaly-duplicate/ADP-20990101-deadbeef00")
        assert resp.status_code == 404

    def test_api_empty_body_is_400(self, client):
        resp = client.post("/api/digitization/anomaly-duplicate", json={})
        assert resp.status_code == 400

    def test_api_standalone_unknown_record(self, client):
        resp = client.post(
            "/api/digitization/anomaly-duplicate",
            json={"record_id": "LR-NOPE", "document_id": "DOC-NOPE",
                  "ingestion_id": "ING-NOPE"},
        )
        assert resp.status_code == 404
        assert resp.get_json()["error_code"] == "PHASE_08_RESULT_NOT_FOUND"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
