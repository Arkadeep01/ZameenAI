"""
Phase 01 — Document Ingestion Tests

Tests:
TEST 01: Valid PDF upload
TEST 02: Valid JPG upload
TEST 03: Valid PNG upload
TEST 04: Valid TIFF upload
TEST 05: Unsupported DOCX
TEST 06: Corrupted PDF
TEST 07: Unreadable image
TEST 08: Oversized file
TEST 09: Checksum generated
TEST 10: Unique identifiers
TEST 11: Original preservation
TEST 12: PDF page count
"""

import io
import os
import sys
import hashlib
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.ingestion.service import DocumentIngestionService, reset_ingestion_service
from app.ocr.ingestion.models import IngestionStatus, ErrorCode, SUPPORTED_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES
from app.ocr.ingestion.ids import IDGenerator
from app.ocr.ingestion.validators import FileValidator, PDFValidator, ImageValidator, ChecksumGenerator


class TestFileValidator:
    def test_validate_extension_pdf(self):
        is_valid, ext, err = FileValidator.validate_extension("document.pdf")
        assert is_valid is True
        assert ext == ".pdf"
        assert err is None

    def test_validate_extension_jpg(self):
        is_valid, ext, err = FileValidator.validate_extension("photo.jpg")
        assert is_valid is True
        assert ext == ".jpg"
        assert err is None

    def test_validate_extension_jpeg(self):
        is_valid, ext, err = FileValidator.validate_extension("photo.jpeg")
        assert is_valid is True
        assert ext == ".jpeg"
        assert err is None

    def test_validate_extension_png(self):
        is_valid, ext, err = FileValidator.validate_extension("image.png")
        assert is_valid is True
        assert ext == ".png"
        assert err is None

    def test_validate_extension_tiff(self):
        is_valid, ext, err = FileValidator.validate_extension("scan.tiff")
        assert is_valid is True
        assert ext == ".tiff"
        assert err is None

    def test_validate_extension_tif(self):
        is_valid, ext, err = FileValidator.validate_extension("scan.tif")
        assert is_valid is True
        assert ext == ".tif"
        assert err is None

    def test_validate_extension_unsupported_docx(self):
        is_valid, ext, err = FileValidator.validate_extension("document.docx")
        assert is_valid is False
        assert ext == ".docx"
        assert err == ErrorCode.UNSUPPORTED_FILE_TYPE

    def test_validate_extension_unsupported_exe(self):
        is_valid, ext, err = FileValidator.validate_extension("program.exe")
        assert is_valid is False
        assert ext == ".exe"
        assert err == ErrorCode.UNSUPPORTED_FILE_TYPE

    def test_validate_extension_unsupported_zip(self):
        is_valid, ext, err = FileValidator.validate_extension("archive.zip")
        assert is_valid is False
        assert ext == ".zip"
        assert err == ErrorCode.UNSUPPORTED_FILE_TYPE

    def test_validate_extension_empty_filename(self):
        is_valid, ext, err = FileValidator.validate_extension("")
        assert is_valid is False
        assert err == ErrorCode.UNSUPPORTED_FILE_TYPE

    def test_validate_extension_no_extension(self):
        is_valid, ext, err = FileValidator.validate_extension("document")
        assert is_valid is False
        assert err == ErrorCode.UNSUPPORTED_FILE_TYPE


class TestChecksumGenerator:
    def test_compute_sha256(self):
        content = b"Hello, World!"
        expected_hash = hashlib.sha256(content).hexdigest()

        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(content)
            f.flush()
            result_hash = ChecksumGenerator.compute_sha256(Path(f.name))

        os.unlink(f.name)

        assert result_hash == expected_hash

    def test_sha256_deterministic(self):
        content = b"Test content for deterministic hash"

        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(content)
            f.flush()
            hash1 = ChecksumGenerator.compute_sha256(Path(f.name))
            hash2 = ChecksumGenerator.compute_sha256(Path(f.name))

        os.unlink(f.name)

        assert hash1 == hash2


