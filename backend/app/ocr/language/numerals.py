"""Decomposed from multilingual_registry.py: numerals. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .registry import *

import logging
logger = logging.getLogger(__name__)

def normalize_numerals(value: Optional[str]) -> Optional[str]:
    """Translate every Indic/Perso-Arabic digit to ASCII in-place.

    Non-digit characters are preserved verbatim so a date like
    ``१२-०६-२०१८`` becomes ``12-06-2018`` while the original text is kept
    untouched in the caller's evidence.  Returns ``None`` for ``None`` input.
    """
    if not value:
        return value
    return "".join(NUMERAL_MAP.get(ch, ch) for ch in value)
