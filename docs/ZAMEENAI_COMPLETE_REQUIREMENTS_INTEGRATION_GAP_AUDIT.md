# ZameenAI — COMPLETE REQUIREMENTS + INTEGRATION GAP AUDIT

> Senior system architect audit. Independent codebase inspection. No code modified.
> Root: `D:\ZameenAI` | Date: 2026-09-29
> All claims cite `file:line`. Verdicts: YES / PARTIAL / NO.

---

## 1. PRIMARY OBJECTIVE — Is this one coherent system?

**No. It is three half-connected subsystems + a mock UI shell:**

1. **Real digitization pipeline** (`backend/app/ocr/`, `backend/app/api/api_v1/digitization/routes.py:64-511`, `jobs_routes.py`): ingest → quality → preprocess → classify → language → ocr-config → OCR (real Tesseract) → extract → confidence → validation → anomaly → HITL — file-persisted (`backend/app/uploads/processing/phase_XX/`), DB-mirrored only for jobs/phases/HITL.
2. **Real-but-split GIS**: demo mock (`api_v1/gis_demo.py:128-169`, 4 parcels) + PostGIS read-only (`api_v1/gis/routes.py:26-185`) + manual link table (`gis_link_routes.py`, `services/gis_service.py`, `models/parcel_link.py`) with `SPATIAL_AUTO_MATCH_IMPLEMENTED=False`.
3. **Real-but-unwired auth**: JWT + 7 roles + `require_permission` in `core/security.py:25-59`, `core/deps.py`, `auth_routes.py`, enforced only on `jobs/*`, `workflow/*`, `gis/links/*`. `digitization/*`, `/upload`, `/gis/*`, `/gis/db/*` are OPEN.
4. **Frontend with real clients that are mostly unwired**: real `api/digitization.ts:31-165`, `hooks/useDigitizationPipeline.ts:68-223`, `services/gis.ts:30-112` exist, but flagship wizard `routes/citizen.digitalizations.tsx:92-178` uses static `EXTRACTED_DATA`, `routes/uploads.tsx:22` posts to dead-end `/api/upload`, most portals are pure mock with `?? gisParcels` fallbacks.

End-to-end `DOCUMENT → UPLOAD → OCR → EXTRACTION → CANONICAL → DB → VALIDATION → VERIFICATION → PARCEL → MAP → ACQUISITION → COMPENSATION → R&R → POSSESSION → DASHBOARD` **does not run**. Acquisition/Compensation/R&R/Possession have **zero tables and zero APIs** (grep `compensation|possession` hits only `gis_demo.py:19-20` color map).

Target vs actual:

```
LAND DOCUMENT → UPLOAD (dead-end) → DIGITIZATION (real, file-only) → OCR (real Tesseract)
→ EXTRACTION (real 28 fields, 15 missing) → CANONICAL (thin, blob-only, 0 rows)
→ DB (10/22 entities) → VALIDATION (file-only) → VERIFICATION (file-only + badges)
→ PARCEL LINKAGE (manual-blind) → GIS MAP (mock) → ACQUISITION/COMP/R&R/POSSESSION (missing)
→ DASHBOARD/REPORTS (hardcoded) → CITIZEN SERVICES (mock + ComingSoon)
```

---

## 2. CROSS-AUDIT VERIFICATION

Independent re-inspection. Prior reports are directionally correct but contain staleness/overstatements:

| Prior claim | Reality (verified) |
|---|---|
| `project_structure.md §2.2`: backend has only `/upload` + `/gis` | False. `app/api/api_v1/api.py:1-35` mounts 9 routers: `upload, gis_demo, gis/db, digitization, jobs, auth, workflow, gis/links, system`. Doc is stale. |
| `project_structure.md`: `gis.py` | File does not exist. Real: `gis_demo.py` + `gis/routes.py`. |
| `README.md`: "backend currently provides file-upload API" | Stale. Upload is least important API now; digitization/jobs/workflow/auth exist. |
| `FRONTEND_AUDIT.md`: "zero routes consume real API" | Overstated. `features/gis/GisMap.tsx:152 fetchParcels()`, `components/gis/FindMyLand.tsx:358 searchLandParcels()`, `services/citizen.ts:84,108,176`, `services/acquisition.ts:447`, `hooks/useDigitizationPipeline.ts` are REAL calls — but with mock fallbacks or unwired (wizard never calls `useDigitizationPipeline`). Correct: ~4 hybrid paths exist, ~30 routes pure mock. |
| `BACKEND_GIS_AUDIT.md`: "no auth, IDOR" | Partially stale. `jobs_routes.py:24,38,49,60`, `workflow_routes.py:18,23,36,43`, `gis_link_routes.py:21,32` now enforce `require_permission` + `enforce_ownership`. But `gis_demo.py`, `gis/routes.py`, `digitization/routes.py`, `uploads.py` remain OPEN — IDOR still true there. |
| `BACKEND_GIS_AUDIT.md`: "no tests for GIS" | False for integration: `tests/test_backend_integration.py:86-94` asserts `automatic_spatial_matching is False` and `SPATIAL_MATCH_UNSUPPORTED`. True that no parcel CRUD/spatial tests exist. |
| `BACKEND_GIS_AUDIT.md`: `parcel.owner linkage via project_id` | Wrong. `parcel.py:56-60 project_id FK→projects.id` is project linkage, not owner/record linkage. Owner is flat `owner_name:150`. Record linkage is separate `parcel_link.py`. |
| Both audits miss | `previous_owner.*` + `boundaries.*` + `land_address.*` are **0 hits** in `backend/app` (verified by grep). Canonical spec itself is incomplete, not just display. |

