"""Decomposed from phase07_semantic_field_extraction.py: terminology. (Authoritative implementation; verbatim move.)"""
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
from app.ocr.language.registry import (
    FIELD_ALIASES as _REGISTRY_FIELD_ALIASES, MULTILINGUAL_FIELDS as _REGISTRY_MULTILINGUAL_FIELDS,
)
from .models import *

import logging
logger = logging.getLogger(__name__)

def normalize_label(label: str) -> str:
    """Normalize OCR label for matching."""
    label = label.lower()
    label = re.sub(r"['\u2019]", "", label)
    label = re.sub(r"[/\-]", " ", label)
    label = re.sub(r"[:\.]", "", label)
    label = re.sub(r"\s+", " ", label)
    label = label.strip()
    return label

def _compute_similarity(s1: str, s2: str) -> float:
    """Compute simple similarity between two strings based on common characters."""
    if not s1 or not s2:
        return 0.0
    set1 = set(s1)
    set2 = set(s2)
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    return intersection / union if union > 0 else 0.0

def _ocr_text_similarity(a: str, b: str) -> float:
    """OCR-tolerant string similarity using difflib SequenceMatcher."""
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()

def labels_match(normalized_ocr_label: str, alias: str) -> bool:
    """Check if normalized OCR label matches an alias."""
    normalized_alias = normalize_label(alias)
    if normalized_ocr_label == normalized_alias:
        return True
    if normalized_alias in normalized_ocr_label:
        return True
    if normalized_ocr_label in normalized_alias:
        return True
    if len(normalized_alias) >= 3 and len(normalized_ocr_label) >= 3:
        if _compute_similarity(normalized_alias, normalized_ocr_label) > 0.8:
            return True
        if _ocr_text_similarity(normalized_alias, normalized_ocr_label) > 0.72:
            return True
    return False

def token_ocr_match(word: str, alias_token: str) -> bool:
    """Check whether an OCR token matches an alias token tolerating concatenation."""
    w = word.lower()
    a = alias_token.lower()
    if w == a:
        return True
    if len(w) >= 2 and len(a) >= 2:
        if w.startswith(a) or a.startswith(w):
            return True
        if len(a) >= 3 and len(w) >= 3:
            if _compute_similarity(w, a) > 0.75:
                return True
            if _ocr_text_similarity(w, a) > 0.7:
                return True
    return False

def _contains_alias_text(text_norm: str, alias_norm: str) -> bool:
    """Token-order tolerant containment of an alias inside a normalized text."""
    if not text_norm or not alias_norm:
        return False
    if alias_norm in text_norm:
        return True
    text_tokens = text_norm.split()
    alias_tokens = alias_norm.split()
    if not alias_tokens:
        return False
    idx = 0
    matched = 0
    for tok in text_tokens:
        if idx < len(alias_tokens) and token_ocr_match(tok, alias_tokens[idx]):
            matched += 1
            idx += 1
    return matched >= min(len(alias_tokens), 2) and matched == len(alias_tokens)

