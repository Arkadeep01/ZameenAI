"""Decomposed from phase06_ocr_visual_text_recognition.py: layout. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (project_tessdata_dirs)
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
import pytesseract
from PIL import Image
from app.ocr.ocr_config.models import (
    REGION_PRIORS,
)
from app.ocr.ocr_config.probes import (
    available_tesseract_langs, is_surya_available,
)
from .models import *
from .models import (_PHASE03_TO_REGION)

import logging
logger = logging.getLogger(__name__)

def _try_native_pdf_text(pdf_path: str, page_num: int) -> tuple[bool, str]:
    """Attempt to extract native text from a PDF page."""
    try:
        import pymupdf as fitz
        with fitz.open(pdf_path) as doc:
            if page_num <= len(doc):
                page = doc[page_num - 1]
                text = page.get_text("text").strip()
                return bool(text), text
    except Exception as e:
        logger.warning(f"Native PDF text extraction failed for page {page_num}: {e}")
    return False, ""

class _TessdataEnv:
    """Expose project-local tessdata to in-process pytesseract calls only."""

    def __init__(self) -> None:
        self._tessdata: Optional[Path] = None
        self._previous: Optional[str] = None
        self._active = False

    def __enter__(self) -> "_TessdataEnv":
        if os.getenv("TESSDATA_PREFIX"):
            return self
        for candidate in project_tessdata_dirs():
            if (candidate / "eng.traineddata").exists():
                self._tessdata = candidate
                self._previous = os.environ.get("TESSDATA_PREFIX")
                os.environ["TESSDATA_PREFIX"] = str(candidate)
                self._active = True
                break
        return self

    def __exit__(self, *args: Any) -> None:
        if self._active:
            if self._previous is None:
                os.environ.pop("TESSDATA_PREFIX", None)
            else:
                os.environ["TESSDATA_PREFIX"] = self._previous
            self._active = False

def check_tesseract_languages(codes: List[str]) -> Tuple[List[str], List[str]]:
    """Split requested Tesseract codes into (usable, missing)."""
    installed = set(available_tesseract_langs())
    usable = [c for c in codes if c in installed]
    missing = [c for c in codes if c not in installed]
    return usable, missing

def surya_layout(image_path: str, width: int, height: int) -> Dict[str, Any]:
    """Surya layout adapter. Returns {status, regions, note}.

    The surya package is not installed in this environment, so this honestly
    returns UNAVAILABLE and Phase 06 continues with Phase 03 regions, then
    page-geometry priors. When surya becomes available, its text-region boxes
    plug into the ``regions`` list unchanged (absolute page coordinates).
    """
    if not is_surya_available():
        return {"status": "UNAVAILABLE",
                "reason": "surya_not_installed",
                "regions": [], "reading_order": []}
    try:
        import surya  # type: ignore  # noqa: F401  (extension point)
        return {"status": "UNAVAILABLE",
                "reason": "surya_adapter_not_wired",
                "regions": [], "reading_order": []}
    except Exception as exc:
        logger.warning("Surya layout failed: %s", type(exc).__name__)
        return {"status": "UNAVAILABLE",
                "reason": f"surya_call_failed:{type(exc).__name__}",
                "regions": [], "reading_order": []}

def phase03_page_data(record_id: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Read Phase 03 decision record: (regions_detected, processed_paths).

    Regions carry Phase 03 bboxes ([x1, y1, x2, y2]) and types
    (TABLE / TEXT_REGION / HEADER / FOOTER / EMBLEM_OR_STAMP).
    """
    from src.phase03_ai_document_preprocessing import PROCESSING_STORAGE_DIR

    regions: List[Dict[str, Any]] = []
    processed: List[str] = []
    result_json = PROCESSING_STORAGE_DIR / record_id / "preprocessing_result.json"
    if not result_json.exists():
        return regions, processed
    try:
        with open(result_json, encoding="utf-8") as handle:
            data = json.load(handle)
        for page in data.get("pages", []) or []:
            outputs = (page.get("output_files", {}) or {})
            proc = outputs.get("processed")
            if proc and Path(proc).exists() and proc not in processed:
                processed.append(str(proc))
            for region in page.get("regions_detected", []) or []:
                entry = dict(region)
                entry.setdefault("page", page.get("page_number", 1))
                regions.append(entry)
    except Exception as exc:
        logger.warning("Could not read Phase 03 decision record: %s", exc)
    return regions, processed