Entry points verified:

- `backend/app/main.py:34` mounts `api_router` at `/api`; `47-61` inits domain DB.
- `backend/app/api/api_v1/api.py:17-33` mounts all 9 routers.
- `backend/app/api/api_v1/uploads.py:10-32` writes `data/uploads/{uuid}{ext}`, returns `{message,filename,path}`, imports nothing from pipeline — dead-end.
- `backend/app/core/security.py:25-59` 7 roles + perms; `core/deps.py` fail-closed JWT + ownership; `api_v1/auth_routes.py:11-53` login/me/roles.

---

## 3. END-TO-END INTEGRATION MATRIX

| Stage | Frontend | API | Backend | DB | GIS | RBAC | Status |
|---|---|---|---|---|---|---|---|
| Document upload | `uploads.tsx:22 POST /api/upload` REAL; `digitalizations.tsx:295 addSampleFile` MOCK | `POST /api/upload` EXISTS OPEN | `uploads.py:10-32` writes `data/uploads/{uuid}` dead-end | `documents` NOT written by this path | — | NONE | **BROKEN** — upload ≠ ingest |
| Ingest / Job | `api/digitization.ts:31 ingestFile→/digitization/ingest` REAL but unwired to wizard | `POST /digitization/ingest`, `POST /jobs`, `POST /jobs/run` EXISTS | `ingestion/service.py`, `services/digitization_orchestrator.py:102-321` REAL Phase01→11 | `documents, digitization_jobs, pipeline_phase_executions` written | — | `jobs/*` AUTH, `ingest` OPEN | **PARTIAL** — works via API, not via UI upload |
| OCR | No OCR display step; wizard `560-588 setInterval` simulated | `POST /digitization/ocr, /ocr-config, /language-detection` EXISTS OPEN | `ocr/core/tesseract_engine.py:28-61` real `pytesseract`, `recognition/service.py:212-352`, `surya_runner.py` real/UNAVAILABLE fallback | File `phase_06/*_ocr.json` only | — | NONE | **PARTIAL** — real engine, no auth, no UI wiring |
| Extraction | `digitalizations.tsx:738-853` static `EXTRACTED_FIELDS`; real `api/digitization.ts:99 extractFields` unwired | `POST /digitization/extract` EXISTS OPEN | `ocr/extraction/pipeline.py:302-504`, `terminology.py:394-423` 28 fields REAL | **NO DB write**; file `phase_07/*_extracted_record.json` only | — | NONE | **PARTIAL** — real logic, file-only, UI mock |
| Canonical record | `digitalizations.tsx:92-133` static; `land-details.tsx:111,118` `gisParcels[0]` fallback | Only `POST /workflow/records/{id}/canonical` (AUTH `WORKFLOW.APPROVE`); **no GET/search** | `workflow_service.py:96-145 materialize_canonical()` thin `{record_id,status,confidence}` only on VERIFIED | `land_records.payload` (live DB: **0 rows**), `extracted_fields` never written (`save_fields` def-only) | — | AUTH but unreachable from UI | **BROKEN** |
| Validation | `digitalizations.tsx:904 Validation col` static; `desk-validator.tsx:55-139` static | `POST /automated-validation` + `GET /validation/{id}` EXISTS OPEN; file `VLD-*.json` in `phase_12/` (misnamed, `validation/models.py:23`) | `ocr/validation/engine.py:383-592`, 15 `RuleCategory` REAL | **NO table** | — | NONE | **PARTIAL** |
| Verification (HITL/field) | Badges only (`Verified` hardcoded `land-details.tsx:258`, `ParcelSelector.tsx:85`); `field-officer.tsx:95,201` static; real `useDigitizationPipeline` HITL unwired | `POST /hitl-1/open|review-field|submit` OPEN file-backed; `POST /workflow/hitl/{id}/decision` AUTH (`HITL.REVIEW`) | `ocr/hitl/service.py:30-383`, `store.py` REAL file sessions | `hitl_reviews` mirror only; `verification.py` + `verification_photo.py` **0 bytes** | — | Split OPEN/AUTH | **PARTIAL** |
| Parcel | `GisMap.tsx:152 fetchParcels` REAL; `my-land*.tsx:63,78 ?? gisParcels` HYBRID; `ParcelCard/Sheet` props-only | `GET /gis/parcels[/{id}]` demo OPEN; `GET /gis/db/parcels[/search][/{id}]` OPEN PG-only | Demo static 4 parcels; DB raw `SELECT+ST_AsGeoJSON`, no spatial funcs, no validation | `land_parcels` (PG-only per `migrations/001:13-14`) | MULTIPOLYGON SRID4326, no GIST, no `ST_IsValid` | NONE on read | **PARTIAL/MOCK** |
| Acquisition | `acquisition-status.tsx:67 useCitizenAcquisitionCases` REAL→MOCK fallback | **0 routes** | `parcel.acquisition_status String(50)` free text only | **NO table** | Color map only `gis_demo.py:14-23` | — | **NO** |
| Compensation / R&R / Possession / Docs / Notifs / Audit / Reports | `compensation.tsx:74-92 ₹ hardcoded`; `rehabilitation.tsx:11 ComingSoon`; possession no route; `documents/notices/activity ComingSoon`; `citizen.ts:175 notifications REAL→3 hardcoded` | Only `GET /workflow/notifications/me`, `POST .../read`, `GET /workflow/audit` (AUTH). No comp/R&R/poss/docs/reports | None | `notifications`, `audit_events` exist; comp/R&R/poss **missing** | — | Notifs/audit AUTH | **NO** (except minimal notif/audit) |

