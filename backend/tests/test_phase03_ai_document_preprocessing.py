"""
Phase 03 Tests: AI Document Preprocessing (decision-gated).

Decision architecture under test (thresholds live in
src.phase03_ai_document_preprocessing, never in filenames):
    REJECT   — critical failure OR document score < 45  -> no enhancement, no handoff
    MODERATE — 45 <= score < 65                         -> SELECTIVE_ENHANCEMENT + UPSCALE
    CLEAR    — score >= 65, no critical failure         -> UPSCALE_ONLY (no enhancement)

Real Phase 02 calibration (never faked in sample tests):
    enhanced ~69.06 -> CLEAR | medium ~57.76 -> MODERATE | low ~43.73 -> REJECT
"""

import hashlib
import io
import shutil
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
import pytest
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.preprocessing.ai_models import ALL_OPERATIONS, CLEAR_THRESHOLD, MODERATE_THRESHOLD, MAX_SCALE, TARGET_WIDTH, PageDecision, PreprocessingMode, PreprocessingResult, PreprocessingStatus, PageDimensions, PageMetrics, OperationResult, RejectionReason, SUPPORTED_EXTENSIONS
from app.ocr.preprocessing.ai_service import AIDocumentPreprocessingService
from app.ocr.preprocessing.metrics import ImageMetricsCalculator
from app.ocr.preprocessing.image_ops import ImageProcessor
from app.ocr.preprocessing.layout import LayoutAndRegionDetector
from app.ocr.preprocessing.restoration import LowQualityRestorationPipeline
from app.ocr.preprocessing.decision import PreprocessingDecisionEngine


SAMPLES_DIR = Path("uploads/samples")


def _moderate_qr(score=55.0, page_score=55.0, checks=None, quality=None):
    """Minimal Phase 02 to_dict-shaped payload for targeted threshold tests."""
    base_checks = {
        "readable": True, "blank": False, "resolution": "PASS", "blur": "PASS",
        "brightness": "PASS", "contrast": "PASS", "skew": "PASS", "cropping": "PASS",
    }
    if checks:
        base_checks.update(checks)
    base_quality = {
        "quality_score": page_score, "blur_score": 200.0,
        "brightness_score": 0.70, "contrast_score": 0.60,
        "skew_angle_degrees": 0.2, "content_ratio": 0.20,
        "sharpness_normalized": 0.70, "contrast_normalized": 0.60,
        "brightness_normalized": 0.70,
    }
    if quality:
        base_quality.update(quality)
    return {
        "quality": {"quality_score": score},
        "pages": [{
            "page_number": 1, "status": "PASS",
            "quality": base_quality, "checks": base_checks, "issues": [],
        }],
    }


class TestImageMetricsCalculator:
    """Tests for the ImageMetricsCalculator class."""

    def setup_method(self):
        self.calc = ImageMetricsCalculator()

    def _create_test_image(self, size=(800, 600), color='white') -> np.ndarray:
        if color == 'white':
            arr = np.ones((size[1], size[0], 3), dtype=np.uint8) * 255
        elif color == 'black':
            arr = np.zeros((size[1], size[0], 3), dtype=np.uint8)
        elif color == 'gray':
            arr = np.ones((size[1], size[0], 3), dtype=np.uint8) * 128
        else:
            arr = np.random.randint(0, 256, (size[1], size[0], 3), dtype=np.uint8)
        return arr

    def test_compute_blur_score_sharp_image(self):
        arr = self._create_test_image(color='random')
        assert self.calc.compute_blur_score(arr) >= 0

    def test_compute_brightness_score(self):
        assert (self.calc.compute_brightness_score(self._create_test_image(color='white'))
                > self.calc.compute_brightness_score(self._create_test_image(color='black')))

    def test_normalize_sharpness_bounds(self):
        for val in [0, 50, 100, 1000, 10000, 50000]:
            assert 0 <= self.calc.normalize_sharpness(val) <= 1

    def test_compute_all_metrics(self):
        metrics = self.calc.compute_all_metrics(Image.new('RGB', (800, 600), color=(128, 128, 128)))
        assert (metrics.width, metrics.height) == (800, 600)
        assert 0 <= metrics.sharpness_normalized <= 1
        assert 0 <= metrics.contrast_normalized <= 1
        assert 0 <= metrics.brightness_normalized <= 1


