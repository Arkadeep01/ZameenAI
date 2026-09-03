from fastapi import APIRouter

api_router = APIRouter()

from app.api.api_v1.uploads import router as upload_router
api_router.include_router(upload_router, prefix="", tags=["upload"])