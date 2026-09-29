# ZameenAI — Complete Project Structure

> National Intelligent Land Acquisition and Land Records Management System
> React 19 + Vite 8 frontend | FastAPI backend | 12-phase OCR digitization pipeline | GIS parcel mapping
> Generated: 2026-09-29 | Root: `D:\ZameenAI`

---

## 1. Repository Root

```text
ZameenAI/
├── backend/                    # FastAPI backend (Python)
├── frontend/                   # React + Vite client (TypeScript)
├── data/                       # Runtime file storage (git-tracked minimal)
├── docs/                       # Product + technical documentation
├── README.md                   # Setup + run guide
├── FRONTEND_AUDIT.md           # Frontend audit notes
├── BACKEND_GIS_AUDIT.md        # Backend/GIS audit notes
├── MIGRATION_MANIFEST.md       # OCR migration manifest
├── LICENSE                     # License
└── project_structure.md        # This file
```

| Root file | Purpose |
|---|---|
| `README.md` | Tech stack, repo layout, `uvicorn` + `npm run dev` instructions, TanStack Router guide, upload flow |
| `FRONTEND_AUDIT.md` | Frontend audit findings |
| `BACKEND_GIS_AUDIT.md` | Backend/GIS audit findings |
| `MIGRATION_MANIFEST.md` | OCR migration / cleanup manifest |
| `LICENSE` | License text |
| `docs/PRD.md` (~44 KB) | Product requirements |
| `docs/TECHSPEC.md` (~61 KB) | Technical spec (GIS API §71, Parcel Status §34, etc.) |
| `docs/TASKLIST.txt` (~6 KB) | Task list (incl. "Static GIS Mapping using predefined GeoJSON dummy data") |
| `docs/AGENTS.md` (~14 KB) | Agent instructions |
| `docs/ocr_complete_implementation_report.md` (~21 KB) | OCR implementation report |
| `docs/ocr_migration_cleanup_report.md` (~6 KB) | OCR cleanup report |

---

## 2. Backend — `backend/`

### 2.1 Backend root

```text
backend/
├── app/                        # Application source (see §2.2)
├── tests/                      # Pytest suite, one file per OCR phase + integration
├── uploads/                    # Runtime OCR artifacts (originals + processing/phase_XX)
├── tessdata/                   # Tesseract traineddata (eng, ben, hin, osd)
├── requirements.txt            # Python dependencies
├── .env                        # Local env (DB, Redis, CORS, GEMINI_API_KEY)
├── .env.example                # Env template
└── .gitignore
```

**`requirements.txt`:**
`fastapi`, `uvicorn[standard]`, `sqlalchemy`, `psycopg2-binary`, `geoalchemy2`,
`pydantic` (+ `pydantic-settings` via `core/config.py`), `python-multipart`,
`redis`, `celery`, `billiard`, `drf-spectacular`, `pytest`, `httpx`,
`python-dotenv`, `PyYAML`, `pytesseract`, `pymupdf`, `scipy`, `sentencepiece`, `google-genai`

**`tessdata/`:** `eng.traineddata`, `ben.traineddata`, `hin.traineddata`, `osd.traineddata`

### 2.2 `backend/app/` — application source

```text
backend/app/
├── main.py                     # FastAPI app factory: CORS, include /api router, GET /
├── api/
│   ├── __init__.py
│   └── api_v1/
│       ├── __init__.py
│       ├── api.py              # Aggregates upload_router (/upload) + gis_router (/gis) + gis_db_router
│       ├── uploads.py          # POST /api/upload — UUID filename → data/uploads/
│       ├── gis.py              # Mock GeoJSON parcels: GET /parcels, /parcels/{id}, /layers
│       └── gis/
│           ├── __init__.py
│           └── routes.py       # PostGIS-backed parcel APIs (Sniggy branch, requires DB)
├── core/
│   └── config.py               # Settings (DB_NAME/USER/PASSWORD/HOST/PORT, CORS_ALLOWED_ORIGINS→:3005, REDIS_URL, GEMINI_API_KEY)
├── database/
│   ├── __init__.py
│   ├── base.py
│   ├── connection.py
│   ├── seed.py
│   └── models/
│       ├── __init__.py
│       ├── parcel.py
│       ├── project.py
│       ├── gis_layer.py
│       ├── verification.py
│       ├── verification_photo.py
│       ├── audit_log.py
│       └── status_history.py
├── schemas/
│   ├── __init__.py
│   └── intermediate_json.py
├── services/
│   └── __init__.py             # (placeholder — 1 file, logic lives in ocr/* subpackages)
├── ocr/                        # 12-phase digitization pipeline (see §2.3)
├── ai/                         # (empty placeholder)
├── gis/                        # (empty placeholder)
├── models/                     # (empty placeholder)
├── repositories/               # (empty placeholder)
├── workflow/                   # (empty placeholder)
├── decision_support/           # (empty placeholder)
├── notifications/              # (empty placeholder)
├── uploads/                    # Runtime artifacts mirror (1200+ files): originals/, processing/phase_XX/, samples/
└── __pycache__/                # Compiled bytecode (generated, not source)
```

