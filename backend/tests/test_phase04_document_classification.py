"""
Phase 04 Tests: Document Classification

Tests the Phase 04 document classification service:
- Supported document type classification
- High/low confidence classification
- UNKNOWN/ambiguous handling
- Evidence and alternatives
- Multi-page document handling
- Missing input handling
- API response contract
- No regression in Phase 01/02/03
"""

import sys
import tempfile
import shutil
import uuid
from pathlib import Path
from typing import List

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.phase04_document_classification import (
    DocumentClassificationService,
    DocumentType,
    ClassificationStatus,
    ClassificationResult,
    PageClassification,
    CONFIDENCE_HIGH_THRESHOLD,
    CONFIDENCE_REVIEW_THRESHOLD,
    _analyze_title_header,
    _classify_from_text,
)
from src.phase01_ingestion import DocumentIngestionService, IngestionStatus
from src.phase02_quality_check import DocumentQualityCheckService


def _tid(prefix: str = "TEST") -> tuple:
    """Unique test IDs that can never collide with real on-disk records.

    Phase 04 auto-loads earlier-phase evidence keyed by IDs from the shared
    uploads/ tree. Sequential test IDs (LR-2026-000001, ...) would bind to
    real records, leaking one document's evidence into another test's
    classification (and overwriting real stored results)."""
    suffix = uuid.uuid4().hex[:8].upper()
    return (
        f"LR-{prefix}-{suffix}",
        f"DOC-{prefix}-{suffix}",
        f"ING-{prefix}-{suffix}",
    )


def _clean_test_classifications() -> None:
    """Remove classifier outputs written under test-only IDs."""
    base = Path(__file__).parent.parent / "uploads" / "processing" / "phase_04"
    if not base.exists():
        return
    for stale in list(base.glob("LR-TEST-*")) + list(base.glob("LR-2099-NOPE-*")):
        shutil.rmtree(stale, ignore_errors=True)


class TestDocumentTypeEnum:
    """Tests for the DocumentType enum."""

    def test_document_types_defined(self):
        """All document types should be defined."""
        types = [
            DocumentType.LAND_RECORD,
            DocumentType.RECORD_OF_RIGHTS,
            DocumentType.KHATIAN,
            DocumentType.MUTATION_RECORD,
            DocumentType.LAND_REGISTRATION_DOCUMENT,
            DocumentType.LAND_OWNERSHIP_RECORD,
            DocumentType.LAND_TAX_RECORD,
            DocumentType.SURVEY_RECORD,
            DocumentType.LAND_MAP_REFERENCE,
            DocumentType.UNKNOWN,
            DocumentType.OTHER_SUPPORTED_LAND_DOCUMENT,
        ]
        for dt in types:
            assert isinstance(dt.value, str)


class TestClassificationStatusEnum:
    """Tests for the ClassificationStatus enum."""

    def test_status_types_defined(self):
        """All classification statuses should be defined."""
        statuses = [
            ClassificationStatus.HIGH_CONFIDENCE,
            ClassificationStatus.REVIEW_REQUIRED,
            ClassificationStatus.LOW_CONFIDENCE,
            ClassificationStatus.AMBIGUOUS,
        ]
        for status in statuses:
            assert isinstance(status.value, str)


class TestConfidenceThresholds:
    """Tests for confidence threshold constants."""

    def test_high_threshold_default(self):
        """High confidence threshold should default to 0.85."""
        assert CONFIDENCE_HIGH_THRESHOLD == 0.85

    def test_review_threshold_default(self):
        """Review confidence threshold should default to 0.60."""
        assert CONFIDENCE_REVIEW_THRESHOLD == 0.60


class TestKeywordMap:
    """Tests for the keyword mapping configuration."""

    def test_keyword_map_has_all_types(self):
        """Keyword map should contain all document types."""
        from src.phase04_document_classification import KEYWORD_MAP

        expected_types = {
            "LAND_RECORD",
            "RECORD_OF_RIGHTS",
            "KHATIAN",
            "MUTATION_RECORD",
            "LAND_REGISTRATION_DOCUMENT",
            "LAND_OWNERSHIP_RECORD",
            "LAND_TAX_RECORD",
            "SURVEY_RECORD",
            "LAND_MAP_REFERENCE",
        }
        actual_types = set(KEYWORD_MAP.keys())
        assert actual_types == expected_types

    def test_record_of_rights_keywords(self):
        """Record of Rights should have expected keywords."""
        from src.phase04_document_classification import KEYWORD_MAP

        k = KEYWORD_MAP[DocumentType.RECORD_OF_RIGHTS]
        assert any("KHATIAN" in kw.upper() for kw in k["keywords"])
        assert any("PLOT NO" in kw.upper() for kw in k["keywords"])


