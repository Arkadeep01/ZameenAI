"""Decomposed from phase06_ocr_visual_text_recognition.py: tables. (Authoritative implementation; verbatim move.)"""
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

from .models import *
from .words import *

import logging
logger = logging.getLogger(__name__)

def detect_table_grid(
    gray: np.ndarray, bbox: Tuple[int, int, int, int]
) -> Optional[List[Tuple[int, int, int, int, int, int]]]:
    """Ruling-line grid cells as (row, col, x1, y1, x2, y2), else None.

    Conservative: requires >= 2x2 cells from long ruling lines and caps at
    MAX_TABLE_CELLS. No grid -> caller reports UNRESOLVED (never fabricated).
    """
    x1, y1, x2, y2 = (max(0, int(v)) for v in bbox)
    h, w = gray.shape[:2]
    x2, y2 = min(w, x2), min(h, y2)
    if x2 - x1 < 60 or y2 - y1 < 40:
        return None
    crop = gray[y1:y2, x1:x2]
    ch, cw = crop.shape[:2]
    try:
        binary = cv2.adaptiveThreshold(
            crop, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY_INV, 15, 10)
        h_len = max(20, cw // 6)
        v_len = max(20, ch // 6)
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_len, 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_len))
        horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
        vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)
        row_profile = np.count_nonzero(horizontal, axis=1)
        col_profile = np.count_nonzero(vertical, axis=0)
        row_ys = [y for y in range(ch) if row_profile[y] > cw * 0.5]
        col_xs = [x for x in range(cw) if col_profile[x] > ch * 0.5]

        def _clusters(positions: List[int], gap: int = 4) -> List[int]:
            clusters: List[List[int]] = []
            for pos in positions:
                if clusters and pos - clusters[-1][-1] <= gap:
                    clusters[-1].append(pos)
                else:
                    clusters.append([pos])
            return [int(sum(c) / len(c)) for c in clusters]

        grid_rows = _clusters(row_ys)
        grid_cols = _clusters(col_xs)
        if len(grid_rows) < 3 or len(grid_cols) < 3:
            return None
        if (len(grid_rows) - 1) * (len(grid_cols) - 1) > MAX_TABLE_CELLS:
            return None
        cells = []
        for r in range(len(grid_rows) - 1):
            for c in range(len(grid_cols) - 1):
                cells.append((r, c,
                              x1 + grid_cols[c], y1 + grid_rows[r],
                              x1 + grid_cols[c + 1], y1 + grid_rows[r + 1]))
        return cells
    except Exception:
        return None

def native_pdf_page_words(
    pdf_path: str, page_num: int
) -> Tuple[str, List[Dict[str, Any]]]:
    """Native PDF words with coordinates via PyMuPDF (no rasterization)."""
    try:
        import pymupdf as fitz
        with fitz.open(pdf_path) as doc:
            if page_num > len(doc):
                return "", []
            page = doc[page_num - 1]
            items = page.get_text("words") or []
        text_parts: List[str] = []
        words: List[Dict[str, Any]] = []
        for index, item in enumerate(items):
            if len(item) < 5:
                continue
            x0, y0, x1, y1, text = item[0], item[1], item[2], item[3], item[4]
            text = str(text).strip()
            if not text:
                continue
            text_parts.append(text)
            words.append({"text": text, "confidence": NATIVE_WORD_CONF,
                          "confidence_raw": None,
                          "bbox": [int(x0), int(y0), int(x1), int(y1)],
                          "block_num": int(item[5]) if len(item) > 5 else 0,
                          "par_num": 0,
                          "line_num": int(item[7]) if len(item) > 7 else 0,
                          "word_num": index})
        return " ".join(text_parts), words
    except Exception as exc:
        logger.warning("Native PDF word extraction failed: %s", type(exc).__name__)
        return "", []

