"""Decomposed from phase06_ocr_visual_text_recognition.py: words. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
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
from app.ocr.core.tesseract_engine import (
    configure_tesseract, run_ocr_with_data,
)
from .models import *
from .layout import (_TessdataEnv)
from .models import (_NUMERIC_RE, _SUSPICIOUS_NUMERIC_RE)

import logging
logger = logging.getLogger(__name__)

def _build_lines_from_words(words: List[OCRWord]) -> List[OCRLine]:
    """Group words into lines based on line_num."""
    line_groups: Dict[int, List[OCRWord]] = {}
    for word in words:
        line_groups.setdefault(word.line_num, []).append(word)

    lines = []
    for line_num in sorted(line_groups.keys()):
        line_words = line_groups[line_num]
        line_words_sorted = sorted(line_words, key=lambda w: w.word_num)
        line_text = " ".join(w.text for w in line_words_sorted)

        if line_words:
            min_x = min(w.bbox.x for w in line_words)
            min_y = min(w.bbox.y for w in line_words)
            max_x = max(w.bbox.x + w.bbox.width for w in line_words)
            max_y = max(w.bbox.y + w.bbox.height for w in line_words)
            bbox = OCRBoundingBox(x=min_x, y=min_y, width=max_x - min_x, height=max_y - min_y)
        else:
            bbox = OCRBoundingBox(x=0, y=0, width=0, height=0)

        lines.append(OCRLine(text=line_text, words=line_words_sorted, bbox=bbox))

    return lines

def _calculate_metrics(pages: List[PageOCRResult]) -> OCRMetrics:
    """Calculate aggregate OCR metrics across all pages."""
    all_confidences = []
    total_words = 0
    total_chars = 0
    pages_processed = 0
    pages_failed = 0

    for page in pages:
        if page.status == OCRStatus.SUCCESS or page.status == OCRStatus.PARTIAL_SUCCESS:
            pages_processed += 1
            total_words += page.word_count
            total_chars += page.character_count
            for word in page.words:
                if word.confidence is not None:
                    all_confidences.append(word.confidence)
        else:
            pages_failed += 1

    if not all_confidences:
        return OCRMetrics(
            mean_confidence=0.0,
            median_confidence=0.0,
            low_confidence_word_count=0,
            low_confidence_percentage=0.0,
            total_words=0,
            total_characters=0,
            pages_processed=pages_processed,
            pages_failed=pages_failed,
        )

    sorted_conf = sorted(all_confidences)
    mean_conf = sum(sorted_conf) / len(sorted_conf)
    mid = len(sorted_conf) // 2
    median_conf = sorted_conf[mid] if len(sorted_conf) % 2 else (sorted_conf[mid - 1] + sorted_conf[mid]) / 2

    low_conf_count = sum(1 for c in sorted_conf if c < 0.6)
    low_conf_pct = (low_conf_count / len(sorted_conf)) * 100 if sorted_conf else 0.0

    return OCRMetrics(
        mean_confidence=mean_conf,
        median_confidence=median_conf,
        low_confidence_word_count=low_conf_count,
        low_confidence_percentage=low_conf_pct,
        total_words=total_words,
        total_characters=total_chars,
        pages_processed=pages_processed,
        pages_failed=pages_failed,
    )

def _word_script(text: str) -> str:
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F:
            return "Devanagari"
        if 0x0980 <= code <= 0x09FF:
            return "Bengali"
    if re.search(r"[A-Za-z]", text or ""):
        return "Latin"
    return ""

def ocr_words_on_crop(
    crop: Image.Image, language: str, psm: int
) -> List[Dict[str, Any]]:
    """Word-level Tesseract evidence for one region crop (single engine call)."""
    with _TessdataEnv():
        try:
            configure_tesseract()
            return run_ocr_with_data(crop.convert("RGB"), language=language, psm=psm)
        except Exception as exc:
            logger.warning("Region OCR failed (lang=%s psm=%s): %s",
                           language, psm, type(exc).__name__)
            return []

def words_to_objects(
    raw_words: List[Dict[str, Any]],
    *,
    page: int,
    region: str,
    engine: str,
    offset_x: int = 0,
    offset_y: int = 0,
    line_prefix: Optional[str] = None,
) -> List[OCRWord]:
    """Map raw Tesseract word dicts to evidence objects with page coordinates.

    Raw numeric strings are preserved exactly as observed; uncertain tokens
    (low confidence or suspicious glyph mix in numbers) get needs_review.
    """
    out: List[OCRWord] = []
    for item in raw_words:
        text = str(item.get("text", "")).strip()
        if not text:
            continue
        bbox = item.get("bbox", [0, 0, 0, 0]) or [0, 0, 0, 0]
        conf = item.get("confidence")
        conf_raw = round(conf * 100.0, 2) if conf is not None else None
        numeric = bool(_NUMERIC_RE.match(text.replace(" ", "")))
        needs_review = (
            (conf is not None and conf < NEEDS_REVIEW_CONF)
            or (numeric and bool(_SUSPICIOUS_NUMERIC_RE.search(text)))
        )
        line_num = int(item.get("line_num", 0) or 0)
        block_num = int(item.get("block_num", 0) or 0)
        tag = line_prefix or f"{page}"
        out.append(OCRWord(
            text=text, confidence=conf,
            bbox=OCRBoundingBox(
                x=int(bbox[0]) + offset_x, y=int(bbox[1]) + offset_y,
                width=max(0, int(bbox[2]) - int(bbox[0])),
                height=max(0, int(bbox[3]) - int(bbox[1]))),
            block_num=block_num, par_num=int(item.get("par_num", 0) or 0),
            line_num=line_num, word_num=int(item.get("word_num", 0) or 0),
            page=page,
            line_id=f"{tag}-{block_num}-{line_num}",
            region=region, engine=engine,
            script=_word_script(text),
            needs_review=needs_review,
            confidence_raw=conf_raw,
        ))
    return out

def build_lines(
    words: List[OCRWord], page: int, start_order: int = 0
) -> List[OCRLine]:
    """Stable lines grouped by (region, line_id), ordered for reading."""
    groups: Dict[Tuple[str, str], List[OCRWord]] = {}
    for word in words:
        groups.setdefault((word.region, word.line_id), []).append(word)

    def _sort_key(item: Tuple[Tuple[str, str], List[OCRWord]]) -> Tuple[int, int, int]:
        (region, _), members = item
        try:
            region_rank = REGION_ORDER.index(region)
        except ValueError:
            region_rank = len(REGION_ORDER)
        top = min(w.bbox.y for w in members)
        left = min(w.bbox.x for w in members)
        return (region_rank, top, left)

    lines: List[OCRLine] = []
    for order, ((region, _), members) in enumerate(
            sorted(groups.items(), key=_sort_key), start=start_order):
        members_sorted = sorted(members, key=lambda w: w.bbox.x)
        text = " ".join(w.text for w in members_sorted)
        min_x = min(w.bbox.x for w in members_sorted)
        min_y = min(w.bbox.y for w in members_sorted)
        max_x = max(w.bbox.x + w.bbox.width for w in members_sorted)
        max_y = max(w.bbox.y + w.bbox.height for w in members_sorted)
        confs = [w.confidence for w in members_sorted if w.confidence is not None]
        lines.append(OCRLine(
            text=text, words=members_sorted,
            bbox=OCRBoundingBox(x=min_x, y=min_y,
                                width=max_x - min_x, height=max_y - min_y),
            region=region, page=page,
            confidence=sum(confs) / len(confs) if confs else 0.0,
            reading_order=order,
        ))
    return lines

def _word_overlap(a: OCRWord, b: OCRWord) -> float:
    """Intersection-over-union of two word boxes (same page)."""
    if a.page != b.page:
        return 0.0
    ax1, ay1 = a.bbox.x, a.bbox.y
    ax2, ay2 = ax1 + a.bbox.width, ay1 + a.bbox.height
    bx1, by1 = b.bbox.x, b.bbox.y
    bx2, by2 = bx1 + b.bbox.width, by1 + b.bbox.height
    inter = max(0, min(ax2, bx2) - max(ax1, bx1)) * max(0, min(ay2, by2) - max(ay1, by1))
    union = max(1, (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter)
    return inter / union

def suppress_duplicate_words(words: List[OCRWord]) -> List[OCRWord]:
    """Drop near-duplicate readings from overlapping segments/crops.

    Keeps the higher-confidence reading; never merges or rewrites text.
    This is dedup of identical evidence, not blind concatenation.
    """
    kept: List[OCRWord] = []
    for word in sorted(words,
                       key=lambda w: (-(w.confidence or 0.0), w.region, w.bbox.x)):
        duplicate = False
        for existing in kept:
            if (word.text == existing.text
                    and _word_overlap(word, existing) > 0.7):
                duplicate = True
                break
        if not duplicate:
            kept.append(word)
    return kept

def _tag_words_by_region(
    words: List[OCRWord], regions: List["DocumentRegion"], page: int
) -> List[int]:
    """Tag each word with its most specific containing region (smallest area).

    Words in no region keep FULL_PAGE (honest unknown, never forced).
    Returns per-region word counts aligned with ``regions``.
    """
    counts = [0] * len(regions)
    boxes = []
    for region in regions:
        box = region.bbox
        boxes.append((box.x, box.y, box.x + box.width, box.y + box.height,
                      box.width * box.height))
    for word in words:
        cx = word.bbox.x + word.bbox.width / 2.0
        cy = word.bbox.y + word.bbox.height / 2.0
        best, best_area = None, None
        for idx, (x1, y1, x2, y2, area) in enumerate(boxes):
            if x1 <= cx <= x2 and y1 <= cy <= y2:
                if best_area is None or area < best_area:
                    best, best_area = idx, area
        if best is not None:
            word.region = regions[best].type
            word.line_id = (f"{page}-R{best}-{word.block_num}-{word.line_num}")
            counts[best] += 1
    return counts

def _word_center_in(word: OCRWord, bbox: Tuple[int, int, int, int]) -> bool:
    x1, y1, x2, y2 = bbox
    cx = word.bbox.x + word.bbox.width / 2.0
    cy = word.bbox.y + word.bbox.height / 2.0
    return x1 <= cx <= x2 and y1 <= cy <= y2
