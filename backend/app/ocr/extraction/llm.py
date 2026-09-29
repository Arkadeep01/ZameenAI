"""Decomposed from phase07_semantic_field_extraction.py: llm. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import difflib
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .models import *
from .normalization import (clean_value, pick_best_label)
from .terminology import (ALL_CANONICAL_FIELDS, _contains_alias_text, normalize_label)

import logging
logger = logging.getLogger(__name__)

_INDICBART_MODEL_NAME = "ai4bharat/IndicBART"

def _indicbart_supported_input_keys(model) -> set:
    """Return encoder-side input keys accepted by the IndicBART seq2seq model.

    The tokenizer implementation is environment-dependent (e.g. the fast
    AlbertTokenizer emits ``token_type_ids`` while the slow AlbertTokenizer
    does not), but ``MBartForConditionalGeneration`` has no
    ``token_type_ids`` parameter. ``generate()`` rejects unknown
    ``model_kwargs``, so the caller must pass only keys the model consumes.
    This mirrors the check transformers itself performs in
    ``_validate_model_kwargs`` (model ``forward`` + encoder ``forward``).
    """
    import inspect

    accepted = set(inspect.signature(model.forward).parameters)
    encoder = getattr(model, "encoder", None)
    if encoder is None:
        base = getattr(model, getattr(model, "base_model_prefix", ""), None)
        if base is not None:
            encoder = getattr(base, "encoder", None)
    if encoder is not None:
        try:
            accepted |= set(inspect.signature(encoder.forward).parameters)
        except (TypeError, ValueError):  # pragma: no cover - defensive
            pass
    return accepted

class IndicBARTNormalizer:
    """Multilingual semantic normalization adapter (NLP component, NOT OCR).

    Uses ai4bharat/IndicBART (cached locally) to normalize field-label
    terminology and transliterated variants before final extraction.

    Honest status reporting:
        USED                   - model loaded and generate() called for this document
        AVAILABLE_NOT_INVOKED  - available but no phrase required normalization
        UNAVAILABLE            - model could not be loaded (fallback normalization used)
        DISABLED               - explicitly disabled via ZAMEENAI_PHASE07_DISABLE_INDICBART
    """

    _model = None
    _tokenizer = None
    _load_attempted = False

    @classmethod
    def _load(cls) -> bool:
        if cls._load_attempted:
            return cls._model is not None
        cls._load_attempted = True
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # type: ignore

            cls._tokenizer = AutoTokenizer.from_pretrained(
                _INDICBART_MODEL_NAME, local_files_only=True
            )
            cls._model = AutoModelForSeq2SeqLM.from_pretrained(
                _INDICBART_MODEL_NAME, local_files_only=True
            )
            cls._model.eval()
            logger.info(f"IndicBART loaded from local cache: {_INDICBART_MODEL_NAME}")
            return True
        except Exception as e:  # noqa: BLE001
            logger.warning(f"IndicBART unavailable: {e}")
            cls._model = None
            cls._tokenizer = None
            return False

    @classmethod
    def available(cls) -> bool:
        return cls._load()

    def normalize_phrases(self, phrases: List[str]) -> Dict[str, str]:
        """Normalize short label phrases (e.g., Hindi/Bengali aliases) to a
        canonical English-ish form. Returns {input_phrase: normalized_output}.

        The output is used ONLY as an additional alias candidate; it never
        overwrites raw OCR evidence and is not trusted blindly.
        """
        if os.getenv("ZAMEENAI_PHASE07_DISABLE_INDICBART", "0") == "1":
            return {}
        if not self.available():
            return {}

        phrases = [p for p in phrases if p and p.strip()]
        if not phrases:
            return {}

        try:
            import torch  # noqa: F401

            device = "cuda" if torch.cuda.is_available() else "cpu"
            if self._model is None or self._tokenizer is None:
                return {}

            inputs = self._tokenizer(
                phrases, return_tensors="pt", padding=True, truncation=True, max_length=128
            )
            # Boundary guard: keep only input keys the model actually accepts.
            # Some tokenizer builds (e.g. AlbertTokenizerFast) emit
            # `token_type_ids`, which MBartForConditionalGeneration does not
            # accept -- generate() raises on unknown model_kwargs. input_ids
            # and attention_mask are always preserved.
            supported = _indicbart_supported_input_keys(self._model)
            inputs = {k: v for k, v in inputs.items() if k in supported}
            if "input_ids" not in inputs:
                logger.warning("IndicBART normalization failed: no input_ids after filtering")
                return {}
            inputs = {k: v.to(device) for k, v in inputs.items()}
            self._model.to(device)

            with torch.no_grad():
                generated = self._model.generate(
                    **inputs,
                    max_length=48,
                    num_beams=2,
                    do_sample=False,
                    early_stopping=True,
                )

            result: Dict[str, str] = {}
            for i, phrase in enumerate(phrases):
                decoded = self._tokenizer.decode(generated[i], skip_special_tokens=True)
                result[phrase] = clean_value(decoded)
            return result
        except Exception as e:  # noqa: BLE001
            logger.warning(f"IndicBART normalization failed: {e}")
            return {}

_MISTRAL_BASE_URL = os.getenv("MISTRAL_BASE_URL", "https://api.mistral.ai/v1")

_MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

class MistralExtractor:
    """Mistral contextual field-extraction adapter.

    Available only when MISTRAL_API_KEY is configured. Returns structured
    candidate fields. Honest status reporting - no fake outputs when the
    model is not configured.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("MISTRAL_API_KEY")
        self.base_url = os.getenv("MISTRAL_BASE_URL", _MISTRAL_BASE_URL)
        self.model = os.getenv("MISTRAL_MODEL", _MISTRAL_MODEL)

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def extract(self, doc: OCRDocument, document_type: str) -> Optional[List[EvidenceCandidate]]:
        if not self.available:
            return None

        import requests  # local import, requests is a runtime dependency

        prompt = self._build_prompt(doc, document_type)
        try:
            resp = requests.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You extract land-record fields from OCR evidence into a strict JSON "
                                "object. Only use values present in the OCR evidence. "
                                "NEVER invent values. Return {\"fields\": [{\"field\": \"...\", "
                                "\"value\": \"...\", \"confidence\": 0.0-1.0, \"status\": "
                                "\"PRESENT|PRESENT_BUT_UNCERTAIN|ABSENT\", \"raw_text\": \"...\"}] }"
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.0,
                    "response_format": {"type": "json_object"},
                    "max_tokens": 2000,
                },
                timeout=60,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            out: List[EvidenceCandidate] = []
            for entry in parsed.get("fields", []):
                field_name = str(entry.get("field", ""))
                value = str(entry.get("value", "")).strip()
                if not field_name or not value:
                    continue
                if field_name not in ALL_CANONICAL_FIELDS:
                    field_name, _score, _alias = pick_best_label(field_name)
                    field_name = field_name
                    if not field_name:
                        continue
                confidence = float(entry.get("confidence") or 0.5)
                out.append(
                    EvidenceCandidate(
                        field_name=field_name,
                        value=value,
                        raw_value=entry.get("raw_text", value),
                        label=field_name,
                        label_score=confidence,
                        confidence=confidence,
                        method=ExtractionMethod.MISTRAL,
                        page=1,
                        source_text=entry.get("raw_text", ""),
                        source_model=self.model,
                    )
                )
            return out
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Mistral extraction failed: {e}")
            return []

    def _build_prompt(self, doc: OCRDocument, document_type: str) -> str:
        excerpt_lines = [line.text for line in doc.lines[:60]]
        excerpt = "\n".join(excerpt_lines)
        return (
            f"Document type: {document_type}\n"
            f"Language: {doc.language.language if doc.language else 'unknown'} "
            f"({doc.language.script if doc.language else 'unknown'})\n"
            f"OCR text:\n{excerpt}\n\n"
            f"Extract fields into the canonical schema fields:\n"
            f"{', '.join(ALL_CANONICAL_FIELDS)}\n"
            f"Do not include fields whose value is not present in the OCR text."
        )

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")

