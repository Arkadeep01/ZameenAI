"""
Tests for Phase 07 - Semantic Field Extraction
"""

import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytest

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.phase07_semantic_field_extraction import (
    SemanticExtractionService,
    SemanticExtractor,
    LandRecordExtractor,
    ExtractionStatus,
    FieldStatus,
    ExtractionMethod,
    ExtractionResult,
    ExtractedRecord,
    FieldMetadata,
    BoundingBox,
    ExtractionSource,
    normalize_label,
    normalize_date,
    normalize_area,
    normalize_nature_of_land,
    normalize_name,
    extract_number,
    is_valid_date_candidate,
    is_reasonable_person_name,
    is_reasonable_numeric_field,
    is_reasonable_location,
    is_reasonable_document_title,
    is_reasonable_area_value,
    LABEL_ALIASES,
    PHASE_07_STORAGE_DIR,
    OCRWord,
    OCRRow,
)


class TestNormalization:
    """Test normalization functions."""

    def test_normalize_label(self):
        assert normalize_label("Father's / Husband's Name") == "fathers husbands name"
        assert normalize_label("Date of Mutation:") == "date of mutation"

    def test_normalize_date_dd_mm_yyyy(self):
        assert normalize_date("15-06-2025") == "2025-06-15"

    def test_normalize_date_dd_slash_mm_slash_yyyy(self):
        assert normalize_date("15/06/2025") == "2025-06-15"

    def test_normalize_date_dd_dot_mm_dot_yyyy(self):
        assert normalize_date("15.06.2025") == "2025-06-15"

    def test_normalize_date_yyyy_mm_dd(self):
        assert normalize_date("2025-06-15") == "2025-06-15"

    def test_normalize_date_invalid(self):
        assert normalize_date("invalid") is None

    def test_normalize_date_empty(self):
        assert normalize_date("") is None
        assert normalize_date(None) is None

    def test_normalize_area_acre(self):
        value, unit = normalize_area("2.5 Acre")
        assert value == 2.5
        assert unit == "ACRE"

    def test_normalize_area_acres(self):
        value, unit = normalize_area("2.5 acres")
        assert value == 2.5
        assert unit == "ACRE"

    def test_normalize_area_hectare(self):
        value, unit = normalize_area("1.5 Hectare")
        assert value == 1.5
        assert unit == "HECTARE"

    def test_normalize_area_no_unit(self):
        value, unit = normalize_area("2.5")
        assert value == 2.5
        assert unit is None

    def test_normalize_area_empty(self):
        value, unit = normalize_area("")
        assert value is None
        assert unit is None

    def test_normalize_nature_of_land_agricultural(self):
        assert normalize_nature_of_land("Agricultural") == "AGRICULTURAL"
        assert normalize_nature_of_land("AGRICULTURAL") == "AGRICULTURAL"
        assert normalize_nature_of_land("agri") == "AGRICULTURAL"

    def test_normalize_nature_of_land_homestead(self):
        assert normalize_nature_of_land("Homestead") == "HOMESTEAD"
        assert normalize_nature_of_land("homestead land") == "HOMESTEAD"

    def test_normalize_nature_of_land_unknown(self):
        assert normalize_nature_of_land("Unknown Land Type") == "UNKNOWN LAND TYPE"

    def test_normalize_name_simple(self):
        assert normalize_name("Ramesh Kumar") == "Ramesh Kumar"

    def test_normalize_name_with_prefix(self):
        assert normalize_name("s/o Ramesh Kumar") == "Ramesh Kumar"

    def test_normalize_name_empty(self):
        assert normalize_name("") == ""

    def test_extract_number_plain_number(self):
        assert extract_number("45") == "45"
        assert extract_number("112") == "112"
        assert extract_number("1023") == "1023"

    def test_extract_number_with_suffix(self):
        assert extract_number("45A") == "45A"

    def test_extract_number_empty(self):
        assert extract_number("") is None


