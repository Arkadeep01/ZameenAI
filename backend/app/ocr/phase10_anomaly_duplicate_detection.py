"""Compatibility facade for phase10_anomaly_duplicate_detection.py (decomposed; authoritative code lives in ./anomaly/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase10_anomaly_duplicate_detection`` import path used by tests.
No logic lives here; see ./anomaly/ for authoritative modules.
"""
from __future__ import annotations

from .anomaly.models import *
from .anomaly.normalize import *
from .anomaly.engines import *
from .anomaly.stage import *
from .anomaly.models import (_NAME_FIELDS, _IDENTIFIER_FIELDS, _COMPOSITE_COMPONENTS, _PRIMARY_IDENTIFIERS)
from .anomaly.normalize import (_value_of)
from .anomaly.stage import (__all__, _gen_stage_id, _utcnow, _summarize)
