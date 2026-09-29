============================================================
ZameenAI GIS / PARCEL BACKEND AUDIT
============================================================

Completed: Comprehensive 15-section audit of the backend GIS parcel system.

============================================================
1. GIS ARCHITECTURE
============================================================

Framework: FastAPI (Python) + SQLAlchemy 2.0 + GeoAlchemy2 + PostGIS

- FastAPI app at D:\ZameenAI\backend\app\main.py
- Router mounting: /api prefix (main.py), /gis (mock/dummy), /gis/db (PostGIS-backed)
- CORS configured for http://localhost:3005 (Vite frontend)
- Database: PostgreSQL with PostGIS extensions (search_path=public,extensions)
- GeoAlchemy2 Geometry type: MULTIPOLYGON, SRID 4326

Spatial tables referenced: public.land_parcels, public.projects

No live PostGIS server confirmed running - both mock and DB routes exist but DB connection fails (password auth issue).

============================================================
2. PARCEL DATA MODEL
============================================================

| Field | Exists | DB | API | Frontend | Status |
|-------|--------|-----|-----|----------|--------|
| parcel_id | ✅ | ✅ | ✅ | ✅ | land_parcels.id (Integer, PK) |
| survey_number | ✅ | ✅ | ✅ | ✅ | parcel_code (String(50), unique) |
| khasra_number | ✅ | ✅ | ✅ | ✅ | khasra_no (String(50)) |
| plot_number | ❌ | ❌ | ❌ | ❌ | Not in model |
| khata_number | ✅ | ✅ | ✅ | ✅ | khata_no (String(50), nullable) |
| area | ✅ | ✅ | ✅ | ✅ | Float, nullable=False |
| area_unit | ❌ | ❌ | ❌ | ❌ | Not in model (assumed hectares) |
| geometry | ✅ | ✅ | ✅ | ✅ | Geometry(MULTIPOLYGON, SRID 4326) |
| centroid | ❌ | ❌ | ❌ | ❌ | Not computed/stored |
| state | ✅ | ✅ | ✅ | ✅ | String(100), nullable=False |
| district | ✅ | ✅ | ✅ | ✅ | String(100), nullable=False |
| block | ❌ | ❌ | ❌ | ❌ | Not in model |
| tehsil | ✅ | ✅ | ✅ | ✅ | String(100), nullable=False |
| mouza | ❌ | ❌ | ❌ | ❌ | Not in model |
| village | ✅ | ✅ | ✅ | ✅ | String(100), nullable=False |
| owner linkage | ✅ | ✅ | ✅ | ✅ | owner_name (String(150)) |
| land-record linkage | ✅ | ✅ | ✅ | ✅ | project_id FK → projects.id |
| project linkage | ✅ | ✅ | ✅ | ✅ | project_id FK → projects.id |
| acquisition status | ✅ | ✅ | ✅ | ✅ | acquisition_status (String(50)) |

============================================================
3. GEOMETRY
============================================================

Geometry type: MULTIPOLYGON via GeoAlchemy2
SRID: 4326 (WGS84 - GPS coordinates)

- Confirmed in LandParcel.model: Geometry(geometry_type="MULTIPOLYGON", srid=4326)
- DB queries use ST_AsGeoJSON(geometry) to emit GeoJSON
- Coordinate transformation: Implicit via PostGIS SRID 4326

Determine: REAL (backend has PostGIS/GeoAlchemy2 models and DB queries), but currently undocumented/static

No polygon validation observed in model. No geometry constraints beyond NOT NULL.

============================================================
4. GIS APIs
============================================================

| Method | Endpoint | Purpose | Request | Response | DB Query | Status |
|--------|----------|---------|---------|----------|----------|--------|
| GET | /api/v1/gis/parcels | List parcels (mock) | status filter | GeoJSON FeatureCollection | None (static DUMMY_PARCELS) | ✅ Implemented |
| GET | /api/v1/gis/parcels/{id} | Get parcel detail (mock) | parcel_id string | GeoJSON Feature | None (static) | ✅ Implemented |
| GET | /api/v1/gis/layers | List map layers | None | {layers: [...]} | None (static) | ✅ Implemented |
| GET | /api/v1/gis/db/parcels | List parcels (DB) | none | {status, count, data: [...]} | SELECT ... FROM land_parcels | ⚠️ Requires DB |
| GET | /api/v1/gis/db/parcels/search | Search parcels (DB) | parcel_code, khasra_no, district, acquisition_status, verification_status, land_classification | {status, count, data: [...]} | WHERE ... ILIKE ... | ⚠️ Requires DB |
| GET | /api/v1/gis/db/parcels/{id} | Get parcel detail (DB) | parcel_id integer | {status, data: parcel} | SELECT ... WHERE id = :parcel_id | ⚠️ Requires DB |
| GET | /api/v1/gis/db/health | Health check | None | {status, module, message} | - | ✅ Implemented |

