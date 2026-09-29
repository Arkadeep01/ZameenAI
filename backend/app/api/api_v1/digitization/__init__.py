"""Digitization bridge API package (FastAPI over the OCR service layer)."""
from .routes import router as digitization_router

__all__ = ["digitization_router"]
