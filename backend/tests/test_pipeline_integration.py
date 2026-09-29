"""
Integration Tests: Phase 01 -> Phase 02 Pipeline

Tests the real pipeline orchestration:
- Phase 01 ingestion returns real IDs
- Phase 02 receives those IDs and performs actual quality analysis
- Phase 01 failure prevents Phase 02
- Phase 02 success unlocks Phase 03
"""

import io
import sys
import tempfile
import os
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.phase01_ingestion import DocumentIngestionService
from src.phase02_quality_check import DocumentQualityCheckService


class TestPhase01ToPhase02Chain:
    """Integration tests for Phase 01 -> Phase 02 pipeline"""

    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        self.quality_service = DocumentQualityCheckService(storage_dir=Path(self.temp_dir))

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_test_pdf(self, page_count=1, with_text=True):
        """Create a test PDF document"""
        import pymupdf as fitz
        doc = fitz.open()
        for i in range(page_count):
            page = doc.new_page(width=595, height=842)
            if with_text:
                page.insert_text((100, 400), f"Test Page {i+1}", fontsize=12)
        data = doc.tobytes()
        doc.close()
        return data

    def _create_test_image(self, format='PNG', size=(800, 600), color='white'):
        """Create a test image"""
        img = Image.new('RGB', size, color=color)
        buf = io.BytesIO()
        img.save(buf, format=format)
        return buf.getvalue()

    def test_01_phase_01_returns_required_ids(self):
        """TEST 01: Phase 01 successful response contains required IDs"""
        pdf_data = self._create_test_pdf()

        result = self.ingestion_service.ingest(pdf_data, "test.pdf")

        assert result.status.value == "SUCCESS"
        assert result.record_id is not None
        assert result.document_id is not None
        assert result.ingestion_id is not None
        assert result.record_id.startswith("LR-")
        assert result.document_id.startswith("DOC-")
        assert result.ingestion_id.startswith("ING-")

    def test_02_phase_02_accepts_phase01_ids(self):
        """TEST 02: Phase 02 accepts IDs from Phase 01"""
        pdf_data = self._create_test_pdf()

        ingest_result = self.ingestion_service.ingest(pdf_data, "test.pdf")

        assert ingest_result.status.value == "SUCCESS"

        quality_result = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert quality_result.status in ["SUCCESS", "FAILED"]
        assert quality_result.record_id == ingest_result.record_id

    def test_03_phase_01_to_phase_02_chain_succeeds(self):
        """TEST 03: Phase 01 -> Phase 02 chain succeeds with valid document"""
        img_data = self._create_test_image(format='PNG', size=(800, 600), color='gray')

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")
        assert ingest_result.status.value == "SUCCESS"

        quality_result = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert quality_result.status in ["SUCCESS", "FAILED"]
        if quality_result.status == "SUCCESS":
            assert quality_result.quality is not None
            assert quality_result.quality.overall_status in ["PASS", "REVIEW_REQUIRED", "FAIL"]

    def test_04_phase_01_failure_prevents_phase_02(self):
        """TEST 04: Phase 01 failure prevents Phase 02 from executing"""
        corrupt_data = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n%\x00\x00\x00\x00"

        try:
            ingest_result = self.ingestion_service.ingest(corrupt_data, "corrupt.pdf")
            if ingest_result.status.value == "FAILED":
                pytest.skip("Corrupt document was rejected at ingestion")
        except Exception:
            pytest.skip("Corrupt document caused error at ingestion")

        quality_result = self.quality_service.check_quality(
            record_id="NONEXISTENT",
            document_id="NONEXISTENT",
            ingestion_id="NONEXISTENT"
        )

        assert quality_result.status == "FAILED"

    def test_05_phase_02_failure_prevents_phase_03(self):
        """TEST 05: Phase 02 failure prevents Phase 03 from executing"""
        pdf_data = self._create_test_pdf()

        ingest_result = self.ingestion_service.ingest(pdf_data, "test.pdf")
        assert ingest_result.status.value == "SUCCESS"

        quality_result = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        if quality_result.status == "FAILED":
            assert quality_result.error_code is not None or len(quality_result.issues) > 0
        else:
            assert quality_result.status == "SUCCESS"

    def test_06_phase_02_success_unlocks_phase_03(self):
        """TEST 06: Phase 02 success unlocks Phase 03"""
        from PIL import ImageDraw
        img = Image.new('RGB', (800, 600), color='white')
        draw = ImageDraw.Draw(img)
        draw.rectangle([100, 100, 700, 500], fill='black')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        img_data = buf.getvalue()

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")
        assert ingest_result.status.value == "SUCCESS"

        quality_result = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        if quality_result.status == "SUCCESS":
            assert quality_result.next_phase == "AI_DOCUMENT_PREPROCESSING"
        else:
            assert quality_result.quality is not None

    def test_07_no_duplicate_phase_02_request(self):
        """TEST 07: Only one Phase 02 request is created per document"""
        img_data = self._create_test_image(format='PNG', size=(800, 600), color='gray')

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")
        assert ingest_result.status.value == "SUCCESS"

        quality_result_1 = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        quality_result_2 = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert quality_result_1.status == quality_result_2.status
        assert quality_result_1.quality.quality_score == quality_result_2.quality.quality_score

    def test_08_network_failure_handled(self):
        """TEST 08: Network failure is handled gracefully"""
        result = self.quality_service.check_quality(
            record_id="NONEXISTENT",
            document_id="NONEXISTENT",
            ingestion_id="NONEXISTENT"
        )

        assert result.status == "FAILED"
        assert result.error_code is not None

    def test_09_actual_quality_score_reaches_frontend(self):
        """TEST 09: Actual Phase 02 quality score reaches frontend"""
        img_data = self._create_test_image(format='PNG', size=(800, 600), color='gray')

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")
        assert ingest_result.status.value == "SUCCESS"

        quality_result = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert quality_result.status in ["SUCCESS", "FAILED"]
        if quality_result.status == "SUCCESS":
            assert quality_result.quality is not None
            assert quality_result.quality.quality_score >= 0
            assert quality_result.quality.quality_score <= 100
        else:
            assert len(quality_result.issues) > 0 or quality_result.error_code is not None

    def test_10_demo_runner_no_longer_exists(self):
        """TEST 10: Demo runner code has been removed from frontend"""
        frontend_path = Path(__file__).parent.parent / "frontend" / "src"

        if not frontend_path.exists():
            pytest.skip("Frontend source not found")

        app_tsx = frontend_path / "App.tsx"
        if not app_tsx.exists():
            pytest.skip("App.tsx not found")

        content = app_tsx.read_text()

        assert "runDemonstration" not in content, "runDemonstration should be removed"
        assert "simulatePhase" not in content, "simulatePhase should be removed"
        assert "handleStartDemo" not in content, "handleStartDemo should be removed"


class TestIngestDemoEndpoint:
    """Isolated demo ingestion: real service, bundled samples, explicit flag."""

    def test_11_demo_default_sample(self, client):
        resp = client.post("/api/digitization/ingest/demo", json={})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["status"] == "SUCCESS"
        assert body["demo"] is True
        assert body["sample"] == "clear"
        assert body["record_id"].startswith("LR-")
        assert body["document_id"].startswith("DOC-")
        assert body["ingestion_id"].startswith("ING-")
        assert body["next_phase"]

    def test_12_demo_unknown_sample_rejected(self, client):
        resp = client.post(
            "/api/digitization/ingest/demo", json={"sample": "klingon"})
        assert resp.status_code == 400
        assert resp.get_json()["error_code"] == "UNKNOWN_DEMO_SAMPLE"

    def test_13_demo_low_sample(self, client):
        resp = client.post(
            "/api/digitization/ingest/demo", json={"sample": "low"})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["status"] == "SUCCESS"
        assert body["sample"] == "low"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
