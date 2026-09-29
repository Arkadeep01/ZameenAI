"""Decomposed from phase05_language_and_script_detection.py: providers. (Authoritative implementation; verbatim move.)"""
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
from .script_detection import *
from .script_detection import (_parse_json_payload)

import logging
logger = logging.getLogger(__name__)

class LanguageDetectionProvider(ABC):
    """Abstract language-detection provider."""

    name: str = "base"

    @abstractmethod
    def detect_language(
        self,
        *,
        text: Optional[str] = None,
        image_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Return provider evidence.

        Contract: returns a dict with keys ``status`` (``ok``/``failed``/
        ``not_applicable``), ``evidence`` (list of evidence dicts),
        plus provider-specific metadata. MUST NOT raise on missing
        credentials — return a ``failed`` payload instead.
        """

class LocalScriptDetector(LanguageDetectionProvider):
    """PRIMARY document detector: unicode/script stats + terminology."""

    name = "local_script_detector"

    def detect_language(
        self,
        *,
        text: Optional[str] = None,
        image_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not text or not text.strip():
            return {
                "status": "failed",
                "reason": "no_text_evidence",
                "evidence": [],
            }
        counts, total = analyze_unicode_text(text)
        hits = terminology_hits(text)
        sample = re.sub(r"\s+", " ", text.strip())[:160]
        evidence: List[Dict[str, Any]] = []
        if counts:
            top_script = max(counts.items(), key=lambda kv: kv[1])[0]
            top_lang = SCRIPT_TO_LANGUAGE.get(top_script, "und")
            evidence.append({
                "source": "unicode_script_analysis",
                "language": top_lang,
                "script": top_script,
                "confidence": round(
                    min(0.99, 0.50 + 0.45 * (counts[top_script] / max(1, total))), 4
                ),
                "sample": sample,
                "detail": f"script_counts={counts}",
            })
        if hits:
            top_lang = max(hits.items(), key=lambda kv: kv[1])[0]
            evidence.append({
                "source": "terminology_match",
                "language": top_lang,
                "script": LANGUAGE_REGISTRY.get(top_lang, {}).get("script", "Unknown"),
                "confidence": round(min(0.90, 0.55 + 0.05 * hits[top_lang]), 4),
                "sample": sample,
                "detail": f"terminology_hits={hits}",
            })
        if not evidence:
            return {"status": "failed", "reason": "no_script_chars", "evidence": []}
        return {"status": "ok", "evidence": evidence}

class GeminiDocumentLanguageProvider(LanguageDetectionProvider):
    """OPTIONAL multimodal Gemini detector (document/image-capable).

    Uses the standard ``models.generate_content`` document modality —
    NEVER the Live Translate audio API. Opt-in per call (``use_gemini``);
    any failure (no key, no SDK, network error) degrades gracefully to a
    ``failed`` payload so the local path always survives.
    """

    name = "gemini_document_provider"
    model_name = GEMINI_DOCUMENT_MODEL

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> None:
        self.api_key = (
            api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        )
        if model_name:
            self.model_name = model_name

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def detect_language(
        self,
        *,
        text: Optional[str] = None,
        image_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "status": "failed",
                "reason": "gemini_not_configured",
                "evidence": [],
            }
        if image_path is None and not (text and text.strip()):
            return {"status": "failed", "reason": "no_evidence", "evidence": []}
        try:
            from google import genai  # type: ignore
            from PIL import Image  # type: ignore
        except ImportError as exc:
            return {
                "status": "failed",
                "reason": f"missing_dependency:{type(exc).__name__}",
                "evidence": [],
            }
        try:
            client = genai.Client(api_key=self.api_key)
            contents: List[Any] = [
                "Identify ONLY the script(s) visibly present in this land-record "
                "document (Latin / Devanagari / Bengali / other). Reply with "
                "strict JSON: {\"script\": \"...\", \"language\": \"en|hi|bn|"
                "other\", \"confidence\": 0.0-1.0, \"evidence\": \"...\"}. "
                "Use visual evidence only."
            ]
            if image_path:
                contents.append(Image.open(image_path))
            elif text:
                contents.append(f"OCR transcript:\n{text[:4000]}")
            response = client.models.generate_content(
                model=self.model_name, contents=contents
            )
            raw = getattr(response, "text", "") or ""
            payload = _parse_json_payload(raw)
            script = str(payload.get("script", "Unknown"))
            language = str(payload.get("language", "und")).lower()
            try:
                confidence = max(0.0, min(1.0, float(payload.get("confidence", 0.0))))
            except (TypeError, ValueError):
                confidence = 0.0
            return {
                "status": "ok",
                "evidence": [{
                    "source": "gemini_document_analysis",
                    "language": language,
                    "script": script,
                    "confidence": round(confidence, 4),
                    "sample": str(payload.get("evidence", ""))[:160],
                    "detail": f"model={self.model_name}",
                }],
            }
        except Exception as exc:  # graceful degradation — never fatal
            logger.warning("Gemini document provider failed: %s", type(exc).__name__)
            return {
                "status": "failed",
                "reason": f"gemini_call_failed:{type(exc).__name__}",
                "evidence": [],
            }

class GeminiLiveTranslateProvider(LanguageDetectionProvider):
    """OPTIONAL audio-only Live Translate provider.

    Exposes the CORRECT Live Translate API surface (model
    ``gemini-3.5-live-translate-preview`` + ``TranslationConfig`` with
    ``target_language_code`` / ``echo_target_language``) for supported
    speech/audio scenarios. It MUST NOT be used for scanned documents:
    any document input returns ``NOT_APPLICABLE_FOR_DOCUMENT_INPUT``.
    """

    name = "gemini_live_translate_provider"
    model_name = GEMINI_LIVE_TRANSLATE_MODEL

    def build_translation_config(
        self,
        target_language_code: str = "en",
        echo_target_language: bool = False,
    ) -> Any:
        """Build the official Live Translate ``TranslationConfig``.

        Uses the installed ``google-genai`` SDK contract — no network call.
        """
        from google.genai import types  # type: ignore

        return types.TranslationConfig(
            target_language_code=target_language_code,
            echo_target_language=echo_target_language,
        )

    def live_connect_config(
        self,
        target_language_code: str = "en",
        echo_target_language: bool = False,
    ) -> Any:
        """Build a ``LiveConnectConfig`` wiring the translation config."""
        from google.genai import types  # type: ignore

        return types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            translation_config=types.TranslationConfig(
                target_language_code=target_language_code,
                echo_target_language=echo_target_language,
            ),
        )

    def detect_language(
        self,
        *,
        text: Optional[str] = None,
        image_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Audio-only modality: document input is explicitly out of scope.
        return {
            "status": "not_applicable",
            "reason": "NOT_APPLICABLE_FOR_DOCUMENT_INPUT",
            "detail": (
                f"Model {self.model_name} supports real-time speech/audio "
                "translation only; it cannot classify scanned document images "
                "or OCR text. Route document input to LocalScriptDetector or "
                "GeminiDocumentLanguageProvider."
            ),
            "evidence": [],
        }
