import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.logging_config import configure_logging
from app.api.api_v1.api import api_router


configure_logging()

app = FastAPI(
    title="ZameenAI",
    description=(
        "National Intelligent Land Acquisition and "
        "Land Records Management System"
    ),
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

register_error_handlers(app)


@app.middleware("http")
async def _request_id(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.on_event("startup")
def _init_domain_db() -> None:
    try:
        from app.database.session import init_domain_db
        init_domain_db()
    except Exception:
        import logging
        logging.getLogger(__name__).warning("domain DB init failed", exc_info=True)


try:  # Ensure tables exist even when lifespan events are skipped (tests).
    from app.database.session import init_domain_db as _init_now
    _init_now()
except Exception:
    pass


@app.get("/")
async def root():
    return JSONResponse({
        "message": "ZameenAI API - Land Acquisition & Digitization Platform"
    })