def fallback_regions(width: int, height: int, page: int) -> List[DocumentRegion]:
    """Relative-geometry priors (fallback only, never a rigid template)."""
    out: List[DocumentRegion] = []
    for rtype in REGION_ORDER:
        y0f, y1f = REGION_PRIORS[rtype]
        y0, y1 = int(height * y0f), int(height * y1f)
        out.append(DocumentRegion(
            type=rtype,
            bbox=OCRBoundingBox(x=0, y=y0, width=width, height=max(1, y1 - y0)),
            confidence=0.30,
            source="geometry_prior",
            page=page,
        ))
    return out

def resolve_regions(
    width: int,
    height: int,
    page: int,
    surya_regions: List[Dict[str, Any]],
    phase03_regions: List[Dict[str, Any]],
) -> Tuple[List[DocumentRegion], str]:
    """Region precedence: Surya boxes > Phase 03 regions > geometry priors."""
    if surya_regions:
        out = []
        for item in surya_regions:
            bbox = item.get("bbox", [0, 0, width, height])
            x1, y1, x2, y2 = (int(v) for v in list(bbox)[:4])
            out.append(DocumentRegion(
                type=str(item.get("type", "METADATA")).upper(),
                bbox=OCRBoundingBox(x=max(0, x1), y=max(0, y1),
                                    width=max(1, min(width, x2) - max(0, x1)),
                                    height=max(1, min(height, y2) - max(0, y1))),
                confidence=float(item.get("confidence", 0.0) or 0.0),
                source="surya",
                page=page,
            ))
        return out, "surya"
    single: Dict[str, Dict[str, Any]] = {}
    segments: List[Dict[str, Any]] = []
    for item in phase03_regions:
        if int(item.get("page", page)) != page:
            continue
        mapped = _PHASE03_TO_REGION.get(str(item.get("type", "")))
        if not mapped:
            continue
        bbox = item.get("bbox", []) or []
        if len(bbox) != 4:
            continue
        area = max(0, bbox[2] - bbox[0]) * max(0, bbox[3] - bbox[1])
        if area <= 0:
            continue
        if mapped == "METADATA":
            segments.append({**item, "_area": area})
        elif mapped not in single or area > single[mapped]["_area"]:
            single[mapped] = {**item, "_area": area}
    if single or segments:
        table_box = None
        if "MAIN_TABLE" in single:
            table_box = [int(v) for v in single["MAIN_TABLE"]["bbox"]]

        def _inside_table(bbox: List[int]) -> bool:
            if not table_box:
                return False
            ix1, iy1 = max(bbox[0], table_box[0]), max(bbox[1], table_box[1])
            ix2, iy2 = min(bbox[2], table_box[2]), min(bbox[3], table_box[3])
            inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            own = max(1, (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))
            return inter / own > 0.5

        out = []
        for rtype in ("HEADER", "MAIN_TABLE", "FOOTER"):
            if rtype not in single:
                continue
            item = single[rtype]
            x1, y1, x2, y2 = (int(v) for v in item["bbox"])
            out.append(DocumentRegion(
                type=rtype,
                bbox=OCRBoundingBox(x=max(0, x1), y=max(0, y1),
                                    width=max(1, min(width, x2) - max(0, x1)),
                                    height=max(1, min(height, y2) - max(0, y1))),
                confidence=float(item.get("confidence", 0.0) or 0.0),
                source="phase03_layout",
                page=page,
            ))
        kept_segments = 0
        for item in sorted(segments, key=lambda i: (i["bbox"][1], i["bbox"][0])):
            bbox = [int(v) for v in item["bbox"]]
            if _inside_table(bbox):
                continue  # table grid path owns in-table text (no duplication)
            x1, y1, x2, y2 = bbox
            out.append(DocumentRegion(
                type="METADATA",
                bbox=OCRBoundingBox(x=max(0, x1), y=max(0, y1),
                                    width=max(1, min(width, x2) - max(0, x1)),
                                    height=max(1, min(height, y2) - max(0, y1))),
                confidence=float(item.get("confidence", 0.0) or 0.0),
                source="phase03_layout",
                page=page,
            ))
            kept_segments += 1
        if not out:
            return fallback_regions(width, height, page), "geometry_prior"
        logger.info("Phase 03 layout: %d regions (%d text segments) on page %s",
                    len(out), kept_segments, page)
        return out, "phase03_layout"
    return fallback_regions(width, height, page), "geometry_prior"