**Key backend entry points:**

| File | Route / Role |
|---|---|
| `app/main.py` | `FastAPI(title="ZameenAI")` + `CORSMiddleware` + `include_router(api_router, prefix="/api")` + `GET /` health message |
| `app/api/api_v1/api.py` | `api_router` → `upload_router(prefix="/upload")` + `gis_router(prefix="/gis")` + `gis_db_router` |
| `app/api/api_v1/uploads.py` | `POST /api/upload` — `UploadFile` → `BASE_DIR/data/uploads/{uuid}{ext}`, returns `{message, filename, path}` |
| `app/api/api_v1/gis.py` | `GET /api/gis/parcels?status=` → GeoJSON `FeatureCollection`; `GET /api/gis/parcels/{parcel_id}`; `GET /api/gis/layers`. Dummy IDs `LA-UP-2025-0842…0844`, `LA-MH-2025-0845` (Jewar/UP + Ravet/MH), status→color map per TECHSPEC §34 |
| `app/api/api_v1/gis/routes.py` | PostGIS parcel routes (DB-backed) |
| `app/core/config.py` | `Settings` + `cors_origins` property; `env_file=".env"` |

### 2.3 `backend/app/ocr/` — digitization pipeline (core value)

**Phase façade files (flat, one per pipeline stage):**

```text
backend/app/ocr/
├── __init__.py
├── paths.py                    # Central path resolution (BASE_DIR, uploads/, processing/phase_XX)
├── ocr.py                      # Top-level OCR orchestration helpers
├── image_preprocessing.py      # Legacy/shared preprocessing entry
├── multilingual_registry.py    # Legacy language registry (see language/ subpackage)
├── flask_api_reference.py      # Flask reference implementation (for migration parity)
├── phase01_ingestion.py        # Phase 01 — Ingestion (ING- IDs, originals/)
├── phase02_quality_check.py    # Phase 02 — Quality check
├── phase03_ai_document_preprocessing.py  # Phase 03 — AI preprocessing (deskew/enhance/restore)
├── phase04_document_classification.py    # Phase 04 — Document classification (ROR etc.)
├── phase05_language_and_script_detection.py  # Phase 05a — Language/script detection
├── phase05_ocr_configuration.py          # Phase 05b — OCR config/probes (tessdata selection)
├── phase06_ocr_visual_text_recognition.py# Phase 06a — Tesseract OCR + evidence/words/tables
├── phase06_surya_local.py                # Phase 06b — Surya local recognizer
├── phase07_semantic_field_extraction.py  # Phase 07 — LLM/regex field extraction
├── phase08_confidence_completeness.py    # Phase 08 — Confidence/completeness scoring
├── phase09_automated_validation.py       # Phase 09a — Automated validation (VLD-*.json)
├── phase09_uploader_remediation.py       # Phase 09b — Uploader remediation (REM-*.json)
├── phase10_anomaly_duplicate_detection.py# Phase 10a — Anomaly/duplicate (ADP-*.json, SUB-*.json)
├── phase10_resubmission.py               # Phase 10b — Resubmission (REP-SUB-*)
├── phase11_hitl_verification.py          # Phase 11a — Human-in-the-loop verification
└── phase11_reprocessing.py               # Phase 11b — Reprocessing (REP-*.json → runs/)
```

**Domain subpackages (service + models + engine per concern):**

