"""
Multilingual support tests (22 scheduled languages + English).

Covers:
 1. Registry schema — every scheduled language has honest metadata and a
    documented script / OCR pack status (None means CONFIGURED, not VERIFIED).
 2. Detection — each language's script+terminology resolves to the right
    primary language; shared-script languages (Devanagari/Bengali/
    Perso-Arabic) disambiguate via terminology; unmapped scripts stay
    honest UNSUPPORTED.
 3. Numeral normalization — Indic / Perso-Arabic digit blocks map to ASCII
    while preserving surrounding text.
 4. Phase 07 wiring — registry aliases merged into MULTILINGUAL_ALIASES and
    native-script area units recognized; numeral normalization applied in the
    date / area / number helpers.
 5. Capability matrix — honest VERIFIED/UNAVAILABLE vocabulary and the API
    endpoint shape.
 6. Real-image evidence-driven detection for en / hi / bn samples.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.multilingual_registry import (
    FIELD_ALIASES,
    LANGUAGE_REGISTRY,
    NUMERAL_MAP,
    SCHEDULED_LANGUAGES,
    SCRIPT_LANGUAGES,
    SCRIPT_RANGES,
    SCRIPT_TO_LANGUAGE,
    SUPPORTED_LANGUAGES,
    build_capability_matrix,
    normalize_numerals,
)
from src.phase05_language_and_script_detection import (
    DetectionStatus,
    LanguageAndScriptDetectionService,
)


# ---------------------------------------------------------------------------
# 1. Registry schema & honesty
# ---------------------------------------------------------------------------

class TestRegistrySchema:
    def test_22_scheduled_languages_plus_english(self):
        assert len(SCHEDULED_LANGUAGES) == 22
        assert "en" in SUPPORTED_LANGUAGES
        assert len(SUPPORTED_LANGUAGES) == 23

    def test_every_language_has_metadata(self):
        for lang in SUPPORTED_LANGUAGES:
            meta = LANGUAGE_REGISTRY[lang]
            assert meta["scripts"], f"{lang} has no scripts"
            assert meta["display"], f"{lang} has no display name"
            assert meta["evidence"] in ("verified", "configured")

    def test_verified_vs_configured_honest(self):
        # Only en/hi/bn carry verified packs (repo tessdata + system check).
        assert LANGUAGE_REGISTRY["hi"]["tesseract"] == "hin"
        assert LANGUAGE_REGISTRY["bn"]["tesseract"] == "ben"
        assert LANGUAGE_REGISTRY["en"]["tesseract"] == "eng"
        # Scheduled languages without verified traineddata report None.
        for lang in ("brx", "doi", "ks", "kok", "mai", "mni", "sat", "sd"):
            assert LANGUAGE_REGISTRY[lang]["tesseract"] is None, lang
            assert LANGUAGE_REGISTRY[lang]["evidence"] == "configured"

    def test_shared_script_languages_are_registered(self):
        for lang in ("hi", "mr", "ne", "sa", "mai", "brx", "doi", "kok"):
            assert lang in SCRIPT_LANGUAGES["Devanagari"], lang
        for lang in ("bn", "as", "mni"):
            assert lang in SCRIPT_LANGUAGES["Bengali"], lang
        for lang in ("ur", "sd", "ks"):
            assert lang in SCRIPT_LANGUAGES["Perso-Arabic"], lang

    def test_unique_scripts_map_to_expected_language(self):
        assert SCRIPT_TO_LANGUAGE["Gujarati"] == "gu"
        assert SCRIPT_TO_LANGUAGE["Tamil"] == "ta"
        assert SCRIPT_TO_LANGUAGE["Ol Chiki"] == "sat"
        assert SCRIPT_TO_LANGUAGE["Meitei Mayek"] == "mni"
        assert SCRIPT_TO_LANGUAGE["Latin"] == "en"

    def test_script_ranges_cover_registered_scripts(self):
        covered = {script for _, _, script in SCRIPT_RANGES}
        for script in SCRIPT_LANGUAGES:
            assert script in covered, script

    def test_field_aliases_cover_canonical_fields(self):
        assert "land.survey_number" in FIELD_ALIASES
        assert "owner.name" in FIELD_ALIASES
        assert "mutation.mutation_number" in FIELD_ALIASES
        assert FIELD_ALIASES["land.area_unit"]
        assert FIELD_ALIASES["owner.name"]

    def test_no_corrupted_glyphs_in_registry(self):
        for field, aliases in FIELD_ALIASES.items():
            for alias in aliases:
                assert "\ufffd" not in alias, (field, alias)
                assert "\uFFFD" not in alias, (field, alias)

    def test_no_empty_alias_lists_for_fields(self):
        # Every canonical field has at least one alias across languages.
        for field, aliases in FIELD_ALIASES.items():
            assert aliases, field


# ---------------------------------------------------------------------------
# 2. Numerals — Indic + Perso-Arabic digit normalization
# ---------------------------------------------------------------------------

class TestNumeralNormalization:
    def test_devanagari_digits(self):
        assert normalize_numerals("१२-०६-२०१८") == "12-06-2018"

    def test_bengali_digits(self):
        assert normalize_numerals("১২.५२") == "12.52"

    def test_arabic_indic_digits(self):
        assert normalize_numerals("١٢٣") == "123"

    def test_perso_arabic_extended_digits(self):
        assert normalize_numerals("۱۲۳") == "123"
        assert normalize_numerals("۱۲-۰۶-۲۰۱۸") == "12-06-2018"

    def test_preserves_surrounding_text(self):
        assert normalize_numerals("खाता १०७") == "खाता 107"

    def test_every_script_block_mapped(self):
        # NUMERAL_MAP maps 'digit-char' -> 'ascii-digit'.
        for digit_char, ascii_digit in NUMERAL_MAP.items():
            assert normalize_numerals(digit_char) == ascii_digit, digit_char

    def test_ascii_untouched(self):
        assert normalize_numerals("Plot 112 / 45") == "Plot 112 / 45"


# ---------------------------------------------------------------------------
# 3. Detection across the scheduled languages
# ---------------------------------------------------------------------------

# Genuine land-record fragments whose terminology out-hits the shared-script
# primary (every fragment was checked against terminology_hits).
_DETECTION_FRAGMENTS = {
    "hi": ("जिला हुगली, खाता संख्या बयालीस, खसरा संख्या एक सौ सात का भूमि अभिलेख। "
           "मालिक का नाम, खतियान विवरण और क्षेत्रफल सहित सरकार के भूमि विभाग का रिकॉर्ड।"),
    "bn": ("পশ্চিমবঙ্গ সরকার, ভূমি ও ভূমি সংস্কার বিভাগ। হুগলি জেলা, সিঙ্গুর ব্লক, "
           "গোপালপুর মৌজার জমির রেকর্ড। খতিয়ান নম্বর বিয়াল্লিশ, দাগ নম্বর একশো সাত, মালিকের নাম।"),
    "mr": ("जिल्हा सातारा, खाते क्र. १४५, मालकाचे नाव, जमीन, क्षेत्रफळ, गाव, तालुका. "
           "जमिनीचा प्रकार आणि सर्वेक्षण तपशील नोंदविले आहेत."),
    "ne": ("जिल्ला काठमाडौँ, खाता क्र. २२, मालिकको नाम, जग्गा, क्षेत्रफल, गाउँ. "
           "भूमि दर्ता विवरण तहसिल कार्यालय."),
    "sa": ("राज्ये महाराष्ट्रे, जिला पुणे, खाता क्र. ११२, स्वामी नाम, भूमि विवरण, "
           "क्षेत्रफल, ग्राम नाम."),
    "kok": ("जिल्हो दक्षिण गोवा, खाते क्र. ८८, मालकाचें नांव, जमीन, क्षेत्रफळ. "
            "सरकारी जमणीचें रेकॉर्ड."),
    "brx": ("जिला कोकराझार, खाता नं. ३४, मालिक नि मॉणा, जमिनि दा प्रकार, खास्रा विवरण. "
            "सरकारी अभिलेख."),
    "doi": ("जिला अधिकारी, खाता नं. ५५, मालिक ग्रांव खसरा, ज़मीन रकबा, ज़मीनी अभिलेख सरकार."),
    "as": ("গুৱাহাটী জিলা, খাতা নং ৪৫, মালিকৰ নাম, মাটি, এলেকা. "
           "চৰকাৰী ভূমি ৰেকৰ্ড বিভাগ।"),
    "gu": ("જિલ્લો અમદાવાદ, ખાતું નં. ૭૭, માલિકનું નામ, જમીન, વિસ્તાર, ગામ. "
           "સરકારી જમીન રેકોર્ડ વિભાગ."),
    "kn": ("ಜಿಲ್ಲೆ ಬೆಂಗಳೂರು, ಖಾತೆ ಸಂ. ೧೧೨, ಮಾಲೀಕರ ಹೆಸರು, ಭೂಮಿ, ವಿಸ್ತೀರ್ಣ, ಗ್ರಾಮ. "
           "ಸರ್ಕಾರಿ ಭೂಮಿ ದಾಖಲೆ ಇಲಾಖೆ."),
    "ml": ("ജില്ല കോഴിക്കോട്, ഖാതാ നമ്പർ ൨൫, ഉടമയുടെ പേര്, ഭൂമി, വിസ്തീർണ്ണം. "
           "സർക്കാർ ഭൂമി രേഖ വകുപ്പ്."),
    "or": ("ଜିଲ୍ଲା କଟକ, ଖାତା ସଂ ୫୬, ମାଲିକଙ୍କ ନାମ, ଜମି, କ୍ଷେତ୍ରଫଳ, ଗାଁ. "
           "ସରକାରୀ ଭୂମି ରେକର୍ଡ ବିଭାଗ।"),
    "pa": ("ਜ਼ਿਲ੍ਹਾ ਲੁਧਿਆਣਾ, ਖਾਤਾ ਨੰ. ੯੯, ਮਾਲਕ ਦਾ ਨਾਮ, ਜ਼ਮੀਨ, ਰਕਬਾ, ਪਿੰਡ. "
           "ਸਰਕਾਰੀ ਜ਼ਮੀਨ ਰਿਕਾਰਡ ਵਿਭਾਗ।"),
    "ta": ("மாவட்டம் தஞ்சாவூர், பட்டா எண் ௧௫௫, உரிமையாளர் பெயர், நிலம், "
           "பரப்பளவு, கிராமம். அரசு நில பதிவு ஆவணம்."),
    "te": ("జిల్లా గుంటూరు, ఖాతా సంఖ్య ౧౨౩, యజమాని పేరు, భూమి, విస్తీర్ణం, గ్రామం. "
           "ప్రభుత్వ భూమి రికార్డు శాఖ."),
    "ur": ("ضلع مراد آباد، کھاتہ نمبر ۳۴، مالک کا نام، زمین، رقبہ. "
           "سرکاری زمین کے ریکارڈ کا محکمہ۔"),
    "sd": ("ضلع حيدرآباد، کاتو نمبر ٤٤، مالڪ جو نالو، زمين، رقبو. "
           "سرڪاري زمين رڪارڈ کاتو."),
    "ks": ("ضلع سري نگر، کھاتہ نمبر ٧٧، مالک ہند زمین، کاسرا رقبو. محکمه دا درج."),
}

_ENGLISH_TEXT = (
    "Government of West Bengal, Department of Land and Land Reforms. "
    "Record of Rights for district Hooghly, block Singur, mouza Gopalpur. "
    "Khatian number forty two, plot number one hundred seven, area details "
    "recorded with owner name and tenant information for mutation purposes."
)

#: Languages that can be detected with high specificity from script + known
#: terminology. Every fragment above out-hits its shared-script siblings.
_SPECIFIC_LANGUAGES = (
    "en", "hi", "bn", "mr", "ne", "sa", "kok", "brx", "doi", "as",
    "gu", "kn", "ml", "or", "pa", "ta", "te", "ur", "sd", "ks",
)


def _detect(text, tmp_path, lang_tag):
    return LanguageAndScriptDetectionService(
        storage_dir=tmp_path / "phase_05"
    ).detect(
        record_id=f"LR-ML-{lang_tag}",
        document_id=f"DOC-ML-{lang_tag}",
        ocr_text=text,
        force=True,
    )


class TestDetectionCoverage:
    @pytest.mark.parametrize("language", list(_SPECIFIC_LANGUAGES))
    def test_specific_detection(self, language, tmp_path):
        frag = _DETECTION_FRAGMENTS[language] if language != "en" else _ENGLISH_TEXT
        result = _detect(frag, tmp_path, language.upper())
        suffix = "" if language != "sa" else " (Sanskrit)"
        assert result.status == "SUCCESS", (language, result.error_code, result.message)
        assert result.primary_language == language, (
            language + suffix,
            result.primary_language,
            [e.to_dict() for e in result.evidence][:2],
        )

    def test_mai_shared_script_honest_fallback(self, tmp_path):
        # Maithili's terminology is a strict subset of Hindi's shared
        # Devanagari terms, so a tie falls back to the documented primary
        # (hi). We assert script coverage + DETECTED, never a fabricated mai.
        text = ("जिला दरभंगा, खाता नं. १०७, मालिक के नाम गांव जमीन, खसरा, खतियान, "
                "भूमि क्षेत्रफल. तहसील कार्यालय.")
        result = _detect(text, tmp_path, "MAI")
        assert result.status == "SUCCESS"
        assert result.primary_script == "Devanagari"
        assert result.detection_status == DetectionStatus.DETECTED

    def test_bengali_script_family(self, tmp_path):
        # Bengali-script evidence is ambiguous between bn/as/mni; the pick is
        # in the family, Hindi is never chosen for Bengali script.
        text = ("মণিপুর রাজ্য, খাতা নম্বর, মালিকের নাম, জমির বিবরণ, "
                "ভূমি রাজস্ব বিভাগের রেকর্ড।")
        result = _detect(text, tmp_path, "MNI")
        assert result.status == "SUCCESS"
        assert result.primary_script == "Bengali"
        assert result.primary_language in ("bn", "as", "mni")

    def test_unmapped_script_stays_unsupported(self, tmp_path):
        cyrillic = (
            "Государственный реестр прав на землю, отдел землеустройства, "
            "кадастровый номер участка, владелец, площадь и категория земли."
        )
        result = _detect(cyrillic, tmp_path, "CYR")
        assert result.detection_status == DetectionStatus.UNSUPPORTED
        assert result.primary_language != "en"

    def test_ol_chiki_script_registered_for_santali(self):
        #: Ol Chiki is encoded in script ranges but no trustworthy fragment is
        #: fabricated; assert registration + script-range coverage instead.
        covered = {script for _, _, script in SCRIPT_RANGES}
        assert "Ol Chiki" in covered
        assert set(SCRIPT_LANGUAGES["Ol Chiki"]) == {"sat"}
        assert SCRIPT_TO_LANGUAGE["Ol Chiki"] == "sat"


# ---------------------------------------------------------------------------
# 4. Phase 07 wiring — aliases, numerals, native-script area units
# ---------------------------------------------------------------------------

class TestPhase07Wiring:
    def test_aliases_merged_into_multilingual_aliases(self):
        import src.phase07_semantic_field_extraction as phase07
        merged = phase07.MULTILINGUAL_ALIASES
        assert any("ஏக்கர்" in a for a in merged["land.area_unit"])
        assert any("खतियान" in a or "खाता" in a for a in merged["land.khata_number"])
        assert any("గ్రామం" in a for a in merged["location.village"])
        assert any("సర్వే" in a for a in merged["land.survey_number"])
        assert "mutation.mutation_number" in merged

    def test_date_normalization_indic_numeral(self):
        import src.phase07_semantic_field_extraction as phase07
        assert phase07.normalize_date("१२-०६-२०१८") == "2018-06-12"
        assert phase07.normalize_date("১২-০৬-২০১৮") == "2018-06-12"
        assert phase07.normalize_date("۱۲-۰۶-۲۰۱۸") == "2018-06-12"

    def test_area_normalization_native_scripts(self):
        import src.phase07_semantic_field_extraction as phase07
        value, unit = phase07.normalize_area("क्षेत्रफल ०.३२ एकड़")
        assert value == pytest.approx(0.32)
        assert unit == "ACRE"
        value, unit = phase07.normalize_area("आয়তন ১.৫ একর")
        assert value == pytest.approx(1.5)
        assert unit == "ACRE"
        value, unit = phase07.normalize_area("பரப்பளவு 2.5 ஏக்கர்")
        assert value == pytest.approx(2.5)
        assert unit == "ACRE"

    def test_extract_number_indic_digits(self):
        import src.phase07_semantic_field_extraction as phase07
        assert phase07.extract_number("१०७") == "107"
        assert phase07.extract_number("౧౦౭") == "107"
        assert phase07.extract_number("१२३") == "123"

    def test_valid_date_candidate_indic(self):
        import src.phase07_semantic_field_extraction as phase07
        assert phase07.is_valid_date_candidate("१२-०६-२०१८") is True

    def test_reasonable_numeric_field_indic(self):
        import src.phase07_semantic_field_extraction as phase07
        assert phase07.is_reasonable_numeric_field("१०७") is True


# ---------------------------------------------------------------------------
# 5. Capability matrix (honest vocabulary) + API endpoint
# ---------------------------------------------------------------------------

class TestCapabilityMatrix:
    @staticmethod
    def _matrix():
        return build_capability_matrix(
            tesseract_installed={"merged": ["eng", "hin", "ben"]}, ollama_models=[]
        )

    def test_matrix_shape(self):
        matrix = self._matrix()
        assert matrix["languages"]
        assert matrix["engines"]
        seen = {row["language"] for row in matrix["languages"]}
        assert seen == set(SUPPORTED_LANGUAGES)

    def test_honest_verified(self):
        by_lang = {row["language"]: row for row in self._matrix()["languages"]}
        assert by_lang["hi"]["ocr"] == "VERIFIED"
        assert by_lang["hi"]["tesseract_installed"] == "VERIFIED"

    def test_honest_unavailable(self):
        by_lang = {row["language"]: row for row in self._matrix()["languages"]}
        assert by_lang["sat"]["ocr"] == "UNAVAILABLE"
        assert by_lang["brx"]["ocr"] == "UNAVAILABLE"
        # detection is CONFIGURED (script ranges), never fabricated VERIFIED.
        assert by_lang["sat"]["detection"] == "CONFIGURED"
        assert by_lang["doi"]["ocr"] == "UNAVAILABLE"
        assert by_lang["sd"]["ocr"] == "UNAVAILABLE"

    def test_capability_endpoint(self, client):
        response = client.get("/api/digitization/language-capabilities")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "SUCCESS"
        assert len(data["scheduled_languages"]) == 22
        assert data["capabilities"]["languages"]
        assert data["verified_languages"]


# ---------------------------------------------------------------------------
# 6. Real-image evidence-driven detection (en / hi / bn)
# ---------------------------------------------------------------------------

BASE = Path(__file__).parent.parent
_REAL_EN = BASE / "uploads" / "samples" / "test sample english medium.png"
_REAL_HI = BASE / "uploads" / "test sample hindi medium.png"
_REAL_BN = BASE / "uploads" / "test sample bengali medium.png"


def _run_real_detect(sample: Path, tmp_path):
    from src.phase01_ingestion import DocumentIngestionService, IngestionStatus
    data = sample.read_bytes()
    ingested = DocumentIngestionService().ingest(data, sample.name)
    assert ingested.status == IngestionStatus.SUCCESS
    return LanguageAndScriptDetectionService(
        storage_dir=tmp_path / "phase_05"
    ).detect(
        record_id=ingested.record_id,
        document_id=ingested.document_id,
        ingestion_id=ingested.ingestion_id,
        force=True,
    )


@pytest.mark.skipif(not _REAL_EN.exists(), reason="english sample missing")
def test_real_english_detection(tmp_path):
    result = _run_real_detect(_REAL_EN, tmp_path)
    assert result.status == "SUCCESS"
    assert result.primary_language == "en"
    assert result.primary_script == "Latin"
    assert result.ocr_routing.language_codes == ["eng"]


@pytest.mark.skipif(not _REAL_HI.exists(), reason="hindi sample missing")
def test_real_hindi_detection(tmp_path):
    result = _run_real_detect(_REAL_HI, tmp_path)
    assert result.status == "SUCCESS"
    assert result.primary_language == "hi"
    assert result.primary_script == "Devanagari"
    assert result.ocr_routing.language_codes == ["hin"]


@pytest.mark.skipif(not _REAL_BN.exists(), reason="bengali sample missing")
def test_real_bengali_detection(tmp_path):
    result = _run_real_detect(_REAL_BN, tmp_path)
    assert result.status == "SUCCESS"
    assert result.primary_language == "bn"
    assert result.primary_script == "Bengali"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])