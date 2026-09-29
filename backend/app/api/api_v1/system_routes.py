"""System health + OCR provider status (explicit availability, never mock)."""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["system"])


@router.get("/health")
def health():
    return {"status": "ok", "service": "zameenai-backend", "version": "1.0.0"}


@router.get("/providers/ocr")
def ocr_provider_status():
    from app.ocr.language.capability import probe_tesseract_installed
    from app.core.config import settings
    try:
        installed = probe_tesseract_installed()
        merged = sorted(installed.get("merged", []))
        return JSONResponse({
            "provider": settings.OCR_PROVIDER,
            "available": bool(merged),
            "installed_languages": merged,
            "missing_languages": [],
            "detail": "Tesseract probed live; empty list means provider unavailable, not a mock.",
        })
    except Exception as exc:
        return JSONResponse({
            "provider": settings.OCR_PROVIDER,
            "available": False,
            "installed_languages": [],
            "missing_languages": [],
            "detail": f"Probe failed: {exc}",
        }, status_code=200)


@router.get("/providers/domain-db")
def domain_db_status():
    from app.database.session import domain_database_url, is_postgres
    url = domain_database_url()
    safe = url.split("://")[0] if "://" in url else url
    return {"dialect": safe, "postgres": is_postgres(),
            "note": "sqlite fallback serves domain metadata; PostGIS routes still require Postgres."}
