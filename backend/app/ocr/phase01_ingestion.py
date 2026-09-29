"""Compatibility facade for phase01_ingestion.py (decomposed; authoritative code lives in ./ingestion/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase01_ingestion`` import path used by tests.
No logic lives here; see ./ingestion/ for authoritative modules.
"""
from __future__ import annotations

from .ingestion.models import *
from .ingestion.ids import *
from .ingestion.validators import *
from .ingestion.service import *
from .ingestion.service import (_ingestion_service)
