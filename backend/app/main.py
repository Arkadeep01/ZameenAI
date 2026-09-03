from fastapi import FastAPI
from app.core.config import settings
from app.core.database import engine
from app.core.security import setup_security
from app.api.api_v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ZameenAI - National Intelligent Land Acquisition and Land Records Management System",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup():
    """Initialize database extension and connections."""
    async with engine.begin() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    setup_security()

@app.get("/")
async def root():
    {"message": "ZameenAI API - Land Acquisition & Digitization Platform"}