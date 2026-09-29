"""Decomposed from phase05_language_and_script_detection.py: script_detection. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import os
import re
import subprocess
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .lang_models import *

import logging
logger = logging.getLogger(__name__)

def _script_of_char(ch: str) -> Optional[str]:
    code = ord(ch)
    for start, end, script in SCRIPT_RANGES:
        if start <= code <= end:
            return script
    return None

def count_scripts(text: str) -> Dict[str, int]:
    """Count script-bearing characters per script. Digits/punctuation ignored."""
    counts: Dict[str, int] = {}
    for ch in text or "":
        script = _script_of_char(ch)
        if script:
            counts[script] = counts.get(script, 0) + 1
    return counts

def analyze_unicode_text(text: str) -> Tuple[Dict[str, int], int]:
    counts = count_scripts(text)
    return counts, sum(counts.values())

def terminology_hits(text: str) -> Dict[str, int]:
    lowered = (text or "").lower()
    hits: Dict[str, int] = {}
    for lang, terms in TERMINOLOGY.items():
        n = sum(1 for t in terms if t.lower() in lowered)
        if n:
            hits[lang] = n
    return hits

def fuse_evidence(
    script_counts: Dict[str, int],
    term_hits: Optional[Dict[str, int]] = None,
) -> Tuple[
    DetectionStatus, str, str, float, List[DetectedLanguage], List[Dict[str, Any]], List[Dict[str, Any]]
]:
    """Fuse script statistics (+ terminology boost) into a decision.

    Confidence formula (documented, deterministic, derived from counts):
        share(lang) = chars(lang-script) / total script chars
        boost(lang) = min(0.05, 0.01 * terminology hits)
        confidence  = min(0.99, 0.50 + 0.45 * share + boost)

    Shared scripts (Devanagari/Bengali/Perso-Arabic) map to several
    languages; terminology evidence picks the best candidate, and a
    zero-hit shared script falls back to the documented primary language
    with the other candidates surfaced as alternatives.

    Returns (status, primary_lang, primary_script, confidence,
             detected_languages, lang_alternatives, script_alternatives).
    """
    total = sum(script_counts.values())
    if total < MIN_SCRIPT_CHARS:
        return (
            DetectionStatus.UNCERTAIN, "und", "Unknown", 0.0, [], [], [],
        )

    term_hits = term_hits or {}

    # Aggregate counts per supported-language; track unmapped scripts too.
    lang_counts: Dict[str, int] = {}
    lang_script: Dict[str, str] = {}
    unsupported: Dict[str, int] = {}
    for script, count in script_counts.items():
        candidates = SCRIPT_LANGUAGES.get(script)
        if not candidates:
            unsupported[script] = unsupported.get(script, 0) + count
            continue
        if len(candidates) == 1:
            lang = candidates[0]
            lang_counts[lang] = lang_counts.get(lang, 0) + count
            lang_script.setdefault(lang, script)
            continue
        # Shared script: terminology evidence disambiguates. Zero hits
        # fall back to the documented primary language for the script.
        scored = [(c, term_hits.get(c, 0)) for c in candidates]
        best_lang, best_score = max(scored, key=lambda t: t[1])
        if best_score == 0:
            best_lang = SCRIPT_TO_LANGUAGE.get(script, candidates[0])
        lang_counts[best_lang] = lang_counts.get(best_lang, 0) + count
        lang_script.setdefault(best_lang, script)

    unsupported_total = sum(unsupported.values())
    supported_total = sum(lang_counts.values())

    # Unmapped-script-dominant documents (e.g. Han- or Cyrillic-only) must
    # NOT become English, and must NOT masquerade as a supported language.
    if unsupported_total >= supported_total and unsupported_total >= MIN_SCRIPT_CHARS:
        top = max(unsupported.items(), key=lambda kv: kv[1])
        share = top[1] / total
        conf = round(min(0.95, 0.50 + 0.45 * share), 4)
        uscript = top[0]
        detected = [
            DetectedLanguage(language="und", script=uscript, confidence=conf)
        ]
        return (
            DetectionStatus.UNSUPPORTED, "und", uscript, conf, detected, [], [],
        )

    if not lang_counts:
        return (
            DetectionStatus.UNCERTAIN, "und", "Unknown", 0.0, [], [], [],
        )

    # Per-language confidence from shares + terminology boost.
    confidences: Dict[str, float] = {}
    for lang, count in lang_counts.items():
        share = count / total
        boost = min(0.05, 0.01 * term_hits.get(lang, 0))
        confidences[lang] = round(min(0.99, 0.50 + 0.45 * share + boost), 4)

    ranked = sorted(lang_counts.items(), key=lambda kv: kv[1], reverse=True)
    primary, primary_count = ranked[0]
    primary_script = lang_script[primary]
    primary_conf = confidences[primary]

    detected = [
        DetectedLanguage(
            language=lang,
            script=lang_script[lang],
            confidence=confidences[lang],
        )
        for lang, _ in ranked
    ]

    # Multilingual: 2+ languages each with meaningful share + chars.
    strong = [
        lang
        for lang, count in ranked
        if (count / total) >= MULTILINGUAL_SHARE_THRESHOLD
        and count >= MULTILINGUAL_MIN_CHARS
    ]
    if len(strong) >= 2:
        status = DetectionStatus.MULTILINGUAL
    else:
        status = DetectionStatus.DETECTED

    lang_alts = [
        {"language": lang, "confidence": confidences[lang]}
        for lang, _ in ranked[1:]
    ]
    script_ranked = sorted(
        ((lang_script[lang], confidences[lang]) for lang, _ in ranked),
        key=lambda t: t[1],
        reverse=True,
    )
    script_alts = [
        {"script": script, "confidence": conf} for script, conf in script_ranked[1:]
    ]
    script_conf = primary_conf
    return (
        status, primary, primary_script, primary_conf,
        detected, lang_alts, script_alts,
    )

def build_ocr_routing(
    status: DetectionStatus,
    primary: str,
    primary_script: str,
    detected: List[DetectedLanguage],
    multilingual: bool,
) -> OCRRouting:
    """Build Phase 06-compatible OCR routing. Never hardcodes one language."""
    if status in (DetectionStatus.FAILED, DetectionStatus.UNCERTAIN):
        return OCRRouting(
            language_codes=["eng"],
            preferred_language="REVIEW_REQUIRED",
            script=primary_script,
        )
    if status == DetectionStatus.UNSUPPORTED:
        return OCRRouting(
            language_codes=["eng"],
            preferred_language="UNSUPPORTED_NEEDS_REVIEW",
            script=primary_script,
        )
    if multilingual or status == DetectionStatus.MULTILINGUAL:
        codes = []
        missing = []
        for d in detected:
            code = LANGUAGE_REGISTRY.get(d.language, {}).get("tesseract")
            if code:
                if code not in codes:
                    codes.append(code)
            else:
                missing.append(d.language)
        if not codes:
            codes = ["eng"]
        return OCRRouting(
            language_codes=codes,
            preferred_language="MULTILINGUAL",
            script="MIXED",
        )
    entry = LANGUAGE_REGISTRY.get(primary, LANGUAGE_REGISTRY["en"])
    tesseract_code = entry.get("tesseract")
    if tesseract_code:
        codes = [tesseract_code]
        display = entry["display"]
    else:
        # Language is DETECTED but has no OCR pack routed upstream: the
        # pipeline must stay honest — fall back to English OCR evidence and
        # flag the gap for review instead of pretending OCR will work.
        codes = ["eng"]
        display = f"{entry['display']}_OCR_UNAVAILABLE"
    return OCRRouting(
        language_codes=codes,
        preferred_language=display,
        script=primary_script,
    )

def _parse_json_payload(text: str) -> Dict[str, Any]:
    """Lenient JSON extraction (strips code fences, falls back to brace scan)."""
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(cleaned[start:end + 1])
                return parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                return {}
        return {}