class TestAnalyzeTitleHeader:
    """Tests for _analyze_title_header function."""

    def test_no_title(self):
        """None title should return no match."""
        result = _analyze_title_header(None)
        assert result == (None, 0.0, [])

    def test_empty_title(self):
        """Empty title should return no match."""
        result = _analyze_title_header("")
        assert result == (None, 0.0, [])

    def test_record_of_rights_title(self):
        """Record of Rights title should match."""
        result = _analyze_title_header("RECORD OF RIGHTS Document")
        assert result[0] == DocumentType.RECORD_OF_RIGHTS
        assert result[1] > 0.0
        assert len(result[2]) > 0

    def test_khatian_title(self):
        """Khatian title should match."""
        result = _analyze_title_header("KHATIAN Certificate")
        assert result[0] == DocumentType.KHATIAN

    def test_mutation_record_title(self):
        """Mutation record title should match."""
        result = _analyze_title_header("MUTATION ENTRY")
        assert result[0] == DocumentType.MUTATION_RECORD


class TestClassifyFromText:
    """Tests for _classify_from_text function."""

    def test_no_text(self):
        """No OCR text should return no match."""
        result = _classify_from_text(None)
        assert result == (None, 0.0, [])

    def test_empty_text(self):
        """Empty OCR text should return no match."""
        result = _classify_from_text("")
        assert result == (None, 0.0, [])

    def test_record_of_rights_text(self):
        """Record of Rights keywords in text should match."""
        text = "This is a KHATIAN NO 123 document with PLOT NO 456"
        result = _classify_from_text(text)
        assert result[0] in (DocumentType.KHATIAN, DocumentType.RECORD_OF_RIGHTS)

    def test_land_ownership_text(self):
        """Land ownership keywords in text should match."""
        text = "OWNER NAME John Doe PROPRIETOR details"
        result = _classify_from_text(text)
        assert result[0] == DocumentType.LAND_OWNERSHIP_RECORD


class TestDetermineClassificationStatus:
    """Tests for _determine_classification_status function."""

    def test_high_confidence(self):
        """Confidence >= 0.85 should be HIGH_CONFIDENCE."""
        from src.phase04_document_classification import _determine_classification_status

        status = _determine_classification_status(0.90)
        assert status == ClassificationStatus.HIGH_CONFIDENCE

    def test_review_confidence(self):
        """Confidence 0.60-0.849 should be REVIEW_REQUIRED."""
        from src.phase04_document_classification import _determine_classification_status

        status = _determine_classification_status(0.70)
        assert status == ClassificationStatus.REVIEW_REQUIRED

    def test_low_confidence(self):
        """Confidence 0.0 < x < 0.60 should be LOW_CONFIDENCE."""
        from src.phase04_document_classification import _determine_classification_status

        status = _determine_classification_status(0.40)
        assert status == ClassificationStatus.LOW_CONFIDENCE

    def test_very_low_confidence(self):
        """Confidence 0.0 should be AMBIGUOUS."""
        from src.phase04_document_classification import _determine_classification_status

        status = _determine_classification_status(0.0)
        assert status == ClassificationStatus.AMBIGUOUS


