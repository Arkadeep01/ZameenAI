# Frontend ↔ Backend Integration Map

**Date:** 2026-09-29
**Backend source of truth:** `backend/app/api/api_v1/digitization/`
(FastAPI bridge over `app.ocr` services; same contracts as Flask
`app.ocr.api.*`). Served under `/api` → all paths below are
`/api/digitization/*` (Vite proxies `/api` → `localhost:8000`).
**Frontend surface:** `frontend/src/routes/citizen.digitalizations.tsx`
(5 wizard steps acting as the 7 windows: upload → processing
[stages 1–5] → extraction [window 6] → confidence → review [window 7]).

Conventions: `IDs` = `{record_id, document_id, ingestion_id}` carried
window-to-window from the real ingestion response. All POST bodies are
JSON unless noted. Error envelope: `{phase, status:"FAILED",
error_code, message}` with HTTP 400/404/500 — surfaced verbatim, never
converted to success.

## Window 1 — Document ingestion (UploadStep)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| File dropzone + metadata form | `FileUpload` rows (mock `addSampleFile`) | `POST /ingest` multipart `file` | real `File` bytes | `{status, record_id, document_id, ingestion_id, ...}` or `NO_FILE_PROVIDED/FILE_UNREADABLE` | map to `FileUpload` (size bytes→string, pages unknown→spinner) | to wire |
| Start AI Processing | disabled until file rows exist | same as above (upload on Start, not on select) | — | real IDs retained in pipeline state | none | to wire |
| Demo sample button (new, minimal) | — | `POST /ingest/demo` `{sample?: clear/medium/low}` | — | real ingestion payload + `demo/sample` | same as upload | to wire |

## Window 2 — Quality (ProcessingStep stage 2)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| Stage list “Quality” | timer-driven | `POST /quality-check` | `IDs` | `{status, overall_status/pages/scores/issues...}` or `MISSING_PARAMETERS` | status → stage state (done/error) | to wire |

## Window 3 — AI preprocessing (ProcessingStep stage 3)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| Stage list “Preprocessing” | timer-driven | `POST /preprocess` | `IDs` | `{status: SUCCESS/PARTIAL/REJECTED...}` (200 on all three; only FAILED→400) | REJECTED/PARTIAL shown as structured outcome, not crash | to wire |

## Window 4 — Classification (ProcessingStep stage 4)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| Stage list “Classification” | timer-driven | `POST /classify` | `IDs` (+optional evidence) | `{predicted_document_type, confidence, classification_status, ...}` (always 200) | `document_type` fed to language-detection + ocr | to wire |

## Window 5 — Language + OCR (ProcessingStep stage 5)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| Stage list “OCR” | timer-driven, `DOC-001` hardcoded | `POST /language-detection` | `IDs` + classification | `{primary_language, primary_script, ocr_routing...}` | routing → ocr_config + ocr calls | to wire |
| — | — | `GET /language-capabilities` | — | `{scheduled_languages, verified_languages, capabilities}` | language dropdown options (keep design) | to wire |
| — | — | `POST /ocr-config` | `IDs` + classification | `{configuration:{engine, language, tesseract...}, ...}` | `configuration` object passed to `/ocr` as `ocr_config` | to wire |
| OCR text/blocks/words/bboxes/confidence | fake preview box | `POST /ocr` | `IDs` + `ocr_config` (+language_detection/document_type) | `{status, pages:[{page_number, text, words[], lines[], mean_confidence...}], full_text, metrics...}` (always 200) | words→preview list; `DocumentPreview` shows real text + counts (no canvas redesign) | to wire |

## Window 6 — NLP extraction (ExtractionResultsStep)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| `EXTRACTED_DATA` nested record | hardcoded RoR object | `POST /extract` | `IDs` | `{extracted_record:{document,owner,land,location,mutation,registration,additional}, field_metadata:{name:{status,confidence,method,raw_value,normalized_value,source:{page,label,text,bbox}}}, ...}` | flatten sections → existing `EXTRACTED_FIELDS` shape (`id=canonical`, `label` from map, `value=normalized??raw`, `confidence 0..1→%`, `issue` from missing/unreadable/conflict) | to wire |
| 28 `EXTRACTED_FIELDS` + `FIELD_GROUPS` | hardcoded | same | — | `field_metadata` + `unresolved_fields/conflicts` | grouping by canonical section (same group UI) | to wire |

