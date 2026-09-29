# ZameenAI Backend Architecture (actual implementation)

## Request flow

```text
Client → FastAPI (app/main.py, prefix /api)
  → auth dependency (app/core/deps.py, JWT from app/core/security.py)
  → route validation (Pydantic schemas in app/schemas/* + digitization bridge schemas)
  → service (app/services/* or app/ocr/*/<domain>/service.py)
  → repository / file store (app/repositories/* → domain sqlite/Postgres;
     app/uploads/processing/* JSON artifacts for OCR phases;
     PostGIS land_parcels for spatial)
  → structured JSON response / error envelope (app/core/errors.py)
```

## Key decisions

- **One served app**: `app/main.py:app`. All routers mount via
  `app/api/api_v1/api.py` under `/api` (39 → 59 paths after integration).
- **OCR authority preserved**: `app/ocr/<domain>/service.py` (decomposed
  from `phaseXX_*` facades, naming convention intact). FastAPI never
  reimplements OCR; `digitization/routes.py` and the new
  `services/digitization_orchestrator.py` delegate to it.
- **Backend owns sequencing**: `POST /api/jobs` (file + `run_pipeline=true`)
  runs Phase 01→11 via `DigitizationOrchestrator`. Per-phase
  `/api/digitization/*` bridge remains for step consumers.
- **Persistence split**: binary files stay on disk; relational state
  (documents, jobs, phases, land_records, hitl_reviews, audit_events,
  notifications, parcel links) lives in SQLAlchemy tables
  (`app/database/models/*`), Postgres-first with sqlite fallback for
  domain metadata. PostGIS tables stay Postgres-only (never faked).
- **Auth/RBAC server-side**: JWT (stdlib HS256) + 7 roles + MODULE.ACTION
  permissions (`app/core/security.py`, enforced in `app/core/deps.py` and
  service-level ownership checks).
- **Workflow unity**: `app/workflow/state_machine.py` is the single
  transition authority; `WorkflowService` derives record state from HITL /
  resubmission / reprocessing file truth and mirrors to DB.
- **GIS honesty**: `/api/gis/parcels*` flagged `demo:true`;
  `/api/gis/db/*` is the real PostGIS path (explicit error without DB);
  `/api/gis/links/*` is the explicit record↔parcel relationship;
  `/api/gis/links/capability` reports spatial auto-match as NOT implemented.
- **Errors**: `app/core/errors.py` envelope `{error:{code,message,status}}`,
  secrets/paths redacted, `X-Request-ID` on every response.