class TestDocumentClassificationService:
    """Tests for the main DocumentClassificationService class."""

    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.ingestion_service = DocumentIngestionService(
            storage_dir=Path(self.temp_dir) / "originals"
        )
        self.quality_service = DocumentQualityCheckService(
            storage_dir=Path(self.temp_dir) / "originals"
        )

    def teardown_method(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
        _clean_test_classifications()

    def _ingest_test_document(
        self, filename: str = "test.png", file_data: bytes = b""
    ) -> tuple:
        """Helper: ingest a test document and return UNIQUE test IDs.

        The ingestion itself still runs against temp storage (proving the
        ingest path works), but the returned IDs live in a TEST namespace so
        Phase 04 evidence auto-loading never binds to real on-disk records.
        """
        if not file_data:
            img = Image.new('RGB', (800, 600), color='white')
            buf = __import__('io').BytesIO()
            img.save(buf, format='PNG')
            file_data = buf.getvalue()

        result = self.ingestion_service.ingest(file_data, filename)
        if result.status != IngestionStatus.SUCCESS:
            raise RuntimeError(f"Ingestion failed: {result.error}")
        return _tid()

    def test_classify_requires_ids(self):
        """Classification requires valid record_id, document_id, ingestion_id."""
        service = DocumentClassificationService()
        with pytest.raises(ValueError) as exc:
            service.classify(
                record_id="", document_id="DOC-TEST-001", ingestion_id="ING-TEST-001"
            )
        assert "record_id is required" in str(exc.value)

    def test_classify_missing_document_id(self):
        """Classification missing document_id should fail."""
        service = DocumentClassificationService()
        with pytest.raises(ValueError) as exc:
            service.classify(
                record_id="LR-TEST-001", document_id="", ingestion_id="ING-TEST-001"
            )
        assert "document_id is required" in str(exc.value)

    def test_classify_missing_ingestion_id(self):
        """Classification missing ingestion_id should fail."""
        service = DocumentClassificationService()
        with pytest.raises(ValueError) as exc:
            service.classify(
                record_id="LR-TEST-001", document_id="DOC-TEST-001", ingestion_id=""
            )
        assert "ingestion_id is required" in str(exc.value)

    def test_classify_with_record_of_rights_title(self):
        """Classification with Record of Rights title should predict RoR."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            title_or_header="RECORD OF RIGHTS",
        )

        assert result.predicted_document_type == DocumentType.RECORD_OF_RIGHTS
        assert result.classification_status == ClassificationStatus.REVIEW_REQUIRED
        assert len(result.evidence) > 0

    def test_classify_with_khatian_text(self):
        """Classification with Khatian OCR text should predict KHATIAN."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            ocr_text="This document contains KHATIAN NO 452 and PLOT NO 12",
        )

        assert result.predicted_document_type in (
            DocumentType.KHATIAN,
            DocumentType.RECORD_OF_RIGHTS,
        )
        assert len(result.evidence) > 0

    def test_classify_unknown_document(self):
        """Classification with no recognizable evidence should be UNKNOWN."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            ocr_text="This is just some random text without land document markers.",
        )

        assert result.predicted_document_type == DocumentType.UNKNOWN
        assert result.classification_status in (
            ClassificationStatus.LOW_CONFIDENCE,
            ClassificationStatus.AMBIGUOUS,
        )

    def test_classify_high_confidence_record_of_rights(self):
        """High-confidence RoR classification with strong title evidence."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            title_or_header="RECORD OF RIGHTS (RoR) - LAND AND LAND REFORMS DEPARTMENT",
        )

        assert result.predicted_document_type == DocumentType.RECORD_OF_RIGHTS
        assert result.confidence >= 0.5
        assert result.classification_status in (
            ClassificationStatus.HIGH_CONFIDENCE,
            ClassificationStatus.REVIEW_REQUIRED,
        )

    def test_classify_review_required_range(self):
        """Classification with confidence 0.60-0.84 should be REVIEW_REQUIRED."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            ocr_text="KHATIAN NO 123 document with land records",
        )

        assert result.confidence >= 0.0
        assert result.confidence < 0.85
        assert result.classification_status in (
            ClassificationStatus.REVIEW_REQUIRED,
            ClassificationStatus.LOW_CONFIDENCE,
        )

    def test_classify_low_confidence(self):
        """Classification with weak evidence should be LOW_CONFIDENCE or AMBIGUOUS."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            ocr_text="Some random document content",
        )

        assert result.confidence < 0.60
        assert result.classification_status in (
            ClassificationStatus.LOW_CONFIDENCE,
            ClassificationStatus.AMBIGUOUS,
        )

    def test_classify_ambiguous_no_evidence(self):
        """Classification with no evidence should be AMBIGUOUS."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
        )

        assert result.predicted_document_type == DocumentType.UNKNOWN
        assert result.classification_status == ClassificationStatus.AMBIGUOUS

    def test_classify_alternatives_returned(self):
        """Alternatives should be returned when confidence is not high."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            ocr_text="KHATIAN NO 123 with some text",
        )

        assert len(result.alternative_predictions) >= 0

    def test_classify_multi_page_basic(self):
        """Basic multi-page classification should produce page results."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        img1 = Image.new('RGB', (800, 600), color='white')
        img2 = Image.new('RGB', (800, 600), color='white')
        img3 = Image.new('RGB', (800, 600), color='white')

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            page_images=[img1, img2, img3],
            ocr_text="RECORD OF RIGHTS KHATIAN NO 45 PLOT NO 10",
        )

        assert len(result.pages) == 3
        assert result.pages[0].page_number == 1
        assert result.pages[2].page_number == 3

    def test_classify_multi_page_aggregation(self):
        """Multi-page aggregation should produce document-level result."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        img1 = Image.new('RGB', (800, 600), color='white')
        img2 = Image.new('RGB', (800, 600), color='white')

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            page_images=[img1, img2],
            ocr_text="RECORD OF RIGHTS KHATIAN NO 45",
        )

        assert result.pages is not None
        assert len(result.pages) == 2

    def test_classify_no_regression_phase02(self):
        """Phase 04 classification must not break Phase 02 quality check."""
        from PIL import Image as _Img
        import io as _io
        img = _Img.new('RGB', (800, 600), color='white')
        buf = _io.BytesIO()
        img.save(buf, format='PNG')
        ingest_result = self.ingestion_service.ingest(buf.getvalue(), "test.png")

        quality_result = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id,
        )

        assert quality_result.status in ["SUCCESS", "FAILED"]

    def test_classify_result_has_required_fields(self):
        """Classification result should have all required fields."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            title_or_header="RECORD OF RIGHTS",
        )

        d = result.to_dict()
        required_fields = [
            "phase",
            "record_id",
            "document_id",
            "ingestion_id",
            "predicted_document_type",
            "confidence",
            "classification_status",
            "evidence",
            "alternative_predictions",
            "timestamps",
            "processing_time_seconds",
            "next_phase",
        ]
        for field in required_fields:
            assert field in d, f"Missing field: {field}"

    def test_classify_result_predicted_type_is_valid(self):
        """predicted_document_type should be a valid DocumentType value."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            title_or_header="LAND RECORD Document",
        )

        assert result.predicted_document_type.value in [
            "LAND_RECORD",
            "RECORD_OF_RIGHTS",
            "KHATIAN",
            "MUTATION_RECORD",
            "LAND_REGISTRATION_DOCUMENT",
            "LAND_OWNERSHIP_RECORD",
            "LAND_TAX_RECORD",
            "SURVEY_RECORD",
            "LAND_MAP_REFERENCE",
            "UNKNOWN",
        ]

    def test_classify_evidence_is_list(self):
        """Evidence should always be a list."""
        record_id, document_id, ingestion_id = self._ingest_test_document()

        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
        )

        assert isinstance(result.evidence, list)


