"""Decomposed from phase02_quality_check.py: metrics. (Authoritative implementation; verbatim move.)"""
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

class ImageQualityAnalyzer:
    @staticmethod
    def compute_blur_score(image: np.ndarray) -> float:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()
        return float(variance)

    @staticmethod
    def compute_brightness_score(image: np.ndarray) -> float:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        mean_brightness = np.mean(gray) / 255.0
        return float(mean_brightness)

    @staticmethod
    def compute_contrast_score(image: np.ndarray) -> float:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        p2, p98 = np.percentile(gray, [2, 98])
        if p98 - p2 == 0:
            return 0.0

        contrast = (p98 - p2) / 255.0
        return float(contrast)

    @staticmethod
    def compute_contrast_score_simple(image: np.ndarray) -> float:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        std_dev = np.std(gray) / 255.0
        return float(std_dev)

    @staticmethod
    def compute_skew_angle(image: np.ndarray) -> float:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        coords = np.column_stack(np.where(binary > 0))
        if len(coords) < 10:
            return 0.0

        angle = cv2.minAreaRect(coords)[-1]

        if angle < -45:
            angle = 90 + angle
        elif angle > 45:
            angle = angle - 90

        return float(angle)

    @staticmethod
    def compute_content_ratio(image: np.ndarray) -> float:
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        white_ratio = np.sum(binary == 255) / binary.size
        content_ratio = 1.0 - white_ratio

        return float(content_ratio)

    @staticmethod
    def compute_readability_score(image: np.ndarray) -> float:
        """
        Compute document readability score based on:
        - Foreground/background separation
        - Edge density in text-like structures
        - Local contrast
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image

        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size

        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_magnitude = np.sqrt(sobelx**2 + sobely**2)
        avg_gradient = np.mean(gradient_magnitude) / 255.0

        local_contrast = np.std(gray) / 255.0

        score = (
            edge_density * 1000 +
            avg_gradient * 50 +
            local_contrast * 100
        ) / 3

        return min(100.0, score)

    @staticmethod
    def check_resolution(dimensions: Tuple[int, int]) -> Tuple[QualityStatus, str]:
        width, height = dimensions
        min_dim = min(width, height)
        max_dim = max(width, height)

        if min_dim < RESOLUTION_FAIL_WIDTH or max_dim < RESOLUTION_FAIL_HEIGHT:
            return QualityStatus.FAIL, "FAIL"

        if min_dim < RESOLUTION_WARN_WIDTH or max_dim < RESOLUTION_WARN_HEIGHT:
            return QualityStatus.WARNING, "WARNING"

        return QualityStatus.PASS, "PASS"

    @staticmethod
    def check_blur(blur_score: float, sharpness_normalized: float) -> QualityStatus:
        if sharpness_normalized < 0.3:
            return QualityStatus.FAIL
        if sharpness_normalized < 0.6:
            return QualityStatus.WARNING
        return QualityStatus.PASS

    @staticmethod
    def check_brightness(brightness_score: float) -> QualityStatus:
        if brightness_score < BRIGHTNESS_DARK_THRESHOLD:
            return QualityStatus.FAIL
        if brightness_score > BRIGHTNESS_BRIGHT_THRESHOLD:
            return QualityStatus.WARNING
        return QualityStatus.PASS

    @staticmethod
    def check_contrast(contrast_score: float, contrast_simple: float) -> QualityStatus:
        combined_contrast = (contrast_score + contrast_simple) / 2
        if combined_contrast < CONTRAST_LOW_THRESHOLD:
            return QualityStatus.FAIL
        if combined_contrast < CONTRAST_LOW_THRESHOLD * 2:
            return QualityStatus.WARNING
        return QualityStatus.PASS

    @staticmethod
    def check_skew(skew_angle: float) -> QualityStatus:
        abs_skew = abs(skew_angle)
        if abs_skew > SKEW_SEVERE_THRESHOLD:
            return QualityStatus.FAIL
        if abs_skew > SKEW_WARNING_THRESHOLD:
            return QualityStatus.WARNING
        return QualityStatus.PASS

    @staticmethod
    def check_blank(content_ratio: float) -> Tuple[bool, float]:
        is_blank = content_ratio < BLANK_THRESHOLD
        return is_blank, content_ratio
