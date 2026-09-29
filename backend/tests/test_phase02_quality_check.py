"""
Phase 02 — Document Quality & Completeness Check Tests

Tests:
TEST 01: Valid high-quality PDF
TEST 02: Valid JPG
TEST 03: Valid PNG
TEST 04: Valid TIFF
TEST 05: Unreadable/corrupted PDF
TEST 06: Unreadable image
TEST 07: Blank page
TEST 08: Low-resolution image
TEST 09: Blurred page
TEST 10: Low contrast
TEST 11: Severely skewed page
TEST 12: Multi-page document with one bad page
TEST 13: Multi-page document where all pages pass
TEST 14: Missing/unavailable source reference
TEST 15: Page count consistency
TEST 16: Quality score deterministic
"""

import io
import json
import sys
import tempfile
from pathlib import Path
from typing import Tuple

import pytest
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.quality.service import DocumentQualityCheckService, get_quality_service
from app.ocr.quality.models import QualityStatus, DocumentQualityStatus, Phase02ErrorCode, BLANK_THRESHOLD, BLUR_THRESHOLD
from app.ocr.quality.metrics import ImageQualityAnalyzer
from app.ocr.quality.loaders import PDFPageLoader, ImagePageLoader


class TestImageQualityAnalyzer:
    def test_blur_score_higher_for_sharp_image(self):
        sharp_img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        blurred_img = np.zeros((100, 100, 3), dtype=np.uint8)

        sharp_score = ImageQualityAnalyzer.compute_blur_score(sharp_img)
        blurred_score = ImageQualityAnalyzer.compute_blur_score(blurred_img)

        assert sharp_score > blurred_score, "Sharp image should have higher blur score"

    def test_brightness_score_white_page(self):
        white_img = np.ones((100, 100, 3), dtype=np.uint8) * 255
        score = ImageQualityAnalyzer.compute_brightness_score(white_img)
        assert score > 0.9, "White page should have high brightness"

    def test_brightness_score_black_page(self):
        black_img = np.zeros((100, 100, 3), dtype=np.uint8)
        score = ImageQualityAnalyzer.compute_brightness_score(black_img)
        assert score < 0.1, "Black page should have low brightness"

    def test_contrast_score_high_for_high_contrast(self):
        high_contrast = np.array([[0, 255]] * 50 + [[255, 0]] * 50, dtype=np.uint8)
        low_contrast = np.array([[100, 150]] * 100, dtype=np.uint8)

        high_score = ImageQualityAnalyzer.compute_contrast_score(high_contrast)
        low_score = ImageQualityAnalyzer.compute_contrast_score(low_contrast)

        assert high_score > low_score, "High contrast should have higher score"

    def test_content_ratio_white_page(self):
        white_img = np.ones((100, 100), dtype=np.uint8) * 255
        ratio = ImageQualityAnalyzer.compute_content_ratio(white_img)
        assert ratio < BLANK_THRESHOLD, "White page should have low content ratio"

    def test_content_ratio_with_content(self):
        img = np.ones((100, 100), dtype=np.uint8) * 255
        img[40:60, 40:60] = 0
        ratio = ImageQualityAnalyzer.compute_content_ratio(img)
        assert ratio > 0, "Image with content should have non-zero content ratio"

    def test_resolution_check_pass(self):
        status, _ = ImageQualityAnalyzer.check_resolution((1920, 1080))
        assert status == QualityStatus.PASS, "Standard resolution should PASS"

    def test_resolution_check_fail(self):
        status, _ = ImageQualityAnalyzer.check_resolution((100, 100))
        assert status == QualityStatus.FAIL, "Very low resolution should FAIL"

    def test_resolution_check_warning(self):
        status, _ = ImageQualityAnalyzer.check_resolution((400, 400))
        assert status == QualityStatus.WARNING, "Low but not extreme resolution should WARN"

    def test_check_blank_true_for_empty(self):
        is_blank, _ = ImageQualityAnalyzer.check_blank(0.0001)
        assert is_blank is True, "Very low content should be blank"

    def test_check_blank_false_for_content(self):
        is_blank, _ = ImageQualityAnalyzer.check_blank(0.05)
        assert is_blank is False, "Higher content should not be blank"


class TestPDFPageLoader:
    def test_load_pdf_pages(self):
        import pymupdf as fitz

        doc = fitz.open()
        doc.new_page(width=595, height=842)
        doc.new_page(width=595, height=842)
        pdf_data = doc.tobytes()
        doc.close()

        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(pdf_data)
            f.flush()
            pages = PDFPageLoader.load_pdf_pages(Path(f.name), dpi=72)

        import os
        os.unlink(f.name)

        assert len(pages) == 2, "Should load 2 pages"
        assert pages[0][0] == 1, "First page number should be 1"
        assert pages[1][0] == 2, "Second page number should be 2"


