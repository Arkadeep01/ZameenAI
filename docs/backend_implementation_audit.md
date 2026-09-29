# Backend Implementation Audit Report

## 1. Initial backend structure
- Served FastAPI `app/main.py` → `api_router` (`/api`): `/upload`
  (legacy file dump), `/gis/*` (static demo), `/gis/db/*` (PostGIS raw SQL),
  `/digitization/*` (real per-phase bridge over `app/ocr` services).
- Migrated OCR: `app/ocr/` decomposed packages + `phaseXX_*` facades intact;
  file-JSON persistence under `app/uploads/processing/*`; 717 migrated tests.
- Empty TECHSPEC dirs: `ai/ gis/ models/ workflow/ notifications/
  repositories/ decision_support/`; `services/__init__`, `schemas/__init__`
  empty; `database/models` had only Project/LandParcel (+4 zero-byte stubs);
  no auth/RBAC, no orchestrator, no migrations, no workers, no audit.

## 2. Problems discovered
1. No backend-owned sequencing: frontend had to call 11 phase endpoints.
2. Zero server-side auth (no login/JWT/roles/permissions; IDOR-able ids).
3. Pipeline state file-only; no job/phase/record/audit/notification tables.
4. `POST /api/upload` disconnected from ingestion (different directory).
5. Mock GIS served at production-looking paths without demo flags.
6. `LandParcel.geometry` (GeoAlchemy2) breaks sqlite `create_all`.
7. Orchestrator-then-missing: classification payload has no `status` key;
   OCR config nests tesseract codes under `configuration` (top `language`
   is BCP-47 `en` → `OCR_LANGUAGE_UNAVAILABLE` if passed raw).
8. `app/database/base.py` ↔ `models/__init__.py` circular import once new
   models were registered.
9. No PyJWT/passlib in venv (stdlib JWT + pbkdf2 fallback used instead).

## 3. Existing authoritative modules (reused, not rewritten)
- All `app/ocr/*` domain services (ingestion, quality, preprocessing,
  classification, language, ocr_config, recognition, extraction,
  confidence, validation, anomaly, remediation, resubmission, HITL,
  reprocessing), `core/tesseract_engine.py`, `paths.py`, `utils/*`,
  `scehmas/intermediate_json.py`, digitization bridge routes/schemas,
  PostGIS GIS routes + `LandParcel`/`Project` models.

## 4. Duplicate implementations discovered
- None competing in OCR (decomposition already consolidated; intentional
  near-duplicates documented in MIGRATION_MANIFEST §4.3 and left alone).
- New `app/models/`, `app/gis/`, `app/workflow/`, `app/ai/`,
  `app/notifications/` are re-export shims, not second implementations.
- `app/core/config.py` extended in place (no parallel settings module).

## 5. Modules preserved
- Every `phaseXX_*.py` facade, all `app/ocr/**` services/engines/models,
  Flask reference (`flask_api_reference.py` + `api/*`), tessdata, samples,
  all 717 migrated tests (untouched), GIS demo + PostGIS routes, upload
  route (legacy kept, documented).

## 6. Modules refactored (minimal, justified)
- `app/core/config.py`: +DATABASE_URL/JWT/storage/provider/threshold knobs.
- `app/main.py`: request-id middleware, error handlers, domain DB init
  (eager + startup; lifespan-safe).
- `app/api/api_v1/api.py`: mounted 5 new routers (jobs/auth/workflow/
  gis-links/system).
- `app/database/base.py`: pure `Base` (model registration moved to
  `models/__init__.py` to break the import cycle).
- `app/api/api_v1/gis_demo.py`: demo flags only (no contract break).
- `app/repositories/document_repository.py`: upsert on document re-ingest.
- `app/database/session.py`: updated `init_domain_db` (Postgres full,
  sqlite portable-only).

## 7. Modules created
- `app/core/security.py` (7 roles, permissions, dev users, stdlib JWT +
  pbkdf2/bcrypt), `app/core/deps.py` (JWT identity, role/permission guards,
  IDOR/BOLA ownership), `app/core/errors.py` (envelope + redaction),
  `app/core/logging_config.py`.
- `app/database/session.py`, `models/{user,document,land_record,
  hitl_review,audit_event,notification,parcel_link}.py`,
  `migrations/{__init__,001_domain_tables}.py`.
- `app/schemas/{common,auth,digitization,workflow_gis}.py`.
- `app/repositories/{document_repository,domain_repositories}.py`.
- `app/services/{digitization_orchestrator,workflow_service,
  gis_service,audit_notification_service}.py`.
- `app/workflow/state_machine.py`; shims `app/{models,gis,workflow,
  notifications,ai,workers}/__init__.py`.
- `app/api/api_v1/{auth,jobs,workflow,gis_link,system}_routes.py`.
- `tests/test_backend_integration.py` (6 tests).
- Docs: `backend_architecture.md`, `backend_api_contract.md`,
  `pipeline_integration.md`, `workflow_state_machine.md`, `rbac_matrix.md`
  (+ this report).

