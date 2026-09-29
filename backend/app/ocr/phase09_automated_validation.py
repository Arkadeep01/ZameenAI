"""Compatibility facade for phase09_automated_validation.py (decomposed; authoritative code lives in ./validation/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase09_automated_validation`` import path used by tests.
No logic lives here; see ./validation/ for authoritative modules.
"""
from __future__ import annotations

from .validation.models import *
from .validation.rules import *
from .validation.engine import *
from .validation.service import *
from .validation.models import (_PRIORITY_SEVERITY, _DATE_FORMATS)
from .validation.rules import (_to_number, _parse_date, _field_priority, _severity_for_priority, _evidence_from_assessment, _base_field_check)
from .validation.engine import (_gen_validation_run_id)
from .validation.service import (__all__)