LABEL_ALIASES: Dict[str, List[str]] = {
    "document.document_title": [
        "Record of Rights",
        "Record of Rihts",
        "Record of Right",
        "RoR",
        "ROR",
        "Record of Rights (RoR)",
        "Record of Rights (Ro",
    ],
    "document.department": [
        "Land and Land Reforms Department",
        "Department of Land",
        "Land Reforms Department",
        "Department",
    ],
    "document.document_date": [
        "Document Date",
        "Date of Document",
        "Date",
    ],
    "location.state": ["State", "State:"],
    "location.district": ["District", "District:", "Dist.", "Dist"],
    "location.block": ["Block", "Block:", "Block Name"],
    "location.tehsil": ["Tehsil", "Tehsil:", "Taluk", "Sub-Division"],
    "location.mouza": ["Mouza", "Mouza:", "Mouza Name", "Mahal"],
    "location.village": ["Village", "Village:", "Village Name"],
    "land.survey_number": ["Survey No.", "Survey No", "Survey Number", "Survey:"],
    "land.khasra_number": ["Khasra No.", "Khasra No", "Khasra Number", "Khasra:"],
    "land.plot_number": ["Plot No.", "Plot No", "Plot Number", "Plot:", "Plot", "Dag No.", "Dag No", "Dag"],
    "land.khata_number": [
        "Khata No.", "Khata No", "Khata Number", "Khata:",
        "Khatian No.", "Khatian No", "Khatian Number",
        "Khaitan No.", "Khaitan No", "Khaitan Number", "Khaitan:",
    ],
    "land.area": ["Area", "Area:", "Area (Acres)", "Area (Acre)", "Area (Hectares)", "Land Area", "Total Area"],
    "land.area_unit": ["Acre", "Acres", "Hectare", "Hectares", "Bigha", "Decimals"],
    "land.nature_of_land": [
        "Nature of Land", "Land Nature", "Classification", "Class",
        "Type of Land", "Land Type",
    ],
    "land.land_type": ["Land Type", "Type", "Land Category"],
    "owner.name": [
        "Name of Owner", "Owner Name", "Owner:", "Name of Landowner",
        "Landowner", "Name",
    ],
    "owner.father_husband_name": [
        "Father's / Husband's Name", "Father's/Husband's Name", "Father/Husband Name",
        "Father's Name", "Husband's Name", "Father Name", "Husband Name",
        "Father's", "Husband's",
    ],
    "owner.recorded_tenant": [
        "Name of Recorded Tenant", "Name of Recorded Tenet", "Recorded Tenant",
        "Recorded Tenet", "Tenant Name", "Recorded Cultivator",
    ],
    "owner.co_owner": ["Co-Owner", "Co Owner", "Joint Owner"],
    "mutation.mutation_number": [
        "Mutation No.", "Mutation No", "Mutation Number", "Mutation:",
        "Mutaton No.", "Mutaton No", "Maton No.", "Maton No",
    ],
    "mutation.mutation_date": [
        "Date of Mutation", "Mutation Date", "Date of Mutaton", "Date ot Mutation",
        "Date of Entry",
    ],
    "registration.document_number": [
        "Document No.", "Document Number", "Registration No.", "Registration Number",
        "Reg. No.", "Registry No.",
    ],
    "registration.registration_date": [
        "Date of Registration", "Registration Date", "Date of Registry", "Registry Date",
    ],
    "registration.issue_date": ["Issue Date", "Date of Issue", "Issued On"],
    "additional.remarks": ["Remarks", "Note", "Notes"],
}

MULTILINGUAL_ALIASES: Dict[str, List[str]] = {
    "document.document_title": [
        "रिकार्ड ऑफ राइट्स", "अधिकार अभिलेख", "खतियान", "খতিয়ান", "রেকর্ড অফ রাইটস", "স্বত্বলিপি",
    ],
    "document.department": [
        "भूमि एवं भूमि सुधार विभाग", "राजस्व विभाग", "ভূমি ও ভূমি সংস্কার বিভাগ", "রাজস্ব বিভাগ",
    ],
    "document.document_date": ["दिनांक", "তারিখ"],
    "location.state": ["राज्य", "রাজ্য"],
    "location.district": ["जिला", "জেলা"],
    "location.block": ["ब्लॉक", "ব্লক"],
    "location.tehsil": ["तहसील", "মহকুমা"],
    "location.mouza": ["मौजा", "মৌজা"],
    "location.village": ["गांव", "গ্রাম"],
    "land.survey_number": ["सर्वे नंबर", "সার্ভে নং"],
    "land.khasra_number": ["खसरा नंबर", "খাসরা নং"],
    "land.plot_number": ["प्लॉट नंबर", "दाग नंबर", "দাগ নং", "প্লট নং"],
    "land.khata_number": ["खाता नंबर", "खतियान नंबर", "খাতা নং", "খতিয়ান নং"],
    "land.area": ["क्षेत्रफल", "रकबा", "আয়তন", "রকম"],
    "land.area_unit": ["एकड़", "एकर", "एक्रे", "হেক্টর", "একর"],
    "land.nature_of_land": ["भूमि की प्रकृति", "भूमि वर्गीकरण", "ভূমির প্রকৃতি", "শ্রেণি"],
    "land.land_type": ["भूमि प्रकार", "ভূমির শ্রেণি"],
    "owner.name": ["रायत का नाम", "रैयत का नाम", "स्वामी का नाम", "রায়তের নাম", "মালিকের নাম"],
    "owner.father_husband_name": ["पिता का नाम", "पति का नाम", "পিতার নাম", "স্বামীর নাম"],
    "owner.recorded_tenant": ["अभिलिखित कृषक", "রায়ত", "কৃষক"],
    "owner.co_owner": ["सह-स्वामी", "সহ-মালিক"],
    "mutation.mutation_number": ["परिवर्तन संख्या", "नामांतरण संख्या", "নামজারি নং", "দখল নং"],
    "mutation.mutation_date": ["परिवर्तन की तिथि", "নামজারির তারিখ"],
    "registration.document_number": ["पंजीकरण संख्या", "নিবন্ধন নং"],
    "registration.registration_date": ["पंजीकरण तिथि", "নিবন্ধনের তারিখ"],
    "additional.remarks": ["टिप्पणी", "মন্তব্য"],
}

