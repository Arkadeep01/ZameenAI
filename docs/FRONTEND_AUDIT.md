ZameenAI Frontend Audit — Complete Report
1. Frontend Architecture
- Framework: Vite + React 18 + TanStack Router v1 (file-based, auto-generated route tree)
- Build system: Vite (port 3005, output to dist)
- Router: @tanstack/react-router v1 — file-based routing, routeTree.gen.ts auto-generated
- State management: @tanstack/react-query v5 for data fetching/mutations/caching
- API client: Axios with Vite proxy (/api → http://localhost:8000), but no routes actually consume the real API
- Authentication: Demo-based modal flow (Zameenlogin.tsx, Zameensignup.tsx); role selection gates portal access after login; no backend auth middleware, no token persistence
- Authorization/RBAC: Extensive permission matrix defined in admin.tsx types (Role, UserStatus, AccessLevel, defaultMatrix()), but not enforced in any portal UI. RBAC exists as TypeScript types only.
- Layouts: PortalLayout (shared shell for all role portals — fixed topbar + fixed sidebar + slate-50 canvas + white cards), Citizen dashboard layout
- 18 route files identified across 7 roles
2. Route/Page Inventory
Route
/citizen/
/citizen/dashboard
/citizen/digitalizations
/citizen/my-land
/citizen/my-land-map
/citizen/land-details
/approver
/field-officer
/executive
/desk-validator
/admin
/pia
/find-my-land
Key findings: All 18 routes use static mock data. None make real API calls despite Axios proxy configuration.
3. Land Digitization UI Flow Audit
The 5-step wizard (citizen.digitalizations.tsx) uses static EXTRACTED_DATA throughout — no real API integration.
Stage
Upload
Processing
Extraction
Confidence Analysis
Human Review
Critical gaps:
- upload-to-processing: Manual button click; no API trigger or backend status
- Processing status: Purely animated; no real pipeline state from backend
- Phase progression: Manual stepper; no backend-driven progression
- Extraction visibility: Static structured data; no OCR results from backend
- Quality-score consistency: Hardcoded confidence percentages
- OCR result display: Not present as separate step
- Confidence display: Shown as % with tone coloring (emerald/amber/rose)
- Validation result display: "Valid"/"Warning"/"Review" labels
- Verification result display: Not present as separate step
- Pipeline failure handling: Only "Send Back" to upload; no error state from backend
4. Canonical Land Record Display Audit
LandDetailsPage (citizen.land-details.tsx) renders some sections but many canonical fields are missing.
Field
record_id
DOCUMENT
document_id
document_type
document_title
department
document_date
map_number
OWNER
name
father_husband_name
co_owner
recorded_tenant
PREVIOUS OWNER
name
father_husband_name
ownership_transfer_date
transfer_reason
transfer_document_number
LAND
survey_number
khasra_number
plot_number
khata_number
area
area_unit
nature_of_land
land_type
LOCATION
state
district
block
tehsil
mouza
village
LAND ADDRESS
house_or_premises_number
road
locality
post_office
police_station
pin_code
BOUNDARIES
north
south
east
west
MUTATION
mutation_number
mutation_date
ADDITIONAL
remarks
Missing sections identified: Previous Ownership, Land Address, Boundaries, Remarks, AI/Extraction Metadata (separate section), Validation (separate section), Verification (separate section). The land-details page renders ~8 of 14 expected sections.
5. GIS Frontend Audit
- Map: Leaflet-based with MapContainer, TileLayer (OpenStreetMap + ArcGisonline satellite)
- Parcel rendering: ParcelPolygon components render polygon boundaries on map
- GeoJSON: Parcel geometries stored as Polygon with coordinates (static mock coordinates)
- Parcel search: FindMyLand component — text search by Khasra/survey number/village
- Parcel selection: Click-to-select with highlighting; detail sheet (ParcelDetailSheet) on click
- Parcel detail: LandDetailsPage integrates map; CitizenGISMap shows selected parcel
- Land-record linkage: my-land page links parcels to land records; view map → land-details flow
- Acquisition status: Parcel 1025 shows "Under Acquisition" status with acquisition details
- Project boundaries: NOT present in any component
- Linked documents: NOT present in GIS context
GIS Status: PARTIAL/MOCK — UI components exist and can display parcels, but use static mock data (gisMockData.ts: 3 parcels with hardcoded coordinates). API integration (services/gis.ts: fetchParcels(), fetchParcel()) is never called by any route. All routes import gisParcels directly from mock data.
6. API Contract Audit
Method	Endpoint
GET	/api/gis/parcels
GET	/api/gis/parcels/:id
GET	/api/*
Contract mismatches identified:
- Frontend has Axios + proxy config for backend API, but zero routes consume real backend data
- All routes import and use static mock data instead of fetchParcels() / fetchParcel()
- GIS types (types/gis.ts) defined but never populated from real API responses
- API client code exists but is effectively dead code for data fetching
- No API response shaping or normalization in any component
7. Mock Data Audit
Mock data is pervasive across all routes:
File
utils/gisMockData.ts
routes/citizen.digitalizations.tsx
routes/citizen.dashboard.tsx
routes/citizen.my-land.tsx
routes/citizen.land-details.tsx
routes/approver.tsx
routes/field-officer.tsx
routes/executive.tsx
routes/pia.tsx
routes/desk-validator.tsx
routes/admin.tsx
Types of mock data found:
- Hard-coded records with fake owners (Ramesh Kumar Sharma, etc.)
- Fake parcel IDs (1024, 1025, 1089)
- Static coordinates (25.3339, 82.9814 etc.)
- Fake dashboard metrics (1,248 total documents, 96.1% success rate, etc.)
- Demo API responses (all static JSON)
- Fallback mock data everywhere (every route has a fallback to mock data)
Production dependency: Zero — all data is static/mock. The Vite proxy to localhost:8000 is configured but never used at runtime.
8. UX/State Audit
Category
desktop
tablet
mobile
accessibility
form validation
loading
error
empty
success
retry
disabled
unauthorized
processing
failed processing
9. Bugs/Disconnections
 1. No real API integration — all 18 routes use static mock data despite Axios proxy config
 2. RBAC/authorization exists as types only — not enforced in any portal UI
 3. GIS uses mock data — services/gis.ts API calls never invoked by routes
 4. Land details use mock parcels — hardcoded defaults for missing fields
 5. Digitization pipeline is purely animated — no backend triggers, no real pipeline state
 6. No authentication persistence — demo modal; role re-selection needed on page refresh
 7. Missing canonical land record fields — previous owner, boundaries, land address, remarks, mutation date
 8. No error/failure state handling in digitization pipeline
 9. GIS not linked to land records — separate data silos, no shared API data
10. Form validation is client-side only — no backend schema enforcement
10. Missing Requirements
- Real backend data integration (all routes currently use mock data)
- Authentication/authorization system with token persistence and role-based content gating
- API client actually connected to backend (/api → localhost:8000)
- GIS parcel data from real backend API (not mock)
- Complete canonical land record display (previous owner, boundaries, land address, mutation details, additional remarks)
- OCR/extraction pipeline API integration
- Form validation with backend JSON schemas
- Error and failure state handling throughout workflows
- Mobile-responsive design for complex forms and maps
- Accessibility improvements (ARIA labels, color contrast, focus management)
- Processing failure and retry states in digitization pipeline
- Verification workflow UI (human-verified state display)
- Mutation tracking and history
11. P0/P1/P2/P3 Priority Matrix
Priority	Category
P0	Critical
P1	High
P2	Medium
P3	Low
12. Final Question
Is the current frontend capable of taking a real backend land-record response and presenting the complete verified land record + GIS parcel to the correct user role?
Answer: NO
Exact evidence:
1. No real API integration — All 18 routes consume static mock data. citizen.digitalizations.tsx uses hardcoded EXTRACTED_DATA object; citizen.land-details.tsx falls back to gisParcels[0] with hardcoded default values for missing search params; services/gis.ts API functions are never called by any route.
2. Incomplete canonical land record display — land-details.tsx renders only ~8 of the 28+ fields specified in the canonical JSON spec. Missing sections include: Previous Ownership, Land Address (house number, road, locality, post office, police station, pin code), Boundaries (north/south/east/west), Remarks, AI/Extraction Metadata as a separate section, separate Validation and Verification sections.
3. GIS uses static mock data — CitizenGISMap and ParcelPolygon render 3 hardcoded parcels from gisMockData.ts with static coordinates. The fetchParcels() and fetchParcel() functions in services/gis.ts exist but are never imported or called by any route component.
4. No role-based content gating — While PortalLayout passes userRole prop, all routes render the same content regardless of role. The RBAC matrix in admin.tsx defines permissions but these are never checked or displayed in any portal UI. The citizen portal has role selection (gov/citizen tabs) but all data is shared mock data.
5. Authentication is demo-only — Zameenlogin.tsx and Zameensignup.tsx provide modal-based login with env-configured demo credentials. There is no token storage, no auth state persistence, and no backend auth middleware. Role selection gates portal access but all portals show identical mock data structure.
6. Dashboard and pipeline data are entirely static — citizen.dashboard.tsx uses hardcoded stats array, pipelineSteps with hardcoded values, and recentDocuments with mock IDs like ZAI-LR-001293. The pipeline animation uses useState intervals with no backend data connection.
Conclusion: The frontend has UI components that could display a complete land record and GIS parcel if real backend data were provided, but zero integration exists between the frontend UI and the real backend. The system is currently a fully mock-driven prototype, not a production frontend capable of consuming real backend land-record responses.
$ echo "Audit complete. Summary: Frontend is MOCK-DRIVEN with zero real API integration. All 18 routes use static data. Key gaps: API integration, land record completeness, GIS data, auth/RBAC, form validation."
Audit complete. Summary: Frontend is MOCK-DRIVEN with zero real API integration. All 18 routes use static data. Key gaps: API integration, land record completeness, GIS data, auth/RBAC, form validation.
+ Thought: 358ms
The audit is complete. Here's the summary:
Framework: Vite + React 18 + TanStack Router v1 + TanStack Query v5 + Leaflet maps
Critical Finding: The frontend is fully mock-driven with zero real API integration. All 18 routes across 7 roles consume static JSON data instead of calling the backend API (even though Axios + Vite proxy to localhost:8000 is configured).
Key evidence:
- citizen.digitalizations.tsx uses hardcoded EXTRACTED_DATA — no API calls
- citizen.land-details.tsx falls back to gisParcels[0] with hardcoded defaults
- services/gis.ts API functions (fetchParcels, fetchParcel) exist but are never called by any route
- All portal routes (approver, field-officer, executive, desk-validator, pia, admin) use static mock data throughout
- RBAC/authorization types exist in admin.tsx but are not enforced in any UI
- GIS components render 3 hardcoded parcels from gisMockData.ts
Cannot present complete verified land record + GIS parcel to correct user role — Answer is NO. The frontend has UI components that could display data if real backend responses were provided, but zero integration exists between the UI and the backend API.
P0 items: Connect API client to real backend, implement authentication, make GIS/land-details routes fetch real data.