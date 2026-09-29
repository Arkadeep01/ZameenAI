"""Compatibility facade for phase06_ocr_visual_text_recognition.py (decomposed; authoritative code lives in ./recognition/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase06_ocr_visual_text_recognition`` import path used by tests.
No logic lives here; see ./recognition/ for authoritative modules.
"""
from __future__ import annotations

from .recognition.models import *
from .recognition.layout import *
from .recognition.artifacts import *
from .recognition.words import *
from .recognition.tables import *
from .recognition.evidence import *
from .recognition.service import *
from .recognition.models import (_PHASE03_TO_REGION, _NUMERIC_RE, _SUSPICIOUS_NUMERIC_RE)
from .recognition.layout import (_try_native_pdf_text, _TessdataEnv)
from .recognition.artifacts import (_roboflow_client)
from .recognition.words import (_build_lines_from_words, _calculate_metrics, _word_script, _word_overlap, _tag_words_by_region, _word_center_in)
from .recognition.tables import (_tight_text_box, _ocr_table_tight)
from .recognition.evidence import (_normalize_term)
from .recognition.service import (_ocr_image)
