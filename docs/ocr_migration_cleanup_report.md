# OCR Migration Cleanup Report

**Date:** 2026-09-29
**Scope:** `D:\ZameenAI\backend\app\ocr\` (cleanup allowed ONLY inside `D:\ZameenAI`)
**Source repo:** `D:\Land Digitization` — verified untouched (all `src/*.py` mtimes pre-date
this work; no writes issued there).
**Prerequisite:** verification complete — final full run **701 passed, 14 skipped,
2 environmental failures** (`google-genai` SDK drift, unprovisioned `llama-server`).

## Method

For each of the 20 root-level migrated files, checked: (1) logic content by AST
(all contain zero executable statements — imports/re-exports only), (2) test
references (`from src.<stem>` / `from app.ocr.<stem>` across `backend/tests/`),
(3) application references (all `backend/app` code incl. lazy function-level
bridges), (4) runtime (full suite green). Deletion rule applied: remove ONLY if
fully superseded with zero references. Result: **nothing qualifies for deletion.**

## Per-file verdict

| Old File | Status | Replacement | Reason |
|---|---|---|---|
| `ocr.py` | Retained | `core/tesseract_engine.py` | Facade (9 lines, no logic). Referenced by `app/ocr/__init__.py`, `classification/bridge.py`, `language/lang_service.py`. |
| `image_preprocessing.py` | Retained | `preprocessing/{quality,deskew,enhancement,pipeline}.py` | Facade (10 lines). Referenced by `app/ocr/__init__.py`. |
| `multilingual_registry.py` | Retained | `language/{registry,numerals,capability}.py` | Facade (13 lines). Referenced by 1 test file + `app/ocr/__init__.py`. |
| `phase01_ingestion.py` | Retained | `ingestion/{models,ids,validators,service}.py` | Facade. 17 test refs (7 files) + 4 app refs (incl. lazy bridges in recognition/remediation/resubmission services). |
| `phase02_quality_check.py` | Retained | `quality/{models,metrics,loaders,service}.py` | Facade. 5 test refs + 3 app refs. |
| `phase03_ai_document_preprocessing.py` | Retained | `preprocessing/{ai_models,metrics,decision,image_ops,layout,restoration,ai_service}.py` | Facade. 2 test refs + 6 app refs. |
| `phase04_document_classification.py` | Retained | `classification/{models,classifiers,bridge,service}.py` | Facade. 8 test refs + 3 app refs. |
| `phase05_language_and_script_detection.py` | Retained | `language/{lang_models,script_detection,providers,lang_service}.py` | Facade. 2 test refs + 3 app refs. |
| `phase05_ocr_configuration.py` | Retained | `ocr_config/{models,probes,service}.py` | Facade. 3 test refs + 2 app refs. |
| `phase06_ocr_visual_text_recognition.py` | Retained | `recognition/{models,layout,artifacts,words,tables,evidence,service}.py` | Facade. 3 test refs + 2 app refs. |
| `phase06_surya_local.py` | Retained | `core/{surya_config,surya_adapter,surya_runner}.py` | Facade. 1 test file + `app/ocr/__init__.py`. |
| `phase07_semantic_field_extraction.py` | Retained | `extraction/{models,terminology,normalization,evidence,candidates,llm,pipeline}.py` | Facade. 11 test refs (6 files) + 4 app refs. |
| `phase08_confidence_completeness.py` | Retained | `confidence/{models,engine,service}.py` | Facade. 2 test refs + 4 app refs. |
| `phase09_automated_validation.py` | Retained | `validation/{models,rules,engine,service}.py` | Facade. 1 test ref + 2 app refs. |
| `phase09_uploader_remediation.py` | Retained | `remediation/{models,issues,service}.py` | Facade. 3 test refs + 3 app refs. |
| `phase10_anomaly_duplicate_detection.py` | Retained | `anomaly/{models,normalize,engines,stage}.py` | Facade. 2 test refs + 3 app refs. |
| `phase10_resubmission.py` | Retained | `resubmission/{models,file_helpers,service}.py` | Facade. 2 test refs + 2 app refs. |
| `phase11_hitl_verification.py` | Retained | `hitl/{models,store,service}.py` | Facade. 1 test ref + 2 app refs. |
| `phase11_reprocessing.py` | Retained | `reprocessing/{models,file_helpers,service}.py` | Facade. 3 test refs + `app/ocr/__init__.py`. |
| `flask_api_reference.py` | Retained | `api/{app_factory,ingest_quality,classify_ocr,workflow}.py` | Facade (13 lines). Referenced by `backend/tests/conftest.py` (Flask test client for all API tests). |

## Totals

- Total old files found: **20**
- Total deleted: **0** (every file is still imported by tests and/or runtime code;
  deleting any of them breaks the suite and lazy cross-phase bridges)
- Total retained: **20** (all as documented zero-logic compatibility facades, not
  duplicate implementations — each exposes exactly one authoritative package)
- Total merged: **~30 duplicated helper definitions** consolidated into 5 single
  authorities (`utils/time_ids.py`, `utils/hashing.py`, `utils/json_io.py`,
  `utils/file_utils.py`, `paths.resolve_project_tessdata_dir`)
- Total decomposed: **20 source files → 82 authoritative modules** across 18
  packages (all splits verbatim; decorator parity audited 0 mismatches)
- Total renamed: **0**
- Total newly created: **6** (`paths.py`, 4 `utils/*` canonical modules,
  `preprocessing/pipeline.py` orchestrator over extracted strategies)
- Unresolved duplicates: **none in code**. Known lookalikes verified distinct
  (see implementation report §28): two `OCRRouting` schemas, per-layer
  `OCRWord`/`TableCell`/`PageDimensions`/`PageResult`/`Severity`,
  phase-specific `_field_priority`/`normalize_name`, divergent `_mime_for_ext`.
- Dead code removed during audit: `utils/text_utils.py` (zero consumers),
  stray `app/ocr/uploads/{originals,processing}` artifacts from a transient
  path bug (empty `reports/` and `uploads/` dirs left in place for Flask).

## Notes

- Function-level `from src.*` lazy bridges inside services/api (e.g.
  `reprocessing/service.py`, `api/workflow.py`) are deliberate: they resolve
  through these facades and avoid heavy import cycles. They are not obsolete.
- `backend/uploads/samples` vs `backend/app/uploads/samples` contain identical
  demo scans (data-level duplication from migration, out of code-cleanup scope;
  demo-sample lookup probes both). Hindi/Bengali demo scans were never migrated
  (only English + 2 generic images); `hindi`/`bengali` demo keys 400 honestly.
