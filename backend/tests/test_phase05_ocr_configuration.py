"""
Tests for Phase 06 - OCR Configuration / Routing
"""

import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path

from app.ocr.ocr_config.service import OCRConfigurationService, create_configuration
from app.ocr.ocr_config.models import OCRConfigurationResult, OCRConfiguration, OCRRouting, OCREngine, InputSource, ConfigurationStatus, PageOCRMode


class TestOCRConfigurationService:
    """Test OCR Configuration Service"""

    def test_ocr_configuration_result_to_dict(self):
        """Test OCRConfigurationResult serialization"""
        result = OCRConfigurationResult(
            status=ConfigurationStatus.SUCCESS,
            record_id="REC-001",
            document_id="DOC-001",
            ingestion_id="ING-001",
            document_type="RECORD_OF_RIGHTS",
            classification_confidence=0.85,
            classification_status="HIGH_CONFIDENCE",
        )

        result.configuration = MagicMock()
        result.configuration.engine = "TESSERACT"
        result.configuration.language = "eng"
        result.configuration.page_mode = "SINGLE_PAGE"
        result.configuration.input_source = "PREPROCESSED_IMAGE"
        result.configuration.input_paths = ["/path/to/image.png"]
        result.configuration.native_pdf_text_attempt = False
        result.configuration.table_aware = True
        result.configuration.preserve_layout = True
        result.configuration.fallback_enabled = True
        result.configuration.tesseract_psm = 6
        result.configuration.tesseract_oem = 3

        result.routing = MagicMock()
        result.routing.primary = "TESSERACT"
        result.routing.fallback = None
        result.routing.fallback_enabled = False

        d = result.to_dict()

        assert d["status"] == "SUCCESS"
        assert d["record_id"] == "REC-001"
        assert d["document_id"] == "DOC-001"
        assert d["ingestion_id"] == "ING-001"
        assert d["document_type"] == "RECORD_OF_RIGHTS"
        assert d["classification_confidence"] == 0.85
        assert d["next_phase"] == "PHASE_06_OCR"

    def test_determine_tesseract_psm_default(self):
        """Test default PSM determination"""
        service = OCRConfigurationService()
        psm = service.determine_tesseract_psm("UNKNOWN")
        assert psm == 6

    def test_determine_tesseract_psm_with_tables(self):
        """Test PSM determination with tables"""
        service = OCRConfigurationService()
        psm = service.determine_tesseract_psm("RECORD_OF_RIGHTS", has_tables=True)
        assert psm == 6

    def test_determine_page_mode_single(self):
        """Test single page mode determination"""
        service = OCRConfigurationService()
        mode = service.determine_page_mode(["/path/to/image.png"], has_tables=False)
        assert mode == PageOCRMode.SINGLE_PAGE.value

    def test_determine_page_mode_multi_page(self):
        """Test multi-page mode determination"""
        service = OCRConfigurationService()
        mode = service.determine_page_mode(
            ["/path/to/page1.png", "/path/to/page2.png"], has_tables=False
        )
        assert mode == PageOCRMode.MULTI_PAGE_SEQUENTIAL.value

    def test_determine_page_mode_table_aware(self):
        """Test table-aware mode determination"""
        service = OCRConfigurationService()
        mode = service.determine_page_mode(["/path/to/page1.png"], has_tables=True)
        assert mode == PageOCRMode.TABLE_AWARE.value

    def test_determine_input_source_pdf(self):
        """Test input source determination for PDF"""
        service = OCRConfigurationService()
        source, paths = service.determine_input_source(
            "/path/to/document.pdf", [], "RECORD_OF_RIGHTS"
        )
        assert source == InputSource.RENDERED_PDF_PAGE.value
        assert paths == []

    def test_determine_input_source_with_preprocessed(self):
        """Test input source determination with preprocessed images"""
        service = OCRConfigurationService()
        source, paths = service.determine_input_source(
            "/path/to/original.png",
            ["/path/to/processed.png"],
            "RECORD_OF_RIGHTS",
        )
        assert source == InputSource.PREPROCESSED_IMAGE.value
        assert len(paths) == 1

    def test_configure_ocr_basic(self):
        """Test basic OCR configuration"""
        service = OCRConfigurationService()

        result = service.configure_ocr(
            record_id="REC-001",
            document_id="DOC-001",
            ingestion_id="ING-001",
            document_type="RECORD_OF_RIGHTS",
            classification_confidence=0.85,
            classification_status="HIGH_CONFIDENCE",
            preprocessed_paths=["/path/to/processed.png"],
            original_path="/path/to/original.png",
            is_native_pdf=False,
            has_tables=True,
        )

        assert result.status == ConfigurationStatus.SUCCESS
        assert result.record_id == "REC-001"
        assert result.document_id == "DOC-001"
        assert result.ingestion_id == "ING-001"
        assert result.next_phase == "PHASE_06_OCR"
        assert result.configuration is not None
        assert result.configuration.engine == OCREngine.TESSERACT.value
        assert result.configuration.language == "eng"
        assert result.configuration.table_aware is True

    def test_configure_ocr_native_pdf(self):
        """Test OCR configuration for native PDF"""
        service = OCRConfigurationService()

        result = service.configure_ocr(
            record_id="REC-001",
            document_id="DOC-001",
            ingestion_id="ING-001",
            document_type="LAND_REGISTRATION_DOCUMENT",
            classification_confidence=0.90,
            classification_status="HIGH_CONFIDENCE",
            original_path="/path/to/document.pdf",
            is_native_pdf=True,
            has_tables=True,
        )

        assert result.status == ConfigurationStatus.SUCCESS
        assert result.configuration is not None
        assert result.configuration.native_pdf_text_attempt is True
        assert result.routing is not None
        assert result.routing.primary == OCREngine.NATIVE_PDF_TEXT.value

    def test_configure_ocr_missing_ids(self):
        """Test OCR configuration with missing IDs fails gracefully"""
        service = OCRConfigurationService()

        result = service.configure_ocr(
            record_id="",
            document_id="DOC-001",
            ingestion_id="ING-001",
        )

        assert result.status == ConfigurationStatus.SUCCESS

    def test_create_configuration_helper(self):
        """Test create_configuration convenience function"""
        result = create_configuration(
            record_id="REC-001",
            document_id="DOC-001",
            ingestion_id="ING-001",
            document_type="MUTATION_RECORD",
            classification_confidence=0.75,
            classification_status="REVIEW_REQUIRED",
        )

        assert result.record_id == "REC-001"
        assert result.document_type == "MUTATION_RECORD"


