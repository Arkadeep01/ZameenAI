# OCR Complete Implementation Report

**Date:** 2026-09-29
**Scope:** `D:\ZameenAI\backend\app\ocr\` (+ `backend/app/schemas/intermediate_json.py`,
backend API wiring, frontend 7-window UI)
**Source reference:** `D:\Land Digitization` (untouched; all `src/*.py` mtimes pre-date
this work)
**Verification:** full suite **701 passed, 14 skipped, 2 environmental failures**
of 717 (incl. live `qwen3:8b` end-to-end extraction). Status labels per §11 key at
the end of each layer section.

Status key: IMPLEMENTED / PARTIALLY IMPLEMENTED / SCAFFOLDED / INTEGRATED /
NOT INTEGRATED / SOURCE-ONLY / MOCK / UNVERIFIED / BLOCKED / NOT IMPLEMENTED.
“Implementation” = code exists and runs; “Integration” = wired into the
production path (served backend + real data flow).

---

## 1. Executive Summary

The Land Digitization pipeline (Phases 01–11) is migrated, decomposed
(20 flat files → 82 authoritative modules in 18 packages, verbatim moves),
and verified: **IMPLEMENTED + test-INTEGRATED**, but **NOT INTEGRATED into the
served product**. Production serving is FastAPI (`backend/app/main.py`:
`/api/upload`, `/api/gis/*`); the OCR pipeline is a separate Flask app
(`app.ocr.api`) exercised only by tests; the frontend 7-window UI is
local-state mock (no backend calls); the Pydantic JSON layer is never
imported by pipeline code; duplicate detection is local-filesystem-only
(no PostgreSQL); HITL has no RBAC; the correction loop is legacy and
disconnected from HITL at both ends. Details and evidence below.

## 2. Source Migration Status

All 19 `src/*` modules + `app.py` migrated to `backend/app/ocr/` (manifest
traceability matrix unchanged). Post-migration decomposition moved every
class/function/constant into domain packages; the 20 original paths remain
as 9–22-line re-export facades (zero logic, AST-verified) preserving the
`phaseXX` convention and the `src.*` import surface used by all tests and by
deliberate lazy cross-phase bridges. Decorator parity audited (109 restored,
0 mismatches). `D:\Land Digitization` untouched.

## 3. Final Architecture

```
backend/app/ocr/
  paths.py Brill stable anchors (OCR_DIR/APP_DIR/BACKEND_DIR)
  core/           tesseract_engine, surya_config, surya_adapter, surya_runner
  preprocessing/  quality, deskew, enhancement, pipeline,
                  ai_models, metrics, decision, image_ops, layout,
                  restoration, ai_service
  ingestion/      models, ids, validators, service          (Phase 01)
  quality/        models, metrics, loaders, service          (Phase 02)
  classification/ models, classifiers, bridge, service      (Phase 04)
  language/       registry, numerals, capability, lang_models,
                  script_detection, providers, lang_service (Phase 05 det.)
  ocr_config/     models, probes, service                   (Phase 05 cfg)
  recognition/    models, layout, artifacts, words, tables,
                  evidence, service                         (Phase 06)
  extraction/     models, terminology, normalization, evidence,
                  candidates, llm, pipeline                 (Phase 07)
  confidence/     models, engine, service                   (Phase 08)
  validation/     models, rules, engine, service            (Phase 09 gate)
  anomaly/        models, normalize, engines, stage          (Phase 10 detect)
  remediation/    models, issues, service                   (Phase 09 loop)
  resubmission/   models, file_helpers, service             (Phase 10 loop)
  hitl/           models, store, service                    (Phase 11 HITL-1)
  reprocessing/   models, file_helpers, service             (Phase 11 rerun)
  utils/          time_ids, hashing, json_io, file_utils
  api/            app_factory, ingest_quality, classify_ocr, workflow (Flask)
```

## 4. File Migration Mapping

See `MIGRATION_MANIFEST.md` §2 (flat copy) and §4.2 (decomposition
source→destination per file). No file was deleted from ZameenAI; nothing was
deleted from the source repo.

## 5. File Decomposition

Method: AST verbatim extraction per responsibility → sibling `models /
helpers / engines / service` packages with DAG star-imports + explicit
`_private` imports (star never carries them) → root facades re-export public
+ private names → 0 import cycles → import rewrite to canonical
`app.ocr.<package>.<module>` paths (~200 dead imports dropped) → storage
paths pinned to `paths.py` anchors (byte-identical to flat layout) →
duplicates consolidated to `utils/` + `resolve_project_tessdata_dir`.

## 6. Deleted/Retained Old Files

Full table in `docs/ocr_migration_cleanup_report.md`: **20 found, 0 deleted,
20 retained** as required zero-logic facades (each referenced by tests
and/or runtime lazy bridges), ~30 helper duplicates merged, 0 renames,
6 newly created, no unresolved code duplicates.

## 7. OCR Implementation

- **Engines:** Tesseract primary (`core/tesseract_engine.py`:
  `configure_tesseract`, `run_real_ocr`, `run_ocr_with_data`,
  `ocr_region`, `ocr_images`, `ocr_layout_regions`); Surya llamacpp adapter
  (`core/surya_config.py`, `surya_adapter.py`, `surya_runner.py`); Roboflow
  artifact detection (`recognition/artifacts.py`, key-gated).
- **Recognition:** `recognition/service.py` (`OCRService.perform_ocr`) with
  native-PDF fast path, layout regions (Surya/Phase-03/fallback),
  artifact masking, word→line building, table-grid OCR, dedup/suppression,
  government-evidence + numeric tokens; persists `{doc}_ocr.json`,
  `{doc}_ocr_text.txt`, `{doc}_ocr_evidence.json` under
  `backend/app/uploads/processing/phase_06/`.
- Status: implementation **IMPLEMENTED** (Tesseract path fully tested;
  Surya path honest UNAVAILABLE without provisioned backend),
  integration **test-only** (Flask route, not served by FastAPI).

## 8. Preprocessing Implementation

- Basic: `preprocessing/quality.py` (contrast/brightness triage),
  `deskew.py` (Hough), `enhancement.py` (low/medium/high strategies),
  `pipeline.py` (orchestrator + Tesseract PSM map).
- AI: `preprocessing/metrics.py` (blur/brightness/contrast/skew/
  readability), `decision.py` (strategy planning), `image_ops.py`
  (denoise/CLAHE/deskew/upscale/binarize), `layout.py` (tables/text/
  header/footer regions), `restoration.py` (low-quality candidates),
  `ai_service.py` (derivative selection + persistence).
- Status: **IMPLEMENTED**, integration test-only.

## 9. Classification Implementation

`classification/classifiers.py` (title/text/layout evidence + aggregation),
`bridge.py` (Phase-03 evidence loading), `service.py`
(`DocumentClassificationService`), types incl. RoR/Khatian/Deed.
Status: **IMPLEMENTED**, integration test-only.

## 10. Language/Script Implementation

- Registry: 22 scheduled languages, scripts, Unicode ranges, terminology,
  numeral folding, capability matrix (`language/registry.py`,
  `numerals.py`, `capability.py`).
- Detection: script statistics + terminology + OCR-preview evidence with
  multi-engine fusion (`script_detection.py`), local + Gemini providers
  (`providers.py`), service (`lang_service.py`); OCR routing
  (`lang_models.py`); engine configuration (`ocr_config/`).
- Live verification: `hin`/`ben` packs resolve via migrated
  `backend/tessdata` (probe repaired during decomposition).
- Status: detection/configuration **IMPLEMENTED**; Gemini live-translate
  provider **BLOCKED** by installed SDK (`google-genai 1.73.1` lacks
  `types.TranslationConfig`; 1 test fails environmentally).

## 11. NLP/Semantic Extraction

28 canonical fields; label/alias matching (`terminology.py`), value
normalization (`normalization.py`), evidence model
(`evidence.py`), candidate generation/validation/reconciliation
(`candidates.py`), IndicBART/Mistral/Ollama providers with LLM-output
grounding (`llm.py`), pipeline + service (`pipeline.py`).
Live `qwen3:8b` end-to-end extraction passes (229 s).
Status: **IMPLEMENTED**, integration test-only.

## 12. JSON Intermediate Layer

- `backend/app/schemas/intermediate_json.py` defines Pydantic models for
  every stage (OCR → extraction → confidence → validation →
  anomaly/duplicate → HITL → canonical record + pipeline artifact).
- **Verified: zero imports of `intermediate_json` anywhere in
  `backend/app`.** The running pipeline passes plain dicts/JSON files
  using each service's `to_dict()` contract. The Pydantic layer is
  therefore **SCAFFOLDED / SOURCE-ONLY, NOT INTEGRATED** — a real
  architectural gap, not a silent pass-through (no unstructured dict
  *replaces* a schema anywhere; rather the defined schemas are unused).
- Per-stage persisted JSON files exist and are versioned
  (`{doc}_confidence_completeness.json` etc.), so stage I/O is stable,
  just not Pydantic-validated.

## 13. Confidence & Completeness

- Files: `confidence/models.py` (weights, bands, thresholds, enums,
  dataclasses), `engine.py` (`ConfidenceCompletenessEngine`), `service.py`
  (Phase-07/OCR loaders, persistence, factory).
- Per-field: **yes** — 6-factor weighted sum
  (semantic 0.3 from Phase-07 confidence; ocr 0.2 derived;
  evidence 0.15 from extraction method table; structural 0.15;
  validation 0.1 from raw/normalized presence; agreement 0.1 from
  conflict alternatives), capped 0.99.
- Document-level: **yes** — unweighted mean over present/conflicting
  fields, capped 0.99, banded HIGH ≥0.85 / MEDIUM ≥0.6 / LOW.
- Completeness: **separate** — priority-weighted
  (CRITICAL 1.0 / IMPORTANT 0.5 / OPTIONAL 0.25; unreadable earns 0.3×).
- Review triggers: critical-missing → REMEDIATION_REQUIRED;
  completeness <0.25 → INCOMPLETE; <0.5 → REMEDIATION_REQUIRED;
  critical conflict → REVIEW_REQUIRED; conf ≥0.8 + complete ≥0.85 →
  READY_FOR_VALIDATION; conf ≥0.6 → REVIEW_REQUIRED else REMEDIATION.
- Low-confidence fields individually identifiable (`fields{fn:
  {confidence, value_status, confidence_factors, in_conflict}}`,
  `LOW_CONFIDENCE` label <0.6).
- Persisted: yes (`phase_08/{record}/{doc}_confidence_completeness.json`).
- Frontend: **no** — UI shows hardcoded statics (e.g. 99.5/98.7/89.5);
  no fetch of the confidence endpoint. Nothing hardcoded in backend
  scoring (all constants are documented heuristic weights).
- No functional change vs original.
- Status: implementation **IMPLEMENTED**, integration **test-only**
  (Flask `POST /api/digitization/confidence-completeness`; not served).

## 14. Automated Validation

15 deterministic rule categories (`validation/rules.py`, `engine.py`):
field-value, cross-field, location-hierarchy (optional JSON reference DB,
honest UNAVAILABLE without it); decisions include `READY_FOR_HITL`,
`REVIEW_REQUIRED`, `DUPLICATE_SUSPECTED`, `ANOMALY_DETECTED`, `BLOCKED`,
`VALIDATION_FAILED`; **never self-approves**. Runs persisted under
`processing/phase_12/` (validation-runs dir). Flask endpoints implemented
+ tested.
Status: **IMPLEMENTED**, integration test-only.

## 15. Anomaly Detection

13 categories, all rule-based on normalized Phase-08 assessments
(`anomaly/engines.py`): ownership/mutation/boundary conflicts,
area-range (0.01–10000.0) and inconsistency, location string-equality
(district==block, block==mouza), classification conflict (validation path
only), duplicate-mapped findings, repeated-values (≥5 fields),
conflicting OCR/semantic candidates (0.1 confidence slack),
unusual-but-valid identifiers (>1,000,000). Severities INFO/WARNING/ERROR
(`CRITICAL` in enum, never emitted). No ML, no GIS, no coordinates.
Status: **IMPLEMENTED**, integration test-only.

## 16. Duplicate Detection

- Strategies: exact `RECORD` (khata+plot 0.88, 0.94 with owner match),
  exact registration doc-number (0.90), mutation number (0.70), exact
  composite (ratio ≥0.5 over ≥4 common fields → 0.5+0.45·ratio), fuzzy
  numeric-core hint (0.5, "hint, never a finding").
- Thresholds: SUSPECTED ≥0.5, CONFIRMED ≥0.9. `DOCUMENT` match type
  declared but **never emitted** (dead mapping branch).
- **Local-dataset-only**: scans Phase-08 output dirs (fingerprint:
  state/district/mouza/village + khata/plot/survey + owner-in-composite).
  Zero DB imports; **not connected to PostgreSQL**; compares against
  previously digitized records **only if their Phase-08 JSON sits in the
  scanned dir**.
- Never auto-rejects: CONFIRMED → `BLOCKED` workflow state but still
  requires human verdict; anomalies alone → `NEEDS_REVIEW`.
- Human can override (HITL `submit()` is the only decider; no veto).
- Frontend: not exposed (no UI, no fetch).
- Status: **IMPLEMENTED (local scope)**, integration test-only;
  registry/DB-backed matching **NOT IMPLEMENTED**.

## 17. HITL Verification

- Sessions (`hitl/service.py`): open from validation run
  (`READY_FOR_HITL`, id `HITL1-YYYYMMDD-<10hex>`), reviewer string
  required (self-asserted, **no auth/RBAC**), field reviews
  (VERIFY/CORRECT/UNRESOLVED; CORRECT preserves original, requires value),
  notes, submit (`VERIFIED` needs all flagged fields dispositioned;
  `CORRECTION_REQUIRED`/`REJECTED` need reason), terminal immutability
  (`VERIFIED/CORRECTION_REQUIRED/REJECTED`).
- Verified state paths: READY→UNDER_REVIEW→{VERIFIED, CORRECTION_REQUIRED,
  REJECTED} all exist; **`CORRECTION_REQUIRED` is terminal — no
  resubmission/reprocessing loop is wired**; `add_note` and record-session
  listing have **no API routes**.
- Persisted per-record JSON with full audit trail
  (history/notes/field_reviews/evidence/timestamps).
- Frontend/RBAC: absent (mock UIs only; reviewer strings spoofable).
- Status: **IMPLEMENTED**, integration test-only (4 Flask routes).

## 18. Correction

Uploader remediation (`remediation/`): auto-trigger from Phase-08
statuses (REMEDIATION_REQUIRED/INCOMPLETE always; REVIEW only with
critical gaps), 19 issue types with severity, evidence upload with
structural validation (50 MB, type/magic/PDF/image checks, sha dedup),
uploader-match guard. `CORRECTION_REQUIRED` from HITL does **not**
create remediation (disconnected). Status: **IMPLEMENTED**, integration
test-only (Flask, legacy-labeled).

## 19. Resubmission

Types: complete-document / page-replacement / additional-evidence
(`REMEDIATION_RESUBMISSION` enum value never assigned); page-level
provenance (KEPT/REPLACED/ADDED/SUPPORTING with hashes); version/attempt
tracking with parent linkage; originals never overwritten (immutable
evidence copies); strict status machine with retry edge only for
`FAILED→QUEUED`. Status: **IMPLEMENTED**, integration test-only.

## 20. Reprocessing

Reruns **exactly phases 02→08** (quality, preprocessing,
classification, language+OCR-config, Tesseract OCR, extraction,
confidence) on an assembled corrected document into synthetic
`~REP-SUB` scope; compares old/new (change/regression detection);
decides CASE_A (ready→`PHASE_12_AUTOMATED_VALIDATION` string),
CASE_B (review), CASE_C (remediation loop), CASE_D (extraction error);
max 3 attempts, transient-only retry. **Validation/anomaly are NOT
rerun; no HITL session is created.** Status: **IMPLEMENTED**,
integration test-only.

## 21. Database Persistence

Pipeline persistence is **filesystem JSON** (`backend/app/uploads/`,
`backend/app/ocr/uploads/`). No pipeline stage reads/writes PostgreSQL;
`land_record.py` model from the manifest does not exist in the repo;
`app/database/` serves GIS/parcel models only. Status for OCR data:
**NOT IMPLEMENTED** (filesystem IMPLEMENTED).

## 22. API Integration

All pipeline endpoints exist on the **Flask** app (`api/app_factory.py`
advertises 7 production + 9 legacy-loop + 4 HITL routes) with endpoint
tests green. But the served product (`app/main.py`, FastAPI) mounts only
`/api/upload` + `/api/gis/*` — **no `/api/digitization/*` route is
served**. Status: API layer **IMPLEMENTED**, product integration
**NOT INTEGRATED** (test-client only).

## 23. Frontend 7-Window Integration

`citizen.digitalizations.tsx` is a local-state wizard (upload →
simulated progress → local corrections, hardcoded confidences);
`desk-validator`/`pia`/`dashboard` similar mocks. Zero `fetch`/`axios`
calls to digitization/HITL/validation endpoints; only `/api/upload`
and `/api/gis/*` are wired. Status: **MOCK/SCAFFOLDED, NOT INTEGRATED**.

## 24. Cross-Layer Data Flow

| Arrow | Module / schema | Implemented? |
|---|---|---|
| OCR → JSON | `recognition/service.py` persists `{doc}_ocr.json/_ocr_text.txt/_ocr_evidence.json` (`to_dict` contract) | ✅ |
| JSON → NLP | `extraction/pipeline.py` loads Phase-06 artifacts + classification | ✅ |
| NLP → Confidence | `confidence/service.py` loads `{doc}_extraction_metadata.json` (+OCR text) | ✅ |
| Confidence → Completeness | same engine pass (`_completeness`) | ✅ (single stage) |
| Confidence → Validation | `validation/service.py` loads `{doc}_confidence_completeness.json` | ✅ |
| Validation → Anomaly/Duplicate | `anomaly/stage.py create_from_validation_run` via `validation_run_id` | ✅ |
| Anomaly → HITL | `STAGE_NEXT_PHASE=PHASE_11_HITL_1`; HITL links latest `ADP-*.json` | ✅ (advisory; flags derive from Phase-08 only) |
| HITL → Correction | ❌ | **Broken**: `CORRECTION_REQUIRED` terminal, no wiring |
| Correction → Resubmission | `SUBMITTED/PROCESSING` handoff | ✅ |
| Resubmission → Reprocessing | internal submission load | ✅ |
| Reprocessing → OCR/Extraction/Confidence | `_phase06/_phase07/_phase08` rerun | ✅ |
| → Validation/Anomaly/HITL | routing strings only (`PHASE_12_*`, nonexistent) | ❌ strings, not executed |
| → Final verified record | canonical Pydantic record never populated by pipeline | ❌ (frontend shows mocks) |

Broken links: HITL-out, reprocessing-out (validation/anomaly/HITL),
DB landing, served-API mounting, frontend wiring, Pydantic-layer usage.

## 25. Model/Runtime Dependencies

Tesseract binary present (system packs eng+osd; hin/ben via migrated
`backend/tessdata` through repaired probe). Ollama `qwen3:8b` live and
passing. Gemini provider **BLOCKED** (SDK 1.73.1 < required 2.22.0).
Surya **unprovisioned** in ZameenAI (honest UNAVAILABLE; bundle only in
source `tools/`). `.venv-surya` absent in ZameenAI. No GPU requirement
for the passing suite.

## 26. Tests

717 total: **701 passed, 14 skipped, 2 environmental failures**
(`live_translate_config_contract` SDK drift; `runner_env_forces_llamacpp`
unprovisioned binary — both fail identically on pristine code). 8 test
files updated to decomposed-module references (patch targets, docker
source scan, no-duplicate-pipeline structural test, Flask fixture);
source-repo tests untouched. Coverage spans every phase, API contracts,
and live Ollama e2e.

## 27. Real Document End-to-End Verification

- Sample scans (`backend/uploads/samples`, `backend/app/uploads/samples`)
  flow through ingest→quality→preprocess→classify→language→OCR→extract→
  confidence→validation→anomaly→HITL in tests (incl. real RoR
  `LR-2026-000002` chains and reprocessing Phases 03–08 rerun).
- Live `qwen3:8b` semantic extraction passes on a real RoR OCR document.
- Demo ingest endpoints return 200 on bundled samples.

## 28. Remaining Gaps

1. Pydantic JSON layer unused by pipeline (Schemas exist; wiring absent).
2. No PostgreSQL persistence for pipeline records; no registry duplicate
   lookup; `DOCUMENT` duplicate branch dead.
3. Correction loop disconnected at both ends (HITL-out, validation-out).
4. `PHASE_12_*` routing strings reference nonexistent numbering.
5. HITL `add_note`/record-listing have no routes; no RBAC anywhere on HITL.
6. Flask OCR API unmounted from served FastAPI; frontend fully mock.
7. Hindi/Bengali demo scans unmigrated; `.venv-surya`/llama bundle
   unmigrated (Surya stays UNAVAILABLE).
8. Lookalike names across layers (`OCRRouting`, `OCRWord`, `Severity`,
   `normalize_name`, …) verified distinct but invite confusion.

## 29. Known Limitations

- Heuristic weights/thresholds throughout confidence/validation/anomaly
  are expert constants, not learned; overall confidence is an unweighted
  mean; `ocr` factor derives from extraction confidence (no direct
  Tesseract score input).
- Duplicate detection recalls only Phase-08 JSONs present in one scanned
  directory; cross-district registry checks don't exist.
- Human override is total (no programmatic veto even on CONFIRMED
  duplicates) and reviewer identity is self-asserted.
- Full suite takes ~13 min (live LLM inference).

## 30. Final Verdict

- (1) Old redundant files cleaned: **yes** — audit complete, 0 deletions
  justified (all 20 facades actively required), dead code removed,
  report in `docs/ocr_migration_cleanup_report.md`.
- (2) No duplicate active implementations: **yes** (verified).
- (3) Source repo untouched: **yes**.
- (4–11) OCR/NLP/JSON/confidence/validation/anomaly-duplicate/HITL/
  correction chain: **implemented and test-verified**, except the JSON
  Pydantic layer is unused (Schemas scaffolded) and the HITL↔loop
  junctions are strings, not wiring.
- (12–13) Backend APIs expose real outputs **via Flask (tested) but not
  via the served FastAPI**; frontend receives **mock data only**.
- (14–15) End-to-end document processing succeeds in tests; suite
  701/717 (2 environmental failures documented).
- (16) Limitations above are explicit.
- Honest overall label: pipeline **IMPLEMENTED + test-INTEGRATED**;
  product integration (served API, DB, UI, Pydantic contracts, registry
  dedup, RBAC, loop closure) **NOT INTEGRATED** — that is the remaining
  program, tracked in §§28–29.