class TestDecisionThresholds:
    """Decision bands reference the single config section (no filename logic)."""

    def setup_method(self):
        self.engine = PreprocessingDecisionEngine(ImageMetricsCalculator())

    def test_threshold_constants(self):
        assert CLEAR_THRESHOLD == 65.0
        assert MODERATE_THRESHOLD == 45.0
        assert TARGET_WIDTH == 2200
        assert MAX_SCALE == 2.5

    def test_clear_band(self):
        decision, mode, reasons = self.engine.decide_quality_band(69.06, [])
        assert decision == PageDecision.CLEAR
        assert mode == PreprocessingMode.UPSCALE_ONLY
        assert reasons == []

    def test_clear_boundary(self):
        decision, _, _ = self.engine.decide_quality_band(65.0, [])
        assert decision == PageDecision.CLEAR
        decision, _, _ = self.engine.decide_quality_band(64.99, [])
        assert decision == PageDecision.MODERATE

    def test_moderate_band(self):
        decision, mode, reasons = self.engine.decide_quality_band(57.76, [])
        assert decision == PageDecision.MODERATE
        assert mode == PreprocessingMode.SELECTIVE_ENHANCEMENT
        assert reasons == []

    def test_reject_band(self):
        decision, mode, reasons = self.engine.decide_quality_band(43.73, [])
        assert decision == PageDecision.REJECT
        assert mode == PreprocessingMode.NONE
        assert reasons == [RejectionReason.QUALITY_SCORE_BELOW_THRESHOLD.value]

    def test_reject_boundary(self):
        decision, _, _ = self.engine.decide_quality_band(44.99, [])
        assert decision == PageDecision.REJECT
        decision, _, _ = self.engine.decide_quality_band(45.0, [])
        assert decision == PageDecision.MODERATE

    def test_critical_failure_rejects_despite_high_score(self):
        decision, mode, reasons = self.engine.decide_quality_band(
            90.0, [RejectionReason.BLANK_PAGE.value])
        assert decision == PageDecision.REJECT
        assert reasons == [RejectionReason.BLANK_PAGE.value]


class TestCriticalFailures:
    """Rejection reasons are deterministic and explainable."""

    def setup_method(self):
        self.engine = PreprocessingDecisionEngine(ImageMetricsCalculator())

    def _checks(self, **over):
        base = {"readable": True, "blank": False, "resolution": "PASS",
                "blur": "PASS", "brightness": "PASS", "contrast": "PASS",
                "skew": "PASS", "cropping": "PASS"}
        base.update(over)
        return base

    def test_blank_page(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(blank=True), [], 800, 600, 0.8, 0.9)
        assert RejectionReason.BLANK_PAGE.value in reasons

    def test_unreadable(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(readable=False), [], 800, 600, 0.8, 0.7)
        assert RejectionReason.UNREADABLE_DOCUMENT.value in reasons

    def test_low_resolution_flag(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(resolution="FAIL"), [], 800, 600, 0.8, 0.7)
        assert RejectionReason.LOW_RESOLUTION.value in reasons

    def test_tiny_image(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(), [], 80, 60, 0.8, 0.7)
        assert RejectionReason.LOW_RESOLUTION.value in reasons

    def test_severe_blur(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(blur="FAIL"), [], 800, 600, 0.10, 0.7)
        assert RejectionReason.SEVERE_BLUR.value in reasons

    def test_mild_blur_warning_is_not_critical(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(blur="WARNING"), [], 800, 600, 0.50, 0.7)
        assert reasons == []

    def test_extreme_darkness(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(brightness="FAIL"),
            [{"code": "TOO_DARK", "severity": "ERROR"}],
            800, 600, 0.8, 0.02)
        assert RejectionReason.EXTREME_DARKNESS.value in reasons

    def test_extreme_overexposure(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(brightness="FAIL"),
            [{"code": "TOO_BRIGHT", "severity": "ERROR"}],
            800, 600, 0.8, 0.99)
        assert RejectionReason.EXTREME_OVEREXPOSURE.value in reasons

    def test_severe_cropping(self):
        reasons = self.engine.detect_critical_failures(
            self._checks(cropping="FAIL"), [], 800, 600, 0.8, 0.7)
        assert RejectionReason.SEVERE_CROPPING.value in reasons

    def test_healthy_page_has_no_reasons(self):
        assert self.engine.detect_critical_failures(
            self._checks(), [], 800, 600, 0.8, 0.7) == []