class TestIDGenerator:
    def setup_method(self):
        IDGenerator.reset_counters()

    def test_generate_record_id_format(self):
        record_id = IDGenerator.generate_record_id()
        assert record_id.startswith("LR-")
        parts = record_id.split("-")
        assert len(parts) == 3
        assert parts[1].isdigit()
        assert parts[2].isdigit()

    def test_generate_document_id_format(self):
        doc_id = IDGenerator.generate_document_id()
        assert doc_id.startswith("DOC-")
        parts = doc_id.split("-")
        assert len(parts) == 3

    def test_generate_ingestion_id_format(self):
        ing_id = IDGenerator.generate_ingestion_id()
        assert ing_id.startswith("ING-")
        parts = ing_id.split("-")
        assert len(parts) == 3

    def test_ids_are_unique(self):
        record_ids = [IDGenerator.generate_record_id() for _ in range(100)]
        doc_ids = [IDGenerator.generate_document_id() for _ in range(100)]
        ing_ids = [IDGenerator.generate_ingestion_id() for _ in range(100)]

        assert len(set(record_ids)) == 100
        assert len(set(doc_ids)) == 100
        assert len(set(ing_ids)) == 100

    def test_ids_increment(self):
        record1 = IDGenerator.generate_record_id()
        record2 = IDGenerator.generate_record_id()
        assert record1 != record2


class TestDocumentIngestionService:
    def setup_method(self):
        reset_ingestion_service()
        self.temp_dir = tempfile.mkdtemp()
        self.service = DocumentIngestionService(storage_dir=Path(self.temp_dir))

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_valid_pdf(self, page_count=1):
        import pymupdf as fitz
        doc = fitz.open()
        for _ in range(page_count):
            doc.new_page()
        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes

    def _create_valid_image(self, format="PNG", size=(100, 100)):
        from PIL import Image
        img = Image.new("RGB", size, color="red")
        buf = io.BytesIO()
        img.save(buf, format=format)
        return buf.getvalue()

    def _create_corrupted_pdf(self):
        return b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n%\x00\x00\x00\x00"

    def _create_invalid_image(self):
        return b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0d"

    def _get_file_size(self, data):
        return len(data)

    def test_01_valid_pdf_upload(self):
        pdf_data = self._create_valid_pdf(page_count=3)
        result = self.service.ingest(pdf_data, "land_record.pdf")

        assert result.status == IngestionStatus.SUCCESS
        assert result.error is None
        assert result.record_id is not None
        assert result.document_id is not None
        assert result.ingestion_id is not None
        assert result.source is not None
        assert result.source.file_type == "PDF"
        assert result.source.page_count == 3
        assert result.integrity is not None
        assert result.integrity.file_readable is True
        assert result.integrity.file_valid is True
        assert result.integrity.checksum_generated is True

    def test_02_valid_jpg_upload(self):
        jpg_data = self._create_valid_image(format="JPEG", size=(800, 600))
        result = self.service.ingest(jpg_data, "photo.jpg")

        assert result.status == IngestionStatus.SUCCESS
        assert result.error is None
        assert result.source.file_type == "JPG"
        assert result.source.page_count == 1
        assert result.source.width == 800
        assert result.source.height == 600

    def test_03_valid_png_upload(self):
        png_data = self._create_valid_image(format="PNG", size=(1024, 768))
        result = self.service.ingest(png_data, "image.png")

        assert result.status == IngestionStatus.SUCCESS
        assert result.error is None
        assert result.source.file_type == "PNG"
        assert result.source.page_count == 1
        assert result.source.width == 1024
        assert result.source.height == 768

    def test_04_valid_tiff_upload(self):
        from PIL import Image
        img = Image.new("RGB", (640, 480), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="TIFF")
        tiff_data = buf.getvalue()

        result = self.service.ingest(tiff_data, "scan.tiff")

        assert result.status == IngestionStatus.SUCCESS
        assert result.error is None
        assert result.source.file_type == "TIFF"
        assert result.source.page_count == 1

    def test_05_unsupported_docx(self):
        docx_data = b"PK\x03\x04" + b"\x00" * 100
        result = self.service.ingest(docx_data, "document.docx")

        assert result.status == IngestionStatus.FAILED
        assert result.error is not None
        assert result.error.error_code == ErrorCode.UNSUPPORTED_FILE_TYPE
        supported_types = result.error.details.get("supported_types", [])
        assert ".docx" not in supported_types
        assert ".pdf" in supported_types

    def test_06_corrupted_pdf(self):
        corrupted_data = self._create_corrupted_pdf()
        result = self.service.ingest(corrupted_data, "corrupted.pdf")

        assert result.status == IngestionStatus.FAILED
        assert result.error is not None
        assert result.error.error_code == ErrorCode.CORRUPTED_PDF

    def test_07_unreadable_image(self):
        invalid_data = self._create_invalid_image()
        result = self.service.ingest(invalid_data, "invalid.png")

        assert result.status == IngestionStatus.FAILED
        assert result.error is not None

    def test_08_oversized_file(self):
        max_size = MAX_UPLOAD_SIZE_BYTES
        large_data = b"\x00" * (max_size + 1)
        result = self.service.ingest(large_data, "large.pdf")

        assert result.status == IngestionStatus.FAILED
        assert result.error is not None
        assert result.error.error_code == ErrorCode.FILE_TOO_LARGE
        assert result.error.details.get("within_limit") is False
        assert result.error.details.get("file_size_bytes") > MAX_UPLOAD_SIZE_BYTES

    def test_09_checksum_generated(self):
        pdf_data = self._create_valid_pdf()
        result = self.service.ingest(pdf_data, "test.pdf")

        assert result.status == IngestionStatus.SUCCESS
        assert result.source is not None
        assert result.source.sha256 is not None
        assert len(result.source.sha256) == 64

        computed_hash = hashlib.sha256(pdf_data).hexdigest()
        assert result.source.sha256 == computed_hash

    def test_10_unique_identifiers(self):
        pdf1 = self._create_valid_pdf()
        pdf2 = self._create_valid_pdf()

        result1 = self.service.ingest(pdf1, "doc1.pdf")
        result2 = self.service.ingest(pdf2, "doc2.pdf")

        assert result1.document_id != result2.document_id
        assert result1.ingestion_id != result2.ingestion_id
        assert result1.record_id != result2.record_id

    def test_11_original_preservation(self):
        original_data = self._create_valid_pdf(page_count=5)
        original_hash = hashlib.sha256(original_data).hexdigest()

        result = self.service.ingest(original_data, "original.pdf")

        assert result.status == IngestionStatus.SUCCESS
        assert result.source is not None
        assert result.source.sha256 == original_hash

        stored_path = Path(self.temp_dir) / f"{result.ingestion_id}.pdf"
        assert stored_path.exists()

        with open(stored_path, "rb") as f:
            stored_hash = hashlib.sha256(f.read()).hexdigest()

        assert stored_hash == original_hash

    def test_12_pdf_page_count(self):
        pdf_1_page = self._create_valid_pdf(page_count=1)
        pdf_3_pages = self._create_valid_pdf(page_count=3)
        pdf_10_pages = self._create_valid_pdf(page_count=10)

        result1 = self.service.ingest(pdf_1_page, "one_page.pdf")
        result3 = self.service.ingest(pdf_3_pages, "three_pages.pdf")
        result10 = self.service.ingest(pdf_10_pages, "ten_pages.pdf")

        assert result1.source.page_count == 1
        assert result3.source.page_count == 3
        assert result10.source.page_count == 10


