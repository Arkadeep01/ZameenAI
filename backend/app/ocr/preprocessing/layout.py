"""Decomposed from phase03_ai_document_preprocessing.py: layout. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import hashlib
import json
import logging
import math
import os
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image
from .ai_models import *

import logging
logger = logging.getLogger(__name__)

class LayoutAndRegionDetector:
    """Detects layout regions including tables, text blocks, headers, footers, and artifacts."""

    def __init__(self, metrics_calc: ImageMetricsCalculator):
        self.metrics_calc = metrics_calc

    def detect_all_regions(self, img: np.ndarray, page_num: int) -> List[RegionOfInterest]:
        regions: List[RegionOfInterest] = []
        h, w = img.shape[:2]

        table_regions = self._detect_tables(img, page_num)
        regions.extend(table_regions)

        text_regions = self._detect_text_blocks(img, page_num)
        regions.extend(text_regions)

        header_region = self._detect_header(img, page_num, h, w)
        if header_region:
            regions.append(header_region)

        footer_region = self._detect_footer(img, page_num, h, w)
        if footer_region:
            regions.append(footer_region)

        large_blobs = self._detect_large_blobs(img, page_num, h, w)
        regions.extend(large_blobs)

        return regions

    def _detect_tables(self, img: np.ndarray, page_num: int) -> List[RegionOfInterest]:
        regions = []
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY_INV, 15, 10,
        )

        min_line_len_h = max(15, int(w * 0.08))
        min_line_len_v = max(15, int(h * 0.08))

        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (min_line_len_h, 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, min_line_len_v))

        horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
        vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)

        table_mask = cv2.add(horizontal, vertical)
        contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        min_table_area = w * h * 0.02
        idx = 0
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_table_area:
                continue
            x, y, tw, th = cv2.boundingRect(contour)

            sub_h_lines = np.count_nonzero(horizontal[y:y+th, x:x+tw], axis=1)
            sub_v_lines = np.count_nonzero(vertical[y:y+th, x:x+tw], axis=0)
            h_line_count = int(np.sum(sub_h_lines > 0))
            v_line_count = int(np.sum(sub_v_lines > 0))

            if h_line_count >= 2 and v_line_count >= 2:
                idx += 1
                regions.append(RegionOfInterest(
                    region_id=f"TABLE-{idx:03d}",
                    region_type="TABLE",
                    page=page_num,
                    bbox=[int(x), int(y), int(x + tw), int(y + th)],
                    confidence=min(0.95, 0.6 + (h_line_count + v_line_count) * 0.02),
                ))

        return regions

    def _detect_text_blocks(self, img: np.ndarray, page_num: int) -> List[RegionOfInterest]:
        regions = []
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY_INV, 25, 10,
        )

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
        dilated = cv2.dilate(binary, kernel, iterations=2)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        min_text_area = w * h * 0.005
        max_text_area = w * h * 0.5
        idx = 0

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_text_area or area > max_text_area:
                continue
            x, y, tw, th = cv2.boundingRect(contour)
            if tw < 30 or th < 10:
                continue
            idx += 1
            if idx > 15:
                break
            regions.append(RegionOfInterest(
                region_id=f"TEXT-{idx:03d}",
                region_type="TEXT_REGION",
                page=page_num,
                bbox=[int(x), int(y), int(x + tw), int(y + th)],
                confidence=0.70,
            ))

        return regions

    def _detect_header(self, img: np.ndarray, page_num: int, h: int, w: int) -> Optional[RegionOfInterest]:
        header_h = int(h * 0.12)
        if header_h < 20:
            return None
        header_region = img[0:header_h, :]
        gray = cv2.cvtColor(header_region, cv2.COLOR_BGR2GRAY)
        if np.std(gray) < 5:
            return None
        return RegionOfInterest(
            region_id="HEADER-001",
            region_type="HEADER",
            page=page_num,
            bbox=[0, 0, w, header_h],
            confidence=0.75,
        )

    def _detect_footer(self, img: np.ndarray, page_num: int, h: int, w: int) -> Optional[RegionOfInterest]:
        footer_h = int(h * 0.10)
        if footer_h < 20:
            return None
        footer_region = img[h - footer_h:h, :]
        gray = cv2.cvtColor(footer_region, cv2.COLOR_BGR2GRAY)
        if np.std(gray) < 5:
            return None
        return RegionOfInterest(
            region_id="FOOTER-001",
            region_type="FOOTER",
            page=page_num,
            bbox=[0, h - footer_h, w, h],
            confidence=0.75,
        )

    def _detect_large_blobs(self, img: np.ndarray, page_num: int, h: int, w: int) -> List[RegionOfInterest]:
        regions = []
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        min_blob_area = w * h * 0.005
        max_blob_area = w * h * 0.15
        idx = 0

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_blob_area or area > max_blob_area:
                continue
            x, y, tw, th = cv2.boundingRect(contour)
            aspect = max(tw, th) / max(1, min(tw, th))
            if aspect > 5:
                continue
            idx += 1
            if idx > 5:
                break
            regions.append(RegionOfInterest(
                region_id=f"ARTIFACT-{idx:03d}",
                region_type="EMBLEM_OR_STAMP",
                page=page_num,
                bbox=[int(x), int(y), int(x + tw), int(y + th)],
                confidence=0.60,
            ))

        return regions
