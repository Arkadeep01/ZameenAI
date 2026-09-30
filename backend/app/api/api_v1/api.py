from fastapi import APIRouter

from app.api.api_v1.uploads import router as upload_router
from app.api.api_v1.gis_demo import router as gis_router
from app.api.api_v1.gis.routes import router as gis_db_router
from app.api.api_v1.digitization import digitization_router
from app.api.api_v1.auth_routes import router as auth_router
from app.api.api_v1.jobs_routes import router as jobs_router
from app.api.api_v1.workflow_routes import router as workflow_router
from app.api.api_v1.gis_link_routes import router as gis_link_router
from app.api.api_v1.system_routes import router as system_router
from app.api.api_v1.acquisition_routes import router as acquisition_router
from app.api.api_v1.admin_routes import router as admin_router
from app.api.api_v1.records_routes import router as records_router

api_router = APIRouter()

# Mounted at /upload so that, combined with main.py's "/api" prefix,
# the frontend's axios.post('/api/upload') call resolves correctly.
api_router.include_router(upload_router, prefix="/upload", tags=["upload"])
# Demo / mock GeoJSON parcels used by the Vite frontend GIS map.
api_router.include_router(gis_router, prefix="/gis", tags=["gis"])
# PostGIS-backed parcel APIs from the Sniggy branch (requires DB).
api_router.include_router(gis_db_router)
# Real digitization pipeline (thin FastAPI bridge over app.ocr services;
# same contracts as the Flask reference in app.ocr.api).
api_router.include_router(digitization_router)
# Backend-owned orchestration: one call runs Phase 01 -> 11.
api_router.include_router(jobs_router)
# JWT auth + roles (server-side RBAC; frontend checks are not authoritative).
api_router.include_router(auth_router)
# Unified workflow (HITL decisions, canonical records, audit, notifications).
api_router.include_router(workflow_router)
# Explicit land-record <-> parcel linkage (manual/identifier; spatial
# auto-match reported as not implemented, never fabricated).
api_router.include_router(gis_link_router)
# Health + provider availability (explicit, never mock).
api_router.include_router(system_router)
# Acquisition domain (projects/cases/compensation/R&R/notices/objections/
# possession/freeze — permission + scope + workflow + audit gated).
api_router.include_router(acquisition_router)
# Platform administration (users/roles/permissions/config/audit — admin only).
api_router.include_router(admin_router)
# Canonical land-record + document access (LAND_RECORD.*/DOCUMENT.* gated).
api_router.include_router(records_router)