def resolve_aliases(field_name: str) -> List[str]:
    """Return combined English + multilingual aliases for a canonical field."""
    combined = list(LABEL_ALIASES.get(field_name, []))
    combined.extend(MULTILINGUAL_ALIASES.get(field_name, []))
    return combined

FIELD_ANCHORS: Dict[str, List[str]] = {
    "document.document_title": ["ror", "record", "rights", "khatian", "right", "khatiyan"],
    "document.department": ["land", "reforms", "department", "revenue", "राजस्व"],
    "document.document_date": ["date", "दिनांक", "তারিখ"],
    "location.state": ["state", "राज्य", "রাজ্য"],
    "location.district": ["district", "dist", "जिला", "জেলা"],
    "location.block": ["block", "ब्लॉक", "ব্লক"],
    "location.tehsil": ["tehsil", "taluk", "sub-division", "महकुमा", "তহসিল"],
    "location.mouza": ["mouza", "mahal", "मौजा", "মৌজা"],
    "location.village": ["village", "गांव", "গ্রাম"],
    "land.survey_number": ["survey", "सर्वे", "সার্ভে"],
    "land.khasra_number": ["khasra", "खसरा", "খাসরা"],
    "land.plot_number": ["plot", "dag", "प्लॉट", "দাগ"],
    "land.khata_number": ["khata", "khatian", "khaitan", "खाता", "খাতা", "খতিয়ান"],
    "land.area": ["area", "क्षेत्रफल", "रकबा", "আয়তন"],
    "land.area_unit": ["acre", "acres", "hectare", "bigha", "decimal", "एकड़", "একর", "হেক্টর"],
    "land.nature_of_land": ["nature", "land", "classification", "class", "ভূমি", "श्रेणी"],
    "land.land_type": ["type", "category", "প্রকার"],
    "owner.name": ["name", "owner", "raiyat", "रायत", "रैयत", "མ涯", "মালিক", "নাম"],
    "owner.father_husband_name": ["father", "husband", "पिता", "পিতা", "স্বামী"],
    "owner.recorded_tenant": ["tenant", "recorded", "cultivator", "raiyat", "কৃষক", "রায়ত"],
    "owner.co_owner": ["co-owner", "joint", "सह", "সহ"],
    "mutation.mutation_number": ["mutation", "নামজারি", "দখল"],
    "mutation.mutation_date": ["mutation", "date", "নামজারি"],
    "registration.document_number": ["registration", "reg", "document", "নিবন্ধন"],
    "registration.registration_date": ["registration", "registry", "নিবন্ধন"],
    "registration.issue_date": ["issue", "issued", "जारी", "প্রজ্ঞাপন"],
    "additional.remarks": ["remarks", "note", "टिप्पणी", "মন্তব্য"],
}

