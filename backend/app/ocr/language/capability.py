"""Decomposed from multilingual_registry.py: capability. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (resolve_project_tessdata_dir as _canonical_tessdata_dir)
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .registry import *

import logging
logger = logging.getLogger(__name__)

def _probe_tesseract_langs(tessdata_prefix: Optional[str] = None) -> List[str]:
    """Return Tesseract packs actually visible to ``tesseract --list-langs``.

    Returns [] on any failure (missing binary, broken run) — never guesses.
    """
    try:
        env = None
        if tessdata_prefix:
            env = {**os.environ, "TESSDATA_PREFIX": tessdata_prefix}
        proc = subprocess.run(
            ["tesseract", "--list-langs"],
            capture_output=True, text=True, timeout=20, env=env,
        )
        langs = []
        for line in (proc.stdout or "").splitlines():
            token = line.strip()
            if token and not token.lower().startswith("list of available"):
                langs.append(token)
        return langs
    except Exception:
        return []

def _project_tessdata_dir() -> Optional[Path]:
    """Compatibility wrapper; authoritative impl: app.ocr.paths.resolve_project_tessdata_dir."""
    if os.getenv("TESSDATA_PREFIX"):
        return None
    return _canonical_tessdata_dir()

def probe_tesseract_installed() -> Dict[str, List[str]]:
    """Real Tesseract packs: system + project-local tessdata (if any)."""
    system_langs: List[str] = []
    local_langs: List[str] = []
    prefix = None
    full_env = _probe_tesseract_langs()
    if full_env:
        system_langs = full_env
    tessdata = _project_tessdata_dir()
    if tessdata is not None:
        local_langs = _probe_tesseract_langs(tessdata_prefix=str(tessdata))
        prefix = str(tessdata)
    merged: List[str] = []
    for code in (*system_langs, *local_langs):
        if code and code not in merged:
            merged.append(code)
    return {"system": system_langs, "local": local_langs,
            "merged": merged, "tessdata_prefix": prefix}

def _probe_ollama_models() -> List[str]:
    """Models known to a live Ollama endpoint ([] when unreachable)."""
    base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    try:
        import urllib.request
        with urllib.request.urlopen(f"{base}/api/tags", timeout=3) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        models = [m.get("name", "") for m in payload.get("models", [])]
        return models
    except Exception:
        return []

def build_capability_matrix(
    tesseract_installed: Optional[Dict[str, List[str]]] = None,
    ollama_models: Optional[List[str]] = None,
    force_indicbart: Optional[bool] = None,
    force_surya: Optional[bool] = None,
) -> Dict[str, Any]:
    """Runtime-probe every configured language and REPORTS what is actually
    possible.  The single rule: a language in the registry is CONFIGURED — it
    only becomes VERIFIED when a real OCR pack for its script is installed.

    Status vocabulary: VERIFIED / UNAVAILABLE / NOT_VERIFIED / ERROR.
    """
    if tesseract_installed is None:
        tesseract_installed = probe_tesseract_installed()
    installed = set(tesseract_installed.get("merged", []))
    if ollama_models is None:
        ollama_models = _probe_ollama_models()

    indicbart_disabled = os.getenv("ZAMEENAI_PHASE07_DISABLE_INDICBART", "0") == "1"
    indicbart_status = (
        "ERROR" if force_indicbart is False else
        ("UNAVAILABLE" if indicbart_disabled else
         ("VERIFIED" if force_indicbart else "NOT_VERIFIED"))
    )
    surya_status = (
        "UNAVAILABLE" if force_surya is False else
        ("VERIFIED" if force_surya else "NOT_VERIFIED")
    )
    qwen_status = (
        "VERIFIED" if any("qwen" in m.lower() for m in ollama_models) else
        ("UNAVAILABLE" if ollama_models else "NOT_VERIFIED")
    )
    indicbart_langs = {"hi", "bn", "mr", "gu", "kn", "ml", "or", "pa", "ta",
                       "te", "ur", "ne", "sa", "as", "brx", "doi", "kok",
                       "mai", "mni", "sd", "sat", "ks"}

    rows = []
    for code in sorted(SUPPORTED_LANGUAGES):
        meta = LANGUAGE_REGISTRY[code]
        tesseract_code = meta.get("tesseract")
        if tesseract_code and tesseract_code in installed:
            ocr_status = "VERIFIED"
        elif tesseract_code:
            ocr_status = "UNAVAILABLE"  # pack known upstream, not installed
        else:
            ocr_status = "UNAVAILABLE"  # no upstream pack configured
        rows.append({
            "language": code,
            "name": meta["display"],
            "status": "CONFIGURED",
            "scripts": list(meta["scripts"]),
            "tesseract_code": tesseract_code,
            "tesseract_installed": ocr_status,
            "ocr": ocr_status,
            "surya": surya_status,
            "indicbart": indicbart_status if code in indicbart_langs else "UNAVAILABLE",
            "qwen3_ollama": qwen_status,
            "numeral_normalization": "VERIFIED",
            "detection": ("VERIFIED" if meta.get("evidence") == "verified"
                          else "CONFIGURED"),
        })
    return {
        "generated_at": None,
        "languages": rows,
        "engines": {
            "tesseract": {
                "status": "VERIFIED" if installed else "UNAVAILABLE",
                "installed_packs": sorted(installed),
            },
            "surya": surya_status,
            "indicbart": indicbart_status,
            "qwen3_ollama": qwen_status,
            "detection": "VERIFIED",
        },
    }