---

## 4. CANONICAL LAND RECORD

Required model (from task §4) vs actual (`schemas/intermediate_json.py:280-341`, `ocr/extraction/models.py:115-140`, `terminology.py:241-423`):

Required `previous_owner{name,father,transfer_date,reason,doc_no}` (5), `land_address{house,road,locality,PO,PS,pin}` (6), `boundaries{N,S,E,W}` (4) are **entirely absent**:

- `grep previous_owner|boundaries` in `backend/app` = **0 files**.
- `OwnerSection:289-293` = `name, father_husband_name, co_owner, recorded_tenant` only.
- `LocationSection:307-313` = `state/district/block/tehsil/mouza/village` only — no address sub-object.
- No `BoundarySection` / `PreviousOwnerSection`. Only false hits: `evidence.py:_is_section_boundary` (layout helper), `anomaly/engines.py` string "parcel boundary conflict".
- `ExtractedRecord:115-126` + `CanonicalLandRecord:331-341` share the gap; `FIELD_APPLICABILITY:241-392` has no entries for those fields.
- `intermediate_json.CanonicalLandRecord` is orphaned (nothing imports it; `DigitizationPipelineArtifact:357-368` never built; workflow builds ad-hoc dict).

---

## 5. CANONICAL JSON END-TO-END FIELD AUDIT

Legend: ✅ real, ⚠️ partial/file-only/mock, ❌ missing.

| Field | OCR | Extraction | DB | API | Frontend | Validation | GIS | RBAC | Status |
|---|---|---|---|---|---|---|---|---|---|
| `record_id` | ✅ | ✅ | ✅ `land_records.id` | ⚠️ POST canonical only, no GET | ⚠️ static `LR-2026-00001` | ✅ | ❌ no col | ✅ `WORKFLOW.*` | **PARTIAL** — 0 rows live, no read API, UI mock |
| `document.document_id/type/title/department/date/map_number` (6) | ✅ | ✅ 28-field terminology | ⚠️ `payload` blob + `document_type` only | ⚠️ blob write only | ⚠️ `digitalizations:140-146` static; `land-details` missing most | ✅ generic | ❌ | ✅/❌ split | **PARTIAL** — file+static, not queryable |
| `owner.name/father/co_owner/tenant` (4) | ✅ | ✅ | ⚠️ blob only; `owner_name` flat on parcel | ⚠️ blob | ⚠️ `digitalizations:148-151` static; `land-details:595,605,633` hardcoded Sharma | ✅ | ⚠️ `owner_name` only | ✅/❌ | **PARTIAL** |
| `previous_owner.name/father/date/reason/doc_no` (5) | ✅ text exists | ❌ no alias/section | ❌ | ❌ | ❌ | ❌ | ❌ | — | **NO** — lost at extraction |
| `land.survey/khasra/plot/khata/area/unit/nature/type` (8) | ✅ | ✅ all 8 | ⚠️ blob only | ⚠️ blob | ⚠️ `digitalizations:154-161` static; `land-details:195-201` fallbacks `SV-id/458/782` | ✅ | ⚠️ `khasra_no,khata_no,area` only; **no `plot_no,unit,survey` col** (`parcel.py`) | ✅/❌ | **PARTIAL** — GIS join impossible on plot/unit/survey |
| `location.state/district/block/tehsil/mouza/village` (6) | ✅ | ✅ all 6 | ⚠️ blob + parcel `village/tehsil/district` | ⚠️ blob; `db/search` filters `district` only | ⚠️ static Example* | ✅ | ⚠️ no `state/block/mouza` cols | ✅/❌ | **PARTIAL** |
| `land_address.house/road/locality/PO/PS/pin` (6) | ✅ text | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | **NO** |
| `boundaries.N/S/E/W` (4) | ✅ text | ❌ | ❌ (`geometry` is parcel polygon, not record boundary text) | ❌ | ❌ | ❌ | ❌ | — | **NO** |
| `mutation.number/date` (2) | ✅ | ✅ | ⚠️ blob | ⚠️ blob | ⚠️ static `MUT-12345` + hardcoded `Mutation Verified land-details:457` | ✅ | ❌ | ✅/❌ | **PARTIAL** |
| `additional.remarks` | ✅ | ✅ | ⚠️ blob | ⚠️ blob | ⚠️ static "No remarks" | — | ❌ | — | **PARTIAL** |
| `confidence/completeness` | — | ✅ `confidence/service.py` | ⚠️ cols + file `phase_08` | `POST /confidence-completeness` OPEN, no GET | ⚠️ `digitalizations:866 avg + 900 table` static | ✅ | — | NONE | **PARTIAL** — real calc, file-only, UI mock |
| `validation_result` | — | ✅ `validation/engine.py` | ❌ file `VLD-*.json` only | `POST+GET /automated-validation|/validation/{id}` OPEN | ⚠️ `Valid/Warning/Review` labels static | ✅ 15 cats | — | NONE | **PARTIAL** |
| `verification/HITL` | — | ✅ `hitl/service.py` | ⚠️ `hitl_reviews` mirror; `verification.py` empty | HITL OPEN + `workflow/hitl/decision` AUTH | ❌ no session UI (badges only) | — | `verification_status` free string | Split | **PARTIAL** |

