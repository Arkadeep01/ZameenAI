"""Compatibility facade for phase05_language_and_script_detection.py (decomposed; authoritative code lives in ./language/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase05_language_and_script_detection`` import path used by tests.
No logic lives here; see ./language/ for authoritative modules.
"""
from __future__ import annotations

from .language.lang_models import *
from .language.script_detection import *
from .language.providers import *
from .language.lang_service import *
from .language.script_detection import (_script_of_char)
from .language.lang_service import (_parse_json_payload, _candidate_image_paths, _derivative_matches_instance, _project_tessdata_dir, _available_tesseract_langs, _provisional_ocr_text, __all__)
