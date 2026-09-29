"""Decomposed from phase05_ocr_configuration.py: probes. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (resolve_project_tessdata_dir as _canonical_tessdata_dir)
import logging
import os
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .models import *

import logging
logger = logging.getLogger(__name__)

def _project_tessdata_dir() -> Optional[Path]:
    """Project-local tessdata fallback (same convention as Phase 05).

    Compatibility wrapper; authoritative impl: app.ocr.paths.resolve_project_tessdata_dir.
    """
    if os.getenv("TESSDATA_PREFIX"):
        return None
    return _canonical_tessdata_dir()

def available_tesseract_langs() -> List[str]:
    """Tesseract packs actually installed (never assumed)."""
    try:
        env = None
        tessdata = _project_tessdata_dir()
        if tessdata is not None:
            env = {**os.environ, "TESSDATA_PREFIX": str(tessdata)}
        proc = subprocess.run(
            ["tesseract", "--list-langs"],
            capture_output=True, text=True, timeout=15, env=env,
        )
        langs = [
            line.strip()
            for line in (proc.stdout or "").splitlines()
            if line.strip() and not line.strip().lower().startswith("list")
        ]
        return langs or ["eng"]
    except Exception:
        return ["eng"]

def read_roboflow_model_id() -> Tuple[Optional[str], Optional[str]]:
    """Return the configured Roboflow model.

    The legacy ``src/roboflow.py`` executed inference at import time, so it
    used to be parsed as text. Its configuration was migrated into this module
    (see ``ROBOFLOW_MODEL_ID`` / ``ROBOFLOW_API_URL``) so Phase 06 owns the
    capability directly and nothing parses files at runtime.
    Returns (model_id, api_url).
    """
    return ROBOFLOW_MODEL_ID, ROBOFLOW_API_URL

def is_surya_available() -> bool:
    """Capability probe for the Surya layout engine (import only, no model load)."""
    try:
        import importlib.util as importlib_util
        return importlib_util.find_spec("surya") is not None
    except Exception:
        return False

def is_roboflow_configured() -> bool:
    """True when the Roboflow client can be constructed (SDK + key + model)."""
    try:
        import importlib.util as importlib_util
        if importlib_util.find_spec("inference_sdk") is None:
            return False
    except Exception:
        return False
    model_id, _ = read_roboflow_model_id()
    if not model_id:
        return False
    return bool(os.getenv("ROBOFLOW_API_KEY"))

def resolve_ocr_languages(
    detected: List[str],
    available: Optional[List[str]] = None,
) -> Tuple[List[str], List[str], str]:
    """Resolve DETECTED -> REQUESTED -> AVAILABLE Tesseract packs.

    Returns (tesseract_codes, missing_packs, pack_status) where pack_status
    is one of OK / PARTIAL / UNAVAILABLE. Unmapped languages (None in
    TESSERACT_LANG_MAP) count as missing — never silently swapped to English.
    """
    installed = set(available if available is not None else available_tesseract_langs())
    codes: List[str] = []
    missing: List[str] = []
    for lang in detected:
        pack = TESSERACT_LANG_MAP.get((lang or "").lower())
        if pack is None:
            missing.append(lang)
        elif pack in installed:
            if pack not in codes:
                codes.append(pack)
        else:
            missing.append(f"{lang}({pack})")
    if codes and not missing:
        status = LanguagePackStatus.OK.value
    elif codes:
        status = LanguagePackStatus.PARTIAL.value
    else:
        status = LanguagePackStatus.UNAVAILABLE.value
    return codes, missing, status