## 8. Modules removed and why
- None. Zero-byte stubs (`audit_log.py`, `verification*.py`,
  `gis_layer.py`, `status_history.py`) retained untouched; no file deleted.

## 9. FastAPI wiring before/after
- Before: 39 paths (upload, demo GIS, PostGIS GIS, per-phase digitization).
- After: 59 paths (+20: `/jobs*`, `/auth*`, `/workflow*`,
  `/gis/links*`, `/health`, `/providers/*`). One served app unchanged.

## 10. OCR pipeline wiring before/after
- Before: phases reachable only one-by-one via `/api/digitization/*`.
- After: `POST /api/jobs` (run_pipeline=true) executes 01→11 through
  `DigitizationOrchestrator` reusing the same services; per-phase bridge
  kept. Contract fixes: classification success via
  `predicted_document_type`; OCR language from `configuration.language`.

## 11. Workflow transitions repaired
- New single `state_machine.py` (INGESTED→…→VERIFIED/REJECTED with
  CORRECTION→RESUBMITTED→REPROCESSING→REPROCESSED→VALIDATED loop);
  `WorkflowService.record_state` derives state from HITL/resubmission/
  reprocessing file truth; `HITL decision` endpoint validates + authorizes +
  audits + materialises canonical record on VERIFIED. Invalid edges → 422.

## 12. Database changes
- 8 new tables (see §7); FK job→document, phases→job, fields→record;
  indexes on ids/status; sqlite fallback excludes PostGIS tables;
  `migrations/001_domain_tables.py` baseline. GIS `land_parcels` untouched.

## 13. Schema changes
- New Pydantic contracts for auth, documents/jobs/phases, OCR/extraction/
  confidence/validation/anomaly/HITL, workflow transitions, parcel links,
  notifications, audit. All fields traceable to real outputs.

## 14. Service changes
- New orchestrator/workflow/GIS/audit/notification services; existing OCR
  services untouched (only called, with correct payload mapping).

## 15. Repository changes
- New `DocumentRepository` + domain repositories (audit/land-record/HITL/
  notification/parcel-link); routes/services never embed SQL beyond the
  pre-existing PostGIS raw queries (kept as spatial authority).

## 16. RBAC implementation
- JWT login (`password123` dev creds, DEBUG-visible user list), 7 roles,
  MODULE.ACTION permissions, route guards + citizen/project ownership
  enforcement. Tested: 401 unauthenticated, 403 citizen-on-jobs and
  field-on-RUN, 401 bad credentials/forged token.

## 17. Audit logging implementation
- `audit_events` append-only (actor/role/action/entity/prev/new state,
  request/ip/meta); logged for start, pipeline completion, HITL decisions,
  canonical creation; read-only `GET /workflow/audit`; no mutation API.

## 18. GIS integration status
- PostGIS routes preserved as spatial authority (require DATABASE_URL;
  explicit failure otherwise). Demo routes flagged `demo:true`.
  `land_record_parcel_links` table + `/gis/links` APIs added;
  `/capability` reports auto spatial matching NOT implemented.

## 19. Frontend integration contract
- `POST /api/jobs` replaces 11-step frontend sequencing; per-phase bridge
  unchanged; `/api/upload` legacy (documented); GIS map keeps working on
  flagged demo data until it migrates to `/gis/db` + `/gis/links`;
  login via `/api/auth/login` → Bearer token (frontend role checks remain
  UX-only; backend enforces).

## 20. Test results
- New: `tests/test_backend_integration.py` — 6 passed.
- Regression subset: phase01 + phase04 + HITL — 96 passed.
- Full 717-suite not re-run here (last decomposition baseline: 701 passed,
  14 skipped, 2 environmental failures per MIGRATION_MANIFEST §4.4).
- Live verification: sample PNG through `POST /api/jobs` →
  `AWAITING_HITL` with real OCR (137 words), extraction PARTIAL,
  confidence/validation/anomaly/HITL ids (see §10).

## 21. Remaining limitations (IMPLEMENTED vs SCAFFOLDED vs NOT)
- IMPLEMENTED+INTEGRATED: auth/RBAC, orchestrator 01→11, workflow machine +
  HITL decisions + canonical materialisation, domain persistence, audit,
  notifications store, GIS links, error envelope, docs, tests.
- SCAFFOLDED (explicit, not silent): Celery/Redis dispatch
  (`workers/enqueue_pipeline` returns BROKER_UNAVAILABLE without broker);
  DB-backed users (model exists, runtime uses dev store); Alembic env
  (baseline module only); spatial auto-match (reported unsupported).
- NOT IMPLEMENTED: email/SMS/push delivery, S3/object storage, government
  GIS/LRMS live integrations, report exports, decision-support predictors —
  none claimed.
- Known cosmetic: classification payload lacks generic `status` key
  (orchestrator predicate handles it); `class Config` pydantic deprecation
  + `on_event` deprecation warnings (harmless, scheduled cleanup).
