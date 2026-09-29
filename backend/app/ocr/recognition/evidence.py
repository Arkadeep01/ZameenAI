"""Decomposed from phase06_ocr_visual_text_recognition.py: evidence. (Authoritative implementation; verbatim move.)"""
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

from .models import *

import logging
logger = logging.getLogger(__name__)

def _normalize_term(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9\u0900-\u097f\u0980-\u09ff ]", " ",
                     (text or "").lower())
    return re.sub(r"\s+", " ", cleaned).strip()

def government_evidence(
    header_text: str, footer_text: str,
    artifacts: List[ArtifactDetection], emblem_detected: bool,
) -> GovernmentEvidence:
    """Build non-authoritative government-document evidence (explainable score).

    Score = matched signals / 7 signals; every match is listed. This never
    claims ``government_document`` and never overrides Phase 04.
    """
    header_norm = _normalize_term(header_text)
    footer_norm = _normalize_term(footer_text)
    matched_terms: List[str] = []
    signals: Dict[str, bool] = {
        "header": bool(header_text.strip()),
        "department": False, "title": False, "footer_legal": False,
        "emblem": bool(emblem_detected), "seal": False, "signature": False,
    }
    for term in GOVT_SIGNALS["government"] + GOVT_SIGNALS["department"]:
        if _normalize_term(term) and _normalize_term(term) in header_norm:
            signals["department"] = True
            matched_terms.append(term)
    for term in GOVT_SIGNALS["title"]:
        if _normalize_term(term) and _normalize_term(term) in header_norm:
            signals["title"] = True
            matched_terms.append(term)
    for term in GOVT_SIGNALS["footer_legal"]:
        if _normalize_term(term) and (
                _normalize_term(term) in footer_norm
                or _normalize_term(term) in header_norm):
            signals["footer_legal"] = True
            matched_terms.append(term)
    for art in artifacts:
        if art.artifact_type == "seal":
            signals["seal"] = True
        elif art.artifact_type == "signature":
            signals["signature"] = True
        elif art.artifact_type == "stamp":
            signals["seal"] = True
    matched = [name for name, present in signals.items() if present]
    total = len(signals)
    gov_terms = sorted(set(matched_terms))
    return GovernmentEvidence(
        header_detected=signals["header"],
        department_detected=signals["department"],
        government_terminology=gov_terms,
        document_title_detected=signals["title"],
        emblem_region_detected=signals["emblem"],
        seal_detected=signals["seal"],
        signature_detected=signals["signature"],
        footer_legal_text_detected=signals["footer_legal"],
        evidence_score=round(len(matched) / total, 4) if total else 0.0,
        matched_signals=matched,
    )

def numeric_tokens(words: List[OCRWord]) -> List[NumericToken]:
    """Raw identifier/number tokens exactly as observed (never normalized)."""
    out: List[NumericToken] = []
    for word in words:
        compact = word.text.replace(" ", "")
        if len(compact) >= 2 and sum(ch.isdigit() for ch in compact) >= 2:
            out.append(NumericToken(
                text=word.text, confidence=word.confidence,
                bbox=word.bbox, page=word.page, region=word.region,
                needs_review=word.needs_review,
            ))
    return out

def scripts_present(words: List[OCRWord]) -> List[str]:
    """Distinct scripts observed in page words (evidence, no translation)."""
    try:
        from ..language.script_detection import count_scripts
        counts = count_scripts(" ".join(w.text for w in words))
        return sorted(counts)
    except Exception:
        seen = {w.script for w in words if w.script}
        return sorted(seen)