```text
backend/app/ocr/
├── api/
│   ├── __init__.py
│   ├── app_factory.py
│   ├── classify_ocr.py
│   ├── ingest_quality.py
│   └── workflow.py
│   └── uploads/                # (empty placeholder)
├── ingestion/                  # ids.py, models.py, service.py, validators.py
├── quality/                    # load, metrics, models, service
├── preprocessing/              # ai_models, ai_service, decision, deskew, enhancement,
│                               # image_ops, layout, metrics, pipeline, quality, restoration
├── classification/             # bridge, classifiers, models, service
├── language/                   # capability, lang_models, lang_service, numerals,
│                               # providers, registry, script_detection
├── ocr_config/                 # models, probes, service
├── core/                       # surya_adapter, surya_config, surya_runner, tesseract_engine
├── recognition/                # artifacts, evidence, layout, models, service, tables, words
├── extraction/                 # candidates, evidence, llm, models, normalization, pipeline, terminology
├── confidence/                 # engine, models, service
├── validation/                 # engine, models, rules, service
├── remediation/                # issues, models, service
├── anomaly/                    # engines, models, normalize, stage
├── resubmission/               # file_helpers, models, service
├── reprocessing/               # file_helpers, models, service
├── hitl/                       # models, service, store
├── utils/                      # file_utils, hashing, json_io, time_ids (+ text_utils ref)
├── reports/                    # (empty placeholder)
└── uploads/                    # (empty placeholder)
```

### 2.4 `backend/tests/` — pytest suite

```text
backend/tests/
├── __init__.py
├── conftest.py
├── test_phase01_ingestion.py
├── test_phase02_quality_check.py
├── test_phase03_ai_document_preprocessing.py
├── test_phase_03_integration.py
├── test_phase04_document_classification.py
├── test_phase05_language_and_script_detection.py
├── test_phase05_ocr_configuration.py
├── test_phase06_ocr_visual_text_recognition.py
├── test_phase06_surya_local.py
├── test_phase07_semantic_field_extraction.py
├── test_phase07_pipeline_semantic_extraction.py
├── test_phase07_indicbart_token_type_ids.py
├── test_phase08_confidence_completeness.py
├── test_phase09_uploader_remediation.py
├── test_phase10_anomaly_duplicate.py
├── test_phase10_resubmission.py
├── test_phase11_hitl_verification.py
├── test_phase11_reprocessing.py
├── test_phase12_automated_validation.py
├── test_pipeline_integration.py
└── test_multilingual_support.py
```

Run from `backend/`: `pytest` (see `.pytest_cache/` for `lastfailed`/`nodeids`).

### 2.5 `backend/uploads/` + `backend/app/uploads/` — runtime artifacts

Both trees hold live pipeline output (1200+ files under `app/uploads/`). Layout:

```text
uploads/
├── originals/                  # ING-2026-*.png — ingested originals (e.g. ING-2026-000001…000050.png)
├── samples/                    # Manual test images: image.png, ror-record-of-rights.png,
│                               # test sample english {low,medium,enhanced}.png
└── processing/
    ├── phase_01/ … phase_12/   # Per-phase JSON per LR-/DOC- ID
    │   ├── phase_04/LR-2026-*/DOC-*_classification.json
    │   ├── phase_05/LR-2026-*/DOC-*_language_detection{,_metadata}.json
    │   ├── phase_06/LR-2026-*/DOC-*_ocr{.json,_evidence.json,_text.txt}
    │   ├── phase_07/LR-2026-*/DOC-*_extracted_record.json + _extraction_metadata.json
    │   ├── phase_08/LR-2026-*/DOC-*_confidence_completeness.json
    │   ├── phase_09/LR-2026-*/REM-*.json + _evidence/ev/
    │   ├── phase_10/LR-2026-*/ADP-*.json + SUB-*.json + evidence/SUB-*/
    │   ├── phase_11/LR-2026-*/SUB-*/runs/REP-*.json
    │   └── phase_12/LR-2026-*/VLD-*.json   # e.g. VLD-20260922-42c89579c9.json
    └── …
```

ID conventions: `LR-2026-*` (land record), `DOC-2026-*` / `DOC-REP-SUB-*` (document),
`ING-2026-*` (ingestion), `REM-*` (remediation), `ADP-*` (anomaly/duplicate),
`SUB-*` (submission), `REP-*` / `REP-SUB-*` (reprocessing/resubmission), `VLD-*` (validation).

---

## 3. Frontend — `frontend/`

### 3.1 Frontend root

