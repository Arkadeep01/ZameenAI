"""Decomposed from phase04_document_classification.py: bridge. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .models import *
from .models import (_REGION_TYPE_MAP, _TITLE_BAND_FRACTION)

import logging
logger = logging.getLogger(__name__)

def _load_phase03_result(
    record_id: str, document_id: str, ingestion_id: str
) -> Optional[Dict[str, Any]]:
    """Load the Phase 03 decision record bound to THIS ingestion.

    Record IDs restart per process, so a bare record_id directory match is
    not enough: the stored document_id/ingestion_id must also agree, else a
    different document's evidence would leak into this classification.
    Returns the parsed dict, or None (never raises).
    """
    try:
        result_path = (
            APP_DIR
            / "uploads"
            / "processing"
            / "phase_03"
            / record_id
            / "preprocessing_result.json"
        )
        if not result_path.exists():
            return None
        with open(result_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return None
        if data.get("record_id") != record_id:
            return None
        if document_id and data.get("document_id") not in (None, "", document_id):
            return None
        if ingestion_id and data.get("ingestion_id") not in (None, "", ingestion_id):
            return None
        return data
    except Exception:
        logger.warning("Phase 04 could not load Phase 03 result", exc_info=True)
        return None

def _load_phase03_regions(
    record_id: str, document_id: str, ingestion_id: str
) -> List[Dict[str, Any]]:
    """Load Phase 03 region evidence for THIS ingestion (read-only, never raises).

    Returns layout-channel region dicts ``{"type": ...}`` mapped onto the
    classifier vocabulary, or [] when no bound Phase 03 decision record exists.
    """
    data = _load_phase03_result(record_id, document_id, ingestion_id)
    if not data:
        return []
    try:
        regions: List[Dict[str, Any]] = []
        for page in data.get("pages", []) or []:
            for region in page.get("regions_detected", []) or []:
                if not isinstance(region, dict):
                    continue
                mapped = _REGION_TYPE_MAP.get(str(region.get("type", "")).upper())
                if mapped:
                    regions.append({"type": mapped})
        return regions
    except Exception:
        logger.warning("Phase 04 could not load Phase 03 regions", exc_info=True)
        return []

def _read_title_band_text(
    record_id: str, document_id: str, ingestion_id: str
) -> str:
    """Read the document title band via the shared provisional OCR helper.

    Uses the Phase 03 processed page image when available, else the Phase 01
    original. Only the top band is read (header evidence, not full OCR).
    Returns "" when no image/OCR is available (never raises).
    """
    try:
        candidate_paths: List[Path] = []
        data = _load_phase03_result(record_id, document_id, ingestion_id)
        if data:
            pages = data.get("pages", []) or []
            if pages:
                output_files = pages[0].get("output_files", {}) or {}
                for key in ("processed", "upscaled", "original"):
                    p = output_files.get(key)
                    if p:
                        candidate_paths.append(Path(p))
        originals_dir = (
            APP_DIR / "uploads" / "originals"
        )
        if originals_dir.exists():
            for ext in (".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"):
                p = originals_dir / f"{ingestion_id}{ext}"
                if p.exists():
                    candidate_paths.append(p)
                    break

        from PIL import Image as _PILImage  # type: ignore

        from src.ocr import run_real_ocr as _run_real_ocr

        for image_path in candidate_paths:
            try:
                with _PILImage.open(str(image_path)) as img:
                    img = img.convert("RGB")
                    width, height = img.size
                    band_height = max(1, int(height * _TITLE_BAND_FRACTION))
                    band = img.crop((0, 0, width, band_height))
                    text = _run_real_ocr(band, language="eng", psm=6)
            except Exception:
                continue
            if text and text.strip():
                return text.strip()
        return ""
    except Exception:
        logger.warning("Phase 04 title-band read failed", exc_info=True)
        return ""