class TestValidators:
    """Test field validators."""

    def test_is_valid_date_candidate(self):
        assert is_valid_date_candidate("15-06-2025") is True
        assert is_valid_date_candidate("2025-06-15") is True
        assert is_valid_date_candidate("abc") is False
        assert is_valid_date_candidate("") is False

    def test_is_reasonable_person_name(self):
        assert is_reasonable_person_name("Ramesh Kumar") is True
        assert is_reasonable_person_name("Ramesh Chandra Saha") is True
        assert is_reasonable_person_name("Late Haripada Saha") is True
        assert is_reasonable_person_name("John") is False
        assert is_reasonable_person_name("of the") is False

    def test_is_reasonable_numeric_field(self):
        assert is_reasonable_numeric_field("45") is True
        assert is_reasonable_numeric_field("112") is True
        assert is_reasonable_numeric_field("1023") is True
        assert is_reasonable_numeric_field("45A") is True
        assert is_reasonable_numeric_field("abc") is False
        assert is_reasonable_numeric_field("") is False

    def test_is_reasonable_location(self):
        assert is_reasonable_location("Nadia") is True
        assert is_reasonable_location("Krishnanagar") is True
        assert is_reasonable_location("AB") is False
        # Unicode-aware: Devanagari/Bengali names pass, digit fragments fail.
        assert is_reasonable_location("कृष्णनगर") is True
        assert is_reasonable_location("লখনউ") is True
        assert is_reasonable_location("45") is False
        assert is_reasonable_location("?~") is False
        assert is_reasonable_location("'~afta") is False

    def test_is_reasonable_document_title(self):
        assert is_reasonable_document_title("Record of Rights (RoR)") is True
        assert is_reasonable_document_title("Khatian") is True
        assert is_reasonable_document_title("ভূমির রেকর্ড") is True
        assert is_reasonable_document_title("45") is False
        assert is_reasonable_document_title("AB") is False
        assert is_reasonable_document_title("-- 12 --") is False
        assert is_reasonable_document_title("") is False

    def test_is_reasonable_area_value(self):
        assert is_reasonable_area_value("2.5 Acre") is True
        assert is_reasonable_area_value("0.32 Acre") is True
        assert is_reasonable_area_value("abc") is False


class TestExtractionResult:
    """Test ExtractionResult dataclass."""

    def test_extraction_result_to_dict(self):
        result = ExtractionResult(
            status=ExtractionStatus.SUCCESS,
            record_id="LR-2026-000001",
            document_id="DOC-2026-000001",
            ingestion_id="ING-2026-000001",
            document_type="RECORD_OF_RIGHTS",
            classification_confidence=0.85,
            fields_expected=10,
            fields_extracted=5,
            fields_missing=3,
            fields_not_applicable=2,
        )

        result_dict = result.to_dict()

        assert result_dict["status"] == "SUCCESS"
        assert result_dict["record_id"] == "LR-2026-000001"
        assert result_dict["document_type"] == "RECORD_OF_RIGHTS"
        assert result_dict["classification_confidence"] == 0.85
        assert result_dict["completeness"]["fields_expected"] == 10
        assert result_dict["completeness"]["fields_extracted"] == 5

    def test_extraction_result_with_error(self):
        result = ExtractionResult(
            status=ExtractionStatus.FAILED,
            record_id="LR-2026-000001",
            document_id="DOC-2026-000001",
            ingestion_id="ING-2026-000001",
            error_code="OCR_RESULT_NOT_FOUND",
            error_message="Phase 06 OCR result could not be located",
        )

        result_dict = result.to_dict()

        assert result_dict["status"] == "FAILED"
        assert result_dict["error_code"] == "OCR_RESULT_NOT_FOUND"


