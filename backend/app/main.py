from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.api_v1.api import api_router

app = FastAPI(
    title="ZameenAI",
    description="National Intelligent Land Acquisition and Land Records Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mounted at /api so routes resolve as /api/upload, /api/gis/parcels, etc.,
# matching what the Vite dev proxy forwards and what uploads.tsx already calls.
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return JSONResponse({"message": "ZameenAI API - Land Acquisition & Digitization Platform"})