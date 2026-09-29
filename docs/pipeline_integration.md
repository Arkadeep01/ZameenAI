# Pipeline Integration (migrated OCR → FastAPI)

## Authority map (no duplicates)

| Phase | Authoritative service | FastAPI entry |
|---|---|---|
| 01 ingestion | `app/ocr/ingestion/service.py` | `POST /api/digitization/ingest`, `POST /api/jobs` |
| 02 quality | `app/ocr/quality/service.py` | `/quality-check`, orchestrator |
| 03 preprocessing | `app/ocr/preprocessing/ai_service.py` | `/preprocess`, orchestrator |
| 04 classification | `app/ocr/classification/service.py` | `/classify`, orchestrator |
| 05a language | `app/ocr/language/lang_service.py` | `/language-detection`, orchestrator |
| 05b ocr-config | `app/ocr/ocr_config/service.py` | `/ocr-config`, orchestrator |
| 06 OCR | `app/ocr/recognition/service.py` (+`core/tesseract_engine.py`, `core/surya_*`) | `/ocr`, orchestrator |
| 07 extraction | `app/ocr/extraction/pipeline.py` | `/extract`, orchestrator |
| 08 confidence | `app/ocr/confidence/service.py` | `/confidence-completeness`, orchestrator |
| 09 validation | `app/ocr/validation/service.py` | `/automated-validation`, orchestrator |
| 09-remediation | `app/ocr/remediation/service.py` | `/remediation*`, orchestrator via workflow |
| 10 anomaly/dup | `app/ocr/anomaly/stage.py` + `engines.py` | `/anomaly-duplicate*`, orchestrator |
| 10 resubmission | `app/ocr/resubmission/service.py` | `/resubmission*`, workflow |
| 11 HITL | `app/ocr/hitl/service.py` | `/hitl-1/*`, `/workflow/hitl/*/decision` |
| 11 reprocessing | `app/ocr/reprocessing/service.py` | `/reprocess*`, workflow |

`phaseXX_*.py` files remain as re-export facades; `src.*` import alias
kept for the 717 migrated tests.

## Orchestrator (`app/services/digitization_orchestrator.py`)

- `start_job(bytes, filename, created_by, run_pipeline)` → Phase 01, DB
  `documents` + `digitization_jobs` rows, optional full run.
- `run_pipeline(job_id|ids, from_phase?)` → executes 02→11 in order with
  per-service success predicates (each service has its own status
  vocabulary), persists `pipeline_phase_executions`, stops on first real
  failure with `{error_code, message}`, opens HITL-1 when validation needs
  review, returns provenance/confidence payloads verbatim.
- Verified live: sample PNG → SUCCESS through validation/anomaly →
  `AWAITING_HITL` with `validation_run_id` + `hitl_id` (OCR 137 words,
  real Tesseract; extraction PARTIAL with unavailable-LLM warnings, never
  fabricated).
- Contract fixes applied during integration (behavior-preserving):
  classification `predicted_document_type` accepted as success; OCR config
  `configuration.language` ("eng") used instead of BCP-47 `language`
  ("en"); `classification_status` preferred over missing `status`.

## OCR provider boundary

- Tesseract via `core/tesseract_engine.py`; packs probed live
  (`/api/providers/ocr`); missing packs → explicit
  `OCR_LANGUAGE_UNAVAILABLE`, never silent English fallback.
- Surya layout / Roboflow artifacts report `UNAVAILABLE` when unconfigured
  and the pipeline continues with Tesseract evidence (warnings preserved).
- LLM extraction (IndicBART/mistral/ollama) degrades to deterministic
  extractors with `UNAVAILABLE` model statuses recorded in the result.