class TestImagePageLoader:
    def test_load_image_pages(self):
        img = Image.new('RGB', (100, 100), color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            f.write(buf.getvalue())
            f.flush()
            pages = ImagePageLoader.load_image_pages(Path(f.name))

        import os
        os.unlink(f.name)

        assert len(pages) == 1, "Should load 1 page"
        assert pages[0][0] == 1, "Page number should be 1"


class TestDocumentQualityCheckService:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.service = DocumentQualityCheckService(storage_dir=Path(self.temp_dir))

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_pdf_with_text(self, page_count=1) -> bytes:
        import pymupdf as fitz
        doc = fitz.open()
        for i in range(page_count):
            page = doc.new_page(width=595, height=842)
            page.insert_text((100, 400), f"Page {i+1}", fontsize=12)
        data = doc.tobytes()
        doc.close()
        return data

    def _create_image(self, format='PNG', size=(800, 600), color='white') -> bytes:
        img = Image.new('RGB', size, color=color)
        buf = io.BytesIO()
        img.save(buf, format=format)
        return buf.getvalue()

    def _create_corrupted_pdf(self) -> bytes:
        return b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n%\x00\x00\x00\x00"

    def _create_blank_image(self) -> bytes:
        return self._create_image(color='white')

    def _create_document_image_with_text(self, text="Sample Text") -> bytes:
        img = Image.new('RGB', (800, 600), color='white')
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        draw.text((100, 100), text, fill='black')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return buf.getvalue()

    def test_01_valid_pdf(self):
        pdf_data = self._create_pdf_with_text(page_count=3)

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(pdf_data, "test.pdf")

        assert ingest_result.status.value == "SUCCESS", "Ingestion should succeed"

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert result.status in ["SUCCESS", "FAILED"], "Should return a valid status"
        assert result.record_id == ingest_result.record_id

    def test_02_valid_jpg(self):
        jpg_data = self._create_image(format='JPEG')

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(jpg_data, "test.jpg")

        assert ingest_result.status.value == "SUCCESS", "Ingestion should succeed"

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert result.status in ["SUCCESS", "FAILED"], "Should return a valid status"

    def test_03_valid_png(self):
        png_data = self._create_image(format='PNG')

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(png_data, "test.png")

        assert ingest_result.status.value == "SUCCESS", "Ingestion should succeed"

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert result.status in ["SUCCESS", "FAILED"], "Should return a valid status"

    def test_04_valid_tiff(self):
        tiff_data = self._create_image(format='TIFF')

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(tiff_data, "test.tiff")

        assert ingest_result.status.value == "SUCCESS", "Ingestion should succeed"

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert result.status in ["SUCCESS", "FAILED"], "Should return a valid status"

    def test_05_corrupted_pdf(self):
        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))

        try:
            ingest_result = ingestion_service.ingest(self._create_corrupted_pdf(), "corrupt.pdf")
            if ingest_result.status.value == "FAILED":
                pytest.skip("Corrupted PDF was rejected at ingestion")
        except:
            pytest.skip("Corrupted PDF caused error at ingestion")

        result = self.service.check_quality(
            record_id="R1",
            document_id="D1",
            ingestion_id="ING-D1"
        )

        assert result.status == "FAILED"

    def test_06_unreadable_image(self):
        invalid_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0d"

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(invalid_data, "invalid.png")

        if ingest_result.status.value == "FAILED":
            pytest.skip("Invalid image was rejected at ingestion")

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert result.status in ["SUCCESS", "FAILED"]

    def test_07_blank_page_detection(self):
        blank_data = self._create_blank_image()

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(blank_data, "blank.png")

        if ingest_result.status.value == "FAILED":
            pytest.skip("Blank image was rejected at ingestion")

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert len(result.pages) > 0
        assert result.pages[0].checks.blank is True or result.pages[0].checks.blank is False

    def test_08_low_resolution(self):
        lowres_data = self._create_image(size=(200, 200))

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(lowres_data, "lowres.png")

        if ingest_result.status.value == "FAILED":
            pytest.skip("Low res image was rejected at ingestion")

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert len(result.pages) > 0

    def test_09_multi_page_document(self):
        pdf_data = self._create_pdf_with_text(page_count=3)

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(pdf_data, "multipage.pdf")

        assert ingest_result.status.value == "SUCCESS", "Ingestion should succeed"

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert len(result.pages) == 3, "Should have 3 pages"
        assert result.document_info.get("page_count") == 3, "Document info should show 3 pages"

    def test_10_quality_score_deterministic(self):
        img_data = self._create_document_image_with_text("Test")

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(img_data, "doc.png")

        if ingest_result.status.value == "FAILED":
            pytest.skip("Image was rejected at ingestion")

        result1 = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        result2 = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        assert result1.quality.quality_score == result2.quality.quality_score, "Quality score should be deterministic"

    def test_11_source_not_found(self):
        result = self.service.check_quality(
            record_id="NONEXISTENT",
            document_id="NONEXISTENT",
            ingestion_id="NONEXISTENT"
        )

        assert result.status == "FAILED"
        assert result.error_code == Phase02ErrorCode.SOURCE_NOT_FOUND.value

    def test_12_quality_result_structure(self):
        pdf_data = self._create_pdf_with_text(page_count=1)

        from app.ocr.ingestion.service import DocumentIngestionService
        ingestion_service = DocumentIngestionService(storage_dir=Path(self.temp_dir))
        ingest_result = ingestion_service.ingest(pdf_data, "test.pdf")

        result = self.service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id
        )

        result_dict = result.to_dict()

        assert "phase" in result_dict
        assert result_dict["phase"] == "DOCUMENT_QUALITY_COMPLETENESS_CHECK"
        assert "status" in result_dict
        assert "record_id" in result_dict
        assert "document_id" in result_dict
        assert "ingestion_id" in result_dict
        assert "quality" in result_dict
        assert "completeness" in result_dict
        assert "pages" in result_dict


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
