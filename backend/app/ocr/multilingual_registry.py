"""Compatibility facade for multilingual_registry.py (decomposed; authoritative code lives in ./language/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.multilingual_registry`` import path used by tests.
No logic lives here; see ./language/ for authoritative modules.
"""
from __future__ import annotations

from .language.registry import *
from .language.numerals import *
from .language.capability import *
from .language.registry import (_NUMERAL_BLOCK, _FIELD_ALIASES)
from .language.capability import (_probe_tesseract_langs, _project_tessdata_dir, _probe_ollama_models)
