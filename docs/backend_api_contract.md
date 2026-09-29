# ZameenAI Backend API Contract (served surface)

Base prefix: `/api`. Auth: `Authorization: Bearer <JWT>` except
`/api/health`, `/api/providers/*`, `/api/auth/login`, demo GIS reads.

## Auth
- `POST /api/auth/login` {username,password} → {access_token}
- `GET /api/auth/me` → current user/role/scopes
- `GET /api/auth/roles` → 7 roles + permissions

## Jobs (backend-owned pipeline)
- `POST /api/jobs` (multipart file, `run_pipeline` form flag; needs
  `DIGITIZATION.RUN`) → ingestion ids + `job_id`; with run_pipeline=true
  executes Phases 01→11 and returns `{job_id, record_id, document_id,
  ingestion_id, status, validation_run_id, hitl_id, results{quality,
  preprocessing, classification, language_detection, ocr_config, ocr,
  extraction, confidence, validation, anomaly_duplicate, hitl}}`.
- `POST /api/jobs/run` {record_id,document_id,ingestion_id | job_id,
  from_phase?} → re-run / resume.
- `GET /api/jobs/{job_id}`, `GET /api/jobs/by-record/{record_id}` →
  job + persisted phase executions.

## Per-phase bridge (unchanged contracts, Flask parity)
`/api/digitization/ingest`, `/ingest/demo`, `/quality-check`,
`/preprocess`, `/classify`, `/language-capabilities`,
`/language-detection`, `/ocr-config`, `/ocr`, `/extract`,
`/confidence-completeness`, `/automated-validation`,
`/validation/{id}`, `/records/{id}/validations`, `/anomaly-duplicate`,
`/anomaly-duplicate/{id}`, `/hitl-1/open`, `/hitl-1/{id}`,
`/hitl-1/{id}/review-field`, `/hitl-1/{id}/submit`, `/remediation*`,
`/resubmission*`, `/reprocess*`.

## Workflow / HITL / audit / notifications
- `GET /api/workflow/records/{record_id}/state` → {state, allowed_transitions}
- `POST /api/workflow/hitl/{hitl_id}/decision?decision=&reviewer=&notes=`
  (needs `HITL.REVIEW`; VERIFIED materialises the canonical record)
- `POST /api/workflow/records/{record_id}/canonical` (needs `WORKFLOW.APPROVE`)
- `GET /api/workflow/audit?entity_type=&entity_id=`
- `GET /api/workflow/notifications/me`, `POST /api/workflow/notifications/{id}/read`

## GIS
- Demo (flagged): `GET /api/gis/parcels`, `/api/gis/parcels/{id}`, `/api/gis/layers`
- Real PostGIS (needs DATABASE_URL): `GET /api/gis/db/health`,
  `/api/gis/db/parcels`, `/parcels/search`, `/parcels/{parcel_id}`
- Links: `GET /api/gis/links/capability`, `POST /api/gis/links`,
  `GET /api/gis/links/records/{record_id}`

## System
- `GET /api/health`, `GET /api/providers/ocr` (live Tesseract probe),
  `GET /api/providers/domain-db` (sqlite vs postgres, explicit).

## Upload (legacy)
- `POST /api/upload` stores to `data/uploads` (pre-pipeline path; new
  clients should use `POST /api/jobs`).

## Errors
`{error:{code,message,status,details?,request_id?}}`; codes include
`INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`INVALID_TRANSITION`, `SPATIAL_MATCH_UNSUPPORTED`, `DB_UNAVAILABLE`,
`BROKER_UNAVAILABLE`, phase `error_code`s passed through verbatim.