def _tight_text_box(gray_cell: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """Ink bounding box inside a grid cell (relative coords) or None if empty.

    Grid cells are mostly white + ruling borders, and the borders span the
    full cell edges — so a naive ink box equals the whole cell and Tesseract
    misreads it. Foreground within RULE_MARGIN of the cell border is ignored
    (printed forms pad text away from rules), yielding the true glyph box.
    """
    try:
        _, binary = cv2.threshold(
            gray_cell, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        ch, cw = binary.shape[:2]
        if ch <= 2 * RULE_MARGIN or cw <= 2 * RULE_MARGIN:
            return None
        interior = binary.copy()
        interior[:RULE_MARGIN, :] = 0
        interior[-RULE_MARGIN:, :] = 0
        interior[:, :RULE_MARGIN] = 0
        interior[:, -RULE_MARGIN:] = 0
        points = cv2.findNonZero(interior)
        if points is None or len(points) < 8:
            return None
        x, y, w, h = cv2.boundingRect(points)
        if w < 10 or h < 10:
            return None
        pad = 2
        return (max(RULE_MARGIN, x - pad), max(RULE_MARGIN, y - pad),
                min(cw - RULE_MARGIN, x + w + pad),
                min(ch - RULE_MARGIN, y + h + pad))
    except Exception:
        return None

def _ocr_table_tight(
    pil_view: Image.Image, gray_full: np.ndarray,
    cells: List[Tuple[int, int, int, int, int, int]],
    language: str, page: int,
    full_words: List[OCRWord],
) -> Tuple[List[TableRow], List[OCRWord], List[OCRWord]]:
    """Resolve table cells via tight glyph-box OCR.

    Returns (rows, words_to_add, full_words_to_drop). Non-empty tight reads
    replace full-page fragments inside their cell; empty tight cells keep
    whatever full-page evidence exists (never destroy evidence).
    """
    width, height = pil_view.size
    by_cell_full: Dict[Tuple[int, int], List[OCRWord]] = {}
    for word in full_words:
        cx = word.bbox.x + word.bbox.width / 2.0
        cy = word.bbox.y + word.bbox.height / 2.0
        for row_idx, col_idx, cx1, cy1, cx2, cy2 in cells:
            if cx1 <= cx <= cx2 and cy1 <= cy <= cy2:
                by_cell_full.setdefault((row_idx, col_idx), []).append(word)
                break

    rows_map: Dict[int, List[TableCell]] = {}
    words_to_add: List[OCRWord] = []
    drop_ids: set = set()
    for row_idx, col_idx, cx1, cy1, cx2, cy2 in cells:
        key = (row_idx, col_idx)
        bx1, by1 = max(0, cx1), max(0, cy1)
        bx2, by2 = min(width, cx2), min(height, cy2)
        if bx2 - bx1 < 12 or by2 - by1 < 12:
            continue
        tight = _tight_text_box(gray_full[by1:by2, bx1:bx2])
        members: List[OCRWord] = []
        if tight is not None:
            tx1, ty1, tx2, ty2 = tight
            crop = pil_view.crop((bx1 + tx1, by1 + ty1, bx1 + tx2, by1 + ty2))
            raw = ocr_words_on_crop(crop, language, 7)
            members = words_to_objects(
                raw, page=page, region="MAIN_TABLE", engine="tesseract",
                offset_x=bx1 + tx1, offset_y=by1 + ty1,
                line_prefix=f"{page}-CELL-{row_idx}-{col_idx}")
            members = [w for w in members if w.text.strip("| ").strip()]
            if members:
                for old in by_cell_full.get(key, []):
                    drop_ids.add(id(old))
        if not members:
            members = sorted(by_cell_full.get(key, []),
                             key=lambda w: w.bbox.x)
        confs = [w.confidence for w in members if w.confidence is not None]
        rows_map.setdefault(row_idx, []).append(TableCell(
            row_index=row_idx, column_index=col_idx,
            text=" ".join(w.text for w in members),
            confidence=sum(confs) / len(confs) if confs else 0.0,
            bbox=OCRBoundingBox(x=bx1, y=by1,
                                width=max(1, bx2 - bx1),
                                height=max(1, by2 - by1)),
            page=page,
        ))
        words_to_add.extend(m for m in members if m not in by_cell_full.get(key, []))

    rows: List[TableRow] = []
    for row_idx in sorted(rows_map):
        row_cells = sorted(rows_map[row_idx], key=lambda c: c.column_index)
        min_x = min(c.bbox.x for c in row_cells)
        min_y = min(c.bbox.y for c in row_cells)
        max_x = max(c.bbox.x + c.bbox.width for c in row_cells)
        max_y = max(c.bbox.y + c.bbox.height for c in row_cells)
        confs = [c.confidence for c in row_cells if c.confidence]
        rows.append(TableRow(
            row_index=row_idx, cells=row_cells,
            bbox=OCRBoundingBox(x=min_x, y=min_y,
                                width=max_x - min_x, height=max_y - min_y),
            confidence=sum(confs) / len(confs) if confs else 0.0,
            page=page,
        ))
    dropped = [w for w in full_words if id(w) in drop_ids]
    return rows, words_to_add, dropped
