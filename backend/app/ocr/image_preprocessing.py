"""Compatibility facade for image_preprocessing.py.

Decomposed; authoritative code lives in ./preprocessing/.
Thin re-export shim preserving the src.image_preprocessing import path.
No logic lives here.
"""
from __future__ import annotations

from .preprocessing.quality import ImageQualityAssessment
from .preprocessing.pipeline import ImagePreprocessor, get_optimal_tesseract_psm
