"""
Tests for Phase 06 - OCR & Visual Text Recognition (multi-engine).

Covers the 20 required areas: Tesseract OCR, word bboxes, line
reconstruction, page/multipage/native-PDF OCR, Surya + Roboflow integration
and their UNAVAILABLE fallbacks, artifact/header/table/confidence evidence,
raw numerics, Phase 06 -> Phase 07 handoff, multilingual packs without silent
English fallback, QR deferral, original preservation, and no-duplicate-pipeline
guarantees. Real-sample tests use evidence, never hardcoded text.
"""

import hashlib
import shutil
import sys
import tempfile
from pathlib import Path

import pytest
from PIL import Image, ImageDraw, ImageFont
from unittest.mock import patch, MagicMock

from app.ocr.recognition.service import OCRService, perform_ocr
from app.ocr.recognition.models import OCRResult, OCRStatus, OCRBoundingBox, OCRWord, OCRLine, PageOCRResult, OCRMetrics, ArtifactDetection, DocumentRegion, GovernmentEvidence
from app.ocr.recognition.words import build_lines
from app.ocr.recognition.artifacts import detect_artifacts
from app.ocr.recognition.layout import surya_layout
from app.ocr.ocr_config.service import OCRConfigurationService
from app.ocr.ocr_config.models import ConfigurationStatus, REGION_PSM, TESSERACT_LANG_MAP
from app.ocr.ocr_config.probes import read_roboflow_model_id, resolve_ocr_languages