```text
frontend/
├── src/                        # Application source (see §3.2)
├── assets/                     # Static images: logo.png, favicon.png
├── index.html                  # <div id="root"> + /src/main.tsx + /assets/favicon.png
├── package.json                # React 19, Vite 8, TanStack Router/Query, Axios, Tailwind 4, Lucide
├── package-lock.json
├── vite.config.ts              # tanstackRouter() + react(), base "/", server.port 3005, /api→:8000 proxy
├── tsconfig.json               # ES2020, bundler resolution, jsx react-jsx, include src + vite.config
├── tailwind.config.js
├── postcss.config.cjs
├── .env.local                  # Local Vite env
├── .env.example
├── .gitignore
├── dist/                       # Production build output (npm run build)
├── node_modules/               # (generated)
└── .tanstack/                  # Router plugin cache (generated)
```

**`package.json` scripts:** `dev` (vite), `dev:routes` (tsr watch), `generate:routes` (tsr generate), `build` (vite build).
Type-check: `npx tsc --noEmit`. Dev URL: `http://localhost:3005`.

### 3.2 `frontend/src/` — application source (60 files)

```text
frontend/src/
├── main.tsx                    # StrictMode + QueryClientProvider + createRouter(routeTree) + RouterProvider
├── routeTree.gen.ts            # GENERATED — do not edit (TanStack Router plugin output)
├── index.css                   # Tailwind entry
├── vite-env.d.ts
├── styles.d.ts
│
├── routes/                     # File-based routing: <file> → <browser path>
│   ├── __root.tsx              # Root layout (<Outlet />)
│   ├── index.tsx               # / (landing: Hero, KeyModules, StakeholderPathways, …)
│   ├── uploads.tsx             # /uploads (Axios POST /api/upload + progress)
│   ├── gis.tsx                 # /gis (GIS prototype map)
│   ├── find-my-land.tsx        # /find-my-land
│   ├── pia.tsx                 # /pia
│   ├── approver.tsx            # /approver
│   ├── admin.tsx               # /admin
│   ├── executive.tsx           # /executive
│   ├── desk-validator.tsx      # /desk-validator
│   ├── field-officer.tsx       # /field-officer
│   ├── citizen.tsx             # /citizen (parent layout)
│   ├── citizen.index.tsx       # /citizen (index)
│   ├── citizen.dashboard.tsx   # /citizen/dashboard
│   ├── citizen.my-land.tsx     # /citizen/my-land
│   ├── citizen.my-land-map.tsx # /citizen/my-land-map
│   ├── citizen.land-details.tsx# /citizen/land-details
│   └── citizen.digitalizations.tsx # /citizen/digitalizations
│
├── components/
│   ├── common/                 # Landing + shared UI (16 files)
│   │   ├── header.tsx
│   │   ├── TopBar.tsx
│   │   ├── Hero.tsx
│   │   ├── KeyModules.tsx
│   │   ├── ModuleDetailModal.tsx
│   │   ├── StakeholderPathways.tsx
│   │   ├── ProblemToSolution.tsx
│   │   ├── TransparencyStats.tsx
│   │   ├── TrustBar.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   ├── GovernmentEmblem.tsx
│   │   ├── Zameenlogin.tsx
│   │   ├── Zameensignup.tsx
│   │   ├── OfficialLoginModal.tsx
│   │   └── CitizenStatusModal.tsx
│   ├── gis/                    # Map + parcel UI (14 files)
│   │   ├── CitizenGISMap.tsx
│   │   ├── FindMyLand.tsx
│   │   ├── LandDetailsPage.tsx
│   │   ├── GisMap.tsx (see features/gis/GisMap.tsx — canonical map)
│   │   ├── ParcelCard.tsx
│   │   ├── ParcelDetailSheet.tsx
│   │   ├── ParcelPolygon.tsx
│   │   ├── ParcelMapLabel.tsx
│   │   ├── ParcelSelector.tsx
│   │   ├── MapControls.tsx
│   │   ├── MapPanControl.tsx
│   │   ├── MapLegend.tsx
│   │   ├── StatCard.tsx
│   │   ├── ServiceCard.tsx
│   │   └── GISActionCard.tsx
│   └── portal/
│       └── PortalLayout.tsx    # Shared layout for role portals (admin/approver/executive/…)
│
├── features/
│   └── gis/
│       └── GisMap.tsx          # Leaflet map feature (leaflet.css imported in main.tsx)
│
├── services/
│   └── gis.ts                  # GIS API client (calls /api/gis/*)
│
├── types/
│   └── gis.ts                  # GIS TypeScript types (Parcel, Feature, etc.)
│
└── utils/
    ├── gisMockData.ts          # Mock parcels mirroring backend DUMMY_PARCELS
    ├── indiaGeo.ts             # India geo helpers
    ├── portalData.ts           # Portal content data
    ├── portals.ts              # Portal routing/config helpers
    ├── executiveRefs.ts        # Executive references
    └── types.ts                # Shared utility types
```

