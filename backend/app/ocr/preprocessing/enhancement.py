"""Quality-tier enhancement strategies (authoritative; extracted from ImagePreprocessor)."""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import cv2

import logging
logger = logging.getLogger(__name__)


def enhance_low_quality(image: Image.Image, metrics: dict) -> Image.Image:
    """Aggressive enhancement for low-quality images."""
    # 1. Increase contrast significantly
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.5)

    # 2. Sharpen to improve text clarity
    image = image.filter(ImageFilter.SHARPEN)
    image = image.filter(ImageFilter.SHARPEN)

    # 3. Increase brightness slightly if too dark
    if metrics.get('brightness', 100) < 60:
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.3)

    # 4. Denoise using bilateral filter
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    image_cv = cv2.bilateralFilter(image_cv, 9, 75, 75)
    image = Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

    logger.info("Applied aggressive enhancement for low-quality image")
    return image


def enhance_medium_quality(image: Image.Image, metrics: dict) -> Image.Image:
    """Moderate enhancement for medium-quality images."""
    # 1. Moderate contrast increase
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.8)

    # 2. Sharpen once
    image = image.filter(ImageFilter.SHARPEN)

    # 3. Light denoising
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    image_cv = cv2.bilateralFilter(image_cv, 5, 50, 50)
    image = Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))

    logger.info("Applied moderate enhancement for medium-quality image")
    return image


def enhance_high_quality(image: Image.Image, metrics: dict) -> Image.Image:
    """Minimal enhancement for high-quality images."""
    # Slight contrast boost only
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.2)

    logger.info("Applied minimal enhancement for high-quality image")
    return image


def apply_universal_enhancements(image: Image.Image) -> Image.Image:
    """Apply improvements that work for all quality levels."""
    from .deskew import deskew_image
    # Deskew if needed
    image = deskew_image(image)

    # Enhance colors/saturation for better OCR
    enhancer = ImageEnhance.Color(image)
    image = enhancer.enhance(0.0)  # Convert to grayscale-like (removes color noise)

    return image