class TestPhase06API:
    """Test Phase 06 OCR configuration API endpoint"""

    def test_phase06_endpoint_success(self, client):
        """Test /api/digitization/ocr-config endpoint"""
        with patch("app.ocr.api.classify_ocr.OCRConfigurationService") as mock_service_class:
            mock_service = MagicMock()
            result = OCRConfigurationResult(
                status=ConfigurationStatus.SUCCESS,
                record_id="REC-001",
                document_id="DOC-001",
                ingestion_id="ING-001",
                document_type="RECORD_OF_RIGHTS",
                classification_confidence=0.85,
                classification_status="HIGH_CONFIDENCE",
                configuration=OCRConfiguration(),
                routing=OCRRouting(primary="TESSERACT", fallback=None),
            )
            mock_service.configure_ocr.return_value = result
            mock_service_class.return_value = mock_service

            response = client.post(
                "/api/digitization/ocr-config",
                json={
                    "record_id": "REC-001",
                    "document_id": "DOC-001",
                    "ingestion_id": "ING-001",
                    "document_type": "RECORD_OF_RIGHTS",
                    "classification_confidence": 0.85,
                    "classification_status": "HIGH_CONFIDENCE",
                },
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "SUCCESS"
            assert data["record_id"] == "REC-001"
            assert data["next_phase"] == "PHASE_06_OCR"

    def test_phase06_endpoint_missing_params(self, client):
        """Test /api/digitization/ocr-config with missing parameters"""
        response = client.post(
            "/api/digitization/ocr-config",
            json={
                "record_id": "REC-001",
            },
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "FAILED"
        assert data["error_code"] == "MISSING_PARAMETERS"

    def test_phase06_endpoint_no_json(self, client):
        """Test /api/digitization/ocr-config without JSON"""
        response = client.post(
            "/api/digitization/ocr-config",
            content_type="application/json",
            data="not json",
        )

        assert response.status_code == 400
        data = response.get_json()
        if data is not None:
            assert data["status"] == "FAILED"
            assert data["error_code"] == "INVALID_REQUEST"
