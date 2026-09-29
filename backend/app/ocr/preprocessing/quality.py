"""Image quality assessment (authoritative; moved verbatim from image_preprocessing.py)."""
from __future__ import annotations

import numpy as np
from PIL import Image

import logging
logger = logging.getLogger(__name__)


class ImageQualityAssessment:
    """Assess and categorize image quality."""

    QUALITY_THRESHOLDS = {
        "HIGH": {"contrast": 0.7, "brightness": 100},
        "MEDIUM": {"contrast": 0.5, "brightness": 50},
        "LOW": {"contrast": 0.3, "brightness": 0},
    }

    @staticmethod
    def assess_quality(image: Image.Image):
        """
        Assess image quality.

        Returns:
            Tuple of (quality_level, metrics_dict)
            quality_level: "HIGH", "MEDIUM", or "LOW"
        """
        # Convert to grayscale for analysis
        gray = image.convert('L')
        arr = np.array(gray, dtype=np.float32)

        # Calculate metrics
        contrast = np.std(arr) / 255.0
        brightness = np.mean(arr)

        # Detect if text-heavy (most pixels are black/white)
        hist = np.histogram(arr, bins=256)[0]
        text_density = (hist[0] + hist[255]) / len(arr.flatten())  # Dark or light pixels

        metrics = {
            "contrast": contrast,
            "brightness": brightness,
            "text_density": text_density,
        }

        # Classify quality
        if contrast > 0.7 and brightness > 80:
            quality = "HIGH"
        elif contrast > 0.4 or brightness > 40:
            quality = "MEDIUM"
        else:
            quality = "LOW"

        logger.info(f"Image quality assessment: {quality} (contrast={contrast:.3f}, brightness={brightness:.1f})")
        return quality, metrics
