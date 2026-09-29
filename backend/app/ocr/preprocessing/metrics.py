"""Decomposed from phase03_ai_document_preprocessing.py: metrics. (Authoritative implementation; verbatim move.)"""
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

class ImageMetricsCalculator:
    """Calculates image quality metrics for preprocessing decisions."""

    @staticmethod
    def compute_blur_score(img_array: np.ndarray) -> float:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    @staticmethod
    def compute_brightness_score(img_array: np.ndarray) -> float:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        return float(np.mean(gray) / 255.0)

    @staticmethod
    def compute_contrast_score(img_array: np.ndarray) -> float:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        p2 = np.percentile(gray, 2)
        p98 = np.percentile(gray, 98)
        return float((p98 - p2) / 255.0)

    @staticmethod
    def compute_skew_angle(gray: np.ndarray) -> float:
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
        if num_labels <= 1:
            return 0.0
        min_area = max(20, int(gray.shape[0] * gray.shape[1] * 0.00001))
        foreground = np.zeros_like(binary)
        for label in range(1, num_labels):
            if stats[label, cv2.CC_STAT_AREA] >= min_area:
                foreground[labels == label] = 255
        coords = np.column_stack(np.where(foreground > 0))
        if len(coords) < 50:
            return 0.0
        rect = cv2.minAreaRect(coords.astype(np.float32))
        angle = float(rect[-1])
        if angle < -45:
            angle += 90
        elif angle > 45:
            angle -= 90
        return angle

    @staticmethod
    def normalize_sharpness(blur_score: float) -> float:
        return min(math.log(1 + blur_score) / math.log(1 + SHARPNESS_REFERENCE), 1.0)

    @staticmethod
    def _estimate_background(gray: np.ndarray, kernel_size: Optional[int] = None) -> np.ndarray:
        """Estimate slowly-varying paper/background intensity via large closing + blur."""
        h, w = gray.shape
        k = kernel_size or max(15, min(w, h) // 8)
        if k % 2 == 0:
            k += 1
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, k))
        bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
        sigma = max(5.0, k / 3.0)
        bg = cv2.GaussianBlur(bg, (0, 0), sigmaX=sigma)
        return np.clip(bg, 16, 255).astype(np.float32)

    @staticmethod
    def _line_structure_mask(gray: np.ndarray, min_frac: float = 0.06) -> np.ndarray:
        """Detect horizontal + vertical line structure (table borders)."""
        h, w = gray.shape
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10
        )
        h_len = max(15, int(w * min_frac))
        v_len = max(15, int(h * min_frac))
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_len, 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_len))
        horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
        vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)
        return cv2.add(horizontal, vertical)

    @classmethod
    def compute_readability_metrics(
        cls,
        img_bgr: np.ndarray,
        base_gray: Optional[np.ndarray] = None,
        is_binary: bool = False,
    ) -> ReadabilityMetrics:
        """Compute an OCR-oriented readability score for a candidate image.

        The score weights character-like connected components, stroke width
        quality, noise, background uniformity, structure (table-line)
        preservation and information preservation. It deliberately excludes
        Laplacian/edge strength as a positive signal because binarization can
        inflate edge scores while destroying weak text strokes.

        Two references are used:
        - Contrast/uniformity are measured on the candidate's own grayscale
          (so an enhanced grayscale can demonstrate a real improvement), except
          for binary candidates which use `base_gray` to avoid a flat 0/255
          background inflating their score.
        - Information and structure preservation compare the candidate against
          `base_gray`. For grayscale candidates `base_gray` is the source
          document (we measure how much recoverable text survived); for binary
          candidates `base_gray` is the pre-binarization grayscale (we measure
          how many faint strokes binarization destroyed).
        """
        cand_gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        h, w = cand_gray.shape
        empty = ReadabilityMetrics()
        if h < 24 or w < 24:
            return empty

        base_gray = cand_gray if base_gray is None else base_gray

        # Preservation comparisons happen at base resolution.
        pres_cand_gray = cand_gray
        if cand_gray.shape != base_gray.shape:
            bh, bw = base_gray.shape
            pres_cand_gray = cv2.resize(cand_gray, (bw, bh), interpolation=cv2.INTER_AREA)

        # Contrast/uniformity reference: candidate's own grayscale, or the
        # pre-binarization grayscale for binary candidates.
        contrast_gray = base_gray if (is_binary and base_gray is not None) else cand_gray

        g32 = contrast_gray.astype(np.float32)
        bg = cls._estimate_background(contrast_gray)
        fg_norm_contrast = np.clip((bg - g32) / np.maximum(bg, 1.0), 0.0, 1.0)

        text_mask = fg_norm_contrast > 0.12
        num_text_px = int(np.count_nonzero(text_mask))
        local_contrast = float(np.mean(fg_norm_contrast[text_mask])) if num_text_px > 0 else 0.0

        text_region_contrast = 0.0
        if num_text_px > 0:
            row_sums = np.sum(text_mask.astype(np.uint8), axis=1)
            strong_rows = row_sums > max(2, w * 0.10)
            if strong_rows.any():
                band_mask = np.zeros_like(text_mask)
                for y in range(h):
                    if strong_rows[y]:
                        band_mask[y, :] = True
                band_vals = fg_norm_contrast[band_mask > 0]
                text_region_contrast = float(np.mean(band_vals)) if band_vals.size else 0.0

        non_text = fg_norm_contrast < 0.10
        if non_text.any() and np.count_nonzero(non_text) > max(50, h * w * 0.10):
            bg_std = float(np.std(bg[non_text])) / 255.0
            background_uniformity = max(0.0, 1.0 - min(1.0, bg_std / 0.15))
        else:
            background_uniformity = 0.0

        # --- Component metrics measured on a candidate-optimal internal
        # binarization (what OCR will actually consume) ---
        if is_binary:
            comp_u8 = (cand_gray > 127).astype(np.uint8) * 255
        else:
            _, comp_u8 = cv2.threshold(
                cand_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
            )
        ink_u8 = comp_u8
        total_ink = int(np.count_nonzero(ink_u8))

        char_h_lo = max(3, int(h * 0.015))
        char_h_hi = max(10, int(h * 0.09))
        area_lo = max(4, int(char_h_lo * char_h_lo))
        area_hi = max(60, int(char_h_hi * char_h_hi * 4))

        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(ink_u8, connectivity=8)
        char_px = 0
        tiny_px = 0
        n_char = 0
        comp_px = 0
        if num_labels > 1:
            for i in range(1, num_labels):
                a = int(stats[i, cv2.CC_STAT_AREA])
                bw = int(stats[i, cv2.CC_STAT_WIDTH])
                bh = int(stats[i, cv2.CC_STAT_HEIGHT])
                if a < 3:
                    tiny_px += a
                    continue
                aspect = (bw / bh) if bh > 0 else bw
                if char_h_lo <= bh <= char_h_hi and 0.15 <= aspect <= 8.0 and area_lo <= a <= area_hi:
                    n_char += 1
                    char_px += a
                    comp_px += a

        character_like_ratio = (char_px / total_ink) if total_ink > 0 else 0.0
        noise_free_ratio = max(0.0, 1.0 - (tiny_px / total_ink)) if total_ink > 0 else 0.0
        component_density = min(1.0, comp_px / max(1.0, total_ink * 0.5)) if total_ink > 0 else 0.0

        # Stroke width quality from distance transform of char-like region
        stroke_width_quality = 0.0
        if n_char > 0 and total_ink > 0:
            char_labels = []
            for i in range(1, num_labels):
                bw = int(stats[i, cv2.CC_STAT_WIDTH])
                bh = int(stats[i, cv2.CC_STAT_HEIGHT])
                area = int(stats[i, cv2.CC_STAT_AREA])
                aspect = (bw / bh) if bh > 0 else bw
                if area >= 3 and char_h_lo <= bh <= char_h_hi and 0.15 <= aspect <= 8.0 and area_lo <= area <= area_hi:
                    char_labels.append(i)
            if char_labels:
                char_mask = np.isin(labels, np.array(char_labels))
                dist = cv2.distanceTransform(ink_u8, cv2.DIST_L2, 3)
                char_dist = dist[char_mask > 0]
                if char_dist.size:
                    median_w = float(2 * np.median(char_dist) + 1.0)
                    char_h_mid = (char_h_lo + char_h_hi) / 2.0
                    ratio = median_w / max(1.0, char_h_mid)
                    if ratio <= 0.30:
                        stroke_width_quality = min(1.0, ratio / 0.30)
                    else:
                        stroke_width_quality = max(0.0, 1.0 - (ratio - 0.30) / 0.70)

        # --- Structure (table-line) preservation: base lines surviving in candidate ---
        structure_preservation = 1.0
        line_mask = cls._line_structure_mask(base_gray)
        n_lines = int(np.count_nonzero(line_mask))
        pres_bg = cls._estimate_background(pres_cand_gray)
        pres_fg = np.clip(
            (pres_bg - pres_cand_gray.astype(np.float32)) / np.maximum(pres_bg, 1.0), 0.0, 1.0
        )
        cand_ink = pres_fg > 0.12
        if n_lines > 0:
            preserved = int(np.count_nonzero(line_mask & cand_ink))
            structure_preservation = min(1.0, (preserved / n_lines) * 1.5)

        # --- Information preservation: base text ink retained by the candidate ---
        base_bg = cls._estimate_background(base_gray)
        base_ink = np.clip(
            (base_bg - base_gray.astype(np.float32)) / np.maximum(base_bg, 1.0), 0.0, 1.0
        ) > 0.12
        n_base_ink = int(np.count_nonzero(base_ink))
        if n_base_ink > 0:
            retained = int(np.count_nonzero(base_ink & cand_ink))
            information_preservation = min(1.0, retained / n_base_ink)
        else:
            information_preservation = 0.0

        overall = (
            READABILITY_WEIGHTS["character_like_ratio"] * character_like_ratio
            + READABILITY_WEIGHTS["noise_free_ratio"] * noise_free_ratio
            + READABILITY_WEIGHTS["local_contrast"] * min(1.0, local_contrast)
            + READABILITY_WEIGHTS["stroke_width_quality"] * stroke_width_quality
            + READABILITY_WEIGHTS["background_uniformity"] * background_uniformity
            + READABILITY_WEIGHTS["structure_preservation"] * structure_preservation
            + READABILITY_WEIGHTS["information_preservation"] * information_preservation
        )

        return ReadabilityMetrics(
            local_contrast=local_contrast,
            text_region_contrast=text_region_contrast,
            character_like_ratio=character_like_ratio,
            component_density=component_density,
            stroke_width_quality=stroke_width_quality,
            noise_free_ratio=noise_free_ratio,
            background_uniformity=background_uniformity,
            structure_preservation=structure_preservation,
            information_preservation=information_preservation,
            overall=overall,
        )

    def compute_all_metrics(self, img: Image.Image) -> PageMetrics:
        img_array = np.array(img.convert("RGB"))
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        blur_score = self.compute_blur_score(img_bgr)
        brightness = self.compute_brightness_score(img_bgr)
        contrast = self.compute_contrast_score(img_bgr)
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        skew = self.compute_skew_angle(gray)

        return PageMetrics(
            sharpness_normalized=self.normalize_sharpness(blur_score),
            contrast_normalized=contrast,
            brightness_normalized=brightness,
            skew_angle_degrees=skew,
            blur_score=blur_score,
            width=img.width,
            height=img.height,
        )
