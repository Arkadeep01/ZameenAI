"""Decomposed from phase07_semantic_field_extraction.py: normalization. (Authoritative implementation; verbatim move.)"""
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
from app.ocr.language.numerals import (
    normalize_numerals,
)
from .models import *
from .terminology import *
from .terminology import (_compute_similarity, _contains_alias_text, _ocr_text_similarity)

import logging
logger = logging.getLogger(__name__)

AREA_UNIT_MAP: Dict[str, str] = {
    "acre": "ACRE",
    "acres": "ACRE",
    "acre.": "ACRE",
    "ac": "ACRE",
    "hectare": "HECTARE",
    "hectares": "HECTARE",
    "ha": "HECTARE",
    "bigha": "BIGHA",
    "bighas": "BIGHA",
    "decimal": "DECIMAL",
    "decimals": "DECIMAL",
    "dec": "DECIMAL",
    # Native-script units (all 22 scheduled languages) map to the same
    # normalized tokens phase 10 recognizes, so area alignment is
    # language-agnostic without inventing new enum values.
    # Acre (अंग्रेज़ी/gwar): Devanagari, Bengali, Assamese, Gujarati, Kannada,
    # Urdu/Perso-Arabic, Malayalam, Odia, Punjabi, Sindhi, Tamil, Telugu.
    "एकड़": "ACRE", "एकर": "ACRE", "एक्रे": "ACRE",
    "একর": "ACRE", "একৰ": "ACRE", "એકર": "ACRE",
    "ಎಕರೆ": "ACRE", "ایکڑ": "ACRE", "ايڪڙ": "ACRE",
    "ഏക്കർ": "ACRE", "ଏକର": "ACRE", "ਏਕੜ": "ACRE",
    "ஏக்கர்": "ACRE", "ఎకరం": "ACRE",
    # Hectare (table 5) — native-script hai/tara/hectarea spellings.
    "हेक्टर": "HECTARE", "હેક્ટર": "HECTARE", "হেক্টর": "HECTARE",
    "ಹೆಕ್ಟೇರ್": "HECTARE", "ഹെക്ടർ": "HECTARE", "ହେକ୍ଟର": "HECTARE",
    "హెక్టారు": "HECTARE", "ہیکٹر": "HECTARE",
    # Bigha / Katha / Guntas — the other recognized South-Asian units.
    "வி஘ா": "BIGHA", "বিঘা": "BIGHA", "विघा": "BIGHA", "ਬੀਘਾ": "BIGHA",
    "कट्ठा": "KATHA", "কাঠা": "KATHA",
    # Square meters / square feet — expressed in native scripts.
    "चौरस मीटर": "SQUARE_METER", "سانٹی میٹر": "SQUARE_METER",
    "చదరపు మీటరు": "SQUARE_METER", "சதுர மீட்டர்": "SQUARE_METER",
    "चौरस फुट": "SQUARE_FEET", "சதுர அடி": "SQUARE_FEET",
    "అడుగులు": "SQUARE_FEET", "சதுர அடி": "SQUARE_FEET",
}

NATURE_OF_LAND_VALUES: Dict[str, str] = {
    "agricultural": "AGRICULTURAL",
    "agriculture": "AGRICULTURAL",
    "agri": "AGRICULTURAL",
    "cultivable": "CULTIVABLE",
    "cultivation": "CULTIVATION",
    "homestead": "HOMESTEAD",
    "homestead land": "HOMESTEAD",
    "bastu": "HOMESTEAD",
    "bastee": "HOMESTEAD",
    "basti": "HOMESTEAD",
    "busty": "HOMESTEAD",
    "fallow": "FALLOW",
    "fallow land": "FALLOW",
    "wasteland": "WASTELAND",
    "barren": "BARREN",
    "forest": "FOREST",
    "pond": "POND",
    "built-up": "BUILT-UP",
    "residential": "RESIDENTIAL",
    "commercial": "COMMERCIAL",
    "industrial": "INDUSTRIAL",
}

DOCUMENT_TITLE_MAP: Dict[str, str] = {
    "record of rights": "Record of Rights (RoR)",
    "record of rights (ror)": "Record of Rights (RoR)",
    "ror": "Record of Rights (RoR)",
    "khatian": "Khatian",
    "khatian certificate": "Khatian Certificate",
    "mutation record": "Mutation Record",
    "mutation entry": "Mutation Entry",
    "land registration document": "Land Registration Document",
    "registry deed": "Registry Deed",
    "property deed": "Property Deed",
    "land ownership record": "Land Ownership Record",
    "ownership certificate": "Ownership Certificate",
    "land tax record": "Land Tax Record",
    "tax assessment": "Tax Assessment",
    "survey record": "Survey Record",
    "survey report": "Survey Report",
    "land map reference": "Land Map Reference",
    "map reference": "Map Reference",
}

