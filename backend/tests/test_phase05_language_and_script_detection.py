"""
Phase 05 Tests: Language & Script Detection.

Covers:
 1. English detection            10. OCR routing
 2. Hindi detection              11. Classification handoff
 3. Bengali detection            12. Evidence generation
 4. Latin script detection       13. No API key fallback
 5. Devanagari detection         14. Gemini provider unavailable
 6. Bengali script detection     15. Invalid input
 7. Mixed-language detection     16. Missing document
 8. Uncertain detection          17. Duplicate execution / idempotency
 9. Unsupported language         18. API response schema
 + Critical negative test: image passed to the Gemini Live Translate
   provider must yield NOT_APPLICABLE_FOR_DOCUMENT_INPUT.
 + No-hard-coding test: misleading filenames / document_type never
   decide the language.
 + Real-image tests on the English sample documents (evidence-driven).
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.language.lang_models import GEMINI_LIVE_TRANSLATE_MODEL, DetectionStatus, APIStatus, LanguageDetectionResult
from app.ocr.language.providers import GeminiDocumentLanguageProvider, GeminiLiveTranslateProvider, LocalScriptDetector
from app.ocr.language.lang_service import LanguageAndScriptDetectionService
from app.ocr.language.script_detection import build_ocr_routing, count_scripts, fuse_evidence


# ---------------------------------------------------------------------------
# Synthetic evidence (long enough to exceed MIN_SCRIPT_CHARS = 20)
# ---------------------------------------------------------------------------

ENGLISH_TEXT = (
    "Government of West Bengal, Department of Land and Land Reforms. "
    "Record of Rights for district Hooghly, block Singur, mouza Gopalpur. "
    "Khatian number forty two, plot number one hundred seven, area details "
    "recorded with owner name and tenant information for mutation purposes."
)

HINDI_TEXT = (
    "जिला हुगली, खाता संख्या बयालीस, खसरा संख्या एक सौ सात का भूमि अभिलेख। "
    "मालिक का नाम, खतियान विवरण और क्षेत्रफल सहित सरकार के भूमि विभाग का "
    "रिकॉर्ड जिसमें जमीन की पूरी जानकारी दर्ज है।"
)

BENGALI_TEXT = (
    "পশ্চিমবঙ্গ সরকার, ভূমি ও ভূমি সংস্কার বিভাগ। হুগলি জেলা, সিঙ্গুর ব্লক, "
    "গোপালপুর মৌজার জমির রেকর্ড। খতিয়ান নম্বর বিয়াল্লিশ, দাগ নম্বর একশো সাত, "
    "মালিকের নাম সহ জমির সম্পূর্ণ বিবরণ।"
)

TAMIL_TEXT = (
    "நில உரிமை பதிவு ஆவணம் மாவட்டம் கிராமம் கதவு எண் பட்டா விவரங்கள் "
    "உரிமையாளர் பெயர் பரப்பளவு அளவீடு வருவாய் துறை அலுவலகம்"
)

#: A genuinely unmapped script (not in the 22-scheduled set) so the honest
#: UNSUPPORTED lane has real evidence. Han/Cyrillic are not registered.
CYRILLIC_TEXT = (
    "Государственный реестр прав на землю, отдел землеустройства, "
    "кадастровый номер участка, владелец, площадь и категория земли."
)


def _service(tmp_path):
    return LanguageAndScriptDetectionService(storage_dir=tmp_path / "phase_05")


# ---------------------------------------------------------------------------
# 1-3. Language detection (English / Hindi / Bengali)
# ---------------------------------------------------------------------------

class TestMVPDetection:
    def test_01_english_detection(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000001", document_id="DOC-T05-000001",
            ocr_text=ENGLISH_TEXT, force=True,
        )
        assert result.detection_status == DetectionStatus.DETECTED
        assert result.primary_language == "en"
        assert result.multilingual is False
        assert result.language_confidence > 0.5

    def test_02_hindi_detection(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000002", document_id="DOC-T05-000002",
            ocr_text=HINDI_TEXT, force=True,
        )
        assert result.detection_status == DetectionStatus.DETECTED
        assert result.primary_language == "hi"
        assert result.primary_script == "Devanagari"

    def test_03_bengali_detection(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000003", document_id="DOC-T05-000003",
            ocr_text=BENGALI_TEXT, force=True,
        )
        assert result.detection_status == DetectionStatus.DETECTED
        assert result.primary_language == "bn"
        assert result.primary_script == "Bengali"


# ---------------------------------------------------------------------------
# 4-6. Script detection (Latin / Devanagari / Bengali)
# ---------------------------------------------------------------------------

class TestScriptDetection:
    def test_04_latin_script_detection(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000004", document_id="DOC-T05-000004",
            ocr_text=ENGLISH_TEXT, force=True,
        )
        assert result.primary_script == "Latin"
        assert result.script_confidence > 0.5

    def test_05_devanagari_script_detection(self):
        counts = count_scripts(HINDI_TEXT)
        assert counts.get("Devanagari", 0) > counts.get("Latin", 0)
        assert counts.get("Bengali", 0) == 0

    def test_06_bengali_script_detection(self):
        counts = count_scripts(BENGALI_TEXT)
        assert counts.get("Bengali", 0) > counts.get("Latin", 0)
        # The danda "।" (U+0964) is shared punctuation counted in the
        # Devanagari block; Bengali must dominate overwhelmingly instead.
        assert counts.get("Bengali", 0) > 10 * counts.get("Devanagari", 0)


# ---------------------------------------------------------------------------
# 7-9. Mixed / uncertain / unsupported
# ---------------------------------------------------------------------------

class TestResultStates:
    def test_07_mixed_english_hindi(self, tmp_path):
        mixed = ENGLISH_TEXT + " " + HINDI_TEXT
        result = _service(tmp_path).detect(
            record_id="LR-T05-000007", document_id="DOC-T05-000007",
            ocr_text=mixed, force=True,
        )
        assert result.detection_status == DetectionStatus.MULTILINGUAL
        assert result.multilingual is True
        langs = {d.language for d in result.detected_languages}
        assert {"en", "hi"} <= langs

    def test_07b_mixed_english_bengali(self, tmp_path):
        mixed = ENGLISH_TEXT + " " + BENGALI_TEXT
        result = _service(tmp_path).detect(
            record_id="LR-T05-000017", document_id="DOC-T05-000017",
            ocr_text=mixed, force=True,
        )
        assert result.detection_status == DetectionStatus.MULTILINGUAL
        assert result.multilingual is True

    def test_08_uncertain_detection(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000008", document_id="DOC-T05-000008",
            ocr_text="hello", force=True,
        )
        assert result.detection_status == DetectionStatus.UNCERTAIN
        assert result.status == APIStatus.SUCCESS
        assert result.primary_language == "und"

    def test_09_unsupported_language(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000009", document_id="DOC-T05-000009",
            ocr_text=CYRILLIC_TEXT, force=True,
        )
        assert result.detection_status == DetectionStatus.UNSUPPORTED
        # Technical limitation must NOT be silently converted to English.
        assert result.primary_language != "en"
        assert "unsupported_script_needs_review" in result.warnings

    def test_09b_tamil_now_supported(self, tmp_path):
        # Tamil is one of the 22 scheduled languages; script evidence alone
        # (unique Tamil script -> ta) must yield DETECTED, not UNSUPPORTED.
        result = _service(tmp_path).detect(
            record_id="LR-T05-000019", document_id="DOC-T05-000019",
            ocr_text=TAMIL_TEXT, force=True,
        )
        assert result.detection_status == DetectionStatus.DETECTED
        assert result.primary_language == "ta"
        assert result.primary_script == "Tamil"
        assert result.ocr_routing.language_codes == ["tam"]


# ---------------------------------------------------------------------------
# 10. OCR routing
# ---------------------------------------------------------------------------

class TestOCRRouting:
    def test_10_routing_english(self):
        routing = build_ocr_routing(
            DetectionStatus.DETECTED, "en", "Latin", [], False
        )
        d = routing.to_dict()
        assert d["language_codes"] == ["eng"]
        assert d["preferred_language"] == "English"
        assert d["script"] == "Latin"
        assert d["engine_preferences"] == ["TESSERACT", "SURYA"]

    def test_10_routing_hindi(self):
        routing = build_ocr_routing(
            DetectionStatus.DETECTED, "hi", "Devanagari", [], False
        )
        assert routing.to_dict()["language_codes"] == ["hin"]

    def test_10_routing_bengali(self):
        routing = build_ocr_routing(
            DetectionStatus.DETECTED, "bn", "Bengali", [], False
        )
        assert routing.to_dict()["language_codes"] == ["ben"]

    def test_10_routing_multilingual(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000010", document_id="DOC-T05-000010",
            ocr_text=ENGLISH_TEXT + " " + HINDI_TEXT, force=True,
        )
        routing = result.ocr_routing.to_dict()
        assert set(routing["language_codes"]) == {"eng", "hin"}
        assert routing["preferred_language"] == "MULTILINGUAL"
        assert routing["script"] == "MIXED"

    def test_10_routing_present_in_result(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000110", document_id="DOC-T05-000110",
            ocr_text=ENGLISH_TEXT, force=True,
        )
        assert result.ocr_routing is not None
        assert result.ocr_routing.language_codes == ["eng"]


# ---------------------------------------------------------------------------
# 11. Classification handoff — document_type is context, never the verdict
# ---------------------------------------------------------------------------

class TestClassificationHandoff:
    def test_11_handoff_passthrough(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000011", document_id="DOC-T05-000011",
            classification_id="CLS-2026-000011",
            document_type="RECORD_OF_RIGHTS",
            classification_confidence=0.85,
            ocr_text=ENGLISH_TEXT, force=True,
        )
        assert result.document_type == "RECORD_OF_RIGHTS"
        assert result.classification_confidence == 0.85
        assert result.classification_id == "CLS-2026-000011"
        assert result.next_phase == "OCR_VISUAL_TEXT_RECOGNITION"

    def test_11_document_type_does_not_decide_language(self, tmp_path):
        # RECORD_OF_RIGHTS + Hindi evidence must yield Hindi, not English.
        result = _service(tmp_path).detect(
            record_id="LR-T05-000111", document_id="DOC-T05-000111",
            document_type="RECORD_OF_RIGHTS",
            classification_confidence=0.99,
            ocr_text=HINDI_TEXT, force=True,
        )
        assert result.primary_language == "hi"


# ---------------------------------------------------------------------------
# 12. Evidence generation
# ---------------------------------------------------------------------------

class TestEvidence:
    def test_12_evidence_present_and_shaped(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000012", document_id="DOC-T05-000012",
            document_type="RECORD_OF_RIGHTS",
            ocr_text=ENGLISH_TEXT, force=True,
        )
        assert len(result.evidence) > 0
        sources = {e.source for e in result.evidence}
        assert "ocr_preview" in sources or "unicode_script_analysis" in sources
        for item in result.evidence:
            d = item.to_dict()
            assert {"source", "language", "script", "confidence"} <= set(d)
        # Classification context is retained with zero weight.
        context = [e for e in result.evidence if e.source == "classification_context"]
        assert context and context[0].confidence == 0.0

    def test_12_no_filename_evidence(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000112", document_id="DOC-T05-000112",
            ocr_text=ENGLISH_TEXT, force=True,
        )
        for item in result.evidence:
            assert "filename" not in item.source
            assert ".png" not in item.sample


# ---------------------------------------------------------------------------
# 13-14. Gemini fallback behaviour (offline-safe)
# ---------------------------------------------------------------------------

class TestGeminiFallback:
    def test_13_no_api_key_fallback(self, tmp_path, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
        result = _service(tmp_path).detect(
            record_id="LR-T05-000013", document_id="DOC-T05-000013",
            ocr_text=ENGLISH_TEXT, use_gemini=True, force=True,
        )
        # Local path carries the pipeline even with Gemini unavailable.
        assert result.status == APIStatus.SUCCESS
        assert result.primary_language == "en"

    def test_14_gemini_document_provider_unavailable(self):
        provider = GeminiDocumentLanguageProvider(api_key=None)
        provider.api_key = None
        out = provider.detect_language(text=ENGLISH_TEXT)
        assert out["status"] == "failed"
        assert out["reason"] == "gemini_not_configured"

    def test_14_local_detector_needs_no_key(self):
        out = LocalScriptDetector().detect_language(text=HINDI_TEXT)
        assert out["status"] == "ok"
        assert out["evidence"]


# ---------------------------------------------------------------------------
# 15-16. Invalid input / missing document
# ---------------------------------------------------------------------------

class TestInputValidation:
    def test_15_invalid_input_missing_ids(self, tmp_path):
        service = _service(tmp_path)
        with pytest.raises(ValueError):
            service.detect(record_id="", document_id="DOC-T05-000015", force=True)
        with pytest.raises(ValueError):
            service.detect(record_id="LR-T05-000015", document_id="", force=True)

    def test_16_missing_document(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-NOPE-000016",
            document_id="DOC-T05-NOPE-000016",
            ingestion_id="ING-T05-NOPE-000016",
            force=True,
        )
        assert result.detection_status == DetectionStatus.FAILED
        assert result.status == APIStatus.FAILED
        assert result.error_code == "DOCUMENT_NOT_FOUND"
        # Failures must not masquerade as English.
        assert result.primary_language in ("und", "", None) or result.primary_language != "en"


# ---------------------------------------------------------------------------
# 17. Duplicate execution / idempotency
# ---------------------------------------------------------------------------

class TestIdempotency:
    def test_17_duplicate_execution(self, tmp_path):
        service = _service(tmp_path)
        first = service.detect(
            record_id="LR-T05-000017", document_id="DOC-T05-000017",
            ocr_text=BENGALI_TEXT, force=True,
        )
        second = service.detect(
            record_id="LR-T05-000017", document_id="DOC-T05-000017",
            ocr_text=BENGALI_TEXT,
        )
        assert second.primary_language == first.primary_language == "bn"
        assert second.detection_status == first.detection_status
        assert "idempotent_replay" in second.warnings


# ---------------------------------------------------------------------------
# 18. API response schema
# ---------------------------------------------------------------------------

class TestResponseSchema:
    def test_18_schema(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000018", document_id="DOC-T05-000018",
            ocr_text=ENGLISH_TEXT, force=True,
        )
        d = result.to_dict()
        assert d["phase"] == "PHASE_05_LANGUAGE_SCRIPT_DETECTION"
        assert d["status"] == "SUCCESS"
        assert d["record_id"] == "LR-T05-000018"
        assert d["document_id"] == "DOC-T05-000018"
        assert set(d["language"]) >= {"primary", "confidence", "alternatives"}
        assert set(d["script"]) >= {"primary", "confidence", "alternatives"}
        assert isinstance(d["multilingual"], bool)
        assert isinstance(d["detected_languages"], list)
        assert d["detected_languages"][0]["language"] == "en"
        assert set(d["ocr_routing"]) >= {
            "language_codes", "preferred_language", "script"
        }
        assert isinstance(d["evidence"], list) and d["evidence"]
        assert d["next_phase"] == "OCR_VISUAL_TEXT_RECOGNITION"

    def test_18_result_roundtrip(self, tmp_path):
        result = _service(tmp_path).detect(
            record_id="LR-T05-000118", document_id="DOC-T05-000118",
            ocr_text=HINDI_TEXT, force=True,
        )
        clone = LanguageDetectionResult.from_dict(result.to_dict())
        assert clone.primary_language == "hi"
        assert clone.primary_script == "Devanagari"
        assert clone.detection_status == DetectionStatus.DETECTED


# ---------------------------------------------------------------------------
# Critical negative test: Live Translate must refuse document input
# ---------------------------------------------------------------------------

class TestLiveTranslateModality:
    def test_live_translate_model_name(self):
        assert GEMINI_LIVE_TRANSLATE_MODEL == "gemini-3.5-live-translate-preview"

    def test_negative_image_to_live_translate(self, tmp_path):
        provider = GeminiLiveTranslateProvider()
        fake_image = tmp_path / "page.png"
        fake_image.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 64)
        out = provider.detect_language(image_path=str(fake_image))
        assert out["status"] == "not_applicable"
        assert out["reason"] == "NOT_APPLICABLE_FOR_DOCUMENT_INPUT"

    def test_negative_text_to_live_translate(self):
        provider = GeminiLiveTranslateProvider()
        out = provider.detect_language(text=ENGLISH_TEXT)
        assert out["reason"] == "NOT_APPLICABLE_FOR_DOCUMENT_INPUT"

    def test_live_translate_config_contract(self):
        """Correct Live API surface: TranslationConfig with the official fields."""
        pytest.importorskip("google.genai")
        provider = GeminiLiveTranslateProvider()
        config = provider.build_translation_config(
            target_language_code="bn", echo_target_language=True
        )
        assert config.target_language_code == "bn"
        assert config.echo_target_language is True


# ---------------------------------------------------------------------------
# No hard-coding: misleading filename never decides the language
# ---------------------------------------------------------------------------

class TestNoHardCoding:
    def test_misleading_filename_ignored(self, tmp_path, monkeypatch):
        from PIL import Image
        import app.ocr.language.lang_service as phase05

        misleading = tmp_path / "land_record_hindi.png"
        Image.new("RGB", (400, 200), color="white").save(misleading)
        monkeypatch.setattr(
            phase05, "_candidate_image_paths", lambda *a, **k: [misleading]
        )
        monkeypatch.setattr(
            phase05, "_provisional_ocr_text", lambda *a, **k: (ENGLISH_TEXT, "eng")
        )
        result = LanguageAndScriptDetectionService(
            storage_dir=tmp_path / "phase_05"
        ).detect(
            record_id="LR-T05-000019", document_id="DOC-T05-000019", force=True
        )
        assert result.primary_language == "en"
        assert result.primary_script == "Latin"


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

class TestPhase05API:
    def test_endpoint_success(self, client, tmp_path):
        response = client.post(
            "/api/digitization/language-detection",
            json={
                "record_id": "LR-T05-API-001",
                "document_id": "DOC-T05-API-001",
                "document_type": "RECORD_OF_RIGHTS",
                "classification_confidence": 0.85,
                "ocr_text": ENGLISH_TEXT,
                "force": True,
            },
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["phase"] == "PHASE_05_LANGUAGE_SCRIPT_DETECTION"
        assert data["status"] == "SUCCESS"
        assert data["language"]["primary"] == "en"
        assert data["next_phase"] == "OCR_VISUAL_TEXT_RECOGNITION"

    def test_endpoint_missing_params(self, client):
        response = client.post(
            "/api/digitization/language-detection",
            json={"record_id": "LR-T05-API-002"},
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "FAILED"
        assert data["error_code"] == "MISSING_PARAMETERS"

    def test_endpoint_no_json(self, client):
        response = client.post(
            "/api/digitization/language-detection",
            content_type="application/json",
            data="not json",
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "FAILED"
        assert data["error_code"] == "INVALID_REQUEST"


# ---------------------------------------------------------------------------
# Real-image tests (evidence-driven, nothing hard-coded)
# ---------------------------------------------------------------------------

SAMPLES_DIR = Path(__file__).parent.parent / "uploads" / "samples"
MEDIUM_SAMPLE = SAMPLES_DIR / "test sample english medium.png"
ENHANCED_SAMPLE = SAMPLES_DIR / "test sample english enhanced.png"


def _run_ingest_then_detect(sample_path: Path):
    from app.ocr.ingestion.service import DocumentIngestionService
    from app.ocr.ingestion.models import IngestionStatus

    data = sample_path.read_bytes()
    ingestion = DocumentIngestionService()
    ingested = ingestion.ingest(data, sample_path.name)
    assert ingested.status == IngestionStatus.SUCCESS
    service = LanguageAndScriptDetectionService()
    return service.detect(
        record_id=ingested.record_id,
        document_id=ingested.document_id,
        ingestion_id=ingested.ingestion_id,
        force=True,
    )


class TestRealImages:
    @pytest.mark.skipif(not MEDIUM_SAMPLE.exists(), reason="medium sample missing")
    def test_real_image_medium(self):
        result = _run_ingest_then_detect(MEDIUM_SAMPLE)
        assert result.status == APIStatus.SUCCESS
        assert result.primary_language == "en"
        assert result.primary_script == "Latin"
        assert result.ocr_routing.language_codes == ["eng"]
        assert result.evidence

    @pytest.mark.skipif(not ENHANCED_SAMPLE.exists(), reason="enhanced sample missing")
    def test_real_image_enhanced(self):
        result = _run_ingest_then_detect(ENHANCED_SAMPLE)
        assert result.status == APIStatus.SUCCESS
        assert result.primary_language == "en"
        assert result.primary_script == "Latin"
        assert result.ocr_routing.language_codes == ["eng"]
        assert result.evidence


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