**Loss points:** `previous_owner/address/boundaries` die at extraction. All other fields survive OCR→extract→file but die at DB (blob-only, `ExtractedField` never written, 0 `land_records` rows) and UI (wizard static, land-details fallback).

---

## 6. LAND RECORD ↔ GIS INTEGRATION — Exact Contract

| Identifier | Land side | Parcel side `parcel.py:8-96` | Match? |
|---|---|---|---|
| `record_id` / `document_id` | `ExtractedRecord:116-117`, `LandRecord.id/document_id` | ❌ no col; only `parcel_link.record_id` | Only via link table, manual |
| `survey_number` | ✅ extracted | ⚠️ `parcel_code unique` (implicit, not named survey) | Convention-only, no normalizer |
| `khasra_number` | ✅ | ✅ `khasra_no indexed` | **Yes — only reliable key** |
| `plot_number` | ✅ | ❌ missing | No |
| `khata_number` | ✅ | ✅ `khata_no nullable` | Yes |
| `state/district/block/tehsil/mouza/village` | ✅ all 6 | ⚠️ `village/tehsil/district` only; no `state/block/mouza` | 3/6 |
| `parcel_id` | ❌ (link table only) | `id:int PK` vs demo `LA-UP-2025-0842:str` vs `parcel_code:str` — **3-way ambiguity**; `parcel_link.py:18-29` holds `parcel_id:int? + parcel_code:str?` with no FK | Ambiguous |

- **Matching strategy:** none automatic. `gis_service.py:13-35` `SPATIAL_AUTO_MATCH_IMPLEMENTED=False`, `capability()` = `manual_linking:true, automatic_spatial_matching:false`. `create_link():32-50` blind-inserts `MANUAL/IDENTIFIER`; rejects `SPATIAL→400 SPATIAL_MATCH_UNSUPPORTED`. No khasra normalization, no confidence, no `ST_*` join (grep `ST_Intersects|ST_Within|ST_DWithin|ST_Contains` = 0).
- **Manual:** `POST /api/gis/links` (`GIS.READ`) + `GET /records/{record_id}` — EXISTS, AUTH, persisted in `land_record_parcel_links`. No UI calls it.
- **Spatial:** not implemented. `gis/routes.py` only `ST_AsGeoJSON` on read; no bbox/point-in-poly/nearby; no GIST index; no geometry validation (`ST_IsValid` 0 hits).
- **Confidence / ambiguous / unmatched / 1-many / many-1:** no columns, no API, no UI. `parcel_link.confidence:float?` exists but `GisService.create_link` never sets it.
- **Persistence:** `land_record_parcel_links{record_id,parcel_id,parcel_code,project_id,match_method,confidence?,created_by}` — no FK to parcels or records.

---

## 7. RBAC INTEGRATION

Backend `security.py:25-59` — 7 roles (`system_admin,pia,field_officer,desk_validator=LAO,approver,executive,citizen`) + `MODULE.ACTION` perms; `deps.py` — fail-closed JWT, `require_permission/require_roles/enforce_ownership` (citizen scopes `LR-2026-000002`, project_ids). `DEV_USERS password123` in-memory; `users` table 0 rows, unwired.