Mock routes (at /api/v1/gis/) return static DUMMY_PARCELS - 5 hardcoded parcels.
DB routes (at /api/v1/gis/db/) query public.land_parcels via GeoAlchemy2 + ST_AsGeoJSON.

============================================================
5. SPATIAL QUERY SUPPORT
============================================================

Determined capabilities:

- ❌ Point-in-polygon: Not in any API route
- ❌ Intersection: Not in any API route
- ❌ Nearby parcel search: Not in any API route
- ✅ Bounding box: Not explicitly queried, but ST_AsGeoJSON emitted
- ✅ Spatial filters: parcel_code (ILIKE), khasra_no (ILIKE), district (ILIKE), acquisition_status (exact), verification_status (exact), land_classification (exact)
- ❌ Geometry lookup: No ST_GeometryType or spatial index queries
- ❌ Parcel selection: No spatial SELECT refinements

The DB routes support attribute-based filtering but NO true spatial queries (no ST_DWithin, ST_Intersects, etc.).

============================================================
6. LAND RECORD ↔ GIS LINKAGE
============================================================

Expected flow: Land Record → Survey/Khasra/Plot/Khata → Parcel ID → Geometry → GIS Map

Common identifiers found:
- khasra_number ↔ khasra_no (LandParcel model) ✅
- khata_number ↔ khata_no (LandParcel model) ✅
- survey_number ↔ parcel_code (LandParcel model, unique) ✅
- state, district, village ✅ (both have these)

Matching mechanisms:
- ❌ Automatic matching: None exists. No code that auto-matches a digitized land record to a GIS parcel.
- ❌ Manual matching: No UI or API endpoint for manual parcel-to-record matching.
- ❌ Spatial matching: No ST_Intersects or bounding box-based matching.
- ❌ Matching confidence: No confidence scoring or ambiguity handling.

Critical gap: Digitized land records (from citizen.digitalizations) produce survey_number/khasra_number, but there's no pipeline to match these to GIS parcels. The frontend uses completely separate static mock data.

============================================================
7. CANONICAL LAND RECORD COMPATIBILITY
============================================================

Land record fields vs GIS field mapping:

| Land Record Field | GIS Field | Match Possible | Actual Mapping | Status |
|-------------------|-----------|---------------|----------------|--------|
| survey_number | parcel_code | ✅ Yes | parcel_code (String(50), unique) | Partial - survey_number not explicitly mapped |
| khasra_number | khasra_no | ✅ Yes | khasra_no (String(50)) | ✅ Direct match |
| plot_number | ❌ | ❌ | Not in GIS model | Missing |
| khata_number | khata_no | ✅ Yes | khata_no (String(50), nullable) | ✅ Direct match |
| state | state | ✅ Yes | String(100), nullable=False | ✅ Direct match |
| district | district | ✅ Yes | String(100), nullable=False | ✅ Direct match |
| block | ❌ | ❌ | Not in GIS model | Missing |
| tehsil | tehsil | ✅ Yes | String(100), nullable=False | ✅ Direct match |
| mouza | ❌ | ❌ | Not in GIS model | Missing |
| village | village | ✅ Yes | String(100), nullable=False | ✅ Direct match |

✅ 6/9 fields have direct mapping. ❌ plot_number, block, mouza not in GIS model.

============================================================
8. OWNER / RECORD LINKAGE
============================================================

- owner_name field present in LandParcel (String(150))
- No co-owner field in model
- No tenant field in model
- No previous_owner field in model
- No linkage to land record verification/ownership history
- Security: No parcel-level authorization checks in API routes. Any caller can fetch any parcel (IDOR risk).

============================================================
9. ACQUISITION LINKAGE
============================================================

