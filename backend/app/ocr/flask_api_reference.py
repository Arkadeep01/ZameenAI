"""Compatibility facade for flask_api_reference.py (decomposed; authoritative code lives in ./api/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.flask_api_reference`` import path used by tests.
No logic lives here; see ./api/ for authoritative modules.
"""
from __future__ import annotations

from .api.app_factory import *
from .api.ingest_quality import *
from .api.classify_ocr import *
from .api.workflow import *
from .api.app_factory import (_safe_name)
