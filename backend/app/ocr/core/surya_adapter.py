"""Decomposed from phase06_surya_local.py: surya_adapter. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional
from .surya_config import *
from .surya_config import (_NON_TEXT_LABELS, _REPO_ROOT)

import logging
logger = logging.getLogger(__name__)

def run_surya_local(
    image_path: str,
    timeout: Optional[float] = None,
) -> Dict[str, Any]:
    """Run genuine Surya recognition on one image file (subprocess, no Docker).

    Returns the Phase 06 Surya evidence envelope with ``status`` one of
    SUCCESS / UNAVAILABLE / ERROR. Never raises for backend failures.
    """
    probe = check_surya_local()
    if not probe["available"]:
        return {
            "status": "UNAVAILABLE",
            "backend": "llamacpp",
            "reason": probe["reason"],
            "hint": probe.get("hint", ""),
        }
    if not image_path or not Path(image_path).is_file():
        return {
            "status": "UNAVAILABLE",
            "backend": "llamacpp",
            "reason": "invalid_image",
        }
    if timeout is None:
        try:
            timeout = float(os.getenv("ZAMEENAI_SURYA_TIMEOUT", "600"))
        except ValueError:
            timeout = 600.0

    env = dict(os.environ)
    # Explicit non-Docker backend. Surya's autodetect would pick vllm on a
    # CUDA box, which spawns Docker - never allow that path here.
    env["SURYA_INFERENCE_BACKEND"] = "llamacpp"
    env["LLAMA_CPP_BINARY"] = probe["binary"]
    # Never inherit a pinned external/Docker server into the local run.
    env.pop("SURYA_INFERENCE_URL", None)

    cmd = [
        probe["python"],
        "-m",
        "app.ocr.core.surya_runner",
        "recognize",
        "--image",
        str(image_path),
    ]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(_REPO_ROOT),
            env=env,
        )
    except subprocess.TimeoutExpired:
        logger.warning("Surya local inference timed out for %s", image_path)
        return {
            "status": "ERROR",
            "backend": "llamacpp",
            "reason": "inference_timeout",
        }
    except Exception as exc:  # noqa: BLE001 - boundary: never break Phase 06
        logger.warning("Surya local inference failed to launch: %s", exc)
        return {
            "status": "ERROR",
            "backend": "llamacpp",
            "reason": f"launch_failed:{type(exc).__name__}",
        }
    if proc.returncode != 0:
        logger.warning(
            "Surya local runner failed (%s): %s",
            proc.returncode,
            (proc.stderr or "")[-2000:],
        )
        return {
            "status": "ERROR",
            "backend": "llamacpp",
            "reason": "runner_failed",
            "detail": (proc.stderr or "")[-2000:],
        }
    try:
        # The runner prints exactly one JSON document on stdout.
        payload = json.loads(proc.stdout.strip().splitlines()[-1])
    except Exception as exc:  # noqa: BLE001 - boundary
        logger.warning("Surya local runner emitted invalid JSON: %s", exc)
        return {
            "status": "ERROR",
            "backend": "llamacpp",
            "reason": "invalid_runner_output",
        }
    if not isinstance(payload, dict) or payload.get("backend") == "vllm":
        return {
            "status": "ERROR",
            "backend": "llamacpp",
            "reason": "unexpected_backend",
        }
    return payload

def map_blocks_to_regions(
    blocks: List[Dict[str, Any]], width: int, height: int
) -> List[Dict[str, Any]]:
    """Map Surya recognition blocks to ``resolve_regions`` inputs.

    Uses absolute page coordinates (runner already scales polygons).
    Picture/empty blocks carry no text and are skipped.
    """
    regions: List[Dict[str, Any]] = []
    for idx, block in enumerate(blocks):
        label = str(block.get("label", ""))
        if label in _NON_TEXT_LABELS:
            continue
        text = str(block.get("text", "") or "").strip()
        if not text:
            continue
        poly = block.get("polygon") or []
        try:
            xs = [float(p[0]) for p in poly]
            ys = [float(p[1]) for p in poly]
        except (TypeError, IndexError, ValueError):
            continue
        if not xs or not ys:
            continue
        x1, y1, x2, y2 = (
            max(0, int(min(xs))),
            max(0, int(min(ys))),
            min(width, int(max(xs))),
            min(height, int(max(ys))),
        )
        if x2 - x1 < 5 or y2 - y1 < 5:
            continue
        regions.append(
            {
                "bbox": [x1, y1, x2, y2],
                "type": SURYA_LABEL_TO_REGION.get(label, "METADATA"),
                "confidence": float(block.get("confidence", 0.0) or 0.0),
                "reading_order": int(block.get("reading_order", idx)),
                "label": label,
            }
        )
    regions.sort(key=lambda r: (r["reading_order"], r["bbox"][1], r["bbox"][0]))
    return regions

def save_pil_to_temp(image: Any) -> str:
    """Persist a PIL image to a temp PNG for the runner subprocess."""
    tmp = tempfile.NamedTemporaryFile(
        suffix=".png", prefix="zameenai_surya_", delete=False
    )
    try:
        if getattr(image, "mode", "RGB") != "RGB":
            image = image.convert("RGB")
        image.save(tmp.name, format="PNG")
    finally:
        tmp.close()
    return tmp.name