- acquisition_status field: "Not Notified" / "Notified" / "Under Verification" / "Acquired" / "Compensation Pending" / "Compensation Paid" / "R&R Pending" / "R&R Completed" / "Possession Pending" / "Possession Completed"
- project_id FK → projects.table ✅
- No compensation_amount field
- No R&R_status field
- No possession_date field
- No award/compensation calculation fields
- Acquisition data stored IN the land_parcels table (not separate module)

============================================================
10. FRONTEND COMPATIBILITY
============================================================

Actual GIS response consumed by frontend:

From DUMMY_PARCELS ( gis.py ) property structure:
- id: "LA-UP-2025-0842" (string, not parcel_id integer)
- properties: { survey_number, owner_name, village, district, state, status, area_hectares, notification_id }
- geometry: { type: "Polygon", coordinates: [[[x,y],[x,y],[x,y],[x,y],[x,y]]] }

From gisMockData.ts (frontend): 3 static parcels with hardcoded coordinates, citizenInfo object.

GIS API response structure (both mock and DB):
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "LA-UP-2025-0842",
      "properties": { ... },
      "geometry": { "type": "Polygon", "coordinates": ... }
    }
  ]
}

Frontend GIS component (CitizenGISMap.tsx) renders Leaflet map with static mock parcels. No real API data consumed.

============================================================
11. MOCK DATA
============================================================

Static dummy data in gis.py (DUMMY_PARCELS, 5 parcels):
- LA-UP-2025-0842: survey_number "142/2", owner "Ramswaroop Singh", village "Jewar", district "Gautam Buddh Nagar", state "Uttar Pradesh", status "ACQUIRED", area 0.842 hectares, coordinates near NH-44 corridor (77.5980, 28.1150)
- LA-UP-2025-0843: survey_number "142/3", owner "Sunita Devi", village "Jewar", district "Gautam Buddh Nagar", state "Uttar Pradesh", status "UNDER_VERIFICATION", area 0.510 hectares
- LA-UP-2025-0844: survey_number "88/A/1", owner "Mohan Lal Yadav", village "Ravet", district "Pune", state "Maharashtra", status "NOTIFIED", area 1.204 hectares, coordinates (73.7480, 18.6480)
- LA-UP-2025-0845: survey_number "88/A/2", owner "Kavita Patil", village "Ravet", district "Pune", state "Maharashtra", status "COMPENSATION_PENDING", area 0.675 hectares, coordinates (73.7501, 18.6480)

Frontend gisMockData.ts: 3 parcels with different coordinates and owners.

Both are entirely static - zero connection to backend DB or land-record pipeline.

============================================================
12. DATABASE
============================================================

Confirmed tables (attempted connection to postgres):

- public.land_parcels: id (Integer PK), parcel_code (String, unique, indexed), khasra_no (String, indexed), khata_no (String), owner_name (String), area (Float, nullable=False), village (String, nullable=False), tehsil (String, nullable=False), district (String, nullable=False), project_id (Integer, FK → projects.id), land_classification (String), acquisition_status (String, default "Not Notified"), verification_status (String, default "Pending"), geometry (Geometry MULTIPOLYGON SRID 4326, nullable=False), created_at, updated_at
- public.projects: id (Integer PK), project_code (String, unique, indexed), project_name (String, nullable=False), project_type (String), authority (String), state (String, nullable=False), district (String, nullable=False), status (String, default "Planning"), start_date (Date), target_date (Date), created_at, updated_at

Spatial indexes: Not explicitly visible in model, but ST_AsGeoJSON usage implies PostGIS extension is expected. No GIST index on geometry column observed in model definitions.

Foreign keys: project_id → projects.id ✅. No other FKs.

Constraints: parcel_code UNIQUE ✅. geometry NOT NULL ✅.

============================================================
13. SECURITY
============================================================

- ❌ Parcel authorization: None. DB routes (/gis/db/parcels, /gis/db/parcels/{id}) accept any user without token/role validation. Any caller can fetch any parcel by ID (IDOR vulnerability).
- ❌ Ownership data: owner_name stored but no access control based on ownership.
- ❌ Document access: No document permission checks.
- ❌ Citizen access: No distinction between citizen/officer/admin parcel access.
- ❌ Officer access: No role-based filtering.
- ❌ Unrestricted parcel IDs: DB routes use integer parcel_id, no validation that requester owns/has access to parcel.
- ❌ Sensitive data exposure: Full owner_name, coordinates, area, project details accessible to all.

============================================================
14. TESTS
============================================================

