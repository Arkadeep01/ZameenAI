"""Compatibility facade for phase02_quality_check.py (decomposed; authoritative code lives in ./quality/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase02_quality_check`` import path used by tests.
No logic lives here; see ./quality/ for authoritative modules.
"""
from __future__ import annotations

from .quality.models import *
from .quality.metrics import *
from .quality.loaders import *
from .quality.service import *
from .quality.service import (_quality_service)