class TestIngestionResultContract:
    def setup_method(self):
        reset_ingestion_service()
        self.temp_dir = tempfile.mkdtemp()
        self.service = DocumentIngestionService(storage_dir=Path(self.temp_dir))

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_success_result_structure(self):
        import pymupdf as fitz
        doc = fitz.open()
        doc.new_page()
        doc.new_page()
        pdf_data = doc.tobytes()
        doc.close()

        result = self.service.ingest(pdf_data, "Khatian_Demo.pdf")
        result_dict = result.to_dict()

        assert "phase" in result_dict
        assert result_dict["phase"] == "DOCUMENT_INGESTION"

        assert "status" in result_dict
        assert result_dict["status"] == "SUCCESS"

        assert "record_id" in result_dict
        assert "document_id" in result_dict
        assert "ingestion_id" in result_dict

        assert "source" in result_dict
        source = result_dict["source"]
        assert "original_filename" in source
        assert "file_type" in source
        assert "mime_type" in source
        assert "file_size_bytes" in source
        assert "sha256" in source
        assert "page_count" in source

        assert "integrity" in result_dict
        integrity = result_dict["integrity"]
        assert "file_readable" in integrity
        assert "file_valid" in integrity
        assert "checksum_generated" in integrity

        assert "timestamps" in result_dict
        assert "received_at" in result_dict["timestamps"]
        assert "completed_at" in result_dict["timestamps"]

        assert "next_phase" in result_dict
        assert result_dict["next_phase"] == "DOCUMENT_QUALITY_COMPLETENESS_CHECK"

    def test_failure_result_structure(self):
        docx_data = b"PK\x03\x04" + b"\x00" * 100
        result = self.service.ingest(docx_data, "document.docx")
        result_dict = result.to_dict()

        assert result_dict["status"] == "FAILED"
        assert "error_code" in result_dict
        assert "message" in result_dict
        assert "details" in result_dict


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
