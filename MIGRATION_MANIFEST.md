# ZameenAI Land Digitization Migration Manifest

**Authoritative Source Reference:** `D:\Land Digitization` (Untouched, preserved read-only)  
**Target Architecture:** `D:\ZameenAI`  
**Date of Migration:** 2026-09-29  
**Status:** In Progress / Active Integration  

---

## 1. Migration Overview

Every file in the Land Digitization processing chain has been mapped directly into the ZameenAI architecture under `backend/app/ocr/`, preserving 100% of the original domain logic, heuristic weights, validation rules, anomaly categories, and human verification constraints.

---

## 2. Complete Module Traceability Matrix

| Original Source Path (`D:\Land Digitization\`) | Destination Path (`D:\ZameenAI\`) | Original Responsibility | Destination Responsibility | Status | Primary Dependencies | Associated Tests |
|---|---|---|---|---|---|---|
| `src/image_preprocessing.py` | `backend/app/ocr/image_preprocessing.py` | Adaptive contrast, CLAHE, deskew, noise removal | Image quality assessment & OCR enhancement | Copied & Verified | PIL, OpenCV, numpy | `test_phase03_ai_document_preprocessing.py` |
| `src/multilingual_registry.py` | `backend/app/ocr/multilingual_registry.py` | 22 Scheduled Indian languages, scripts, OCR matrix | Multilingual capabilities & script lookup | Copied & Verified | json, os, subprocess | `test_multilingual_support.py` |
| `src/ocr.py` | `backend/app/ocr/ocr.py` | Tesseract character recognition wrapper | Primary character & line recognition engine | Copied & Verified | pytesseract, PIL | `test_phase06_ocr_visual_text_recognition.py` |
| `src/phase01_ingestion.py` | `backend/app/ocr/phase01_ingestion.py` | Document upload, hashing, PDF/image page splitting | Window 1: Ingestion & file validation | Copied & Verified | pymupdf, PIL, hashlib | `test_phase01_ingestion.py` |
| `src/phase02_quality_check.py` | `backend/app/ocr/phase02_quality_check.py` | Blur, DPI, brightness, contrast, skew assessment | Window 2: Quality & completeness check | Copied & Verified | cv2, numpy, pymupdf | `test_phase02_quality_check.py` |
| `src/phase03_ai_document_preprocessing.py` | `backend/app/ocr/phase03_ai_document_preprocessing.py` | AI geometric enhancement, orientation, shadow removal | Window 3: AI Document Preprocessing | Copied & Verified | cv2, PIL, pymupdf | `test_phase03_ai_document_preprocessing.py`, `test_phase_03_integration.py` |
| `src/phase04_document_classification.py` | `backend/app/ocr/phase04_document_classification.py` | Document type classifier (RoR, Khatian, Deed, etc.) | Window 4: Document Classification | Copied & Verified | PIL, ocr | `test_phase04_document_classification.py` |
| `src/phase05_language_and_script_detection.py` | `backend/app/ocr/phase05_language_and_script_detection.py` | Script and language detector with multi-engine fallback | Window 5: Language & Script Detection | Copied & Verified | google-genai, ocr | `test_phase05_language_and_script_detection.py` |
| `src/phase05_ocr_configuration.py` | `backend/app/ocr/phase05_ocr_configuration.py` | Engine parameters, PSM/OEM config, language pack routing | Window 5: OCR Engine Configuration | Copied & Verified | ocr, classification | `test_phase05_ocr_configuration.py` |
| `src/phase06_ocr_visual_text_recognition.py` | `backend/app/ocr/phase06_ocr_visual_text_recognition.py` | Visual text recognition, line/word extraction, bboxes | Window 5: OCR Recognition | Copied & Verified | pytesseract, surya | `test_phase06_ocr_visual_text_recognition.py` |
| `src/phase06_surya_local.py` | `backend/app/ocr/phase06_surya_local.py` | Local Surya layout & text recognition adapter | Window 5: Local Surya Layout Adapter | Copied & Verified | surya, torch | `test_phase06_surya_local.py` |
| `src/phase07_semantic_field_extraction.py` | `backend/app/ocr/phase07_semantic_field_extraction.py` | 28 canonical fields, label matching, tables, LLM | Window 6: NLP Semantic Field Extraction | Copied & Verified | Ollama, transformers | `test_phase07_semantic_field_extraction.py`, `test_phase07_pipeline_semantic_extraction.py` |
| `src/phase08_confidence_completeness.py` | `backend/app/ocr/phase08_confidence_completeness.py` | 6-factor weighted confidence & completeness evaluation | Window 7: Confidence & Completeness Scoring | Copied & Verified | phase07, re | `test_phase08_confidence_completeness.py` |
| `src/phase09_automated_validation.py` | `backend/app/ocr/phase09_automated_validation.py` | 15 deterministic rule categories; never self-approves | Window 7: Automated Validation Gate | Copied & Verified | phase07, phase08 | `test_phase12_automated_validation.py` |
| `src/phase09_uploader_remediation.py` | `backend/app/ocr/phase09_uploader_remediation.py` | Remediation evidence generation & advice | Remediation & Correction Loop | Copied & Verified | phase01, phase08 | `test_phase09_uploader_remediation.py` |
| `src/phase10_anomaly_duplicate_detection.py` | `backend/app/ocr/phase10_anomaly_duplicate_detection.py` | 13 anomaly categories, fuzzy/exact duplicate detector | Window 7: Anomaly & Duplicate Detection | Copied & Verified | unicodedata, re | `test_phase10_anomaly_duplicate.py` |
| `src/phase10_resubmission.py` | `backend/app/ocr/phase10_resubmission.py` | Resubmission lifecycle tracking & delta checks | Resubmission Handling | Copied & Verified | phase01, phase09 | `test_phase10_resubmission.py` |
| `src/phase11_hitl_verification.py` | `backend/app/ocr/phase11_hitl_verification.py` | Human verification session lifecycle & corrections | Window 7: HITL Verification & Final Record | Copied & Verified | phase09, phase10 | `test_phase11_hitl_verification.py` |
| `src/phase11_reprocessing.py` | `backend/app/ocr/phase11_reprocessing.py` | Targeted rerun of modified/remediated stages | Reprocessing Engine | Copied & Verified | phase01..phase10 | `test_phase11_reprocessing.py` |
| `app.py` | `backend/app/ocr/flask_api_reference.py` | Original 32 Flask endpoints & routing | Architecture reference & legacy test bridge | Preserved Reference | Flask, Flask-CORS | API test suites |
| `tessdata/*` | `backend/tessdata/*` | Language training data for ben, eng, hin, osd | Multilingual OCR character models | Migrated | Tesseract binary | All OCR tests |
| `uploads/samples/*` | `backend/uploads/samples/*` | Sample scanned land records for validation & demo | Pipeline verification test assets | Migrated | PIL | Pipeline integration tests |
| `tests/*` | `backend/tests/*` | Comprehensive 21-file test suite (717 tests) | Backend test & regression suite | Migrated & Active | pytest | Complete test suite |

---

## 3. Destination Module Architecture

```
D:\ZameenAI\
  backend\
    app\
      ocr\                                <--- Authority for Land Digitization
        image_preprocessing.py
        multilingual_registry.py
        ocr.py
        phase01_ingestion.py
        phase02_quality_check.py
        phase03_ai_document_preprocessing.py
        phase04_document_classification.py
        phase05_language_and_script_detection.py
        phase05_ocr_configuration.py
        phase06_ocr_visual_text_recognition.py
        phase06_surya_local.py
        phase07_semantic_field_extraction.py
        phase08_confidence_completeness.py
        phase09_automated_validation.py
        phase09_uploader_remediation.py
        phase10_anomaly_duplicate_detection.py
        phase10_resubmission.py
        phase11_hitl_verification.py
        phase11_reprocessing.py
        __init__.py
      schemas\
        intermediate_json.py              <--- Phase 5: Structured JSON schema layer
      services\
        digitization_service.py           <--- Phase 7: Business logic & pipeline runner
      api\
        api_v1\
          digitization\
            routes.py                     <--- Phase 7: FastAPI endpoints
      database\
        models\
          land_record.py                  <--- Phase 10: PostgreSQL persistence
    tessdata\
    uploads\
    tests\
  frontend\
    src\
      routes\
        citizen.digitalizations.tsx       <--- Phase 6 & 8: Real 7-window live UI
```

---

## 4. Phase B — Code Decomposition (2026-09-29)

The flat copy under `backend/app/ocr/` was fully scanned (classes,
functions, responsibilities per file) and decomposed into
task-specific modules. Splits are verbatim moves (algorithm,
constants, error handling, provenance preserved); cross-file
duplicated helpers were consolidated to single authorities.

### 4.1 Method

1. AST-based extraction of every top-level class/function/constant
   into a responsibility package; the original `phaseXX_*` / `ocr` /
   `image_preprocessing` / `multilingual_registry` /
   `phase06_surya_local` / `flask_api_reference` files remain as thin
   re-export facades (10–22 lines) preserving the `phaseXX` naming
   convention and the `src.*` import path used by all 717 tests.
2. Restored dropped `@dataclass`/`@staticmethod`/`@app.route`
   decorators from the untouched source repo and audited
   decorator parity (0 mismatches).
3. Rewired intra-subsystem imports to canonical paths
   (`app.ocr.<package>.<module>`), removed ~200 dead copied imports,
   added explicit cross-sibling imports for `_private` names
   (star-imports never carry them), verified 0 import cycles.
4. Centralized filesystem anchors in `app/ocr/paths.py`
   (`OCR_DIR`/`APP_DIR`/`BACKEND_DIR`) so storage directories resolve
   byte-identically to the flat layout; removed stray artifacts
   written to `app/ocr/uploads/` while paths were shifted.
5. Consolidated duplicates into `app/ocr/utils/`
   (`time_ids`, `hashing`, `json_io`, `file_utils`); per-domain
   private wrappers delegate to them (formats unchanged).
6. Full suite: **701 passed, 14 skipped, 2 environmental failures**
   (details in 4.4). Source repo `D:\Land Digitization` untouched.

### 4.2 Source → destination mapping (authoritative code)

| Original flat file | New authoritative modules |
|---|---|
| `ocr.py` (247) | `core/tesseract_engine.py` — Tesseract wrapper (configure/run/data/region/page/table) |
| `image_preprocessing.py` (254) | `preprocessing/quality.py` (assessment), `deskew.py` (Hough deskew), `enhancement.py` (low/med/high strategies), `pipeline.py` (orchestrator + PSM map) |
| `multilingual_registry.py` (807) | `language/registry.py` (22-language data + loops), `numerals.py` (digit folding), `capability.py` (tesseract/ollama probes + matrix) |
| `phase01_ingestion.py` (602) | `ingestion/models.py`, `ids.py`, `validators.py`, `service.py` |
| `phase02_quality_check.py` (852) | `quality/models.py`, `metrics.py`, `loaders.py`, `service.py` |
| `phase03_ai_document_preprocessing.py` (2563) | `preprocessing/ai_models.py`, `metrics.py`, `decision.py`, `image_ops.py`, `layout.py`, `restoration.py`, `ai_service.py` |
| `phase04_document_classification.py` (1027) | `classification/models.py`, `classifiers.py`, `bridge.py` (phase03 evidence), `service.py` |
| `phase05_language_and_script_detection.py` (1317) | `language/lang_models.py`, `script_detection.py`, `providers.py`, `lang_service.py` |
| `phase05_ocr_configuration.py` (824) | `ocr_config/models.py`, `probes.py`, `service.py` |
| `phase06_ocr_visual_text_recognition.py` (2235) | `recognition/models.py`, `layout.py`, `artifacts.py`, `words.py`, `tables.py`, `evidence.py`, `service.py` |
| `phase06_surya_local.py` (483) | `core/surya_config.py`, `surya_adapter.py`, `surya_runner.py` |
| `phase07_semantic_field_extraction.py` (3448) | `extraction/models.py`, `terminology.py`, `normalization.py`, `evidence.py`, `candidates.py`, `llm.py`, `pipeline.py` |
| `phase08_confidence_completeness.py` (981) | `confidence/models.py`, `engine.py`, `service.py` |
| `phase09_automated_validation.py` (1195) | `validation/models.py`, `rules.py`, `engine.py`, `service.py` |
| `phase09_uploader_remediation.py` (1401) | `remediation/models.py`, `issues.py`, `service.py` |
| `phase10_anomaly_duplicate_detection.py` (1177) | `anomaly/models.py`, `normalize.py`, `engines.py`, `stage.py` |
| `phase10_resubmission.py` (1255) | `resubmission/models.py`, `file_helpers.py`, `service.py` |
| `phase11_hitl_verification.py` (554) | `hitl/models.py`, `store.py`, `service.py` |
| `phase11_reprocessing.py` (1485) | `reprocessing/models.py`, `file_helpers.py`, `service.py` |
| `flask_api_reference.py` (1302) | `api/app_factory.py`, `ingest_quality.py`, `classify_ocr.py`, `workflow.py` |
| (new) shared | `utils/{time_ids,hashing,json_io,file_utils}.py`, `paths.py` |

Largest remaining files are single-service orchestrators
(`reprocessing/service.py` 1274, `preprocessing/ai_service.py` 945,
`resubmission/service.py` 906, `recognition/service.py` 879) — one
class each, legitimately cohesive; all helpers/models/engines live
in sibling modules.

### 4.3 Intentional non-duplicates (verified distinct)

- `OCRRouting` in `language/lang_models.py` (detection routing:
  language_codes/preferred/script) vs `ocr_config/models.py`
  (engine config: primary/fallback).
- `OCRWord`/`TableCell` in `recognition/models.py` (OCR output)
  vs `extraction/evidence.py` (extraction evidence model).
- `PageDimensions`/`PageResult` in `quality/models.py` (gate metrics)
  vs `preprocessing/ai_models.py` (enhancement planning).
- `Severity` in `anomaly/models.py` vs `remediation/models.py`
  (different enums/rules).
- `_field_priority` in `confidence/engine.py` (returns label+weight)
  vs `validation/rules.py` (returns label).
- `normalize_name` in `anomaly/normalize.py` (match key, casefold)
  vs `extraction/normalization.py` (display title).
- `_mime_for_ext` in `remediation/service.py` (no `.pdf` entry) vs
  `resubmission/file_helpers.py` (with `.pdf`) — divergent behavior
  preserved deliberately.

### 4.4 Test results (2026-09-29, `python -m pytest tests`)

- **701 passed, 14 skipped, 2 failed** of 717 (incl. live
  `qwen3:8b` end-to-end extraction, 229 s).
- `test_live_translate_config_contract` — environmental: installed
  `google-genai 1.73.1` has no `types.TranslationConfig`
  (requirements demand `>=2.22.0`); fails identically on pristine code.
- `test_runner_env_forces_llamacpp` — environmental: no provisioned
  `llama-server` in ZameenAI (bundle lives only in source-repo
  `tools/`, never migrated); resolution returns `UNAVAILABLE` before
  and after decomposition.
- Tests updated to decomposed modules (source repo untouched):
  `patch("app.OCRService")`-style targets → canonical
  `app.ocr.api.*` / `app.ocr.core.*` paths; surya docker-source test
  now scans `core/surya_*.py`; `test_20_no_duplicate_pipeline`
  asserts the decomposed single-authority layout; Flask fixture in
  `test_phase11_reprocessing.py` imports the decomposed api package.
- Migration repairs applied during decomposition (behavior
  restorations, not rewrites): project-tessdata probe now also
  checks migrated `backend/tessdata` (hin/ben packs); demo-sample
  lookup probes migrated `uploads` trees.

