"""Decomposed from phase03_ai_document_preprocessing.py: restoration. (Authoritative implementation; verbatim move.)"""
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
from .metrics import *
from .image_ops import *

import logging
logger = logging.getLogger(__name__)

class LowQualityRestorationPipeline:
    """Dedicated restoration pipeline for LOW-quality documents.

    Produces several OCR candidates:
      restored grayscale variants (background correction + CLAHE + denoise + sharpen)
      multi-scale upscaled variants
      adaptive/global binarization variants
      structure-preserving variants
    Each candidate is scored with the OCR-oriented readability model and the
    destructive ones are rejected in favor of the best recoverable representation.
    """

    def __init__(self, processor: ImageProcessor, metrics_calc: ImageMetricsCalculator):
        self.processor = processor
        self.metrics_calc = metrics_calc

    @staticmethod
    def _to_bgr(img: np.ndarray) -> np.ndarray:
        return img if len(img.shape) == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    def _candidate(
        self,
        name: str,
        description: str,
        img_bgr: np.ndarray,
        operations: List[str],
        is_binary: bool = False,
        base_gray: Optional[np.ndarray] = None,
    ) -> Derivative:
        img = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        metrics = self.metrics_calc.compute_all_metrics(img)
        readability = self.metrics_calc.compute_readability_metrics(
            img_bgr, base_gray=base_gray, is_binary=is_binary
        )
        return Derivative(
            name=name,
            description=description,
            image=img,
            metrics=metrics,
            operations_applied=operations,
            readability=readability,
            is_binary=is_binary,
        )

    @staticmethod
    def _line_mask(gray: np.ndarray, min_frac: float = 0.06) -> np.ndarray:
        """Detect horizontal + vertical lines to protect table borders."""
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

    def build_candidates(self, original: Image.Image, base_grayscale: np.ndarray) -> List[Derivative]:
        """Generate the LOW restoration candidate set from a grayscale base."""
        candidates: List[Derivative] = []
        gray = base_grayscale
        h, w = gray.shape

        # 1. Background-corrected + local contrast (multiple strengths)
        bg_corrected = self.processor.correct_background(gray)
        clahe_mild = self.processor.apply_clahe(bg_corrected, clip_limit=1.5, tile=8)
        clahe_strong = self.processor.apply_clahe(bg_corrected, clip_limit=3.0, tile=8)

        candidates.append(self._candidate(
            "low_restored_clahe_mild",
            "Background correction + mild CLAHE",
            self._to_bgr(clahe_mild),
            ["background_correction", "contrast_enhancement"],
            base_gray=gray,
        ))
        candidates.append(self._candidate(
            "low_restored_clahe_strong",
            "Background correction + strong CLAHE",
            self._to_bgr(clahe_strong),
            ["background_correction", "contrast_enhancement"],
            base_gray=gray,
        ))

        # 2. Edge-preserving denoising variants (bilateral / non-local means)
        denoised_mild = self.processor.denoise_bilateral(clahe_mild, d=5, sigma_color=15.0)
        denoised_strong = self.processor.denoise_nlmeans(clahe_mild, h=12.0)

        candidates.append(self._candidate(
            "low_restored_denoise_bilateral",
            "Background correction + CLAHE + bilateral denoise",
            self._to_bgr(denoised_mild),
            ["background_correction", "contrast_enhancement", "denoising"],
            base_gray=gray,
        ))
        candidates.append(self._candidate(
            "low_restored_denoise_nlm",
            "Background correction + CLAHE + NL-means denoise",
            self._to_bgr(denoised_strong),
            ["background_correction", "contrast_enhancement", "denoising"],
            base_gray=gray,
        ))

        # 3. Controlled sharpening candidates (mild / medium / strong)
        sharpen_base = denoised_mild
        for amount, label in [(0.35, "mild"), (0.6, "medium"), (0.9, "strong")]:
            sharp = self.processor.unsharp_mask(sharpen_base, amount=amount, sigma=1.0)
            candidates.append(self._candidate(
                f"low_restored_sharpen_{label}",
                f"Background correction + CLAHE + denoise + {label} sharpening",
                self._to_bgr(sharp),
                ["background_correction", "contrast_enhancement", "denoising", "sharpening"],
                base_gray=gray,
            ))

        # 4. Multi-scale upscaling where justified by source size
        if w < OCR_TARGET_WIDTH:
            for scale in LOW_UPSCALE_SCALES:
                if int(round(h * scale)) > MAX_RESTORED_DIM or int(round(w * scale)) > MAX_RESTORED_DIM:
                    continue
                upscaled = self.processor.upscale_to_scale(sharpen_base, scale)
                candidates.append(self._candidate(
                    f"low_upscale_{scale:.1f}x".replace(".", "_"),
                    f"Restored grayscale upscaled {scale:.1f}x for OCR",
                    self._to_bgr(upscaled),
                    ["background_correction", "contrast_enhancement", "denoising", "sharpening", "upscale"],
                    base_gray=gray,
                ))

        # 5. Binarization candidates (adaptive Gaussian, adaptive mean, Otsu)
        bin_input = clahe_mild
        binary_gauss = self.processor.binarize(bin_input, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 15, 8)
        binary_mean = self.processor.binarize(bin_input, cv2.ADAPTIVE_THRESH_MEAN_C, 25, 10)
        binary_otsu = self.processor.binarize_otsu(bin_input)

        candidates.append(self._candidate(
            "low_binarized_gaussian",
            "Adaptive Gaussian threshold",
            self._to_bgr(binary_gauss),
            ["background_correction", "contrast_enhancement", "binarization"],
            is_binary=True,
            base_gray=bin_input,
        ))
        candidates.append(self._candidate(
            "low_binarized_mean",
            "Adaptive mean threshold",
            self._to_bgr(binary_mean),
            ["background_correction", "contrast_enhancement", "binarization"],
            is_binary=True,
            base_gray=bin_input,
        ))
        candidates.append(self._candidate(
            "low_binarized_otsu",
            "Otsu global threshold",
            self._to_bgr(binary_otsu),
            ["background_correction", "contrast_enhancement", "binarization"],
            is_binary=True,
            base_gray=bin_input,
        ))

        # 6. Structure-preserving derivative: binarized with table lines protected
        lines = self._line_mask(bin_input)
        structure_preserved = binary_gauss.copy()
        structure_preserved[lines > 0] = 0
        candidates.append(self._candidate(
            "low_structure_preserved",
            "Binarized with preserved table/row lines",
            self._to_bgr(structure_preserved),
            ["background_correction", "contrast_enhancement", "binarization", "structure_preservation"],
            is_binary=True,
            base_gray=bin_input,
        ))

        return candidates