| Action | Backend | Frontend | Verdict |
|---|---|---|---|
| Upload | `uploads.py` OPEN | `uploads.tsx` no token; `api/client.ts:1-35` no `Authorization` interceptor | **NO** |
| OCR / Extraction / Validation (`digitization/*`) | All OPEN (no `Depends`) | `api/digitization.ts` no token | **NO** |
| Jobs / run | AUTH `DIGITIZATION.RUN/READ` + ownership | No login → cannot call | **PARTIAL** (server ready, client absent) |
| Field verification / HITL file API | OPEN | `field-officer/desk-validator` static | **NO** |
| HITL decision / Approval / Canonical / Audit | AUTH `HITL.REVIEW/WORKFLOW.APPROVE/REJECT/READ` | `admin.tsx:60-163` local `cycleAccess+logAudit`, 0 `fetch/axios` | **PARTIAL** (server, no UI) |
| Compensation / Possession / GIS editing | No API/table | No UI | **NO** |
| Reports / Dashboard | `REPORT.READ/DASHBOARD.READ` defined, no report API | `executive.tsx`, `dashboard.tsx:71-84` hardcoded `ACQ-2026-00182`, `??3/??1` | **NO** |
| Citizen isolation | `enforce_ownership` on 2 routes only | `Zameenlogin.tsx:28-92` demo + `setTimeout`, `index.tsx:38-53` persona navigate, role case `UPPER` vs backend `lower` mismatch | **NO** — any caller reads any `gis/db` parcel (IDOR) |

Privileged actions audited only via `workflow/*` (`audit_events` ✅, `audit_log.py` empty stub ⚠️); OPEN paths bypass audit.

---

## 8. DATABASE COMPLETENESS

| Entity | Status | Evidence |
|---|---|---|
| DOCUMENT | ✅ `documents` | `document.py:17`, live 3 rows |
| LAND_RECORD | ✅ `land_records` | `land_record.py:18`, live **0 rows** |
| OWNER | ❌ no table; only `land_parcels.owner_name` + Pydantic `OwnerSection` | Missing |
| PREVIOUS_OWNER | ❌ | Missing |
| LAND | ❌ only `payload` blob | Missing |
| LOCATION | ❌ only `village/tehsil/district` cols + schema | Missing |
| ADDRESS | ❌ | Missing |
| BOUNDARY | ❌ only `geometry`; `gis_layer.py` 0 bytes | Missing |
| MUTATION | ❌ only `MutationSection` schema + anomaly strings | Missing |
| EXTRACTION_RESULT | ⚠️ `extracted_fields` (never written) | Partial |
| CONFIDENCE | ⚠️ cols + file service | Partial |
| VALIDATION_RESULT | ❌ file `VLD-*.json` only | Missing table |
| VERIFICATION | ❌ `verification.py` + `verification_photo.py` 0 bytes; only `hitl_reviews` | Missing |
| PARCEL | ✅ `land_parcels` PostGIS | `parcel.py:8` |
| PARCEL_LINK | ✅ `land_record_parcel_links` | `parcel_link.py:18` |
| PROJECT | ✅ `projects` | `project.py:7` |
| ACQUISITION | ❌ only free-text `acquisition_status` | Missing |
| COMPENSATION | ❌ | Missing |
| R_AND_R | ❌ | Missing |
| POSSESSION | ❌ | Missing |
| AUDIT_LOG | ⚠️ `audit_events` ✅ (7 rows), `audit_log.py` stub empty | Partial |

Relationships: `LandRecord.fields↔ExtractedField`, `parcel.project_id→projects.id` only. No record↔parcel FK, no User wiring, no spatial index. `migrations/001:8-14` portable 10 + PG-only 2; no Alembic env.

---

## 9. API COMPLETENESS