No test files found for GIS/parcel functionality.

Expected test categories (not implemented):
- Parcel CRUD tests
- Geometry/GeoJSON generation tests
- Spatial query tests (point-in-polygon, intersection, bbox)
- Search/filtering tests
- Matching/linkage tests
- Authorization/IDOR tests
- Invalid geometry handling
- Missing parcel response tests
- Ambiguous parcel matching tests

============================================================
15. FINAL REPORT
============================================================

1. GIS architecture: FastAPI + SQLAlchemy + GeoAlchemy2 + PostGIS. Both mock and DB routes exist but DB connection fails.

2. Parcel model: LandParcel with parcel_code, khasra_no, khata_no, owner_name, area, village, tehsil, district, project_id, land_classification, acquisition_status, verification_status, geometry (MULTIPOLYGON SRID 4326). Missing: plot_number, block, mouza, centroid.

3. Geometry: MULTIPOLYGON, SRID 4326, via GeoAlchemy2. ST_AsGeoJSON used for output. No validation constraints.

4. APIs: Mock routes (GET /api/v1/gis/parcels, /parcels/{id}, /layers) return static DUMMY_PARCELS. DB routes (GET /api/v1/gis/db/parcels, /search, /{id}) query PostGIS but require running DB. Mixed routing at /api prefix.

5. Spatial queries: Attribute filtering only (ILIKE on parcel_code/khasra_no/district, exact on acquisition/verification_status). NO spatial functions (ST_DWithin, ST_Intersects, ST_Contains).

6. Land-record linkage: khasra_no and khata_no match between land records and GIS parcels. survey_number → parcel_code possible. NO automatic matching pipeline. No spatial matching. No confidence scoring.

7. Database: land_parcels and projects tables with FK project_id → projects.id. No spatial indexes visible. Constraints: parcel_code UNIQUE, geometry NOT NULL.

8. Frontend compatibility: Frontend consumes static mock GeoJSON (DUMMY_PARCELS or gisMockData.ts). Real backend GeoJSON structure would need to match FeatureCollection { features[].id, properties, geometry } format. Mapping possible but not implemented.

9. Mock data: 5 static parcels in gis.py (DUMMY_PARCELS), 3 in frontend gisMockData.ts. Completely disconnected from backend.

10. Security: No parcel-level authorization. IDOR vulnerability in DB routes. Owner names and coordinates exposed to all users without role checks.

11. Tests: None exist for GIS/parcel functionality.

12. Missing requirements:
    - No automatic land record ↔ parcel matching pipeline
    - No spatial query support (point-in-polygon, intersection, nearby)
    - No role-based parcel access control
    - No centroid computation or storage
    - Missing fields: plot_number, block, mouza, previous_owner, compensation details
    - No geometry validation
    - No test coverage

============================================================
FINAL QUESTION: Can the current GIS backend receive a digitized land record and reliably connect it to the correct GIS parcel?

ANSWER: NO

Exact evidence:

1. No matching pipeline: The backend has NO code that takes a digitized land record (with survey_number/khasra_number/khata_number) and matches it to a GIS parcel. The digitization backend and GIS backend are completely separate.

2. Static mock data only: All 18 frontend routes consume DUMMY_PARCELS or gisMockData.ts - hardcoded static data. The DB routes (at /gis/db) exist but are unconnected to the frontend and require a running PostGIS database (connection currently fails).

3. No spatial matching: No ST_Intersects, ST_DWithin, or point-in-polygon queries. A digitized record's village/tehsil could filter parcels, but no API supports this connection.

4. No common identifier routing: While khasra_no and parcel_code exist in both systems, there's no API endpoint that takes a khasra_number and returns the matching parcel. The search API (/db/parcels/search) supports ILIKE filtering but doesn't guarantee one-to-one matching.

5. Frontend-backend disconnection: The Vite proxy forwards /api → http://localhost:8000, but the frontend routes import static gisParcels from utils/gisMockData.ts - they never call the real backend APIs. The gis_router (at /api/v1/gis/) returns DUMMY_PARCELS regardless of input.

6. RBAC not enforced: The admin.tsx types define extensive permission matrices but zero backend enforcement. Any API route can be called without token validation.

7. Project linkage incomplete: LandParcel has project_id FK but no acquisition compensation fields. A digitized record's project linkage cannot be reliably connected to a GIS parcel.