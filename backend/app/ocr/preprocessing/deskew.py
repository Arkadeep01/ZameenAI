"""Deskew helper (authoritative; extracted verbatim from ImagePreprocessor._deskew_image)."""
from __future__ import annotations

import numpy as np
from PIL import Image
import cv2

import logging
logger = logging.getLogger(__name__)


def deskew_image(image: Image.Image, threshold: float = 0.3) -> Image.Image:
    """Detect and correct skew in document images."""
    try:
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)

        # Use HoughLines to detect skew
        edges = cv2.Canny(img_cv, 50, 150)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, 50)

        if lines is None or len(lines) == 0:
            return image

        angles = []
        for line in lines:
            rho, theta = line[0]
            angle = np.degrees(theta) - 90
            if abs(angle) < 45:  # Only consider small angles
                angles.append(angle)

        if not angles:
            return image

        # Get median angle
        median_angle = np.median(angles)

        if abs(median_angle) > threshold:
            # Rotate image
            h, w = img_cv.shape
            center = (w // 2, h // 2)
            rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(
                np.array(image),
                rotation_matrix,
                (w, h),
                borderMode=cv2.BORDER_REPLICATE
            )
            image = Image.fromarray(rotated)
            logger.info(f"Deskewed image by {median_angle:.2f} degrees")

    except Exception as e:
        logger.debug(f"Deskewing failed (continuing without it): {e}")

    return image