| Endpoint | Exists | Correct response | Auth | Consumer | Status |
|---|---|---|---|---|---|
| `POST /api/upload` | ✅ | ⚠️ `{message,filename,path}` — no job/id, dead-end | OPEN | `uploads.tsx` | **BROKEN** |
| `POST /digitization/ingest\|/demo\|/quality\|/preprocess\|/classify\|/language\|/ocr-config\|/ocr\|/extract\|/confidence\|/validation\|/anomaly\|/hitl-1/*\|/remediation\|/resubmission\|/reprocess` | ✅ | ✅ `to_dict()` + `error_code` | OPEN | `api/digitization.ts` (unwired to wizard) | **PARTIAL** |
| `POST /jobs\|/run; GET /jobs/{id}\|/by-record/{id}` | ✅ | ✅ orchestrator 01→11 | AUTH | Nobody in UI | **PARTIAL** |
| `GET /validation/{id}, /records/{id}/validations` | ✅ | ✅ file-backed | OPEN | Nobody | **PARTIAL** |
| Land-record CRUD/search + canonical GET | ❌ (only `POST /workflow/records/{id}/canonical`, `GET .../state`) | ⚠️ thin snapshot | AUTH | Nobody | **NO** |
| `GET /gis/parcels[/{id}], /layers` demo | ✅ | ✅ `FeatureCollection` + `demo:true` | OPEN | `GisMap.tsx` | **MOCK-OK** |
| `GET /gis/db/parcels\|/search\|/{id}` | ✅ PG-only | ✅ `{status,count,data}` + GeoJSON | OPEN | `FindMyLand.tsx` | **PARTIAL** |
| `POST /gis/links`, `GET /links/records/{id}`, `GET /capability` | ✅ | ✅ `{SUCCESS\|SPATIAL_MATCH_UNSUPPORTED}` | AUTH (capability OPEN) | Nobody | **PARTIAL** |
| Acquisition / Comp / R&R / Possession | ❌ 0 routes | — | — | `acquisition.ts MOCK` | **NO** |
| `POST /auth/login`, `GET /me\|/roles` | ✅ | ✅ HS256 JWT | OPEN→JWT | Nobody | **PARTIAL** |
| `GET /workflow/notifications/me`, `POST .../read`, `GET /workflow/audit`, `GET /health\|/providers/*` | ✅ minimal | ✅ | AUTH/OPEN | `citizen.ts` fallback | **PARTIAL** |

---

## 10. FRONTEND COMPLETENESS

| Page | Status | Evidence |
|---|---|---|
| login | MOCK EXISTS | `Zameenlogin.tsx:28-92` demo creds + `setTimeout`, no `POST /auth/login` |
| dashboard | HYBRID | `citizen.dashboard.tsx:51-68` real hooks + `77-84` hardcoded `ACQ-2026-00182` |
| upload / processing / extraction | SPLIT (REAL client + MOCK page) | REAL `api/digitization.ts` + `useDigitizationPipeline.ts:68` vs MOCK `digitalizations.tsx:550 setInterval`, `92 EXTRACTED_DATA` |
| land-record detail | MOCK | `land-details.tsx:111,118,544 gisParcels[0]`, fallbacks, hardcoded Sharma/docs |
| verification / validation | MOCK + unused hook | Badges + `desk-validator:55 MOCK`; real `validation_run_id` never displayed |
| GIS map / parcel detail / linked record | HYBRID/MOCK | REAL `GisMap:152` + `FindMyLand:358` (fallback `374-380`); detail sheets props-only; `GIS Linked` badge, no link call |
| acquisition / compensation | HYBRID/MOCK | `useCitizenAcquisitionCases→MOCK_ACQUISITION_CASES acquisition.ts:84`, `₹1.48Cr hardcoded` |
| R&R / possession / documents / notices | MISSING (shell only) | `rehabilitation/documents/notices/activity:11 ComingSoonPage`; possession no route |
| notifications | HYBRID + missing list | `citizen.ts:175 axios→3 hardcoded`; `notices ComingSoon` |
| citizen portal shell | EXISTS | `citizen.tsx:6 Outlet` + 15 subroutes |

Only `digitalizations.tsx` shows ~30 fields w/ confidence; **no page shows `previous_owner/address/boundaries/verification-session/GIS-link-id`**.

---

## 11. MOCK / DEMO DATA

| Location | Intentional demo | Accidental prod dependency |
|---|---|---|
| `gis_demo.py 4×LA-UP-2025` + `demo:true, warning` | ✅ labeled | — |
| `gisMockData.ts 4 parcels`, `citizenInfo Ramesh Sharma`, hardcoded owners/₹/IDs (`land-details:595,633`, `compensation:74`, `dashboard:77`) | ⚠️ partly labeled `MOCK DATA` but imported as fallback (`my-land:63 ?? gisParcels`, `citizen.ts:111-116 always mock`, `FindMyLand:339,466`) | **YES** — UI works with backend down |
| `digitalizations.tsx:92 EXTRACTED_DATA + 136 FIELDS 87-99%` | No `demo` flag, no fetch | **YES** — wizard's only source; real hook not imported |
| `acquisition.ts:84 MOCK_CASES`, `citizen.ts:181-296 notifs/schemes` | `try axios catch→mock` | **YES** — masks backend absence |
| `security.py:116 DEV_USERS password123`, `Zameenlogin VITE_DEMO_*` | ✅ dev-marked | ⚠️ prod path still `DEV_USERS`; `users` 0 rows |
| `app/uploads/processing/phase_XX 1200+ files`, `tessdata/` | Real artifacts ✅ | — |

Rule: `gis_demo` + `DEV_USERS` + `ingest/demo` are intentional; **all `?? gisParcels/MOCK_*` + static `EXTRACTED_DATA` + hardcoded owners/₹ are accidental production dependencies**.

---

## 12. MAJOR REMAINING REQUIREMENTS (Backlog A–U)