def _text_image(lines=None, size=(700, 1000), font_size=40,
                header=("GOVERNMENT RECORD",),
                body=("Plot 112 Khatian 45",),
                footer=("Computer Generated",)):
    """Document-like synthetic image with text inside the fallback bands.

    Canvas 700x1000 -> HEADER 0-150, METADATA 150-350, MAIN_TABLE 350-750,
    FOOTER 750-1000, so region crops read whole lines instead of slicing them.
    Pass ``lines`` for a single body block, or header/body/footer tuples.
    """
    if lines is not None:
        body = tuple(lines)
        header, footer = (), ()
    img = Image.new("RGB", size, color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()
    y = 30
    for line in header:
        draw.text((30, y), line, fill=(10, 10, 10), font=font)
        y += font_size + 16
    y = max(y, 190)
    for line in body:
        draw.text((30, y), line, fill=(10, 10, 10), font=font)
        y += font_size + 16
    y = max(y, 800)
    for line in footer:
        draw.text((30, y), line, fill=(10, 10, 10), font=font)
        y += font_size + 16
    return img


@pytest.fixture()
def workdir():
    tmp = Path(tempfile.mkdtemp())
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture()
def service(workdir):
    return OCRService(storage_dir=workdir / "phase_06")


class TestOCRModels:
    """Test OCR data models"""

    def test_ocr_bounding_box(self):
        """Test OCRBoundingBox serialization"""
        bbox = OCRBoundingBox(x=10, y=20, width=100, height=30)
        d = bbox.to_dict()
        assert d["x"] == 10
        assert d["y"] == 20
        assert d["width"] == 100
        assert d["height"] == 30

    def test_ocr_word(self):
        """Test OCRWord serialization"""
        word = OCRWord(
            text="Government",
            confidence=0.96,
            bbox=OCRBoundingBox(x=10, y=20, width=100, height=30),
            block_num=1,
            par_num=1,
            line_num=1,
            word_num=1,
        )
        d = word.to_dict()
        assert d["text"] == "Government"
        assert d["confidence"] == 0.96
        assert d["bbox"]["x"] == 10

    def test_ocr_line(self):
        """Test OCRLine serialization"""
        line = OCRLine(
            text="Government of West Bengal",
            words=[],
            bbox=OCRBoundingBox(x=10, y=20, width=500, height=30),
        )
        d = line.to_dict()
        assert d["text"] == "Government of West Bengal"

    def test_page_ocr_result(self):
        """Test PageOCRResult serialization"""
        page = PageOCRResult(
            page_number=1,
            text="Test text",
            words=[],
            lines=[],
            mean_confidence=0.85,
            word_count=10,
            character_count=50,
            status=OCRStatus.SUCCESS,
        )
        d = page.to_dict()
        assert d["page_number"] == 1
        assert d["text"] == "Test text"
        assert d["mean_confidence"] == 0.85
        assert d["word_count"] == 10

    def test_ocr_metrics(self):
        """Test OCRMetrics serialization"""
        metrics = OCRMetrics(
            mean_confidence=0.85,
            median_confidence=0.87,
            low_confidence_word_count=5,
            low_confidence_percentage=10.0,
            total_words=50,
            total_characters=500,
            pages_processed=1,
            pages_failed=0,
        )
        d = metrics.to_dict()
        assert d["mean_confidence"] == 0.85
        assert d["total_words"] == 50
        assert d["pages_processed"] == 1

    def test_ocr_result_to_dict(self):
        """Test OCRResult serialization"""
        result = OCRResult(
            status=OCRStatus.SUCCESS,
            record_id="REC-001",
            document_id="DOC-001",
            ingestion_id="ING-001",
            engine="TESSERACT",
            language="eng",
            pages=[],
            full_text="Test document text",
            next_phase="PHASE_07_SEMANTIC_FIELD_EXTRACTION",
        )

        result.metrics = OCRMetrics(
            mean_confidence=0.85,
            median_confidence=0.87,
            low_confidence_word_count=5,
            low_confidence_percentage=10.0,
            total_words=50,
            total_characters=500,
            pages_processed=1,
            pages_failed=0,
        )

        d = result.to_dict()
        assert d["status"] == "SUCCESS"
        assert d["record_id"] == "REC-001"
        assert d["engine"] == "TESSERACT"
        assert d["language"] == "eng"
        assert d["full_text"] == "Test document text"
        assert d["next_phase"] == "PHASE_07_SEMANTIC_FIELD_EXTRACTION"
        assert d["metrics"]["total_words"] == 50


class TestOCRService:
    """Test OCR Service"""

    def test_ocr_result_no_text_detected(self):
        """Test OCR result with no text detected"""
        result = OCRResult(
            status=OCRStatus.NO_TEXT_DETECTED,
            record_id="REC-001",
            document_id="DOC-001",
            ingestion_id="ING-001",
            pages=[],
            full_text="",
            next_phase="PHASE_07_SEMANTIC_FIELD_EXTRACTION",
        )

        d = result.to_dict()
        assert d["status"] == "NO_TEXT_DETECTED"
        assert d["next_phase"] == "PHASE_07_SEMANTIC_FIELD_EXTRACTION"

    def test_ocr_result_partial_success(self):
        """Test OCR result with partial success"""
        result = OCRResult(
            status=OCRStatus.PARTIAL_SUCCESS,
            record_id="REC-001",
            document_id="DOC-001",
            ingestion_id="ING-001",
            pages=[],
            full_text="Partial text",
            next_phase="PHASE_07_SEMANTIC_FIELD_EXTRACTION",
        )

        d = result.to_dict()
        assert d["status"] == "PARTIAL_SUCCESS"

    def test_ocr_result_failed(self):
        """Test OCR result with failure"""
        result = OCRResult(
            status=OCRStatus.FAILED,
            record_id="REC-001",
            document_id="DOC-001",
            ingestion_id="ING-001",
            error_code="OCR_ENGINE_ERROR",
            error_message="Tesseract failed to initialize",
            next_phase=None,
        )

        d = result.to_dict()
        assert d["status"] == "FAILED"
        assert d["error_code"] == "OCR_ENGINE_ERROR"
        assert d["next_phase"] is None

    def test_ocr_status_enum_values(self):
        """Test OCRStatus enum values"""
        assert OCRStatus.SUCCESS.value == "SUCCESS"
        assert OCRStatus.PARTIAL_SUCCESS.value == "PARTIAL_SUCCESS"
        assert OCRStatus.NO_TEXT_DETECTED.value == "NO_TEXT_DETECTED"
        assert OCRStatus.FAILED.value == "FAILED"


class TestPhase06API:
    """Test Phase 06 API endpoint"""

    def test_phase06_endpoint_success(self, client):
        """Test /api/digitization/ocr endpoint"""
        with patch("app.ocr.api.classify_ocr.OCRService") as mock_service_class:
            mock_service = MagicMock()
            mock_service.perform_ocr.return_value = OCRResult(
                status=OCRStatus.SUCCESS,
                record_id="REC-001",
                document_id="DOC-001",
                ingestion_id="ING-001",
                engine="TESSERACT",
                language="eng",
                pages=[
                    PageOCRResult(
                        page_number=1,
                        text="Record of Rights",
                        words=[],
                        lines=[],
                        mean_confidence=0.85,
                        word_count=10,
                        character_count=100,
                        status=OCRStatus.SUCCESS,
                    )
                ],
                full_text="Record of Rights",
                next_phase="PHASE_07_SEMANTIC_FIELD_EXTRACTION",
            )
            mock_service.perform_ocr.return_value.metrics = OCRMetrics(
                mean_confidence=0.85,
                median_confidence=0.87,
                low_confidence_word_count=1,
                low_confidence_percentage=10.0,
                total_words=10,
                total_characters=100,
                pages_processed=1,
                pages_failed=0,
            )
            mock_service_class.return_value = mock_service

            response = client.post(
                "/api/digitization/ocr",
                json={
                    "record_id": "REC-001",
                    "document_id": "DOC-001",
                    "ingestion_id": "ING-001",
                    "ocr_config": {
                        "engine": "TESSERACT",
                        "language": "eng",
                        "input_source": "PREPROCESSED_IMAGE",
                        "native_pdf_text_attempt": False,
                        "table_aware": True,
                        "tesseract_psm": 6,
                        "tesseract_oem": 3,
                    },
                },
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "SUCCESS"
            assert data["record_id"] == "REC-001"
            assert data["engine"] == "TESSERACT"
            assert data["metrics"]["total_words"] == 10

    def test_phase06_endpoint_missing_ids(self, client):
        """Test /api/digitization/ocr with missing parameters"""
        response = client.post(
            "/api/digitization/ocr",
            json={
                "record_id": "REC-001",
            },
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "FAILED"
        assert data["error_code"] == "MISSING_PARAMETERS"

    def test_phase06_endpoint_no_json(self, client):
        """Test /api/digitization/ocr without JSON"""
        response = client.post(
            "/api/digitization/ocr",
            content_type="application/json",
            data="not json",
        )

        assert response.status_code == 400
        data = response.get_json()
        if data is not None:
            assert data["status"] == "FAILED"
            assert data["error_code"] == "INVALID_REQUEST"

    def test_phase06_endpoint_no_text_detected(self, client):
        """Test /api/digitization/ocr with no text detected"""
        with patch("app.ocr.api.classify_ocr.OCRService") as mock_service_class:
            mock_service = MagicMock()
            mock_service.perform_ocr.return_value = OCRResult(
                status=OCRStatus.NO_TEXT_DETECTED,
                record_id="REC-001",
                document_id="DOC-001",
                ingestion_id="ING-001",
                pages=[],
                full_text="",
                next_phase="PHASE_07_SEMANTIC_FIELD_EXTRACTION",
            )
            mock_service.perform_ocr.return_value.metrics = OCRMetrics(
                mean_confidence=0.0,
                median_confidence=0.0,
                low_confidence_word_count=0,
                low_confidence_percentage=0.0,
                total_words=0,
                total_characters=0,
                pages_processed=0,
                pages_failed=1,
            )
            mock_service_class.return_value = mock_service

            response = client.post(
                "/api/digitization/ocr",
                json={
                    "record_id": "REC-001",
                    "document_id": "DOC-001",
                    "ingestion_id": "ING-001",
                    "ocr_config": {
                        "engine": "TESSERACT",
                        "language": "eng",
                        "input_source": "PREPROCESSED_IMAGE",
                    },
                },
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "NO_TEXT_DETECTED"

    def test_phase06_endpoint_partial_success(self, client):
        """Test /api/digitization/ocr with partial success"""
        with patch("app.ocr.api.classify_ocr.OCRService") as mock_service_class:
            mock_service = MagicMock()
            mock_service.perform_ocr.return_value = OCRResult(
                status=OCRStatus.PARTIAL_SUCCESS,
                record_id="REC-001",
                document_id="DOC-001",
                ingestion_id="ING-001",
                pages=[
                    PageOCRResult(
                        page_number=1,
                        text="Partial text",
                        words=[],
                        lines=[],
                        mean_confidence=0.5,
                        word_count=5,
                        character_count=50,
                        status=OCRStatus.SUCCESS,
                    )
                ],
                full_text="Partial text",
                next_phase="PHASE_07_SEMANTIC_FIELD_EXTRACTION",
            )
            mock_service.perform_ocr.return_value.metrics = OCRMetrics(
                mean_confidence=0.5,
                median_confidence=0.5,
                low_confidence_word_count=3,
                low_confidence_percentage=60.0,
                total_words=5,
                total_characters=50,
                pages_processed=1,
                pages_failed=0,
            )
            mock_service_class.return_value = mock_service

            response = client.post(
                "/api/digitization/ocr",
                json={
                    "record_id": "REC-001",
                    "document_id": "DOC-001",
                    "ingestion_id": "ING-001",
                    "ocr_config": {
                        "engine": "TESSERACT",
                        "language": "eng",
                        "input_source": "PREPROCESSED_IMAGE",
                    },
                },
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "PARTIAL_SUCCESS"


class TestTesseractCharacterOCR:
    """1-5. Tesseract character OCR: words, bboxes, lines, pages."""

    def test_01_tesseract_ocr_succeeds(self, service, workdir):
        img_path = workdir / "tess.png"
        _text_image(["GOVERNMENT OF WEST BENGAL", "Plot 112 Khatian 45"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-001", document_id="DOC-T06-001",
            ingestion_id="ING-T06-001", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        assert result.status in (OCRStatus.SUCCESS, OCRStatus.PARTIAL_SUCCESS)
        assert result.metrics.total_words > 5
        assert "GOVERNMENT" in result.full_text

    def test_02_word_bounding_boxes_exist(self, service, workdir):
        img_path = workdir / "bbox.png"
        _text_image(["Record of Rights"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-002", document_id="DOC-T06-002",
            ingestion_id="ING-T06-002", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        words = result.pages[0].words
        assert words
        for word in words:
            d = word.to_dict()
            assert d["bbox"]["width"] >= 0 and d["bbox"]["height"] >= 0
            assert d["engine"] == "tesseract"
            assert d["region"] in ("HEADER", "METADATA", "MAIN_TABLE", "FOOTER")
            assert d["page"] == 1 and d["line_id"]

    def test_03_line_reconstruction(self, service, workdir):
        img_path = workdir / "lines.png"
        _text_image(["First line here", "Second line here"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-003", document_id="DOC-T06-003",
            ingestion_id="ING-T06-003", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        lines = result.pages[0].lines
        assert len(lines) >= 2
        orders = [line.reading_order for line in lines]
        assert orders == sorted(orders)
        for line in lines:
            assert line.text and line.words
            assert line.bbox.width >= 0

    def test_04_page_ocr_evidence(self, service, workdir):
        img_path = workdir / "page.png"
        _text_image(["Mouza Gopalpur District Hooghly"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-004", document_id="DOC-T06-004",
            ingestion_id="ING-T06-004", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        page = result.pages[0].to_dict()
        assert page["regions"] and page["layout_source"]
        assert "ocr" in page and page["ocr"]["word_count"] > 0
        assert page["table_structure_status"] in ("RESOLVED", "UNRESOLVED")

    def test_05_multipage_images(self, service, workdir):
        paths = []
        for i in range(2):
            p = workdir / f"multi{i}.png"
            _text_image([f"Page content number {i + 1}"]).save(p)
            paths.append(str(p))
        result = service.perform_ocr(
            record_id="LR-T06-005", document_id="DOC-T06-005",
            ingestion_id="ING-T06-005", language="eng",
            input_paths=paths, run_artifacts=False)
        assert len(result.pages) == 2
        assert result.pages[0].page_number == 1
        assert result.pages[1].page_number == 2


class TestNativeAndScannedPDF:
    """6. Native PDF coordinates path; scanned PDF raster path."""

    def _native_pdf(self, path, texts):
        import pymupdf as fitz
        doc = fitz.open()
        for text in texts:
            page = doc.new_page(width=595, height=842)
            page.insert_text((72, 200), text, fontsize=14)
        doc.save(path)
        doc.close()

    def test_06_native_pdf_words_with_bboxes(self, service, workdir):
        pdf = workdir / "native.pdf"
        self._native_pdf(pdf, ["Khatian number 45"])
        result = service.perform_ocr(
            record_id="LR-T06-006", document_id="DOC-T06-006",
            ingestion_id="ING-T06-006", language="eng",
            input_paths=[str(pdf)], run_artifacts=False)
        assert result.input["type"] == "NATIVE_PDF"
        page = result.pages[0]
        assert page.native_text_used is True
        assert page.words
        assert any(w.engine == "native_pdf" for w in page.words)
        assert "45" in result.full_text

    def test_06b_scanned_pdf_raster_path(self, service, workdir):
        import pymupdf as fitz
        img_path = workdir / "scan_src.png"
        _text_image(["Scanned Plot 77"]).save(img_path)
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)
        rect = fitz.Rect(50, 50, 545, 400)
        page.insert_image(rect, filename=str(img_path))
        pdf = workdir / "scanned.pdf"
        doc.save(pdf)
        doc.close()
        result = service.perform_ocr(
            record_id="LR-T06-006B", document_id="DOC-T06-006B",
            ingestion_id="ING-T06-006B", language="eng",
            input_paths=[str(pdf)], run_artifacts=False)
        assert result.input["type"] == "SCANNED_PDF"
        assert result.pages[0].status in (OCRStatus.SUCCESS, OCRStatus.NO_TEXT_DETECTED)


class TestSuryaIntegration:
    """7-8. Surya adapter: honest UNAVAILABLE, pipeline continues."""

    def test_07_surya_unavailable_fallback(self):
        out = surya_layout("nonexistent.png", 800, 600)
        assert out["status"] == "UNAVAILABLE"
        assert out["regions"] == []

    def test_08_surya_fallback_keeps_ocr_working(self, service, workdir):
        img_path = workdir / "surya_fb.png"
        _text_image(["Surya fallback check"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-008", document_id="DOC-T06-008",
            ingestion_id="ING-T06-008", language="eng",
            input_paths=[str(img_path)], run_layout=True, run_artifacts=False)
        assert result.status in (OCRStatus.SUCCESS, OCRStatus.PARTIAL_SUCCESS)
        assert result.engines["surya"] == "UNAVAILABLE"
        assert result.surya["status"] == "UNAVAILABLE"
        assert result.pages[0].layout_source in (
            "phase03_layout", "geometry_prior", "native_pdf")


class TestRoboflowIntegration:
    """9-11. Existing Roboflow module reused; fallbacks never crash OCR."""

    def test_09_uses_existing_module_model(self):
        from app.ocr.ocr_config.models import ROBOFLOW_MODEL_ID, ROBOFLOW_API_URL
        model_id, api_url = read_roboflow_model_id()
        assert model_id == ROBOFLOW_MODEL_ID
        assert api_url == ROBOFLOW_API_URL
        assert "stamp-and-signature" in model_id
        assert "src.roboflow" not in sys.modules  # never imported via roboflow.py

    def test_10_roboflow_unavailable_fallback(self, service, workdir, monkeypatch):
        monkeypatch.delenv("ROBOFLOW_API_KEY", raising=False)
        img_path = workdir / "robo_fb.png"
        _text_image(["Roboflow fallback check"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-010", document_id="DOC-T06-010",
            ingestion_id="ING-T06-010", language="eng",
            input_paths=[str(img_path)], run_artifacts=True)
        assert result.status in (OCRStatus.SUCCESS, OCRStatus.PARTIAL_SUCCESS)
        assert result.engines["roboflow"] == "UNAVAILABLE"
        assert result.roboflow["status"] == "UNAVAILABLE"

    def test_11_artifact_evidence_preserved(self):
        class _FakeClient:
            def infer(self, image_path, model_id=None):
                return {"predictions": [
                    {"x": 100, "y": 100, "width": 60, "height": 60,
                     "class": "seal", "confidence": 0.91},
                    {"x": 200, "y": 200, "width": 40, "height": 20,
                     "class": "dog", "confidence": 0.99},
                    {"x": 300, "y": 300, "width": 80, "height": 25,
                     "class": "Signature", "confidence": 0.83},
                ]}

        status, artifacts, info = detect_artifacts(
            "x.png", 800, 600, 1, client=_FakeClient(), model_id="m/1")
        assert status == "SUCCESS"
        # The non-artifact class must never be labeled a seal/signature.
        assert {a.artifact_type for a in artifacts} == {"seal", "signature"}
        seal = next(a for a in artifacts if a.artifact_type == "seal")
        d = seal.to_dict()
        assert d["confidence"] == 0.91 and d["source"] == "roboflow"
        assert d["page"] == 1 and d["bbox"]["width"] == 60


class TestRegionTableConfidenceEvidence:
    """12-15. Regions, tables, raw confidence, raw numerics."""

    @staticmethod
    def _sample_result(service):
        sample = Path("uploads/samples/test sample english medium.png")
        return service.perform_ocr(
            record_id="LR-T06-REAL", document_id="DOC-T06-REAL",
            ingestion_id="ING-T06-REAL", language="eng",
            input_paths=[str(sample)], run_artifacts=False)

    def test_12_header_region_preserved(self, service):
        result = self._sample_result(service)
        types = {r.type for r in result.pages[0].regions}
        assert "HEADER" in types
        header = next(r for r in result.pages[0].regions if r.type == "HEADER")
        assert header.bbox.width > 0 and header.bbox.height > 0

    def test_13_table_region_preserved(self, service):
        result = self._sample_result(service)
        page = result.pages[0]
        assert "MAIN_TABLE" in {r.type for r in page.regions}
        assert page.table_structure_status in ("RESOLVED", "UNRESOLVED")
        if page.table_structure_status == "RESOLVED":
            assert page.tables
            table = page.tables[0]
            assert table.rows and table.rows[0].cells
            cell = table.rows[0].cells[0]
            assert cell.bbox.width > 0

    def test_14_confidence_preserved_raw(self, service, workdir):
        img_path = workdir / "conf.png"
        _text_image(["Confidence check 123"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-014", document_id="DOC-T06-014",
            ingestion_id="ING-T06-014", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        words = [w for w in result.pages[0].words if w.confidence is not None]
        assert words
        for word in words:
            assert 0.0 <= word.confidence <= 1.0
            assert word.confidence_raw == pytest.approx(word.confidence * 100.0)

    def test_15_raw_numeric_values_preserved(self, service, workdir):
        img_path = workdir / "num.png"
        _text_image(["Plot 112 Khatian 45 Area"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-015", document_id="DOC-T06-015",
            ingestion_id="ING-T06-015", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        texts = [w.text for w in result.pages[0].words]
        assert "112" in texts and "45" in texts
        numerics = {n.text for n in result.pages[0].numeric_tokens}
        assert "112" in numerics and "45" in numerics


class TestHandoffMultilingualQRPreservation:
    """16-20. Handoff compat, multilingual honesty, QR deferral, preservation."""

    def test_16_phase06_to_phase07_handoff(self, service, workdir):
        from app.ocr.extraction.evidence import SemanticExtractor
        img_path = workdir / "handoff.png"
        _text_image(["Khatian No 45 Plot No 112"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-016", document_id="DOC-T06-016",
            ingestion_id="ING-T06-016", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        extractor = SemanticExtractor(result.to_dict())
        assert len(extractor.words) > 0
        assert len(extractor.rows) > 0

    def test_17_multilingual_never_silent_english(self):
        service_cfg = OCRConfigurationService()
        hindi = service_cfg.configure_ocr(
            record_id="R", document_id="D", ingestion_id="I",
            languages=["hi"], script="Devanagari")
        assert hindi.configuration.language == "hin"
        assert hindi.configuration.language_status == "OK"
        assert hindi.status == ConfigurationStatus.SUCCESS

        missing = service_cfg.configure_ocr(
            record_id="R", document_id="D", ingestion_id="I",
            languages=["kok"], script="Devanagari")
        assert missing.status == ConfigurationStatus.FAILED
        assert missing.error_code == "OCR_LANGUAGE_UNAVAILABLE"
        # Detected evidence travels with the failure (never defaulted to eng):
        # no Tesseract config is fabricated when no pack exists.
        assert missing.language == "kok"
        assert missing.configuration is None

    def test_17b_multilingual_codes(self):
        codes, missing, status = resolve_ocr_languages(["en", "hi", "bn"])
        assert set(codes) == {"eng", "hin", "ben"}
        assert missing == [] and status == "OK"
        assert TESSERACT_LANG_MAP["ta"] == "tam"
        assert TESSERACT_LANG_MAP["kok"] is None

    def test_18_qr_not_implemented(self, service, workdir):
        img_path = workdir / "qr.png"
        _text_image(["QR deferral check"]).save(img_path)
        result = service.perform_ocr(
            record_id="LR-T06-018", document_id="DOC-T06-018",
            ingestion_id="ING-T06-018", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        assert result.qr_status == "NOT_IMPLEMENTED"
        assert result.to_dict()["qr_status"] == "NOT_IMPLEMENTED"

    def test_19_original_unchanged(self, service, workdir):
        img_path = workdir / "orig.png"
        _text_image(["Original preservation"]).save(img_path)
        before = hashlib.sha256(img_path.read_bytes()).hexdigest()
        service.perform_ocr(
            record_id="LR-T06-019", document_id="DOC-T06-019",
            ingestion_id="ING-T06-019", language="eng",
            input_paths=[str(img_path)], run_artifacts=False)
        assert hashlib.sha256(img_path.read_bytes()).hexdigest() == before

    def test_20_no_duplicate_pipeline(self):
        ocr = Path(__file__).parent.parent / "app" / "ocr"
        # Single OCR-config authority: one package, no second config module.
        cfg_pkg = ocr / "ocr_config"
        assert cfg_pkg.is_dir()
        assert {p.name for p in cfg_pkg.glob("*.py")} == {
            "__init__.py", "models.py", "probes.py", "service.py"}
        # Migrated phase facades removed: responsibility packages are the
        # only implementation (no phaseXX_*.py in the final architecture).
        assert not list(ocr.glob("phase*.py"))
        assert (ocr / "ocr_config" / "service.py").is_file()
        assert (ocr / "recognition" / "service.py").is_file()
        # Single Tesseract engine implementation.
        engines = [p for p in (ocr / "core").glob("*.py")
                   if "run_real_ocr" in p.read_text(encoding="utf-8")]
        assert [p.name for p in engines] == ["tesseract_engine.py"]
        cfg = (cfg_pkg / "models.py").read_text(encoding="utf-8")
        assert "ROBOFLOW_MODEL_ID" in cfg
        assert "read_roboflow_model_id" in (
            cfg_pkg / "probes.py").read_text(encoding="utf-8")


class TestConfigUpgrade:
    """Phase 05 (ocr-config) multi-engine output contract."""

    def test_config_engine_plan_and_regions(self):
        service = OCRConfigurationService()
        result = service.configure_ocr(
            record_id="R", document_id="D", ingestion_id="I",
            document_type="RECORD_OF_RIGHTS", languages=["en", "hi"],
            preprocessed_paths=["/tmp/page_001_processed.png"])
        assert result.status == ConfigurationStatus.SUCCESS
        d = result.to_dict()
        assert d["ocr_engines"] == {"primary": "tesseract", "layout": "surya",
                                    "artifact": "roboflow"}
        assert d["regions"] == {"header": True, "metadata": True,
                                "main_table": True, "footer": True}
        assert d["configuration"]["tesseract"]["region_psm"]["CELL"] == 7
        assert d["configuration"]["language"] == "eng+hin"
        assert d["language"] == "en" and d["script"] == "Latin"

    def test_config_resolves_phase03_outputs(self):
        service = OCRConfigurationService()
        paths = service.get_preprocessed_paths("LR-2026-000001", "DOC-X", "ING-X")
        assert any(p.endswith("page_001_processed.png") for p in paths)


class TestRealSamples:
    """Real land-record images: evidence-driven assertions only."""

    @staticmethod
    def _run(service, record, doc, ing, sample, language, **kwargs):
        return service.perform_ocr(
            record_id=record, document_id=doc, ingestion_id=ing,
            language=language, input_paths=[str(sample)], **kwargs)

    def test_real_medium_sample(self, service):
        sample = Path("uploads/samples/test sample english medium.png")
        if not sample.exists():
            pytest.skip("medium sample missing")
        result = self._run(service, "LR-T06-MED", "DOC-T06-MED", "ING-T06-MED",
                           sample, "eng", run_artifacts=False)
        page = result.pages[0]
        assert result.status == OCRStatus.SUCCESS
        assert result.metrics.total_words > 20
        assert "HEADER" in {r.type for r in page.regions}
        govt = page.government_document_evidence.to_dict()
        assert govt["header_detected"] is True
        assert govt["evidence_score"] > 0.0
        d = result.to_dict()
        assert d["engines"]["tesseract"] == "SUCCESS"
        assert d["next_phase"] == "PHASE_07_SEMANTIC_FIELD_EXTRACTION"

    def test_real_enhanced_sample(self, service):
        sample = Path("uploads/samples/test sample english enhanced.png")
        if not sample.exists():
            pytest.skip("enhanced sample missing")
        result = self._run(service, "LR-T06-ENH", "DOC-T06-ENH", "ING-T06-ENH",
                           sample, "eng", run_artifacts=False)
        assert result.status == OCRStatus.SUCCESS
        assert result.metrics.total_words > 20
        assert result.pages[0].mean_confidence > 0.0

    def test_real_hindi_land_record(self, service):
        sample = Path("uploads/test sample hindi medium.png")
        if not sample.exists():
            pytest.skip("hindi sample missing")
        result = self._run(service, "LR-T06-HIN", "DOC-T06-HIN", "ING-T06-HIN",
                           sample, "hin", run_artifacts=False)
        assert result.status == OCRStatus.SUCCESS
        assert "Devanagari" in result.pages[0].scripts_present
        assert result.pages[0].words