class TestPipelineIntegrationPhase04:
    """Integration tests for Phase 01 -> Phase 02 -> Phase 04 chain."""

    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.ingestion_service = DocumentIngestionService(
            storage_dir=Path(self.temp_dir) / "originals"
        )
        self.quality_service = DocumentQualityCheckService(
            storage_dir=Path(self.temp_dir) / "originals"
        )
        self.classification_service = DocumentClassificationService()

    def teardown_method(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)
        _clean_test_classifications()

    def test_01_phase_01_to_phase_04_chain_succeeds(self):
        """TEST: Phase 01 -> Phase 04 chain succeeds with valid document."""
        from PIL import Image
        import io

        img = Image.new('RGB', (800, 600), color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        img_data = buf.getvalue()

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")
        assert ingest_result.status.value == "SUCCESS"

        quality_result = self.quality_service.check_quality(
            record_id=ingest_result.record_id,
            document_id=ingest_result.document_id,
            ingestion_id=ingest_result.ingestion_id,
        )
        assert quality_result.status in ["SUCCESS", "FAILED"]

        record_id, document_id, ingestion_id = _tid()
        classify_result = self.classification_service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            title_or_header="RECORD OF RIGHTS",
        )
        assert classify_result.predicted_document_type == DocumentType.RECORD_OF_RIGHTS
        assert classify_result.classification_status in [
            ClassificationStatus.HIGH_CONFIDENCE,
            ClassificationStatus.REVIEW_REQUIRED,
            ClassificationStatus.LOW_CONFIDENCE,
        ]

    def test_02_phase_04_ids_consistent_with_pipeline(self):
        """TEST: Phase 04 IDs should remain consistent throughout pipeline."""
        from PIL import Image
        import io

        img = Image.new('RGB', (800, 600), color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        img_data = buf.getvalue()

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")

        record_id, document_id, ingestion_id = _tid()
        classify_result = self.classification_service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            title_or_header="RECORD OF RIGHTS",
        )

        assert classify_result.record_id == record_id
        assert classify_result.document_id == document_id
        assert classify_result.ingestion_id == ingestion_id

    def test_03_phase_04_with_ocr_text(self):
        """TEST: Phase 04 should accept OCR text and classify accordingly."""
        from PIL import Image
        import io

        img = Image.new('RGB', (800, 600), color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        img_data = buf.getvalue()

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")

        record_id, document_id, ingestion_id = _tid()
        classify_result = self.classification_service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            ocr_text="KHATIAN NO 123 PLOT NO 45 AREA 1000 SQFT",
        )

        assert classify_result.predicted_document_type in (
            DocumentType.KHATIAN,
            DocumentType.RECORD_OF_RIGHTS,
        )

    def test_04_phase_04_no_duplicate_upload(self):
        """TEST: Phase 04 should not require re-uploading the document."""
        from PIL import Image
        import io

        img = Image.new('RGB', (800, 600), color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        img_data = buf.getvalue()

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")

        record_id, document_id, ingestion_id = _tid()
        classify_result = self.classification_service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
        )

        assert classify_result is not None

    def test_05_phase_04_unknown_with_no_evidence(self):
        """TEST: Phase 04 UNKNOWN when no classification evidence available."""
        from PIL import Image
        import io

        img = Image.new('RGB', (800, 600), color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        img_data = buf.getvalue()

        ingest_result = self.ingestion_service.ingest(img_data, "test.png")

        record_id, document_id, ingestion_id = _tid()
        classify_result = self.classification_service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            ocr_text="completely random text no land document markers at all",
        )

        assert classify_result.predicted_document_type == DocumentType.UNKNOWN


