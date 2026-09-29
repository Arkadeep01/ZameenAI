"""Decomposed from phase06_surya_local.py: surya_config. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import logging
logger = logging.getLogger(__name__)

SURYA_GGUF_REPO = "datalab-to/surya-ocr-2-gguf"

SURYA_MODEL_CHECKPOINT = "datalab-to/surya-ocr-2"

_REPO_ROOT = APP_DIR

_DEFAULT_LLAMA_SERVER = (
    _REPO_ROOT / "tools" / "llama-server" / "pkg" / "llama-server.exe"
)

_DEFAULT_SURYA_PYTHON = _REPO_ROOT / ".venv-surya" / "Scripts" / "python.exe"

_NON_TEXT_LABELS = {"Picture", "Figure", "Line", "Separator"}

SURYA_LABEL_TO_REGION = {
    "SectionHeader": "HEADER",
    "Title": "HEADER",
    "Table": "MAIN_TABLE",
    "Text": "METADATA",
    "List": "METADATA",
    "Caption": "METADATA",
    "Footnote": "METADATA",
    "Formula": "METADATA",
    "Form": "METADATA",
}

def is_surya_local_enabled() -> bool:
    """True only when the operator explicitly opts into local Surya."""
    return (os.getenv("ZAMEENAI_SURYA_LOCAL") or "").strip() == "1"

def resolve_llama_server() -> Optional[str]:
    """Locate the native ``llama-server`` binary (no download, no Docker)."""
    for candidate in (
        os.getenv("ZAMEENAI_LLAMA_SERVER"),
        os.getenv("LLAMA_CPP_BINARY"),
        str(_DEFAULT_LLAMA_SERVER),
    ):
        if candidate and Path(candidate).is_file():
            return candidate
    found = shutil.which("llama-server") or shutil.which("llama-server.exe")
    return found

def resolve_surya_python() -> Optional[str]:
    """Interpreter of the isolated Surya environment (CUDA torch)."""
    override = os.getenv("ZAMEENAI_SURYA_PYTHON")
    if override and Path(override).is_file():
        return override
    if _DEFAULT_SURYA_PYTHON.is_file():
        return str(_DEFAULT_SURYA_PYTHON)
    return None

def check_surya_local() -> Dict[str, Any]:
    """Capability probe: no model load, no server start, no Docker."""
    if not is_surya_local_enabled():
        return {
            "available": False,
            "backend": "llamacpp",
            "reason": "disabled",
            "hint": "Set ZAMEENAI_SURYA_LOCAL=1 to enable local Surya OCR.",
        }
    binary = resolve_llama_server()
    if not binary:
        return {
            "available": False,
            "backend": "llamacpp",
            "reason": "llama_server_not_found",
            "hint": (
                "Install the official llama.cpp Windows CUDA bundle and set "
                "ZAMEENAI_LLAMA_SERVER to llama-server.exe "
                "(see SURYA_LOCAL_SETUP in this module docstring)."
            ),
        }
    python = resolve_surya_python()
    if not python:
        return {
            "available": False,
            "backend": "llamacpp",
            "reason": "surya_env_not_found",
            "hint": "ZAMEENAI_SURYA_PYTHON must point at the .venv-surya interpreter.",
        }
    return {
        "available": True,
        "backend": "llamacpp",
        "binary": binary,
        "python": python,
        "model_checkpoint": SURYA_MODEL_CHECKPOINT,
        "gguf_repo": SURYA_GGUF_REPO,
    }