class TestExtractedRecord:
    """Test ExtractedRecord dataclass."""

    def test_extracted_record_to_dict(self):
        record = ExtractedRecord(
            record_id="LR-2026-000001",
            document_id="DOC-2026-000001",
            ingestion_id="ING-2026-000001",
        )
        record.document["document_title"] = "Record of Rights"
        record.land["plot_number"] = "45"
        record.land["area"] = 2.5
        record.land["area_unit"] = "ACRE"

        record_dict = record.to_dict()

        assert record_dict["record_id"] == "LR-2026-000001"
        assert record_dict["document"]["document_title"] == "Record of Rights"
        assert record_dict["land"]["plot_number"] == "45"
        assert record_dict["land"]["area"] == 2.5
        assert record_dict["land"]["area_unit"] == "ACRE"


class TestFieldMetadata:
    """Test FieldMetadata dataclass."""

    def test_field_metadata_to_dict(self):
        source = ExtractionSource(
            page=1,
            label="Plot No.",
            text="45",
            bbox=BoundingBox(x=160, y=170, width=15, height=15),
        )
        metadata = FieldMetadata(
            field_name="land.plot_number",
            status=FieldStatus.EXTRACTED,
            confidence=0.85,
            raw_value="45",
            normalized_value="45",
            source=source,
            method=ExtractionMethod.LABEL_VALUE_SAME_LINE,
        )

        metadata_dict = metadata.to_dict()

        assert metadata_dict["field_name"] == "land.plot_number"
        assert metadata_dict["status"] == "EXTRACTED"
        assert metadata_dict["confidence"] == 0.85
        assert metadata_dict["raw_value"] == "45"
        assert metadata_dict["source"]["page"] == 1
        assert metadata_dict["method"] == "LABEL_VALUE_SAME_LINE"


class TestOCRWordAndRow:
    """Test OCR word and row representation."""

    def test_ocr_word_to_dict(self):
        word = OCRWord(
            text="Plot",
            confidence=0.9,
            bbox=BoundingBox(x=100, y=200, width=30, height=10),
            page_number=1,
            line_num=10,
            word_num=1,
        )

        word_dict = word.to_dict()

        assert word_dict["text"] == "Plot"
        assert word_dict["confidence"] == 0.9
        assert word_dict["page_number"] == 1
        assert word_dict["line_num"] == 10

    def test_ocr_row_properties(self):
        word1 = OCRWord(
            text="Plot", confidence=0.9,
            bbox=BoundingBox(x=100, y=200, width=30, height=10),
            page_number=1, line_num=10, word_num=1
        )
        word2 = OCRWord(
            text="No.", confidence=0.8,
            bbox=BoundingBox(x=130, y=200, width=20, height=10),
            page_number=1, line_num=10, word_num=2
        )
        row = OCRRow(line_num=10, page_number=1, words=[word1, word2])

        assert row.text == "Plot No."
        assert row.bbox.x == 100
        assert row.bbox.width == 50


