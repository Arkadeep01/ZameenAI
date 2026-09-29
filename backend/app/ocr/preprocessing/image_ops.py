"""Decomposed from phase03_ai_document_preprocessing.py: image_ops. (Authoritative implementation; verbatim move.)"""
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

class ImageProcessor:
    """Performs actual image processing operations."""

    def __init__(self, metrics_calc: ImageMetricsCalculator):
        self.metrics_calc = metrics_calc

    def denoise(self, img: np.ndarray) -> np.ndarray:
        return cv2.fastNlMeansDenoising(img, None, h=5, templateWindowSize=7, searchWindowSize=21)

    def denoise_bilateral(self, img: np.ndarray, d: int = 7, sigma_color: float = 25.0) -> np.ndarray:
        """Edge-preserving denoising that keeps weak character strokes intact."""
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return cv2.bilateralFilter(gray, d, sigma_color, sigma_color / 3.0)

    def denoise_nlmeans(self, img: np.ndarray, h: float = 10.0) -> np.ndarray:
        """Non-local means denoising, less destructive to thin strokes than blur."""
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return cv2.fastNlMeansDenoising(gray, None, h=h, templateWindowSize=7, searchWindowSize=21)

    def unsharp_mask(self, img: np.ndarray, amount: float = 0.6, sigma: float = 1.0) -> np.ndarray:
        """Controlled unsharp masking; amount scales the enhancement strength."""
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=sigma)
        return cv2.addWeighted(gray, 1.0 + amount, blurred, -amount, 0)

    def sharpen(self, img: np.ndarray, amount: float = 0.35, sigma: float = 1.0) -> np.ndarray:
        """Conservative sharpening for MODERATE pages with recoverable blur.

        Deliberately mild (amount=0.35) to protect thin character strokes,
        table lines, seals and signatures. Delegates to the existing
        edge-preserving unsharp-mask implementation.
        """
        return self.unsharp_mask(img, amount=amount, sigma=sigma)

    def correct_background(self, img: np.ndarray, kernel_size: Optional[int] = None) -> np.ndarray:
        """Remove slowly-varying illumination/paper background from grayscale."""
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        bg = self.metrics_calc._estimate_background(gray, kernel_size)
        corrected = cv2.divide(gray.astype(np.float32), bg, scale=255.0)
        return np.clip(corrected, 0, 255).astype(np.uint8)

    def apply_clahe(self, img: np.ndarray, clip_limit: float = 2.5, tile: int = 8) -> np.ndarray:
        """Local contrast enhancement (CLAHE) on a grayscale image."""
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile, tile))
        return clahe.apply(gray)

    def correct_brightness(self, img: np.ndarray, brightness: float) -> np.ndarray:
        if brightness < BRIGHTNESS_DARK_THRESHOLD:
            return cv2.convertScaleAbs(img, alpha=1.5, beta=30)
        elif brightness > BRIGHTNESS_BRIGHT_THRESHOLD:
            return cv2.convertScaleAbs(img, alpha=0.85, beta=-25)
        return img

    def deskew(self, img: np.ndarray, angle: float) -> np.ndarray:
        h, w = img.shape[:2]
        center = (w / 2.0, h / 2.0)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(
            img, matrix, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )

    def upscale(self, img: np.ndarray, target_width: int = TARGET_WIDTH, max_scale: float = MAX_SCALE) -> Tuple[np.ndarray, bool]:
        h, w = img.shape[:2]
        if w >= target_width:
            return img, False
        scale = min(target_width / float(w), max_scale)
        # Clamp to the hard cap: rounding must never push a dimension past
        # max_scale x the original (e.g. 447px * 2.5 = 1117.5 -> 1117, not 1118).
        new_w = min(int(round(w * scale)), int(math.floor(w * max_scale)))
        new_h = min(int(round(h * scale)), int(math.floor(h * max_scale)))
        new_w, new_h = max(1, new_w), max(1, new_h)
        return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC), True

    def upscale_to_scale(self, img: np.ndarray, scale: float) -> np.ndarray:
        h, w = img.shape[:2]
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    def binarize(self, img: np.ndarray, method: int = cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                 block_size: int = 15, c: int = 8) -> np.ndarray:
        """Adaptive binarization. Faint text may survive better in grayscale;
        this produces a candidate, not the automatic winner."""
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        binary = cv2.adaptiveThreshold(gray, 255, method, cv2.THRESH_BINARY, block_size, c)
        return binary

    def binarize_otsu(self, img: np.ndarray) -> np.ndarray:
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def gray2bgr(self, binary_or_gray: np.ndarray) -> np.ndarray:
        return cv2.cvtColor(binary_or_gray, cv2.COLOR_GRAY2BGR)