class TestSelectiveOperations:
    """MODERATE ops fire only on their own metric thresholds."""

    def setup_method(self):
        self.engine = PreprocessingDecisionEngine(ImageMetricsCalculator())

    def _applied(self, sharpness=0.70, contrast=0.60, brightness=0.70, skew=0.2):
        plan = self.engine.select_moderate_operations(sharpness, contrast, brightness, skew)
        return {op.operation: op.applied for op in plan}

    def test_healthy_moderate_gets_upscale_only(self):
        applied = self._applied()
        assert all(v is False for v in applied.values())

    def test_skew_triggers_deskew(self):
        assert self._applied(skew=3.0)["DESKEW"] is True
        assert self._applied(skew=0.5)["DESKEW"] is False

    def test_low_contrast_triggers_contrast(self):
        assert self._applied(contrast=0.30)["CONTRAST_ENHANCEMENT"] is True
        assert self._applied(contrast=0.60)["CONTRAST_ENHANCEMENT"] is False

    def test_low_brightness_triggers_brightness(self):
        assert self._applied(brightness=0.05)["BRIGHTNESS_CORRECTION"] is True
        assert self._applied(brightness=0.99)["BRIGHTNESS_CORRECTION"] is True
        assert self._applied(brightness=0.70)["BRIGHTNESS_CORRECTION"] is False

    def test_low_sharpness_triggers_denoise_and_sharpen(self):
        applied = self._applied(sharpness=0.30)
        assert applied["DENOISE"] is True
        assert applied["SHARPEN"] is True
        applied = self._applied(sharpness=0.80)
        assert applied["DENOISE"] is False
        assert applied["SHARPEN"] is False


class TestUpscaleMath:
    """TARGET_WIDTH=2200 / MAX_SCALE=2.5 enforcement (task examples)."""

    def setup_method(self):
        self.processor = ImageProcessor(ImageMetricsCalculator())

    def _upscaled_width(self, width):
        img = np.ones((100, width, 3), dtype=np.uint8) * 200
        out, did = self.processor.upscale(img)
        return out.shape[1], did

    def test_464px_uses_max_scale(self):
        new_w, did = self._upscaled_width(464)
        assert did is True
        assert new_w == 1160  # 464 * 2.5

    def test_800px_uses_max_scale(self):
        new_w, did = self._upscaled_width(800)
        assert did is True
        assert new_w == 2000  # 800 * 2.5

    def test_1000px_hits_target_width(self):
        new_w, did = self._upscaled_width(1000)
        assert did is True
        assert new_w == 2200  # 1000 * 2.2

    def test_1500px_hits_target_width(self):
        new_w, did = self._upscaled_width(1500)
        assert did is True
        assert new_w == 2200

    def test_large_image_never_downscaled(self):
        new_w, did = self._upscaled_width(2500)
        assert did is False
        assert new_w == 2500

    def test_scale_never_exceeds_cap(self):
        for width in (447, 463, 464, 465, 800, 1000, 1500):
            img = np.ones((100, width, 3), dtype=np.uint8) * 200
            out, did = self.processor.upscale(img)
            assert out.shape[1] <= width * MAX_SCALE


class TestPreprocessingDecisionEngineLegacy:
    """Legacy plan builder preserved (per-metric op selection)."""

    def setup_method(self):
        self.engine = PreprocessingDecisionEngine(ImageMetricsCalculator())

    def test_clear_document_gets_minimal_intervention(self):
        metrics = PageMetrics(sharpness_normalized=0.95, contrast_normalized=0.85,
                              brightness_normalized=0.70, skew_angle_degrees=0.1,
                              width=3000, height=2500)
        plan = {op.operation: op for op in self.engine.build_processing_plan(metrics)}
        assert plan["brightness_correction"].applied is False
        assert plan["deskew"].applied is False
        assert plan["denoising"].applied is False
        assert plan["sharpening"].applied is False
        assert plan["contrast_enhancement"].applied is False
        assert plan["upscale"].applied is False
        assert plan["binarization"].applied is False

    def test_low_quality_document_gets_aggressive_processing(self):
        metrics = PageMetrics(sharpness_normalized=0.30, contrast_normalized=0.25,
                              brightness_normalized=0.50, skew_angle_degrees=0.1,
                              width=464, height=354)
        plan = {op.operation: op for op in self.engine.build_processing_plan(metrics)}
        assert plan["denoising"].applied is True
        assert plan["sharpening"].applied is True
        assert plan["contrast_enhancement"].applied is True
        assert plan["upscale"].applied is True
        assert plan["binarization"].applied is True

    def test_phase02_metrics_override(self):
        metrics = PageMetrics(sharpness_normalized=0.90, contrast_normalized=0.80,
                              brightness_normalized=0.70, skew_angle_degrees=0.1,
                              width=2000, height=1500)
        plan = {op.operation: op for op in self.engine.build_processing_plan(
            metrics, {"sharpness_normalized": 0.30, "contrast_normalized": 0.25})}
        assert plan["denoising"].applied is True