| Pri | Requirement | Current State | Why Needed | Dependency | Acceptance Criteria |
|---|---|---|---|---|---|
| **P0** | A1. Wire wizard to real pipeline | MOCK + `setInterval`; hook unwired | Core DoD 2–7 broken in UI | B1 | File → real ingest/OCR/extract/conf/val/HITL states, no timers |
| P0 | A2. Land-record detail from real canonical GET | `gisParcels[0]` fallback + hardcoded | Cannot retrieve final record | H1 | `?record_id=` → real doc/owner/land/loc/mut/remarks/conf/val/verif/link |
| P0 | B1. Retire/bridge `/api/upload` dead-end | Writes file, stops | Upload never digitizes | — | Returns `job_id/record_id` or UI calls `/ingest` |
| P0 | D1/E1. Add `previous_owner, land_address, boundaries` | 0 hits | §4 fields lost | — | 15 subfields extract+persist+validate |
| P0 | H1. Persist extraction→DB + `GET /records/{id}` | File-only; `save_fields` def-only; 0 rows; no GET | Canonical not retrievable | D1 | Rows + full JSON readable after extract/VERIFIED |
| P0 | J1. Identifier matcher + confidence/ambiguous/unmatched | `SPATIAL=False`, blind insert | No auto linkage | H1,I2 | `POST /links/match` → `parcel_id+confidence+state` |
| P0 | J2. Bidirectional link UI | Badges only | DoD open-both-ways fails | J1 | Click record↔parcel persists + displays |
| P0 | K1. Login→JWT→header; protect open routes | OPEN + demo login, no interceptor | RBAC DoD; IDOR | — | 401/403; citizen scoped |
| P1 | C1. OCR surfacing in UI | Engine real, no OCR step | Debug extraction | A1 | OCR text+conf per field visible |
| P1 | F1/G1. Validation + HITL UI | File + badges | Human verification DoD | A1,H1 | LAO review/correct low-conf, persists |
| P1 | H2. Normalize OWNER/LOC/MUT/ADDR/BOUND + Alembic + wire User | Blob-only; 5 stubs 0B; `DEV_USERS` | Query/history impossible | H1 | Migration + seeded roles |
| P1 | I1/I2. Parcel gaps + validation + enum | 6/10 IDs; free-text status | Match + map correctness | — | New cols + `khata/owner/village/state/block/mouza/plot` filters |
| P1 | L1/M1/N1/O1. Acquisition→Comp→R&R→Possession | 0 tables/routes; mock stages | Post-GIS workflow absent | J1 | State-machine with audit |
| P1 | Q1/R1. Notifications + audit completeness | Minimal `workflow/*` | Ops + citizen updates | K1 | All transitions emit scoped notif+audit |
| P2 | P1/S1. Documents repo + real reports | `ComingSoon`, hardcoded stats | Stakeholder value | H1,L1 | Docs linked; dashboards query DB |
| P2 | I3. True spatial queries | `ILIKE` only | Spatial match + UX | I1 | `ST_Intersects/DWithin/Contains`, bbox+page |
| P2 | K2. Scope enforcement + role-case unification | 2 routes scoped | Citizen isolation | K1 | BOLA tests pass |
| P3 | T1/U1. Tests + PostGIS prod + queues | Digitization tests only; Redis/Celery unused | Scale + regression | All | E2E suite; PG live; no prod mock |

---

## 13. PRIORITY

- **P0 (blocks core E2E):** A1, A2, B1, D1, H1, J1, J2, K1.
- **P1 (prototype-functional):** C1, F1, G1, H2, I1, I2, L1, M1, N1, O1, Q1, R1.
- **P2 (important integration):** P1, S1, I3, K2.
- **P3 (production scale):** T1, U1.

---

## 14. END-TO-END DEFINITION OF DONE

- **Digitization DONE? NO.** ✅ upload file, ✅ pipeline via API, ✅ OCR real, ✅ 28-field extract, ⚠️ thin blob-only 0-row canonical, ✅ file conf/val, ⚠️ file-only verif + badges. Fails *persisted, verifiable in UI, retrievable*.
- **GIS DONE? NO.** ✅ parcel exists, ⚠️ unvalidated geometry, ✅ demo API (DB needs PG), ⚠️ 6/10 IDs, ❌ blind manual link, ❌ bidirectional UI, ⚠️ mock map.
- **RBAC DONE? NO.** ✅ 7 roles + perms server-side, ⚠️ 3/6 router groups gated, ❌ scope on 2 routes, ❌ client demo, ⚠️ partial audit.
- **FRONTEND DONE? NO.** ⚠️ real clients exist, ❌ wizard/detail/link mock, ❌ real canonical/conf/val/verif display, ❌ `?? mock` in essential flow.

---

## 15. REQUIRED E2E TEST — Where it fails