class TestSemanticExtractor:
    """Test the semantic extractor with synthetic OCR data."""

    def _create_mock_ocr_result(self):
        return {
            "record_id": "LR-2026-000001",
            "document_id": "DOC-2026-000001",
            "ingestion_id": "ING-2026-000001",
            "status": "SUCCESS",
            "full_text": "Record of Rights (RoR)\nLand and Land Reforms Department\nPlot No. 45\nKhata No. 123\nArea: 2.5 Acre\nNature of Land: Agricultural\nMutation No. 1025\nDate of Mutation: 12-06-2018",
            "pages": [
                {
                    "page_number": 1,
                    "text": "Record of Rights (RoR)\nLand and Land Reforms Department\nPlot No. 45\nKhata No. 123",
                    "words": [
                        {"text": "Record", "confidence": 0.9, "bbox": {"x": 100, "y": 80, "width": 50, "height": 15}, "page_number": 1, "line_num": 1, "word_num": 1},
                        {"text": "of", "confidence": 0.9, "bbox": {"x": 150, "y": 80, "width": 20, "height": 15}, "page_number": 1, "line_num": 1, "word_num": 2},
                        {"text": "Rights", "confidence": 0.9, "bbox": {"x": 170, "y": 80, "width": 40, "height": 15}, "page_number": 1, "line_num": 1, "word_num": 3},
                        {"text": "(RoR)", "confidence": 0.9, "bbox": {"x": 210, "y": 80, "width": 30, "height": 15}, "page_number": 1, "line_num": 1, "word_num": 4},
                        {"text": "Land", "confidence": 0.9, "bbox": {"x": 100, "y": 110, "width": 30, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 1},
                        {"text": "and", "confidence": 0.9, "bbox": {"x": 130, "y": 110, "width": 20, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 2},
                        {"text": "Land", "confidence": 0.9, "bbox": {"x": 150, "y": 110, "width": 30, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 3},
                        {"text": "Reforms", "confidence": 0.9, "bbox": {"x": 180, "y": 110, "width": 50, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 4},
                        {"text": "Department", "confidence": 0.9, "bbox": {"x": 230, "y": 110, "width": 70, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 5},
                        {"text": "Plot", "confidence": 0.8, "bbox": {"x": 100, "y": 170, "width": 30, "height": 15}, "page_number": 1, "line_num": 3, "word_num": 1},
                        {"text": "No.", "confidence": 0.8, "bbox": {"x": 130, "y": 170, "width": 20, "height": 15}, "page_number": 1, "line_num": 3, "word_num": 2},
                        {"text": "45", "confidence": 0.7, "bbox": {"x": 160, "y": 170, "width": 15, "height": 15}, "page_number": 1, "line_num": 3, "word_num": 3},
                        {"text": "Khata", "confidence": 0.8, "bbox": {"x": 100, "y": 200, "width": 35, "height": 15}, "page_number": 1, "line_num": 4, "word_num": 1},
                        {"text": "No.", "confidence": 0.8, "bbox": {"x": 135, "y": 200, "width": 20, "height": 15}, "page_number": 1, "line_num": 4, "word_num": 2},
                        {"text": "123", "confidence": 0.7, "bbox": {"x": 165, "y": 200, "width": 25, "height": 15}, "page_number": 1, "line_num": 4, "word_num": 3},
                        {"text": "Area:", "confidence": 0.8, "bbox": {"x": 100, "y": 230, "width": 30, "height": 15}, "page_number": 1, "line_num": 5, "word_num": 1},
                        {"text": "2.5", "confidence": 0.7, "bbox": {"x": 135, "y": 230, "width": 25, "height": 15}, "page_number": 1, "line_num": 5, "word_num": 2},
                        {"text": "Acre", "confidence": 0.8, "bbox": {"x": 165, "y": 230, "width": 30, "height": 15}, "page_number": 1, "line_num": 5, "word_num": 3},
                        {"text": "Nature", "confidence": 0.8, "bbox": {"x": 100, "y": 260, "width": 45, "height": 15}, "page_number": 1, "line_num": 6, "word_num": 1},
                        {"text": "of", "confidence": 0.8, "bbox": {"x": 145, "y": 260, "width": 15, "height": 15}, "page_number": 1, "line_num": 6, "word_num": 2},
                        {"text": "Land:", "confidence": 0.8, "bbox": {"x": 160, "y": 260, "width": 30, "height": 15}, "page_number": 1, "line_num": 6, "word_num": 3},
                        {"text": "Agricultural", "confidence": 0.7, "bbox": {"x": 195, "y": 260, "width": 70, "height": 15}, "page_number": 1, "line_num": 6, "word_num": 4},
                        {"text": "Mutation", "confidence": 0.8, "bbox": {"x": 100, "y": 410, "width": 60, "height": 15}, "page_number": 1, "line_num": 7, "word_num": 1},
                        {"text": "No.", "confidence": 0.8, "bbox": {"x": 160, "y": 410, "width": 20, "height": 15}, "page_number": 1, "line_num": 7, "word_num": 2},
                        {"text": "1025", "confidence": 0.7, "bbox": {"x": 185, "y": 410, "width": 30, "height": 15}, "page_number": 1, "line_num": 7, "word_num": 3},
                        {"text": "Date", "confidence": 0.8, "bbox": {"x": 100, "y": 440, "width": 30, "height": 15}, "page_number": 1, "line_num": 8, "word_num": 1},
                        {"text": "of", "confidence": 0.8, "bbox": {"x": 130, "y": 440, "width": 15, "height": 15}, "page_number": 1, "line_num": 8, "word_num": 2},
                        {"text": "Mutation:", "confidence": 0.8, "bbox": {"x": 145, "y": 440, "width": 55, "height": 15}, "page_number": 1, "line_num": 8, "word_num": 3},
                        {"text": "12-06-2018", "confidence": 0.7, "bbox": {"x": 205, "y": 440, "width": 70, "height": 15}, "page_number": 1, "line_num": 8, "word_num": 4},
                    ],
                    "lines": [],
                }
            ],
        }

    def test_semantic_extractor_builds_rows(self):
        ocr_result = self._create_mock_ocr_result()
        extractor = SemanticExtractor(ocr_result)

        assert len(extractor.words) > 0
        assert len(extractor.rows) > 0

        row = extractor.rows[0]
        assert row.page_number == 1
        assert len(row.words) >= 1

    def test_semantic_extractor_finds_label(self):
        ocr_result = self._create_mock_ocr_result()
        extractor = SemanticExtractor(ocr_result)

        positions = extractor.find_label_positions("land.plot_number", LABEL_ALIASES.get("land.plot_number", []))

        assert len(positions) > 0

    def test_land_record_extractor_extracts_plot_number(self):
        ocr_result = self._create_mock_ocr_result()
        extractor = LandRecordExtractor(ocr_result)
        record, metadata = extractor.extract(ocr_result)

        assert record is not None
        assert record.record_id == "LR-2026-000001"

    def test_land_record_extractor_extracts_mutation_number(self):
        ocr_result = self._create_mock_ocr_result()
        extractor = LandRecordExtractor(ocr_result)
        record, metadata = extractor.extract(ocr_result)

        assert metadata.get("mutation.mutation_number") is not None


class TestSemanticExtractionService:
    """Test the main extraction service."""

    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.storage_dir = Path(self.temp_dir) / "phase_07"

    def teardown_method(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_mock_classification(self, document_type="RECORD_OF_RIGHTS", confidence=0.85):
        return {
            "record_id": "LR-2026-000001",
            "document_id": "DOC-2026-000001",
            "ingestion_id": "ING-2026-000001",
            "predicted_document_type": document_type,
            "confidence": confidence,
            "classification_status": "HIGH_CONFIDENCE",
        }

    def _create_mock_ocr_result(self):
        return {
            "record_id": "LR-2026-000001",
            "document_id": "DOC-2026-000001",
            "ingestion_id": "ING-2026-000001",
            "status": "SUCCESS",
            "full_text": "Record of Rights (RoR)\nLand and Land Reforms Department\nPlot No. 45\nKhata No. 123\nArea: 2.5 Acre\nNature of Land: Agricultural\nMutation No. 1025\nDate of Mutation: 12-06-2018",
            "pages": [
                {
                    "page_number": 1,
                    "text": "Record of Rights (RoR)\nLand and Land Reforms Department\nPlot No. 45\nKhata No. 123\nArea: 2.5 Acre\nNature of Land: Agricultural\nMutation No. 1025\nDate of Mutation: 12-06-2018",
                    "words": [
                        {"text": "Record", "confidence": 0.9, "bbox": {"x": 100, "y": 80, "width": 50, "height": 15}, "page_number": 1, "line_num": 1, "word_num": 1},
                        {"text": "of", "confidence": 0.9, "bbox": {"x": 150, "y": 80, "width": 20, "height": 15}, "page_number": 1, "line_num": 1, "word_num": 2},
                        {"text": "Rights", "confidence": 0.9, "bbox": {"x": 170, "y": 80, "width": 40, "height": 15}, "page_number": 1, "line_num": 1, "word_num": 3},
                        {"text": "(RoR)", "confidence": 0.9, "bbox": {"x": 210, "y": 80, "width": 30, "height": 15}, "page_number": 1, "line_num": 1, "word_num": 4},
                        {"text": "Land", "confidence": 0.9, "bbox": {"x": 100, "y": 110, "width": 30, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 1},
                        {"text": "and", "confidence": 0.9, "bbox": {"x": 130, "y": 110, "width": 20, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 2},
                        {"text": "Land", "confidence": 0.9, "bbox": {"x": 150, "y": 110, "width": 30, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 3},
                        {"text": "Reforms", "confidence": 0.9, "bbox": {"x": 180, "y": 110, "width": 50, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 4},
                        {"text": "Department", "confidence": 0.9, "bbox": {"x": 230, "y": 110, "width": 70, "height": 15}, "page_number": 1, "line_num": 2, "word_num": 5},
                        {"text": "Plot", "confidence": 0.8, "bbox": {"x": 100, "y": 170, "width": 30, "height": 15}, "page_number": 1, "line_num": 3, "word_num": 1},
                        {"text": "No.", "confidence": 0.8, "bbox": {"x": 130, "y": 170, "width": 20, "height": 15}, "page_number": 1, "line_num": 3, "word_num": 2},
                        {"text": "45", "confidence": 0.7, "bbox": {"x": 160, "y": 170, "width": 15, "height": 15}, "page_number": 1, "line_num": 3, "word_num": 3},
                        {"text": "Khata", "confidence": 0.8, "bbox": {"x": 100, "y": 200, "width": 35, "height": 15}, "page_number": 1, "line_num": 4, "word_num": 1},
                        {"text": "No.", "confidence": 0.8, "bbox": {"x": 135, "y": 200, "width": 20, "height": 15}, "page_number": 1, "line_num": 4, "word_num": 2},
                        {"text": "123", "confidence": 0.7, "bbox": {"x": 165, "y": 200, "width": 25, "height": 15}, "page_number": 1, "line_num": 4, "word_num": 3},
                        {"text": "Area:", "confidence": 0.8, "bbox": {"x": 100, "y": 230, "width": 30, "height": 15}, "page_number": 1, "line_num": 5, "word_num": 1},
                        {"text": "2.5", "confidence": 0.7, "bbox": {"x": 135, "y": 230, "width": 25, "height": 15}, "page_number": 1, "line_num": 5, "word_num": 2},
                        {"text": "Acre", "confidence": 0.8, "bbox": {"x": 165, "y": 230, "width": 30, "height": 15}, "page_number": 1, "line_num": 5, "word_num": 3},
                        {"text": "Nature", "confidence": 0.8, "bbox": {"x": 100, "y": 260, "width": 45, "height": 15}, "page_number": 1, "line_num": 6, "word_num": 1},
                        {"text": "of", "confidence": 0.8, "bbox": {"x": 145, "y": 260, "width": 15, "height": 15}, "page_number": 1, "line_num": 6, "word_num": 2},
                        {"text": "Land:", "confidence": 0.8, "bbox": {"x": 160, "y": 260, "width": 30, "height": 15}, "page_number": 1, "line_num": 6, "word_num": 3},
                        {"text": "Agricultural", "confidence": 0.7, "bbox": {"x": 195, "y": 260, "width": 70, "height": 15}, "page_number": 1, "line_num": 6, "word_num": 4},
                        {"text": "Mutation", "confidence": 0.8, "bbox": {"x": 100, "y": 410, "width": 60, "height": 15}, "page_number": 1, "line_num": 7, "word_num": 1},
                        {"text": "No.", "confidence": 0.8, "bbox": {"x": 160, "y": 410, "width": 20, "height": 15}, "page_number": 1, "line_num": 7, "word_num": 2},
                        {"text": "1025", "confidence": 0.7, "bbox": {"x": 185, "y": 410, "width": 30, "height": 15}, "page_number": 1, "line_num": 7, "word_num": 3},
                        {"text": "Date", "confidence": 0.8, "bbox": {"x": 100, "y": 440, "width": 30, "height": 15}, "page_number": 1, "line_num": 8, "word_num": 1},
                        {"text": "of", "confidence": 0.8, "bbox": {"x": 130, "y": 440, "width": 15, "height": 15}, "page_number": 1, "line_num": 8, "word_num": 2},
                        {"text": "Mutation:", "confidence": 0.8, "bbox": {"x": 145, "y": 440, "width": 55, "height": 15}, "page_number": 1, "line_num": 8, "word_num": 3},
                        {"text": "12-06-2018", "confidence": 0.7, "bbox": {"x": 205, "y": 440, "width": 70, "height": 15}, "page_number": 1, "line_num": 8, "word_num": 4},
                    ],
                    "lines": [],
                }
            ],
        }

    def test_service_returns_failed_for_missing_classification(self):
        service = SemanticExtractionService(storage_dir=self.storage_dir)

        with patch.object(service, 'get_classification_result', return_value=None):
            result = service.extract_fields(
                record_id="LR-2026-000001",
                document_id="DOC-2026-000001",
                ingestion_id="ING-2026-000001",
            )

        assert result.status == ExtractionStatus.FAILED
        assert result.error_code == "CLASSIFICATION_NOT_FOUND"

    def test_service_returns_failed_for_missing_ocr_result(self):
        service = SemanticExtractionService(storage_dir=self.storage_dir)
        mock_classification = self._create_mock_classification()

        with patch.object(service, 'get_classification_result', return_value=mock_classification):
            with patch.object(service, 'get_ocr_result', return_value=None):
                result = service.extract_fields(
                    record_id="LR-2026-000001",
                    document_id="DOC-2026-000001",
                    ingestion_id="ING-2026-000001",
                )

        assert result.status == ExtractionStatus.FAILED
        assert result.error_code == "OCR_RESULT_NOT_FOUND"

    def test_service_extracts_fields_with_valid_input(self):
        service = SemanticExtractionService(storage_dir=self.storage_dir)
        mock_classification = self._create_mock_classification()
        mock_ocr = self._create_mock_ocr_result()

        with patch.object(service, 'get_classification_result', return_value=mock_classification):
            with patch.object(service, 'get_ocr_result', return_value=mock_ocr):
                result = service.extract_fields(
                    record_id="LR-2026-000001",
                    document_id="DOC-2026-000001",
                    ingestion_id="ING-2026-000001",
                )

        assert result.record_id == "LR-2026-000001"
        assert result.document_id == "DOC-2026-000001"
        assert result.ingestion_id == "ING-2026-000001"
        assert result.document_type == "RECORD_OF_RIGHTS"
        assert result.classification_confidence == 0.85
        assert result.extracted_record is not None

    def test_service_preserves_record_document_ingestion_ids(self):
        service = SemanticExtractionService(storage_dir=self.storage_dir)
        mock_classification = self._create_mock_classification()
        mock_ocr = self._create_mock_ocr_result()

        with patch.object(service, 'get_classification_result', return_value=mock_classification):
            with patch.object(service, 'get_ocr_result', return_value=mock_ocr):
                result = service.extract_fields(
                    record_id="LR-2026-000001",
                    document_id="DOC-2026-000001",
                    ingestion_id="ING-2026-000001",
                )

        assert result.extracted_record is not None
        assert result.extracted_record.record_id == "LR-2026-000001"
        assert result.extracted_record.document_id == "DOC-2026-000001"
        assert result.extracted_record.ingestion_id == "ING-2026-000001"

    def test_service_completeness_tracking(self):
        service = SemanticExtractionService(storage_dir=self.storage_dir)
        mock_classification = self._create_mock_classification()
        mock_ocr = self._create_mock_ocr_result()

        with patch.object(service, 'get_classification_result', return_value=mock_classification):
            with patch.object(service, 'get_ocr_result', return_value=mock_ocr):
                result = service.extract_fields(
                    record_id="LR-2026-000001",
                    document_id="DOC-2026-000001",
                    ingestion_id="ING-2026-000001",
                )

        assert result.fields_expected > 0
        assert result.fields_extracted >= 0
        assert result.fields_missing >= 0
        result_dict = result.to_dict()
        assert "completeness" in result_dict
        assert result_dict["completeness"]["fields_expected"] > 0

    def test_service_next_phase_is_phase_08(self):
        service = SemanticExtractionService(storage_dir=self.storage_dir)
        mock_classification = self._create_mock_classification()
        mock_ocr = self._create_mock_ocr_result()

        with patch.object(service, 'get_classification_result', return_value=mock_classification):
            with patch.object(service, 'get_ocr_result', return_value=mock_ocr):
                result = service.extract_fields(
                    record_id="LR-2026-000001",
                    document_id="DOC-2026-000001",
                    ingestion_id="ING-2026-000001",
                )

        assert result.next_phase == "PHASE_08_CONFIDENCE_COMPLETENESS"

    def test_service_saves_extraction_result(self):
        service = SemanticExtractionService(storage_dir=self.storage_dir)
        mock_classification = self._create_mock_classification()
        mock_ocr = self._create_mock_ocr_result()

        with patch.object(service, 'get_classification_result', return_value=mock_classification):
            with patch.object(service, 'get_ocr_result', return_value=mock_ocr):
                result = service.extract_fields(
                    record_id="LR-2026-000001",
                    document_id="DOC-2026-000001",
                    ingestion_id="ING-2026-000001",
                )

        record_file = self.storage_dir / "LR-2026-000001" / "DOC-2026-000001_extracted_record.json"
        metadata_file = self.storage_dir / "LR-2026-000001" / "DOC-2026-000001_extraction_metadata.json"

        assert record_file.exists()
        assert metadata_file.exists()


class TestIntegrationScenarios:
    """Integration test scenarios for Phase 07."""

    def test_same_ids_flow_through_extraction(self):
        """Test that record_id, document_id, ingestion_id flow through unchanged."""
        temp_dir = tempfile.mkdtemp()
        storage_dir = Path(temp_dir) / "phase_07"
        service = SemanticExtractionService(storage_dir=storage_dir)

        mock_classification = {
            "record_id": "LR-2026-TEST01",
            "document_id": "DOC-2026-TEST01",
            "ingestion_id": "ING-2026-TEST01",
            "predicted_document_type": "RECORD_OF_RIGHTS",
            "confidence": 0.85,
        }

        mock_ocr = {
            "record_id": "LR-2026-TEST01",
            "document_id": "DOC-2026-TEST01",
            "ingestion_id": "ING-2026-TEST01",
            "status": "SUCCESS",
            "full_text": "Test",
            "pages": [{"page_number": 1, "text": "Test", "words": [], "lines": []}],
        }

        with patch.object(service, 'get_classification_result', return_value=mock_classification):
            with patch.object(service, 'get_ocr_result', return_value=mock_ocr):
                result = service.extract_fields(
                    record_id="LR-2026-TEST01",
                    document_id="DOC-2026-TEST01",
                    ingestion_id="ING-2026-TEST01",
                )

        assert result.record_id == "LR-2026-TEST01"
        assert result.document_id == "DOC-2026-TEST01"
        assert result.ingestion_id == "ING-2026-TEST01"
        assert result.extracted_record is not None
        assert result.extracted_record.record_id == "LR-2026-TEST01"
        assert result.extracted_record.document_id == "DOC-2026-TEST01"
        assert result.extracted_record.ingestion_id == "ING-2026-TEST01"

        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