FIELD_APPLICABILITY: Dict[str, Dict[str, str]] = {
    "RECORD_OF_RIGHTS": {
        "owner.name": "REQUIRED",
        "owner.father_husband_name": "REQUIRED",
        "owner.recorded_tenant": "REQUIRED",
        "owner.co_owner": "OPTIONAL",
        "land.survey_number": "OPTIONAL",
        "land.khasra_number": "OPTIONAL",
        "land.plot_number": "REQUIRED",
        "land.khata_number": "REQUIRED",
        "land.area": "REQUIRED",
        "land.area_unit": "REQUIRED",
        "land.nature_of_land": "REQUIRED",
        "land.land_type": "OPTIONAL",
        "location.state": "REQUIRED",
        "location.district": "REQUIRED",
        "location.block": "REQUIRED",
        "location.tehsil": "OPTIONAL",
        "location.mouza": "REQUIRED",
        "location.village": "OPTIONAL",
        "document.document_title": "REQUIRED",
        "document.department": "REQUIRED",
        "document.document_date": "REQUIRED",
        "document.map_number": "OPTIONAL",
        "mutation.mutation_number": "OPTIONAL",
        "mutation.mutation_date": "OPTIONAL",
        "registration.document_number": "NOT_APPLICABLE",
        "registration.registration_date": "NOT_APPLICABLE",
        "registration.issue_date": "NOT_APPLICABLE",
        "additional.remarks": "OPTIONAL",
    },
    "KHATIAN": {
        "owner.name": "REQUIRED",
        "owner.father_husband_name": "REQUIRED",
        "owner.recorded_tenant": "OPTIONAL",
        "owner.co_owner": "OPTIONAL",
        "land.survey_number": "REQUIRED",
        "land.khasra_number": "OPTIONAL",
        "land.plot_number": "OPTIONAL",
        "land.khata_number": "REQUIRED",
        "land.area": "REQUIRED",
        "land.area_unit": "REQUIRED",
        "land.nature_of_land": "REQUIRED",
        "land.land_type": "OPTIONAL",
        "location.state": "REQUIRED",
        "location.district": "REQUIRED",
        "location.block": "REQUIRED",
        "location.tehsil": "OPTIONAL",
        "location.mouza": "REQUIRED",
        "location.village": "OPTIONAL",
        "document.document_title": "REQUIRED",
        "document.department": "REQUIRED",
        "document.document_date": "REQUIRED",
        "document.map_number": "OPTIONAL",
        "mutation.mutation_number": "OPTIONAL",
        "mutation.mutation_date": "OPTIONAL",
        "registration.document_number": "NOT_APPLICABLE",
        "registration.registration_date": "NOT_APPLICABLE",
        "registration.issue_date": "NOT_APPLICABLE",
        "additional.remarks": "OPTIONAL",
    },
    "LAND_RECORD": {
        "owner.name": "REQUIRED",
        "owner.father_husband_name": "OPTIONAL",
        "owner.recorded_tenant": "OPTIONAL",
        "owner.co_owner": "OPTIONAL",
        "land.survey_number": "OPTIONAL",
        "land.khasra_number": "OPTIONAL",
        "land.plot_number": "REQUIRED",
        "land.khata_number": "OPTIONAL",
        "land.area": "REQUIRED",
        "land.area_unit": "REQUIRED",
        "land.nature_of_land": "OPTIONAL",
        "land.land_type": "OPTIONAL",
        "location.state": "REQUIRED",
        "location.district": "REQUIRED",
        "location.block": "OPTIONAL",
        "location.tehsil": "OPTIONAL",
        "location.mouza": "OPTIONAL",
        "location.village": "OPTIONAL",
        "document.document_title": "REQUIRED",
        "document.department": "REQUIRED",
        "document.document_date": "REQUIRED",
        "document.map_number": "OPTIONAL",
        "mutation.mutation_number": "OPTIONAL",
        "mutation.mutation_date": "OPTIONAL",
        "registration.document_number": "NOT_APPLICABLE",
        "registration.registration_date": "NOT_APPLICABLE",
        "registration.issue_date": "NOT_APPLICABLE",
        "additional.remarks": "OPTIONAL",
    },
    "MUTATION_RECORD": {
        "owner.name": "REQUIRED",
        "owner.father_husband_name": "OPTIONAL",
        "owner.recorded_tenant": "OPTIONAL",
        "owner.co_owner": "OPTIONAL",
        "land.survey_number": "OPTIONAL",
        "land.khasra_number": "OPTIONAL",
        "land.plot_number": "OPTIONAL",
        "land.khata_number": "OPTIONAL",
        "land.area": "OPTIONAL",
        "land.area_unit": "OPTIONAL",
        "land.nature_of_land": "OPTIONAL",
        "land.land_type": "OPTIONAL",
        "location.state": "REQUIRED",
        "location.district": "REQUIRED",
        "location.block": "OPTIONAL",
        "location.tehsil": "OPTIONAL",
        "location.mouza": "OPTIONAL",
        "location.village": "OPTIONAL",
        "document.document_title": "REQUIRED",
        "document.department": "OPTIONAL",
        "document.document_date": "OPTIONAL",
        "document.map_number": "OPTIONAL",
        "mutation.mutation_number": "REQUIRED",
        "mutation.mutation_date": "REQUIRED",
        "registration.document_number": "NOT_APPLICABLE",
        "registration.registration_date": "NOT_APPLICABLE",
        "registration.issue_date": "NOT_APPLICABLE",
        "additional.remarks": "OPTIONAL",
    },
    "LAND_REGISTRATION_DOCUMENT": {
        "owner.name": "REQUIRED",
        "owner.father_husband_name": "OPTIONAL",
        "owner.recorded_tenant": "OPTIONAL",
        "owner.co_owner": "OPTIONAL",
        "land.survey_number": "OPTIONAL",
        "land.khasra_number": "OPTIONAL",
        "land.plot_number": "OPTIONAL",
        "land.khata_number": "OPTIONAL",
        "land.area": "OPTIONAL",
        "land.area_unit": "OPTIONAL",
        "land.nature_of_land": "OPTIONAL",
        "land.land_type": "OPTIONAL",
        "location.state": "REQUIRED",
        "location.district": "REQUIRED",
        "location.block": "OPTIONAL",
        "location.tehsil": "OPTIONAL",
        "location.mouza": "OPTIONAL",
        "location.village": "OPTIONAL",
        "document.document_title": "REQUIRED",
        "document.department": "OPTIONAL",
        "document.document_date": "OPTIONAL",
        "document.map_number": "OPTIONAL",
        "mutation.mutation_number": "OPTIONAL",
        "mutation.mutation_date": "OPTIONAL",
        "registration.document_number": "REQUIRED",
        "registration.registration_date": "REQUIRED",
        "registration.issue_date": "OPTIONAL",
        "additional.remarks": "OPTIONAL",
    },
}