1. Login as LAO → **FAIL** (`Zameenlogin` simulated; `POST /auth/login` works but UI never calls it).
2. Upload real doc → **FAIL via UI** (`/upload` no job; PASS only via `/ingest` or `/jobs`).
3–6. Preprocess→OCR→Extract→Canonical → **PARTIAL** (APIs real; wizard static; 3 families never extracted).
7–8. Persist + conf/val → **FAIL** (files only, 0 rows, `ExtractedField` never written).
9–11. Low-conf → LAO verify/correct → retrieve final → **FAIL** (no HITL UI, no record GET, thin canonical only on VERIFIED).
12–14. Match→persist link→open both ways → **FAIL** (no auto-match, link API exists but no UI).
15. Role restrictions → **FAIL** (OPEN reads, no UI token, IDOR on `gis/db`).
16. Audit trail → **PARTIAL** (`audit_events:7` via `workflow/*` only).

---

## 16. FINAL PRIORITY ROADMAP (dependency order)

1. **B1 + H1 + D1**: bridge upload→ingest; persist full extraction + 15 missing fields; add record GET.
2. **A1 + A2**: wire wizard + land-details to real APIs; gate `?? mock` behind explicit `DEMO` flag.
3. **K1**: login→JWT→interceptor; lock open routes; unify role case; enforce citizen scope.
4. **F1 + G1**: validation/HITL UI on real sessions.
5. **I1 + I2 + J1 + J2**: parcel cols + identifier matcher + bidirectional link UI.
6. **L1 → M1 → N1 → O1 + Q1 + R1 + P1 + S1**: acquisition lifecycle + docs/notifs/audit/reports.
7. **I3 + K2 + T1 + U1**: spatial queries, BOLA tests, full E2E suite, PG deploy.

---

## 17. FINAL ANSWERS

| # | Question | Verdict | Evidence |
|---|---|---|---|
| 1 | Frontend complete? | **NO** | 4 hybrid vs ~30 mock routes; static wizard; mock fallback; 5× ComingSoon; no token |
| 2 | Digitization backend complete? | **PARTIAL** | Real 12-phase + Tesseract + 28-field + orchestrator; file-only; 3 families missing; dead-end upload; no record GET |
| 3 | GIS backend complete? | **PARTIAL** | Real MULTIPOLYGON + demo+DB+link APIs; 4 cols missing; no spatial/matcher/validation; PG-required; OPEN reads |
| 4 | Canonical extraction complete? | **NO** | 28/43+ subfields; 15 missing, 0 hits |
| 5 | Canonical JSON persisted? | **NO** | 0 rows; `ExtractedField` never written; thin VERIFIED-only snapshot |
| 6 | Frontend displays complete record? | **NO** | Static best page + missing families; detail ~8 sections hardcoded |
| 7 | GIS linkage complete? | **NO** | Explicit `SPATIAL...False`; blind manual; no UI/confidence |
| 8 | RBAC complete? | **PARTIAL** | Server roles/JWT real but half routes OPEN, client demo, minimal scope |
| 9 | Database complete? | **PARTIAL** | 10/22 groups; 12 missing; 5 stubs 0B; `users:0` |
| 10 | API integration complete? | **NO** | Clients exist but wizard/detail/link/auth unwired; 4 workflows 0 routes |
| 11 | E2E workflow operational? | **NO** | Fails at login, upload→job, persist, retrieve, match, roles |

---

## 18. MOST IMPORTANT FINAL QUESTION

**Can ZameenAI CURRENTLY perform: REAL DOC → UPLOAD → OCR → AI EXTRACTION → CANONICAL JSON → DB → VALIDATION → HUMAN VERIFICATION → GIS MATCH → MAP → RBAC → ACQUISITION?**

**Answer: NO — not even PARTIALLY as a system. Subsystems are PARTIAL in isolation, integration is NO.**

Exact technical blockers:

1. `routes/uploads.tsx:22 → api_v1/uploads.py:10` dead-end; real entry `POST /digitization/ingest | POST /jobs` never called by upload/wizard.
2. `previous_owner|boundaries = 0 hits`, no `land_address` — 15 subfields have no terminology/model/DB/API/UI.
3. `extraction/pipeline.py:489` file-only; `save_fields` never called; `zameenai_domain.db land_records:0` — extraction never reaches DB; no record GET API.
4. `workflow_service.py:96` thin snapshot only on VERIFIED — full field map never materialized.
5. `gis_service.py:13 SPATIAL_AUTO_MATCH_IMPLEMENTED=False`; blind manual insert; `parcel.py` missing `plot/state/block/mouza/unit` — auto-match impossible.
6. `digitization/*, /upload, /gis/*, /gis/db/*` no `require_permission`; `api/client.ts` no `Authorization`; `Zameenlogin:60` simulated — RBAC unenforced, IDOR open.
7. `digitalizations.tsx:92,550` static + timers; `land-details:111` mock fallback; R&R/docs `ComingSoon`; acquisition/comp/R&R/possession 0 tables + 0 APIs — workflow cannot run or display.

Fix §16 steps 1–3 first; until then the chain is broken at upload, persistence, and linkage regardless of OCR quality.