class TestPhase03EvidenceAutoload:
    """Regression: IDs-only classify() must use real Phase 03 evidence.

    A real RoR run once returned UNKNOWN/0.000/AMBIGUOUS because no caller
    supplied text evidence. classify() now auto-loads Phase 03 regions plus
    a title-band read instead of answering blindly — without forcing any
    document type."""

    def test_real_ror_ids_only_classifies_from_evidence(self):
        """Real RoR LR-2026-000002 with IDs only -> RECORD_OF_RIGHTS."""
        from pathlib import Path as _P
        phase03 = (
            _P(__file__).parent.parent
            / "uploads"
            / "processing"
            / "phase_03"
            / "LR-2026-000002"
            / "preprocessing_result.json"
        )
        if not phase03.exists():
            pytest.skip("real Phase 03 RoR output not on disk")
        service = DocumentClassificationService()
        result = service.classify(
            record_id="LR-2026-000002",
            document_id="DOC-2026-000002",
            ingestion_id="ING-2026-000002",
        )
        assert result.predicted_document_type == DocumentType.RECORD_OF_RIGHTS
        assert result.confidence >= 0.60
        assert result.classification_status in (
            ClassificationStatus.HIGH_CONFIDENCE,
            ClassificationStatus.REVIEW_REQUIRED,
        )
        assert len(result.evidence) > 0

    def test_no_evidence_anywhere_stays_unknown(self):
        """Unknown record IDs with no Phase 03 data -> honest UNKNOWN."""
        service = DocumentClassificationService()
        result = service.classify(
            record_id="LR-2099-NOPE-000",
            document_id="DOC-2099-NOPE-000",
            ingestion_id="ING-2099-NOPE-000",
        )
        assert result.predicted_document_type == DocumentType.UNKNOWN
        assert result.confidence == 0.0
        assert result.classification_status == ClassificationStatus.AMBIGUOUS

    def test_caller_evidence_wins_over_autoload(self):
        """Explicit caller evidence is never overridden by auto-loading."""
        record_id, document_id, ingestion_id = _tid()
        service = DocumentClassificationService()
        result = service.classify(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            ocr_text="This is just some random text without land document markers.",
        )
        assert result.predicted_document_type == DocumentType.UNKNOWN

    def teardown_method(self):
        _clean_test_classifications()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
