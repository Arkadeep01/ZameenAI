from fastapi import APIRouter

from app.api.api_v1.uploads import router as upload_router
from app.api.api_v1.gis import router as gis_router
from app.api.api_v1.gis.routes import router as gis_db_router

api_router = APIRouter()

# Mounted at /upload so that, combined with main.py's "/api" prefix,
# the frontend's axios.post('/api/upload') call resolves correctly.
api_router.include_router(upload_router, prefix="/upload", tags=["upload"])
# Demo / mock GeoJSON parcels used by the Vite frontend GIS map.
api_router.include_router(gis_router, prefix="/gis", tags=["gis"])
# PostGIS-backed parcel APIs from the Sniggy branch (requires DB).
api_router.include_router(gis_db_router)
