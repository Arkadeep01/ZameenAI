# Frontend ↔ Backend Integration Report

**Date:** 2026-09-29
**Direction:** existing React SPA → real FastAPI backend → decomposed OCR services.
**Docs:** contract map in `docs/frontend_backend_integration_map.md`.

## 1. Existing frontend architecture

React 19 + TanStack Router (file-based) + TanStack Query + axios +
Tailwind v4, Vite (port 3005, `/api` → `localhost:8000`). No store, no
`src/api|hooks|lib` (lib empty), one service (`services/gis.ts`), one
types file (`types/gis.ts`). All digitization state was local `useState`.

## 2. Existing UI preserved

Zero visual redesign. Same layout, StepRail, cards, tables, forms,
buttons, progress/stage list, preview box, badges, wizard steps. Only
data sources, one reviewer input, one evidence picker, and the
correction panel (same styling language) changed. Removed dead lucide
`Map` import (shadowed ES `Map`).

## 3. Backend endpoints discovered

30 Flask routes in `app.ocr.api.*` (full list in
`docs/frontend_backend_integration_map.md` + Flask index). Served
product (`app/main.py`, FastAPI) previously exposed NONE of them —
only `/api/upload` + `/api/gis/*`.

## 4. API mapping

New **FastAPI bridge** `backend/app/api/api_v1/digitization/`
(`__init__.py`, `schemas.py`, `routes.py`), mounted in `api.py` →
`/api/digitization/*`. All 30 endpoints mirrored 1:1: same services,
same `to_dict()` payloads, same `error_code` envelopes, same status
codes (incl. classify-always-200 and ocr-always-200 quirks), multipart
for ingest/evidence. Zero processing logic in the bridge.
Two blocking repairs on the way: `gis.py`→`gis_demo.py` (empty
`gis/` package shadowed it — `import app.main` was broken) and lazy
DB engine in `database/connection.py` (import crashed without
`DATABASE_URL`; `seed.py` behavior unchanged).

## 5. Upload integration

`UploadStep` now takes real `File` objects (browse/camera/drop);
`Start AI Processing` POSTs multipart to `/ingest`; rows show real
name/size + backend `page_count`; real `record/document/ingestion`
ids retained in hook state. Backend 400s render in an error banner.

## 6. Seven-window integration

`useDigitizationPipeline` runs ingest→quality→preprocess→classify→
language→ocr-config→ocr→extract→confidence→validation→anomaly strictly
on responses; a failed stage stops the chain with its backend error.
`ProcessingStep` maps the 7 UI rows onto live stage states
(quality merged into Preprocessing; language/config merged into OCR;
confidence/validation/anomaly merged into Validation; Review tracks
HITL). Progress % = completed hook stages / total. Retry re-runs the
real chain. No timers remain in the flow.

## 7. OCR integration

`DocumentPreview` shows real `full_text` excerpt, page/word counts,
engine. No hardcoded text; empty OCR renders its real status.

## 8. JSON integration

Frontend types (`src/types/digitization.ts`) mirror backend
`to_dict()` contracts. The Pydantic `intermediate_json.py` layer is
still unused by the pipeline (documented gap) — frontend mirrors the
actually-served shapes instead of inventing its own.

## 9. NLP/extraction integration

`extractionToFields()` flattens real `field_metadata`
(`normalized ?? raw`, confidence 0..1→%, status→issue text) into the
existing `ExtractedField` rows; unmapped canonical fields append under
Additional Information (never dropped). `FIELD_GROUPS` kept (+3
registration slots for real backend fields).

## 10. Confidence integration

`ConfidenceAnalysisStep` renders backend `confidence.overall`,
completeness score/counts, validation decision + anomaly workflow
state; table rows come from `applyConfidence()` (real assessments);
Validation badges derive from `value_status`. No second scoring in TS.

## 11. Validation integration

Real `decision` + `findings[]` (field/severity/rule/reason) feed the
issues banner and review context. Backend failures keep their
`error_code` and never render as success.

## 12. Anomaly/duplicate integration

Real `anomalies[]` (category/severity/explanation/field) and
`duplicates.{status, matched_records[]}` shown with backend semantics
preserved (`SUSPECTED` never labeled confirmed).

## 13. HITL integration

