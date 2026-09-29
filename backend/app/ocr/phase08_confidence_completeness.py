"""Compatibility facade for phase08_confidence_completeness.py (decomposed; authoritative code lives in ./confidence/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase08_confidence_completeness`` import path used by tests.
No logic lives here; see ./confidence/ for authoritative modules.
"""
from __future__ import annotations

from .confidence.models import *
from .confidence.engine import *
from .confidence.service import *
from .confidence.engine import (_field_priority, _field_aliases, _label_present_in_text, _record_value)
