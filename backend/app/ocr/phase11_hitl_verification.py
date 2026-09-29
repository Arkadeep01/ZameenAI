"""Compatibility facade for phase11_hitl_verification.py (decomposed; authoritative code lives in ./hitl/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase11_hitl_verification`` import path used by tests.
No logic lives here; see ./hitl/ for authoritative modules.
"""
from __future__ import annotations

from .hitl.models import *
from .hitl.store import *
from .hitl.service import *
from .hitl.store import (_utcnow, _gen_hitl1_id, _flagged_from_assessment)
from .hitl.service import (__all__)
