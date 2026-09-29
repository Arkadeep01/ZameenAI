"""Compatibility facade for phase03_ai_document_preprocessing.py (decomposed; authoritative code lives in ./preprocessing/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase03_ai_document_preprocessing`` import path used by tests.
No logic lives here; see ./preprocessing/ for authoritative modules.
"""
from __future__ import annotations

from .preprocessing.ai_models import *
from .preprocessing.metrics import *
from .preprocessing.decision import *
from .preprocessing.image_ops import *
from .preprocessing.layout import *
from .preprocessing.restoration import *
from .preprocessing.ai_service import *
from .preprocessing.ai_service import (_service_instance)
