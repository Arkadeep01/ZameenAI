from fastapi import APIRouter

from app.api.api_v1.uploads import router as upload_router
from app.api.api_v1.gis.routes import router as gis_router


api_router = APIRouter()


api_router.include_router(
    upload_router,
    prefix="",
    tags=["upload"]
)

api_router.include_router(gis_router)
