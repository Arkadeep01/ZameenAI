"""Compatibility facade for phase05_ocr_configuration.py (decomposed; authoritative code lives in ./ocr_config/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase05_ocr_configuration`` import path used by tests.
No logic lives here; see ./ocr_config/ for authoritative modules.
"""
from __future__ import annotations

from .ocr_config.models import *
from .ocr_config.probes import *
from .ocr_config.service import *
from .ocr_config.probes import (_project_tessdata_dir)