class TestLayoutAndRegionDetector:
    def setup_method(self):
        self.detector = LayoutAndRegionDetector(ImageMetricsCalculator())

    def test_detect_all_regions_returns_list(self):
        img = np.ones((400, 600, 3), dtype=np.uint8) * 255
        cv2.putText(img, "Test Document", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        assert isinstance(self.detector.detect_all_regions(img, 1), list)

    def test_detect_header(self):
        img = np.ones((400, 600, 3), dtype=np.uint8) * 255
        cv2.rectangle(img, (50, 10), (550, 50), (0, 0, 0), -1)
        headers = [r for r in self.detector.detect_all_regions(img, 1) if r.region_type == "HEADER"]
        assert len(headers) >= 1

    def test_detect_table_with_lines(self):
        img = np.ones((400, 600, 3), dtype=np.uint8) * 255
        for y in [100, 200, 300]:
            cv2.line(img, (50, y), (550, y), (0, 0, 0), 2)
        for x in [100, 250, 400, 550]:
            cv2.line(img, (x, 100), (x, 300), (0, 0, 0), 2)
        tables = [r for r in self.detector.detect_all_regions(img, 1) if r.region_type == "TABLE"]
        assert len(tables) >= 1


class TestAIDocumentPreprocessingService:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.originals_dir = Path(self.temp_dir) / "originals"
        self.originals_dir.mkdir(parents=True)
        self.service = AIDocumentPreprocessingService(storage_dir=self.originals_dir)

    def teardown_method(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _save_png(self, filename, img: Image.Image) -> Path:
        path = self.originals_dir / filename
        img.save(str(path))
        return path

    def _text_image(self, size=(800, 600), lines=12):
        img = Image.new('RGB', size, color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 28)
        except Exception:
            font = ImageFont.load_default()
        for i in range(lines):
            draw.text((40, 30 + i * 40), f"Land record line {i + 1} khatian plot area", fill=(10, 10, 10), font=font)
        return img

    def test_source_not_found_returns_error(self):
        result = self.service.preprocess_document(
            record_id="LR-TEST-001", document_id="DOC-TEST-001", ingestion_id="ING-TEST-001")
        assert result.status == PreprocessingStatus.FAILED
        assert result.error_code == "SOURCE_NOT_FOUND"

    def test_moderate_gets_selective_preprocessing(self):
        """MODERATE + degraded sharpness/contrast -> justified ops only, never binarization."""
        self._save_png("mod_test.png", self._text_image())
        qr = _moderate_qr(score=55.0, quality={
            "sharpness_normalized": 0.30, "contrast_normalized": 0.25,
            "brightness_normalized": 0.65, "skew_angle_degrees": 0.2})
        result = self.service.preprocess_document(
            record_id="LR-MOD-001", document_id="DOC-MOD-001",
            ingestion_id="mod_test", quality_result=qr, force=True)
        assert result.status == PreprocessingStatus.SUCCESS
        assert result.decision == PageDecision.MODERATE.value
        assert result.preprocessing_mode == PreprocessingMode.SELECTIVE_ENHANCEMENT.value
        assert "UPSCALE" in result.operations_applied
        assert "DENOISE" in result.operations_applied
        assert "SHARPEN" in result.operations_applied
        assert "CONTRAST_ENHANCEMENT" in result.operations_applied
        assert "binarization" not in [o.lower() for o in result.operations_applied]
        assert result.next_phase == "DOCUMENT_CLASSIFICATION"

    def test_skewed_moderate_gets_deskew(self):
        self._save_png("skew_test.png", self._text_image())
        qr = _moderate_qr(quality={"skew_angle_degrees": 3.0})
        result = self.service.preprocess_document(
            record_id="LR-SKEW-001", document_id="DOC-SKEW-001",
            ingestion_id="skew_test", quality_result=qr, force=True)
        assert "DESKEW" in result.operations_applied

    def test_straight_moderate_skips_deskew(self):
        self._save_png("straight_test.png", self._text_image())
        result = self.service.preprocess_document(
            record_id="LR-STRAIGHT-001", document_id="DOC-STRAIGHT-001",
            ingestion_id="straight_test", quality_result=_moderate_qr(), force=True)
        assert "DESKEW" in result.operations_skipped

    def test_blank_image_rejected(self):
        """Blank page -> REJECT with BLANK_PAGE (no enhancement, no handoff)."""
        self._save_png("blank_test.png", Image.new('RGB', (800, 600), color=(255, 255, 255)))
        result = self.service.preprocess_document(
            record_id="LR-BLANK-001", document_id="DOC-BLANK-001",
            ingestion_id="blank_test", force=True)
        assert result.status == PreprocessingStatus.REJECTED
        assert result.decision == PageDecision.REJECT.value
        assert result.preprocessing_mode == PreprocessingMode.NONE.value
        assert RejectionReason.BLANK_PAGE.value in result.rejection_reasons
        assert result.operations_applied == []
        assert result.next_phase is None

    def test_corrupted_image_rejected(self):
        (self.originals_dir / "corrupt_test.png").write_bytes(b"\x89PNG not really an image" * 64)
        result = self.service.preprocess_document(
            record_id="LR-CORR-001", document_id="DOC-CORR-001",
            ingestion_id="corrupt_test", force=True)
        assert result.status == PreprocessingStatus.REJECTED
        assert RejectionReason.UNREADABLE_DOCUMENT.value in result.rejection_reasons
        assert result.next_phase is None

    def test_very_small_image_rejected(self):
        self._save_png("tiny_test.png", self._text_image(size=(80, 60), lines=2))
        result = self.service.preprocess_document(
            record_id="LR-TINY-001", document_id="DOC-TINY-001",
            ingestion_id="tiny_test", force=True)
        assert result.status == PreprocessingStatus.REJECTED
        assert RejectionReason.LOW_RESOLUTION.value in result.rejection_reasons

    def test_dark_image_rejected(self):
        self._save_png("dark_test.png", Image.new('RGB', (800, 600), color=(0, 0, 0)))
        result = self.service.preprocess_document(
            record_id="LR-DARK-001", document_id="DOC-DARK-001",
            ingestion_id="dark_test", force=True)
        assert result.status == PreprocessingStatus.REJECTED
        assert RejectionReason.EXTREME_DARKNESS.value in result.rejection_reasons

    def test_large_image_never_downscaled(self):
        self._save_png("large_test.png", self._text_image(size=(2500, 1800), lines=30))
        result = self.service.preprocess_document(
            record_id="LR-LARGE-001", document_id="DOC-LARGE-001",
            ingestion_id="large_test", force=True)
        assert result.status == PreprocessingStatus.SUCCESS
        page = result.pages[0]
        assert page.upscaled is False
        assert page.processed_dimensions.width == 2500
        assert Path(page.output_files["processed"]).exists()

    def test_original_untouched_and_processed_created(self):
        img = self._text_image()
        path = self._save_png("hash_test.png", img)
        before = hashlib.sha256(path.read_bytes()).hexdigest()
        result = self.service.preprocess_document(
            record_id="LR-HASH-001", document_id="DOC-HASH-001",
            ingestion_id="hash_test", quality_result=_moderate_qr(), force=True)
        assert hashlib.sha256(path.read_bytes()).hexdigest() == before
        page = result.pages[0]
        processed = Path(page.output_files["processed"])
        assert processed.exists()
        assert page.processed_dimensions.width <= 2200
        assert page.processed_dimensions.width <= page.original_dimensions.width * MAX_SCALE

    def test_replay_guard_returns_cached(self):
        self._save_png("replay_test.png", self._text_image())
        first = self.service.preprocess_document(
            record_id="LR-REPLAY-001", document_id="DOC-REPLAY-001",
            ingestion_id="replay_test", quality_result=_moderate_qr())
        second = self.service.preprocess_document(
            record_id="LR-REPLAY-001", document_id="DOC-REPLAY-001",
            ingestion_id="replay_test", quality_result=_moderate_qr())
        assert second.decision == first.decision
        assert "replayed_at" in second.timestamps

    def test_result_determinism(self):
        arr = np.random.randint(50, 200, (600, 800, 3), dtype=np.uint8)
        self._save_png("det_test.png", Image.fromarray(arr))
        result1 = self.service.preprocess_document(
            record_id="LR-DET-001", document_id="DOC-DET-001",
            ingestion_id="det_test", quality_result=_moderate_qr())
        result2 = self.service.preprocess_document(
            record_id="LR-DET-001", document_id="DOC-DET-001",
            ingestion_id="det_test", quality_result=_moderate_qr())
        assert result1.pages_processed == result2.pages_processed
        assert result1.decision == result2.decision

    def test_evidence_files_generated(self):
        self._save_png("evidence_test.png", self._text_image())
        result = self.service.preprocess_document(
            record_id="LR-EVID-001", document_id="DOC-EVID-001",
            ingestion_id="evidence_test", quality_result=_moderate_qr(), force=True)
        page = result.pages[0]
        assert Path(page.output_files["evidence_before"]).exists()
        assert Path(page.output_files["evidence_after"]).exists()

    def test_multipage_mixed_decisions(self):
        """Page 1 CLEAR + page 2 REJECT -> PARTIAL, nothing silently discarded.

        Per-page Phase 02 evidence drives each page independently; the
        document score stays above the reject gate so page 1 is accepted.
        """
        import pymupdf as fitz
        doc = fitz.open()
        for i in range(2):
            page = doc.new_page(width=595, height=842)
            page.insert_text((100, 400), f"Khatian plot land record page {i + 1}", fontsize=14)
        pdf_bytes = doc.tobytes()
        doc.close()
        (self.originals_dir / "mixed_test.pdf").write_bytes(pdf_bytes)
        page1 = dict(_moderate_qr(score=60.0)["pages"][0])
        page1["page_number"] = 1
        page1["quality"] = dict(page1["quality"], quality_score=72.0)
        page2 = dict(_moderate_qr(score=60.0)["pages"][0])
        page2["page_number"] = 2
        page2["quality"] = dict(page2["quality"], quality_score=30.0)
        page2["checks"] = dict(page2["checks"], blank=True)
        qr = {"quality": {"quality_score": 60.0}, "pages": [page1, page2]}
        result = self.service.preprocess_document(
            record_id="LR-MIX-001", document_id="DOC-MIX-001",
            ingestion_id="mixed_test", quality_result=qr, force=True)
        assert len(result.pages) == 2
        assert result.pages[0].decision == PageDecision.CLEAR.value
        assert result.pages[1].decision == PageDecision.REJECT.value
        assert RejectionReason.BLANK_PAGE.value in result.pages[1].rejection_reasons
        assert result.status == PreprocessingStatus.PARTIAL
        assert result.next_phase == "DOCUMENT_CLASSIFICATION"

    def test_phase03_to_phase04_handoff(self):
        """Accepted output feeds Phase 04 classification (regions + IDs)."""
        from app.ocr.classification.service import DocumentClassificationService
        self._save_png("handoff_test.png", self._text_image())
        result = self.service.preprocess_document(
            record_id="LR-HO-001", document_id="DOC-HO-001",
            ingestion_id="handoff_test", quality_result=_moderate_qr(), force=True)
        assert result.status == PreprocessingStatus.SUCCESS
        regions = [r.to_dict() for r in result.regions_detected_summary]
        assert isinstance(regions, list)
        classification = DocumentClassificationService().classify(
            record_id="LR-HO-001", document_id="DOC-HO-001",
            ingestion_id="handoff_test", layout_regions=regions)
        assert classification.record_id == "LR-HO-001"


class TestRestorationPipelinePreserved:
    """The LOW restoration pipeline stays available as a capability and is
    unit-tested directly (LOW documents are REJECTED at service level now)."""

    def setup_method(self):
        self.calc = ImageMetricsCalculator()
        self.processor = ImageProcessor(self.calc)
        self.pipeline = LowQualityRestorationPipeline(self.processor, self.calc)

    def test_candidate_generation_is_multi_candidate(self):
        gray = np.random.randint(90, 190, (354, 464), dtype=np.uint8)
        original = Image.fromarray(cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB))
        candidates = self.pipeline.build_candidates(original, gray)
        assert len(candidates) >= 3
        names = {c.name for c in candidates}
        assert any("binarized" in n or n == "low_structure_preserved" for n in names)
        assert any(n.startswith("low_restored") for n in names)
        assert "low_structure_preserved" in names

    def test_readability_reported_per_candidate(self):
        gray = np.random.randint(90, 190, (200, 300), dtype=np.uint8)
        original = Image.fromarray(cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB))
        for candidate in self.pipeline.build_candidates(original, gray):
            readability = candidate.readability.to_dict()
            for key in ("overall", "local_contrast", "character_like_ratio",
                        "information_preservation", "structure_preservation"):
                assert key in readability
            assert 0.0 <= readability["overall"] <= 1.0

    def test_sharpen_is_conservative(self):
        gray = np.ones((120, 160), dtype=np.uint8) * 180
        out = self.processor.sharpen(gray)
        assert out.shape == gray.shape
        assert out.dtype == np.uint8