ALL_CANONICAL_FIELDS: List[str] = [
    "document.document_title",
    "document.department",
    "document.document_date",
    "document.map_number",
    "location.state",
    "location.district",
    "location.block",
    "location.tehsil",
    "location.mouza",
    "location.village",
    "land.survey_number",
    "land.khasra_number",
    "land.plot_number",
    "land.khata_number",
    "land.area",
    "land.area_unit",
    "land.nature_of_land",
    "land.land_type",
    "owner.name",
    "owner.father_husband_name",
    "owner.co_owner",
    "owner.recorded_tenant",
    "mutation.mutation_number",
    "mutation.mutation_date",
    "registration.document_number",
    "registration.registration_date",
    "registration.issue_date",
    "additional.remarks",
]

def canonical_section(field_name: str) -> str:
    return field_name.split(".")[0]

def canonical_key(field_name: str) -> str:
    return field_name.split(".")[1]

for _mf in _REGISTRY_MULTILINGUAL_FIELDS:
    _existing = MULTILINGUAL_ALIASES.setdefault(_mf, [])
    _seen_mf = set(_existing)
    for _alias in _REGISTRY_FIELD_ALIASES.get(_mf, []):
        _norm = _alias.strip()
        if _norm and _norm not in _seen_mf:
            _existing.append(_norm)
            _seen_mf.add(_norm)

del _mf, _existing, _seen_mf, _alias, _norm