_VALID_LLM_PROVIDERS = ("ollama", "mistral", "auto")

def _llm_provider() -> str:
    """Active LLM provider name.

    - ``"ollama"``  -> local Ollama only; Mistral is never called.
    - ``"mistral"`` -> Mistral cloud only (legacy behavior); Ollama untouched.
    - ``"auto"``    -> Ollama when reachable, else Mistral when keyed.
    - unset/unknown -> legacy Mistral-only behavior (existing tests + CI stay
      deterministic even on machines where Ollama happens to run).
    """
    raw = (os.getenv("LLM_PROVIDER") or "").strip().lower()
    if raw in ("ollama", "mistral", "auto"):
        return raw
    return "mistral"

def _strip_think_blocks(text: str) -> str:
    """Remove Qwen3 <think>...</think> reasoning traces before JSON parsing."""
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    return cleaned.strip()

def _extract_json_object(text: str) -> str:
    """Return the largest balanced ``{...}`` object found in free text.

    The Ollama request deliberately avoids server-side ``format: json`` and
    ``think: false`` (both crash the bundled runner on some Ollama builds),
    so Qwen3 may wrap the JSON payload in a thinking trace or prose. This
    scans for the first ``{`` and returns up to its matching close brace.
    Raises ``ValueError`` when no balanced object exists.
    """
    start = text.find("{")
    if start < 0:
        raise ValueError("no JSON object found in LLM output")
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    raise ValueError("unbalanced JSON object in LLM output")

