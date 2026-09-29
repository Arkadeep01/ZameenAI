"""Decomposed from phase02_quality_check.py: loaders. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import logging
import math
import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image
from .models import *

import logging
logger = logging.getLogger(__name__)

class PDFPageLoader:
    @staticmethod
    def load_pdf_pages(pdf_path: Path, dpi: int = 300) -> List[Tuple[int, np.ndarray, Tuple[int, int]]]:
        import pymupdf as fitz

        pages = []
        with fitz.open(str(pdf_path)) as doc:
            page_count = len(doc)
            zoom = dpi / 72.0
            matrix = fitz.Matrix(zoom, zoom)

            for page_idx in range(page_count):
                try:
                    page = doc[page_idx]
                    pix = page.get_pixmap(matrix=matrix, alpha=False)
                    img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                        pix.height, pix.width, 3
                    )
                    img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                    pages.append((page_idx + 1, img_array, (pix.width, pix.height)))
                except Exception as e:
                    logger.error(f"Failed to render page {page_idx + 1}: {e}")
                    raise

        return pages

class ImagePageLoader:
    @staticmethod
    def load_image_pages(image_path: Path) -> List[Tuple[int, np.ndarray, Tuple[int, int]]]:
        img = Image.open(str(image_path))
        if img.mode != "RGB":
            img = img.convert("RGB")

        img_array = np.array(img)
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        return [(1, img_array, (img.width, img.height))]
