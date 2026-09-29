"""Compatibility facade for phase04_document_classification.py (decomposed; authoritative code lives in ./classification/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase04_document_classification`` import path used by tests.
No logic lives here; see ./classification/ for authoritative modules.
"""
from __future__ import annotations

from .classification.models import *
from .classification.classifiers import *
from .classification.bridge import *
from .classification.service import *
from .classification.models import (_REGION_TYPE_MAP, _TITLE_BAND_FRACTION)
from .classification.classifiers import (_analyze_title_header, _classify_from_text, _determine_classification_status, _classify_from_layout, _aggregate_multi_page)
from .classification.bridge import (_load_phase03_result, _load_phase03_regions, _read_title_band_text)
