"""Decomposed from ocr.py: tesseract_engine. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from typing import Any, Dict, List, Optional, Sequence
import logging
import pytesseract
from PIL import Image

import logging
logger = logging.getLogger(__name__)

DEFAULT_TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def configure_tesseract(command: Optional[str] = None) -> None:
    """Configure the Tesseract executable.

    If `command` is supplied it wins (deployment-specific override);
    otherwise fall back to a project-default path when it exists.
    Tesseract's own PATH lookup is used when neither is available.
    """
    if command:
        pytesseract.pytesseract.tesseract_cmd = command
    elif DEFAULT_TESSERACT_CMD:
        from pathlib import Path

        if Path(DEFAULT_TESSERACT_CMD).exists():
            pytesseract.pytesseract.tesseract_cmd = DEFAULT_TESSERACT_CMD

def run_real_ocr(
    pil_img: Image.Image,
    language: str = "eng",
    psm: int = 6,
) -> str:
    """OCR one image region/page with Tesseract.

    `language` is intentionally configurable (e.g. "hin", "ben", "eng+hin").
    The `--oem 3 --psm {psm}` config is fixed: OEM=3 (default) so Tesseract
    picks its best engine, PSM comes from the caller (Phase 06 region PSM or
    Phase 05 provisional preview).

    Returns stripped OCR text, or "" when OCR fails (never raises).
    """
    if not isinstance(pil_img, Image.Image):
        raise TypeError("pil_img must be a PIL.Image.Image")
    if not language or not isinstance(language, str):
        raise ValueError("language must be a non-empty Tesseract language code")
    if not isinstance(psm, int) or not (0 <= psm <= 13):
        raise ValueError("psm must be an integer between 0 and 13")

    configure_tesseract()

    try:
        text = pytesseract.image_to_string(
            pil_img.convert("RGB"),
            lang=language,
            config="--oem 3 --psm " + str(psm),
        )
        return text.strip()
    except Exception:
        logger.exception("OCR failed for language=%s, psm=%s", language, psm)
        return ""

def run_ocr_with_data(
    pil_img: Image.Image,
    language: str = "eng",
    psm: int = 6,
) -> List[Dict[str, Any]]:
    """Return word-level OCR with coordinates and confidence.

    Coordinates are relative to the supplied image. Each entry has:
        text, confidence (0..1 or None), bbox [x1, y1, x2, y2],
        block_num, par_num, line_num, word_num.
    """
    if not isinstance(pil_img, Image.Image):
        raise TypeError("pil_img must be a PIL.Image.Image")

    configure_tesseract()

    data = pytesseract.image_to_data(
        pil_img.convert("RGB"),
        lang=language,
        config="--oem 3 --psm " + str(psm),
        output_type=pytesseract.Output.DICT,
    )

    words: List[Dict[str, Any]] = []
    for i, raw_text in enumerate(data.get("text", [])):
        text = str(raw_text).strip()
        if not text:
            continue

        try:
            confidence = float(data["conf"][i])
        except (TypeError, ValueError, KeyError):
            confidence = -1.0

        words.append(
            {
                "text": text,
                "confidence": round(confidence / 100.0, 4) if confidence >= 0 else None,
                "bbox": [
                    int(data["left"][i]),
                    int(data["top"][i]),
                    int(data["left"][i] + data["width"][i]),
                    int(data["top"][i] + data["height"][i]),
                ],
                "block_num": int(data["block_num"][i]),
                "par_num": int(data["par_num"][i]),
                "line_num": int(data["line_num"][i]),
                "word_num": int(data["word_num"][i]),
            }
        )
    return words

def ocr_region(
    image: Image.Image,
    bbox: List[int],
    language: str = "eng",
    psm: int = 6,
) -> Dict[str, Any]:
    """OCR a single layout region.

    The region is cropped before OCR so neighboring content cannot leak in.
    Returns {"text", "words", "bbox"}. Empty result for an empty/invalid bbox.
    """
    if len(bbox) != 4:
        raise ValueError("bbox must contain [x1, y1, x2, y2]")

    width, height = image.size
    x1 = max(0, min(width, int(bbox[0])))
    y1 = max(0, min(height, int(bbox[1])))
    x2 = max(0, min(width, int(bbox[2])))
    y2 = max(0, min(height, int(bbox[3])))

    if x2 <= x1 or y2 <= y1:
        return {"text": "", "words": [], "bbox": [x1, y1, x2, y2]}

    region = image.crop((x1, y1, x2, y2))

    return {
        "text": run_real_ocr(region, language=language, psm=psm),
        "words": run_ocr_with_data(region, language=language, psm=psm),
        "bbox": [x1, y1, x2, y2],
    }

def ocr_images(
    images: Sequence[Image.Image],
    language: str = "eng",
    psm: int = 6,
) -> str:
    """Backward-compatible page OCR.

    This function is for page-level OCR where a page may be handed to us as a
    list of images (one per page) and we join the per-page text.
    Blank pages contribute nothing (not even a separator).
    """
    texts: List[str] = []
    for i, image in enumerate(images):
        logger.info("Executing Tesseract OCR on Page %d...", i + 1)
        text = run_real_ocr(image, language=language, psm=psm)
        if text:
            texts.append(text)
    return "\n\n".join(texts)

def ocr_layout_regions(
    image: Image.Image,
    layout_result: Dict[str, Any],
    language: str = "eng",
    psm: int = 6,
) -> Dict[str, Any]:
    """OCR Stage 6 regions independently.

    For detected tables, each cell is OCR'd via ocr_region (crop before OCR) so
    ruling lines and neighboring cells do not corrupt the text. Non-table
    regions are OCR'd whole page in run_real_ocr upstream.
    """
    page_result: Dict[str, Any] = {"tables": [], "full_page_text": ""}

    for table in layout_result.get("tables", []):
        table_result = {
            "table_index": table.get("table_index", 0),
            "bbox": table.get("bbox"),
            "rows": [],
        }

        cells = table.get("cells", [])
        grouped: Dict[int, List[Dict[str, Any]]] = {}
        for cell in cells:
            row_index = int(cell["row_index"])
            column_index = int(cell["column_index"])

            ocr_result = ocr_region(
                image,
                cell["bbox"],
                language=language,
                psm=psm,
            )
            grouped.setdefault(row_index, []).append(
                {
                    "row_index": row_index,
                    "column_index": column_index,
                    "bbox": cell["bbox"],
                    "text": ocr_result["text"],
                    "words": ocr_result["words"],
                }
            )

        for row_index in sorted(grouped):
            row_cells = sorted(
                grouped[row_index],
                key=lambda item: item["column_index"],
            )
            table_result["rows"].append(
                {"row_index": row_index, "cells": row_cells}
            )

        page_result["tables"].append(table_result)

    return page_result
