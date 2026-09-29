"""Basic preprocessing pipeline orchestrator (authoritative facade over quality/enhancement/deskew)."""
from __future__ import annotations

from typing import Optional
from PIL import Image

import logging
logger = logging.getLogger(__name__)

from .quality import ImageQualityAssessment
from .enhancement import (
    enhance_low_quality,
    enhance_medium_quality,
    enhance_high_quality,
    apply_universal_enhancements,
)
from .deskew import deskew_image


class ImagePreprocessor:
    """Preprocess images for better OCR results."""

    @staticmethod
    def preprocess_for_ocr(
        image_path: str,
        output_path: Optional[str] = None,
        auto_enhance: bool = True,
    ) -> Image.Image:
        """
        Preprocess image for OCR with adaptive enhancement based on quality.

        Args:
            image_path: Path to input image
            output_path: Optional path to save preprocessed image
            auto_enhance: If True, apply adaptive enhancement based on image quality

        Returns:
            Preprocessed PIL Image
        """
        try:
            # Load image
            image = Image.open(image_path)

            # Assess quality
            quality, metrics = ImageQualityAssessment.assess_quality(image)

            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Apply quality-specific preprocessing
            if quality == "LOW":
                image = enhance_low_quality(image, metrics)
            elif quality == "MEDIUM":
                image = enhance_medium_quality(image, metrics)
            else:  # HIGH
                image = enhance_high_quality(image, metrics)

            # Universal improvements
            image = apply_universal_enhancements(image)

            # Save if requested
            if output_path:
                image.save(output_path, quality=95)
                logger.info(f"Preprocessed image saved to {output_path}")

            return image

        except Exception as e:
            logger.error(f"Preprocessing failed for {image_path}: {e}")
            # Return original if preprocessing fails
            return Image.open(image_path).convert('RGB')

    # Backward-compatible private hooks (delegate to authoritative modules).
    @staticmethod
    def _enhance_low_quality(image: Image.Image, metrics: dict) -> Image.Image:
        return enhance_low_quality(image, metrics)

    @staticmethod
    def _enhance_medium_quality(image: Image.Image, metrics: dict) -> Image.Image:
        return enhance_medium_quality(image, metrics)

    @staticmethod
    def _enhance_high_quality(image: Image.Image, metrics: dict) -> Image.Image:
        return enhance_high_quality(image, metrics)

    @staticmethod
    def _apply_universal_enhancements(image: Image.Image) -> Image.Image:
        return apply_universal_enhancements(image)

    @staticmethod
    def _deskew_image(image: Image.Image, threshold: float = 0.3) -> Image.Image:
        return deskew_image(image, threshold)


def get_optimal_tesseract_psm(image_quality: str) -> int:
    """
    Get optimal Tesseract PSM based on image quality.

    PSM values:
    0 = Orientation and script detection only
    1 = Automatic page segmentation with OSD
    3 = Fully automatic (BEST for complex layouts, slower)
    6 = Assume single column of text (default, fast)
    11 = Sparse text; find as much text as possible
    13 = Raw line; treat image as single line

    Returns:
        Optimal PSM for Tesseract
    """
    psm_map = {
        "HIGH": 6,      # Default, fast
        "MEDIUM": 3,    # Fully automatic for complex layouts
        "LOW": 1,       # With OSD for robustness
    }
    return psm_map.get(image_quality, 6)