Reviewer input (new, minimal — backend requires identity) → open
session → `flagged_fields` drive the review queue → Accept/Save/
Incorrect call `review-field` with VERIFY/CORRECT/UNRESOLVED →
Approve/Send-Back submit VERIFIED/CORRECTION_REQUIRED. Terminal states
render; only states the backend implements are used.

## 14. Correction integration

On `CORRECTION_REQUIRED`, a same-styled panel runs the real loop:
create remediation → multipart evidence submit → resubmission →
reprocess, displaying backend remediation/submission/run states and the
reprocessing decision. No local reset fakery.

## 15. Resubmission integration

Same panel (see §14) via `POST /resubmission`; submission id and
status come from the backend.

## 16. Reprocessing integration

Same panel via `POST /reprocess`; run record (decision, confidence
changes) displayed verbatim. No fake revalidation claimed.

## 17. Mock data removed

`EXTRACTED_DATA`, `EXTRACTED_FIELDS` (28 hardcoded confidences),
`addSampleFile` (`Khatian_123_4.pdf`), all 3 `setInterval` simulations,
`DOC-001`, stale `68.4%`, "Read clearly from source" default reason.
Verified: zero `EXTRACTED_*`/timer/fake-ID references remain in the
page; shipped bundle contains no `Khatian_123_4`. No silent mock
fallback exists anywhere in the new code (failures render banners).

## 18. API client changes

New `src/api/client.ts` (shared axios instance, 10-min timeout for
LLM phases, `toBackendError` preserving status + `error_code`) and
`src/api/digitization.ts` (30 typed calls, single client — no
duplicates; existing `services/gis.ts` untouched).

## 19. Type/schema changes

New `src/types/digitization.ts` (Ingest→HITL response interfaces from
`to_dict()` shapes) and `src/hooks/useDigitizationPipeline.ts`
(server-state machine). `FileUpload.pages` widened to accept backend
`"—"`. No business logic in TS (one `confidenceTone` display helper
and %-scaling predate this work and only format backend values).

## 20. Error handling

Every stage surfaces `{status, error_code, message, phase}` via
`BackendErrorBanner` with retry where meaningful; HTTP/validation/
processing errors propagate; success is never shown after failure.

## 21. Loading states

Real per-stage states (spinner rows, % from completed/total stages,
disabled buttons while running, terminal-gated review actions).
Existing visual components reused.

## 22. Backend gaps found

None blocking: all 30 needed endpoints already existed in Flask form
and were bridged (not reimplemented). Incidental repairs: GIS router
shadowing, lazy DB engine. Genuinely absent (documented, not faked):
Pydantic-layer enforcement, DB persistence, served RBAC, SSE/progress
streaming (sequential REST used instead).

## 23. Frontend gaps found

`desk-validator.tsx` (queue/dossier/audit) stays mock — no backend
case-management API exists; left untouched deliberately. Metadata
selects on upload are UI config (backend ingest takes the file only).

## 24. Tests

- Backend suite untouched and green on re-run subset (52/52 in
  `test_phase01_ingestion` + `test_phase11_hitl_verification` after
  bridge/DB/GIS edits).
- `tsc --noEmit`: 0 errors in new/changed files (15 remaining errors
  are pre-existing leaflet/GIS typings).
- `vite build` succeeds; shipped bundle verified to contain wired
  endpoints and no mock identifiers.

## 25. Real end-to-end verification

Live servers (`uvicorn :8000`, real Tesseract + Ollama): multipart
upload of a real sample → ingest → quality → preprocess → classify →
language → ocr-config → OCR (**624 chars real text**) → extract
(**27 fields**) → confidence (**0.86**) → validation (run created) →
anomaly (**8 findings**, NEEDS_REVIEW) → HITL open (3 flagged) →
review-all → submit → **VERIFIED**, every step HTTP 200 with real
payloads (`LR-2026-000144`, run `VLD-20260929-b89d352ba4`,
`HITL1-20260929-c4420f77bb`). Browser-click execution wasn't possible
in this headless sandbox (no browser automation); UI wiring is
verified by build + bundle inspection + identical API calls.

## 26. Remaining issues

1. Headless-browser click-through not run (see §25).
2. `desk-validator` still mock (no backend case API).
3. No auth/RBAC on digitization endpoints (backend-wide gap).
4. Long LLM phases block HTTP workers (no job queue/SSE).
5. Pydantic JSON layer still unenforced; no DB landing.
6. Hindi/Bengali demo samples unmigrated; Surya/Gemini unprovisioned.
