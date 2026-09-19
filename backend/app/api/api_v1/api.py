from fastapi import APIRouter

from app.api.api_v1.uploads import router as upload_router
from app.api.api_v1.gis import router as gis_router

api_router = APIRouter()

# Mounted at /upload so that, combined with main.py's "/api" prefix,
# the frontend's axios.post('/api/upload') call resolves correctly.
api_router.include_router(upload_router, prefix="/upload", tags=["upload"])
api_router.include_router(gis_router, prefix="/gis", tags=["gis"])