## Window 7a — Confidence (ConfidenceAnalysisStep)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| avg + buckets + table + `confidenceTone` | `EXTRACTED_FIELDS` math, stale 68.4% | `POST /confidence-completeness` | `IDs` | `{confidence:{overall,band}, completeness:{score,band,...}, fields:{name:{value_status,confidence,priority,confidence_factors,...}}, missing/unreadable/conflicting/critical_issues, needs_review}` | `confidence 0..1→%`; keep `confidenceTone` thresholds on real values; Validation column from `value_status` | to wire |

## Window 7b — Validation + anomaly (review window sections)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| issues banner (2 mock) | `issue:"OCR ambiguity"` | `POST /automated-validation` | `IDs` | `{decision, findings:[{field,status,severity,rule_category,reason,...}], needs_review...}` | findings → issue list (real messages) | to wire |
| — | none (no UI exists) | `POST /anomaly-duplicate` | `{validation_run_id}` (chained) or `IDs` | `{anomalies:[{category,severity,explanation,field}], duplicates:{status,matched_records:[{matched_record_id,match_type,confidence}]}, workflow_state}` | render in existing issues banner area (minimal extension, same styling) | to wire |

## Window 7c — HITL review (HumanReviewStep)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| review fields + corrections + reason | `reviewFields` from mock filter | `POST /hitl-1/open` | `{validation_run_id, reviewer}` | `{hitl1_id, status:READY_FOR_HITL, flagged_fields, field_snapshot, evidence...}` | flagged_fields → review queue (replaces mock filter) | to wire |
| Accept/Save/Incorrect (dead) | no handlers | `POST /hitl-1/{id}/review-field` | `{field, action:VERIFY/CORRECT/UNRESOLVED, value?, note?, reviewer}` | session | Accept→VERIFY, Save(correction)→CORRECT, Incorrect→UNRESOLVED | to wire |
| Approve / Send Back | reset only | `POST /hitl-1/{id}/submit` | `{decision:VERIFIED/CORRECTION_REQUIRED/REJECTED, reviewer, notes?}` | session terminal | Approve→VERIFIED; Incorrect-flow→CORRECTION_REQUIRED opens correction panel | to wire |
| reviewer identity | none (must add: one text input, minimal) | — | `reviewer` string on open/review/submit | — | single shared input | to wire |

## Correction loop (review-window extension, same styling)

| Frontend | Existing UI data | Backend endpoint | Request | Response | Adapter | Status |
|---|---|---|---|---|---|---|
| — (new compact panel on CORRECTION_REQUIRED) | — | `POST /remediation` | `IDs` (+created_by) | session `{remediation_id,...}` | — | to wire |
| evidence file input (new, minimal) | — | `POST /remediation/{id}/submit` multipart | `record_id,uploader,resolution_notes,files[]` | session SUBMITTED | — | to wire |
| — | — | `POST /resubmission` | `{record_id,document_id,remediation_id,...}` | submission | — | to wire |
| — | — | `POST /reprocess` | `{record_id,submission_id}` | run (fresh Phase-08 verdict) → feed back into Window 6 state | rerun chain, no UI reset fakery | to wire |

## Gaps (documented, not faked)

- `desk-validator.tsx` queue/dossier/audit: mock, **out of scope** (no backend case-management API exists) — left untouched, reported in integration report §23.
- Pydantic `intermediate_json.py`: unused by pipeline; frontend types mirror `to_dict()` contracts instead (no logic duplicated).
- Hindi/Bengali demo samples unmigrated (`hindi`/`bengali` keys 400 honestly).
- No WebSocket/SSE in backend → windows advance by sequential REST calls with real per-window loading states (no timers).