**Routing model (TanStack file router):**
`src/routes/*.tsx` → scanned by `tanstackRouter()` Vite plugin → `src/routeTree.gen.ts`
→ imported by `src/main.tsx` → `createRouter({ routeTree })` → `<RouterProvider/>`.
Navigate via `Link` / `useNavigate({ to: '/uploads' })`. Add `/reports` by creating
`src/routes/reports.tsx` with `createFileRoute('/reports')`.

---

## 4. Data — `data/`

```text
data/
└── uploads/                    # Upload target used by backend/app/api/api_v1/uploads.py
    └── f6ced213-aeea-4479-a151-d97c8b87b61e.jpeg  # (example stored upload)
```

Note: `uploads.py` resolves `BASE_DIR = <repo>/backend/app/.../parent×5` → `<repo>/data/uploads/`
and `mkdir(parents=True, exist_ok=True)` on each upload. `backend/uploads/` and
`backend/app/uploads/` are the OCR pipeline working copies (see §2.5).

---

## 5. Cross-Cutting Flows

### 5.1 Upload flow
1. User opens `/uploads` (from home "Start Uploading" → `navigate({ to: '/uploads' })`).
2. `frontend/src/routes/uploads.tsx` posts via Axios to `/api/upload` with progress UI.
3. Vite (`server.proxy['/api'] → http://localhost:8000`) forwards to FastAPI.
4. `backend/app/api/api_v1/uploads.py:upload_file` writes UUID file to `data/uploads/` → `{message, filename, path}`.

### 5.2 OCR digitization flow (phases 01–12)
`originals/ (ING-*)` → 02 quality → 03 AI preprocessing → 04 classification →
05 language/script + OCR config → 06 Tesseract/Surya recognition (+evidence/words/tables) →
07 semantic extraction (LLM/terminology/normalization) → 08 confidence/completeness →
09 validation + uploader remediation → 10 anomaly/duplicate + resubmission →
11 HITL verification + reprocessing → 12 automated validation (`VLD-*.json`).
Each step persists JSON under `uploads/processing/phase_XX/LR-*/`.

### 5.3 GIS flow
Backend `gis.py:DUMMY_PARCELS` (or PostGIS `gis/routes.py` in production) →
`GET /api/gis/parcels` GeoJSON → `frontend/src/services/gis.ts` →
`features/gis/GisMap.tsx` / `components/gis/CitizenGISMap.tsx` (Leaflet) +
`ParcelCard / ParcelDetailSheet / ParcelPolygon / MapLegend / MapControls`.
Status colors per `PARCEL_STATUS_COLORS` (NOTIFIED red, UNDER_VERIFICATION amber, ACQUIRED green, …).

---

## 6. Run & Verify

```powershell
# Backend (from repo root, terminal 1)
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Set-Location backend
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000  + docs at http://localhost:8000/docs

# Frontend (from repo root, terminal 2)
Set-Location frontend
npm install
npm run dev
# → http://localhost:3005

# Frontend checks (from frontend/)
npm run build        # → frontend/dist/
npx tsc --noEmit     # type-check

# Backend checks (from backend/)
pytest               # phase + integration suite
```

> PowerShell script-policy note: if `npm.ps1` is blocked, use `npm.cmd install` / `npm.cmd run dev`.

---

## 7. Conventions & Notes

- Generated files — never edit: `frontend/src/routeTree.gen.ts`, `__pycache__/`, `dist/`, `node_modules/`, `.tanstack/`, `.pytest_cache/`.
- Empty placeholder packages (reserved for future work): `backend/app/{ai,gis,models,repositories,workflow,decision_support,notifications}`, `backend/app/ocr/{reports,uploads,api/uploads}`, `backend/app/services/__init__.py` only.
- Env: frontend Vite on `:3005` (not `:5173`); backend CORS defaults to `http://localhost:3005`; `/api` proxy target `http://localhost:8000`.
- DB/queue deps (`SQLAlchemy`, `GeoAlchemy2`, `psycopg2-binary`, `Redis`, `Celery`) are installed but GIS currently serves mock GeoJSON until PostGIS is live.