def normalize_date(value: str) -> Optional[str]:
    """Normalize date string to YYYY-MM-DD format."""
    if not value:
        return None

    value = normalize_numerals(value.strip()) or ""
    value = re.sub(r"\s+", "", value)

    date_formats = [
        (r"(\d{2})-(\d{2})-(\d{4})", r"\3-\2-\1"),
        (r"(\d{2})/(\d{2})/(\d{4})", r"\3-\2-\1"),
        (r"(\d{2})\.(\d{2})\.(\d{4})", r"\3-\2-\1"),
        (r"(\d{4})-(\d{2})-(\d{2})", None),
    ]

    for pattern, replacement in date_formats:
        match = re.search(pattern, value)
        if match:
            if replacement:
                normalized = re.sub(pattern, replacement, value)
            else:
                normalized = match.group(0)

            try:
                datetime.strptime(normalized, "%Y-%m-%d")
                return normalized
            except ValueError:
                pass

    return value if len(value) >= 8 else None

def _find_date_tokens(text: str) -> Optional[str]:
    """Extract the first date-like substring from raw text."""
    if not text:
        return None
    text = normalize_numerals(text) or ""
    patterns = [
        r"\d{2}-\d{2}-\d{4}",
        r"\d{2}/\d{2}/\d{4}",
        r"\d{2}\.\d{2}\.\d{4}",
        r"\d{4}-\d{2}-\d{2}",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return m.group(0)
    return None

def normalize_area(value: str) -> Tuple[Optional[float], Optional[str]]:
    """Normalize area value with unit extraction."""
    if not value:
        return None, None

    value = normalize_numerals(value.strip().lower()) or ""

    unit = None
    for unit_key, unit_value in AREA_UNIT_MAP.items():
        if unit_key in value:
            unit = unit_value
            break

    numeric_pattern = r"([\d]+\.[\d]+)"
    match = re.search(numeric_pattern, value)
    if match:
        try:
            area_value = float(match.group(1))
            if 0.001 <= area_value <= 10000:
                return area_value, unit
        except ValueError:
            pass

    numeric_pattern = r"([\d]+)"
    match = re.search(numeric_pattern, value)
    if match:
        try:
            area_value = float(match.group(1))
            if 0.001 <= area_value <= 10000:
                return area_value, unit
        except ValueError:
            pass

    return None, unit

def normalize_nature_of_land(value: str) -> Optional[str]:
    """Normalize nature of land value."""
    if not value:
        return None

    value = value.strip().lower()

    for key, normalized in NATURE_OF_LAND_VALUES.items():
        if key in value:
            return normalized

    return value.upper() if value else None

def normalize_name(value: str) -> str:
    """Normalize person name."""
    if not value:
        return ""

    value = value.strip()

    stop_words = ["s/o", "d/o", "w/o", "c/o", "s/d/w"]
    value_lower = value.lower()
    for sw in stop_words:
        idx = value_lower.find(sw)
        if idx >= 0:
            remaining = value[idx + len(sw):].strip()
            if remaining:
                return remaining.title()

    return value.title()

def extract_number(value: str) -> Optional[str]:
    """Extract numeric value from OCR text preserving full token."""
    if not value:
        return None

    value = normalize_numerals(value.strip()) or ""
    if len(value) == 0 or len(value) > 20:
        return None

    match = re.match(r"^(\d+[A-Za-z]?|\d+)$", value)
    if match:
        return match.group(1)

    match = re.match(r"^([A-Za-z]?\d+)$", value)
    if match:
        return match.group(1)

    return None

def is_valid_date_candidate(value: str) -> bool:
    """Check if value could be a valid date."""
    if not value:
        return False
    value = normalize_numerals(value.strip()) or ""
    if len(value) < 6 or len(value) > 12:
        return False
    if not re.search(r"\d", value):
        return False
    if not re.match(r"^[\d\-/\.\s]+$", value):
        return False
    return True

def is_reasonable_person_name(value: str) -> bool:
    """Check if value could be a reasonable person name."""
    if not value:
        return False
    value = value.strip()
    if len(value) < 3 or len(value) > 60:
        return False
    words = value.split()
    if len(words) == 0:
        return False
    if len(words) == 1:
        return False
    alpha_count = sum(1 for c in value if c.isalpha() or c.isspace() or c in "'-.")
    if alpha_count / len(value) < 0.7:
        return False
    garbage_words = {
        'of', 'the', 'and', 'for', 'with', 'govt', 'gov', 'dept', 'department',
        'west', 'east', 'north', 'south', 'record', 'rights', 'land', 'reforms',
        'government', 'plot', 'khata', 'village', 'block', 'district', 'mouza',
        'area', 'nature', 'mutation', 'date', 'tenant', 'owner', 'name',
    }
    value_lower = value.lower()
    value_words = set(value_lower.split())
    for gw in garbage_words:
        if gw in value_words:
            return False
    return True

def is_reasonable_numeric_field(value: str) -> bool:
    """Check if value is a reasonable numeric field."""
    if not value:
        return False
    value = normalize_numerals(value.strip()) or ""
    if len(value) == 0 or len(value) > 20:
        return False

    if re.match(r"^\d+[A-Za-z]?$", value):
        return True
    if re.match(r"^\d+$", value):
        return True
    return False

def is_reasonable_location(value: str) -> bool:
    """Check if value could be a reasonable location name."""
    if not value:
        return False
    value = value.strip()
    if len(value) < 3 or len(value) > 50:
        return False
    # Unicode-aware letter check: location names may be Devanagari, Bengali,
    # or Latin. A pure digit/punctuation fragment is never a location, and a
    # genuine name always starts with a letter in all three scripts.
    if not any(c.isalpha() for c in value):
        return False
    if not value[0].isalpha():
        return False
    garbage_ratio = sum(1 for c in value if c.isupper()) / len(value) if len(value) > 0 else 0
    if garbage_ratio > 0.6 and len(value) > 5:
        return False
    return True

def is_reasonable_document_title(value: str) -> bool:
    """Check if value could be a reasonable document title/department phrase.

    Header phrases always carry real words; a pure number or punctuation
    fragment (e.g. OCR garbage ``"45"``) must never become the title.
    Unicode-aware so Bengali/Hindi titles pass.
    """
    if not value:
        return False
    value = value.strip()
    if len(value) < 3:
        return False
    if sum(1 for c in value if c.isalpha()) < 2:
        return False
    if re.fullmatch(r"[\d\s\-/\.:,;|_·•]+", value):
        return False
    return True

def is_reasonable_area_value(value: str) -> bool:
    """Check if value could be a valid area measurement."""
    if not value:
        return False
    value = normalize_numerals(value.strip().lower()) or ""
    if not re.search(r"\d", value):
        return False
    return True

def score_label_match(line_text_norm: str, alias: str) -> float:
    """Score how well an alias matches a normalized line text (0..1)."""
    normalized_alias = normalize_label(alias)
    if not normalized_alias:
        return 0.0
    if line_text_norm == normalized_alias:
        return 1.0
    if _contains_alias_text(line_text_norm, normalized_alias):
        return 0.95
    if normalized_alias in line_text_norm:
        return 0.9
    if line_text_norm in normalized_alias and len(line_text_norm) >= 3:
        return 0.8
    sim = _compute_similarity(normalized_alias, line_text_norm)
    if sim > 0.8:
        return sim
    seq = _ocr_text_similarity(normalized_alias, line_text_norm)
    if seq > 0.7:
        return seq
    return 0.0

def pick_best_label(text: str, field_name: Optional[str] = None) -> Tuple[Optional[str], float, str]:
    """Return (field, score, alias) for the best-matching canonical field label in text.

    Uses combined English + multilingual aliases. Longer, more specific aliases win.
    """
    text_norm = normalize_label(text)
    if not text_norm:
        return None, 0.0, ""

    candidates: List[Tuple[str, float, str]] = []
    fields = [field_name] if field_name else list(LABEL_ALIASES.keys())

    for f in fields:
        if f not in LABEL_ALIASES and f not in MULTILINGUAL_ALIASES:
            continue
        for alias in resolve_aliases(f):
            score = score_label_match(text_norm, alias)
            if score > 0.72:
                # Prefer longer/specific aliases when scores are comparable.
                specificity = min(len(alias) / 30.0, 1.0) * 0.05
                candidates.append((f, score + specificity, alias))

    if not candidates:
        return None, 0.0, ""

    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[0][0], candidates[0][1], candidates[0][2]

def _ocr_pipe_to_i(value: str) -> str:
    """Recover a capital 'I' that Tesseract rendered as a vertical bar.

    In two-column RoR layouts a location value like ``Krishnanagar - I`` is
    frequently OCR'd as ``Krishnanagar - |`` where the standalone letter ``I``
    collapses to a ``|`` glyph.  Applied only to location spatial values before
    cleaning; the raw OCR text is preserved as ``raw_value`` evidence.
    """
    if not value or "|" not in value:
        return value
    return value.replace("|", "I")

def clean_value(value: str) -> str:
    """Clean raw OCR value text: strip punctuation noise, collapse spaces."""
    if not value:
        return ""
    value = value.strip(" :,;|-_·•()")
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"^[\|_\-·•,;:\s]+", "", value)
    value = re.sub(r"[\|_·•]+$", "", value)
    return value.strip()

def _align_area_unit(cand: EvidenceCandidate, doc_area_unit: Optional[str]) -> None:
    """Attach the document's area unit to a unit-less area candidate.

    OCR table cells often hold only the numeric area ("0.32") while the unit
    lives in the column header or a label line ("Area (Acre)"). Normalizing the
    candidate to "0.32 ACRE" lets reconciliation merge them as one value instead
    of a false conflict.
    """
    if not doc_area_unit:
        return
    text = (cand.value or "").strip()
    if not text:
        return
    if any(key in text.lower() for key in AREA_UNIT_MAP):
        return
    if regex_full_number(text) is not None:
        cand.value = f"{text} {doc_area_unit}"

_NUMERIC_VALUE_RE = re.compile(r"^\d*\.?\d+$")

def regex_full_number(text: str) -> Optional[str]:
    """Return the input if it is a plain number token, else None."""
    t = text.strip()
    if not t or len(t) > 20:
        return None
    if _NUMERIC_VALUE_RE.match(t):
        return t
    return None
