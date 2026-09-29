"""Decomposed from phase06_ocr_visual_text_recognition.py: artifacts. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
import pytesseract
from PIL import Image
from app.ocr.ocr_config.probes import (
    read_roboflow_model_id,
)
from .models import *

import logging
logger = logging.getLogger(__name__)

def _roboflow_client() -> Tuple[Any, Optional[str], str]:
    """Build the Roboflow client from env + existing module config.

    Returns (client_or_None, model_id_or_None, status) where status is
    READY / UNAVAILABLE. The model id is owned by
    src/phase05_ocr_configuration.py (the legacy src/roboflow.py executed
    inference at import time, so it was removed and never imported).
    """
    model_id, api_url = read_roboflow_model_id()
    if not model_id:
        return None, None, "UNAVAILABLE"
    api_key = os.getenv("ROBOFLOW_API_KEY")
    if not api_key:
        return None, model_id, "UNAVAILABLE"
    try:
        from inference_sdk import InferenceHTTPClient, InferenceConfiguration
        client = InferenceHTTPClient(
            api_url=api_url or "https://serverless.roboflow.com",
            api_key=api_key,
        ).configure(InferenceConfiguration(api_key_transport="header"))
        return client, model_id, "READY"
    except Exception as exc:
        logger.warning("Roboflow client unavailable: %s", type(exc).__name__)
        return None, model_id, "UNAVAILABLE"

def detect_artifacts(
    image_path: str, width: int, height: int, page: int,
    client: Any = None, model_id: Optional[str] = None,
) -> Tuple[str, List[ArtifactDetection], Dict[str, Any]]:
    """Roboflow seal/stamp/signature detection with graceful fallback.

    Only predictions whose class names indicate seal/stamp/signature become
    artifacts — regions are never labeled from color or shape. Any failure
    (no key, no model, network error) returns UNAVAILABLE; OCR continues.
    """
    if client is None or model_id is None:
        client, model_id, status = _roboflow_client()
        if status != "READY" or client is None or model_id is None:
            return "UNAVAILABLE", [], {"model_id": model_id,
                                       "reason": "roboflow_not_configured"}
    artifacts: List[ArtifactDetection] = []
    try:
        raw = client.infer(image_path, model_id=model_id)
        predictions = []
        if isinstance(raw, dict):
            predictions = raw.get("predictions", []) or []
        for pred in predictions:
            if not isinstance(pred, dict):
                continue
            label = str(pred.get("class", "")).lower()
            if "seal" in label:
                artifact_type = "seal"
            elif "stamp" in label:
                artifact_type = "stamp"
            elif "sign" in label:
                artifact_type = "signature"
            else:
                continue  # never label non-artifact classes
            try:
                cx = float(pred.get("x", 0.0))
                cy = float(pred.get("y", 0.0))
                pw = float(pred.get("width", 0.0))
                ph = float(pred.get("height", 0.0))
                conf = float(pred.get("confidence", 0.0))
            except (TypeError, ValueError):
                continue
            x1 = max(0, int(cx - pw / 2))
            y1 = max(0, int(cy - ph / 2))
            x2 = min(width, int(cx + pw / 2))
            y2 = min(height, int(cy + ph / 2))
            if x2 <= x1 or y2 <= y1:
                continue
            artifacts.append(ArtifactDetection(
                artifact_type=artifact_type, confidence=conf,
                bbox=OCRBoundingBox(x=x1, y=y1, width=x2 - x1, height=y2 - y1),
                page=page, source="roboflow",
            ))
        return "SUCCESS", artifacts, {"model_id": model_id,
                                      "predictions": len(predictions)}
    except Exception as exc:
        logger.warning("Roboflow inference failed: %s", type(exc).__name__)
        return "UNAVAILABLE", [], {"model_id": model_id,
                                   "reason": f"inference_failed:{type(exc).__name__}"}

def mask_artifact_regions(
    pil_img: Image.Image, artifacts: List[ArtifactDetection]
) -> Tuple[Image.Image, List[Dict[str, Any]]]:
    """White-mask artifact bboxes on an OCR-VIEW COPY (original preserved).

    Returns (masked_copy, masked_info) retaining original coordinates, type
    and bbox so Phase 07/HITL can inspect the untouched evidence.
    """
    if not artifacts:
        return pil_img, []
    view = pil_img.copy()
    try:
        from PIL import ImageDraw
        draw = ImageDraw.Draw(view)
        masked: List[Dict[str, Any]] = []
        for art in artifacts:
            box = [art.bbox.x, art.bbox.y,
                   art.bbox.x + art.bbox.width, art.bbox.y + art.bbox.height]
            draw.rectangle(box, fill=(255, 255, 255))
            masked.append({"artifact_type": art.artifact_type,
                           "bbox": art.bbox.to_dict(),
                           "source": art.source, "masked_in_ocr_view": True})
        return view, masked
    except Exception:
        return pil_img, []
