"""Compatibility facade for ocr.py (decomposed; authoritative code lives in ./core/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.ocr`` import path used by tests.
No logic lives here; see ./core/ for authoritative modules.
"""
from __future__ import annotations

from .core.tesseract_engine import *