def _ground_llm_candidates(
    doc: OCRDocument, candidates: List[EvidenceCandidate]
) -> List[EvidenceCandidate]:
    """Drop LLM candidates not grounded in the OCR evidence.

    The LLM only proposes contextual candidates; it must never invent field
    values. A candidate survives when its ``raw_text`` or its ``value`` is
    found (OCR-tolerantly) in the document text. Missing/unreadable fields
    therefore remain null downstream.
    """
    if not candidates:
        return []
    full_norm = normalize_label(doc.full_text or "")
    if not full_norm:
        return []
    kept: List[EvidenceCandidate] = []
    for cand in candidates:
        raw_norm = normalize_label(str(cand.raw_value or cand.source_text or ""))
        val_norm = normalize_label(str(cand.value or ""))
        if (raw_norm and _contains_alias_text(full_norm, raw_norm)) or (
            val_norm and _contains_alias_text(full_norm, val_norm)
        ):
            kept.append(cand)
        else:
            logger.info(
                "Dropping ungrounded LLM candidate %s=%r (not in OCR evidence)",
                cand.field_name,
                cand.value,
            )
    return kept

class OllamaExtractor:
    """Local Ollama (qwen3:8b) contextual field-extraction adapter.

    Speaks Ollama's native ``/api/chat`` endpoint with plain (streaming-off)
    JSON-in-text output, so no new client dependency is needed. The request
    deliberately does NOT set ``think: false`` or ``format: json``: both
    crash the bundled ``llama-server`` runner on some Ollama builds
    (observed: Ollama 0.34.2 + qwen3:8b -> runner fault + "unexpected EOF").
    Qwen3 thinking traces are stripped locally (``_strip_think_blocks``) and
    the JSON payload is recovered from free text (``_extract_json_object``).
    Available only when ``LLM_PROVIDER`` is ``"ollama"`` (or ``"auto"``)
    and the Ollama server answers. Returns structured candidate fields;
    honest status reporting - no fake outputs when the server is not
    reachable.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        raw_base = (base_url or os.getenv("OLLAMA_BASE_URL", _OLLAMA_BASE_URL)).rstrip("/")
        # Tolerate a "/v1"-suffixed base URL; the native API lives at the root.
        if raw_base.endswith("/v1"):
            raw_base = raw_base[: -len("/v1")].rstrip("/")
        self.base_url = raw_base
        self.model = model or os.getenv("OLLAMA_MODEL", _OLLAMA_MODEL)
        self._reachable: Optional[bool] = None
        self.last_error: Optional[str] = None

    @property
    def available(self) -> bool:
        if _llm_provider() not in ("ollama", "auto"):
            return False
        if self._reachable is None:
            self._reachable = self._probe()
        return self._reachable

    def _probe(self) -> bool:
        import requests  # local import, requests is a runtime dependency

        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if not resp.ok:
                return False
            try:
                names = {
                    str(m.get("name", ""))
                    for m in resp.json().get("models", [])
                    if isinstance(m, dict)
                }
            except Exception:
                names = set()
            if names and self.model not in names and not any(
                n.startswith(self.model.split(":")[0] + ":") for n in names
            ):
                logger.warning(
                    "Ollama model %r not in server model list %s",
                    self.model,
                    sorted(names),
                )
            return True
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Ollama server unreachable at {self.base_url}: {e}")
            return False

    def extract(self, doc: OCRDocument, document_type: str) -> Optional[List[EvidenceCandidate]]:
        if not self.available:
            return None

        import requests  # local import, requests is a runtime dependency

        self.last_error = None
        prompt = self._build_prompt(doc, document_type)
        try:
            resp = requests.post(
                f"{self.base_url}/api/chat",
                headers={"Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You extract land-record fields from OCR evidence into a strict JSON "
                                "object of the form {\"fields\": [{\"field\": \"...\", "
                                "\"value\": \"...\", \"confidence\": 0.0-1.0, \"status\": "
                                "\"PRESENT|PRESENT_BUT_UNCERTAIN|ABSENT\", \"raw_text\": \"...\"}]}. "
                                "Only use values present in the OCR evidence. "
                                "NEVER invent values. If a value is absent, omit that field."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.0, "num_predict": 3000},
                },
                # Generous timeout: on modest hosts a thinking-model call
                # over a full document excerpt can take several minutes.
                timeout=600,
            )
            resp.raise_for_status()
            content = resp.json().get("message", {}).get("content", "")
            stripped = _strip_think_blocks(content)
            try:
                parsed = json.loads(stripped)
            except (json.JSONDecodeError, ValueError):
                parsed = json.loads(_extract_json_object(stripped))

            out: List[EvidenceCandidate] = []
            for entry in parsed.get("fields", []):
                field_name = str(entry.get("field", ""))
                value = str(entry.get("value", "")).strip()
                if not field_name or not value:
                    continue
                if str(entry.get("status", "PRESENT")).upper() == "ABSENT":
                    continue
                if field_name not in ALL_CANONICAL_FIELDS:
                    field_name, _score, _alias = pick_best_label(field_name)
                    field_name = field_name
                    if not field_name:
                        continue
                confidence = float(entry.get("confidence") or 0.5)
                out.append(
                    EvidenceCandidate(
                        field_name=field_name,
                        value=value,
                        raw_value=entry.get("raw_text", value),
                        label=field_name,
                        label_score=confidence,
                        confidence=confidence,
                        method=ExtractionMethod.OLLAMA,
                        page=1,
                        source_text=entry.get("raw_text", ""),
                        source_model=self.model,
                    )
                )
            return out
        except Exception as e:  # noqa: BLE001
            self.last_error = str(e)
            logger.warning(f"Ollama extraction failed: {e}")
            return []

    def _build_prompt(self, doc: OCRDocument, document_type: str) -> str:
        excerpt_lines = [line.text for line in doc.lines[:60]]
        excerpt = "\n".join(excerpt_lines)
        return (
            f"Document type: {document_type}\n"
            f"Language: {doc.language.language if doc.language else 'unknown'} "
            f"({doc.language.script if doc.language else 'unknown'})\n"
            f"OCR text:\n{excerpt}\n\n"
            f"Extract fields into the canonical schema fields:\n"
            f"{', '.join(ALL_CANONICAL_FIELDS)}\n"
            f"Do not include fields whose value is not present in the OCR text."
        )
