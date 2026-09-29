"""Decomposed from phase06_surya_local.py: surya_runner. (Authoritative implementation; verbatim move.)"""
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
from .surya_adapter import *

import logging
logger = logging.getLogger(__name__)

def _shutdown_server_now(manager: Any) -> None:
    """Stop the spawned llama-server immediately (fast teardown).

    Surya registers an atexit SIGTERM/sleep loop that is slow/flaky on
    Windows and can outlive the caller's patience. Killing the server tree
    here makes that atexit hook a no-op (dead pid + deleted sentinel).
    """
    try:
        manager.stop()
    except Exception:
        pass
    try:
        sentinel = (
            Path(os.path.expanduser("~/.cache/datalab/surya"))
            / "llamacpp_server.json"
        )
        pid: Optional[int] = None
        if sentinel.is_file():
            try:
                pid = int((json.loads(sentinel.read_text()) or {}).get("pid") or 0) or None
            except Exception:
                pid = None
        if pid:
            import subprocess as _sp

            _sp.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                capture_output=True,
                timeout=30,
            )
    except Exception:
        pass

def _runner_recognize(image_path: str) -> Dict[str, Any]:
    """Genuine Surya recognition via the llamacpp backend (no Docker)."""
    import time

    started = time.time()
    # Imported here: this module must stay stdlib-only at top level so the
    # main ZameenAI venv can import the provider cheaply.
    from PIL import Image  # noqa: E402

    from surya.inference import SuryaInferenceManager  # noqa: E402
    from surya.recognition import RecognitionPredictor  # noqa: E402

    timings: Dict[str, float] = {}
    try:
        import torch  # noqa: E402

        cuda = bool(torch.cuda.is_available())
        device_name = (
            torch.cuda.get_device_name(0) if cuda and torch.cuda.device_count() else "cpu"
        )
        torch_version = torch.__version__
    except Exception:
        cuda, device_name, torch_version = False, "cpu", "unknown"
    device = {
        "torch_version": torch_version,
        "cuda_available": cuda,
        "device": device_name,
    }

    if (os.getenv("SURYA_INFERENCE_BACKEND") or "").strip().lower() == "vllm":
        # Defensive: the ZameenAI provider never sets this; refuse Docker.
        return {
            "status": "ERROR",
            "backend": "refused",
            "reason": "vllm_backend_refused",
            "detail": "ZameenAI local Surya never uses the Docker/vLLM backend.",
        }

    try:
        img = Image.open(image_path)
    except Exception as exc:
        return {
            "status": "UNAVAILABLE",
            "backend": "llamacpp",
            "reason": "invalid_image",
            "detail": f"{type(exc).__name__}: {exc}",
            "device": device,
        }
    width, height = img.size
    if img.mode != "RGB":
        img = img.convert("RGB")

    t0 = time.time()
    manager = SuryaInferenceManager(method="llamacpp")
    if manager.method != "llamacpp":
        return {
            "status": "ERROR",
            "backend": str(manager.method),
            "reason": "unexpected_backend",
            "device": device,
        }
    manager.start()
    timings["server_start_s"] = round(time.time() - t0, 2)

    t1 = time.time()
    try:
        pages = RecognitionPredictor(manager)([img], full_page=True)
    except Exception as exc:
        _shutdown_server_now(manager)
        return {
            "status": "ERROR",
            "backend": "llamacpp",
            "reason": f"inference_failed:{type(exc).__name__}",
            "detail": str(exc)[:1000],
            "device": device,
            "timings": timings,
        }
    timings["inference_s"] = round(time.time() - t1, 2)
    _shutdown_server_now(manager)

    blocks: List[Dict[str, Any]] = []
    texts: List[str] = []
    confs: List[float] = []
    for page in pages:
        for order, b in enumerate(page.blocks):
            polygon = [[float(x), float(y)] for x, y in (b.polygon or [])]
            conf = float(b.confidence) if b.confidence is not None else 0.0
            text = str(b.html or "")
            blocks.append(
                {
                    "label": b.label,
                    "raw_label": b.raw_label,
                    "polygon": polygon,
                    "reading_order": int(getattr(b, "reading_order", order)),
                    "confidence": conf,
                    "text": text,
                    "skipped": bool(b.skipped),
                    "error": bool(b.error),
                }
            )
            if text and not b.skipped and not b.error:
                texts.append(text)
                confs.append(conf)
    timings["total_s"] = round(time.time() - started, 2)
    return {
        "status": "SUCCESS",
        "backend": "llamacpp",
        "model": SURYA_MODEL_CHECKPOINT,
        "gguf_repo": SURYA_GGUF_REPO,
        "device": device,
        "image": {"width": width, "height": height},
        "blocks": blocks,
        "text": "\n".join(texts),
        "mean_confidence": round(sum(confs) / len(confs), 4) if confs else 0.0,
        "timings": timings,
    }

def main(argv: Optional[List[str]] = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="ZameenAI Surya local runner (llamacpp backend, no Docker)."
    )
    sub = parser.add_subparsers(dest="command", required=True)
    rec = sub.add_parser("recognize", help="Recognize one image, emit JSON.")
    rec.add_argument("--image", required=True)
    args = parser.parse_args(argv)

    if args.command == "recognize":
        payload = _runner_recognize(args.image)
        sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
        sys.stdout.flush()
        return 0
    return 2

if __name__ == "__main__":
    raise SystemExit(main())