class TestRealSampleValidation:
    """End-to-end on real samples via the real Phase 01 -> 02 -> 03 chain."""

    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.originals_dir = Path(self.temp_dir) / "originals"
        self.originals_dir.mkdir(parents=True)
        self.service = AIDocumentPreprocessingService(storage_dir=self.originals_dir)

    def teardown_method(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _run_sample(self, source_name, target_id):
        from app.ocr.quality.service import DocumentQualityCheckService
        source = SAMPLES_DIR / source_name
        if not source.exists():
            pytest.skip(f"Sample {source_name} not found")
        shutil.copy2(str(source), str(self.originals_dir / f"{target_id}.png"))
        quality = DocumentQualityCheckService(
            storage_dir=self.originals_dir).check_quality(
                f"LR-{target_id}", f"DOC-{target_id}", target_id)
        return self.service.preprocess_document(
            record_id=f"LR-{target_id}", document_id=f"DOC-{target_id}",
            ingestion_id=target_id, quality_result=quality.to_dict(), force=True)

    def test_clear_sample_upscale_only(self):
        result = self._run_sample("test sample english enhanced.png", "clear_sample")
        assert result.status == PreprocessingStatus.SUCCESS
        assert result.decision == PageDecision.CLEAR.value
        assert result.preprocessing_mode == PreprocessingMode.UPSCALE_ONLY.value
        assert result.operations_applied == ["UPSCALE"]
        for skipped in ("DENOISE", "CONTRAST_ENHANCEMENT", "BRIGHTNESS_CORRECTION",
                        "SHARPEN", "DESKEW"):
            assert skipped in result.operations_skipped
        assert result.upscaled is True
        assert result.scale_factor <= MAX_SCALE
        assert result.next_phase == "DOCUMENT_CLASSIFICATION"

    def test_medium_sample_selective(self):
        result = self._run_sample("test sample english medium.png", "medium_sample")
        assert result.status == PreprocessingStatus.SUCCESS
        assert result.decision == PageDecision.MODERATE.value
        assert result.preprocessing_mode == PreprocessingMode.SELECTIVE_ENHANCEMENT.value
        assert "UPSCALE" in result.operations_applied
        assert "binarization" not in [o.lower() for o in result.operations_applied]
        assert result.next_phase == "DOCUMENT_CLASSIFICATION"

    def test_low_sample_rejected(self):
        result = self._run_sample("test sample english low.png", "low_sample")
        assert result.status == PreprocessingStatus.REJECTED
        assert result.decision == PageDecision.REJECT.value
        assert result.preprocessing_mode == PreprocessingMode.NONE.value
        assert result.operations_applied == []
        assert (RejectionReason.QUALITY_SCORE_BELOW_THRESHOLD.value
                in result.rejection_reasons)
        assert result.next_phase is None

    def test_result_contract_shape(self):
        result = self._run_sample("test sample english medium.png", "contract_sample")
        payload = result.to_dict()
        for key in ("phase", "status", "decision", "preprocessing_mode",
                    "quality_score", "operations_applied", "operations_skipped",
                    "rejection_reasons", "upscaled", "scale_factor", "next_phase"):
            assert key in payload, f"missing contract key: {key}"
        assert payload["quality_source"] == "phase02"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
