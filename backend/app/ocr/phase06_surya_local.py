"""Compatibility facade for phase06_surya_local.py (decomposed; authoritative code lives in ./core/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase06_surya_local`` import path used by tests.
No logic lives here; see ./core/ for authoritative modules.
"""
from __future__ import annotations

from .core.surya_config import *
from .core.surya_adapter import *
from .core.surya_runner import *
from .core.surya_config import (_REPO_ROOT, _DEFAULT_LLAMA_SERVER, _DEFAULT_SURYA_PYTHON, _NON_TEXT_LABELS)
from .core.surya_runner import (_shutdown_server_now, _runner_recognize)
