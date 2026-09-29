"""Decomposed from phase01_ingestion.py: ids. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import hashlib
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image
from .models import *

import logging
logger = logging.getLogger(__name__)

class IDGenerator:
    _year = datetime.now().year
    _record_counter = 0
    _doc_counter = 0
    _ing_counter = 0
    _seeded_from_disk = False

    @classmethod
    def _seed_from_disk(cls) -> None:
        """Resume counters past IDs already present on disk.

        Counters are process-local, so a fresh process would otherwise
        re-mint IDs of previous runs and downstream phases would load
        stale files. Seeding is best-effort: any failure leaves the
        counters untouched. Explicit reset_counters() calls (tests)
        disable seeding so test runs stay deterministic.
        """
        if cls._seeded_from_disk:
            return
        cls._seeded_from_disk = True
        try:
            import re
            root = APP_DIR / "uploads"
            patterns = {
                "LR": re.compile(r"^LR-(\d{4})-(\d+)"),
                "DOC": re.compile(r"^DOC-(\d{4})-(\d+)"),
                "ING": re.compile(r"^ING-(\d{4})-(\d+)"),
            }
            best = {"LR": 0, "DOC": 0, "ING": 0}
            candidates: list = []
            originals = root / "originals"
            if originals.is_dir():
                candidates.extend(p.stem for p in originals.iterdir())
            processing = root / "processing"
            if processing.is_dir():
                try:
                    candidates.extend(p.name for p in processing.rglob("*"))
                except Exception:
                    for phase_dir in processing.iterdir():
                        if phase_dir.is_dir():
                            candidates.extend(p.name for p in phase_dir.iterdir())
            for name in candidates:
                for prefix, rx in patterns.items():
                    m = rx.match(name)
                    if m and int(m.group(1)) == cls._year:
                        best[prefix] = max(best[prefix], int(m.group(2)))
            cls._record_counter = max(cls._record_counter, best["LR"])
            cls._doc_counter = max(cls._doc_counter, best["DOC"])
            cls._ing_counter = max(cls._ing_counter, best["ING"])
        except Exception:
            pass

    @classmethod
    def generate_record_id(cls) -> str:
        cls._seed_from_disk()
        cls._record_counter += 1
        return f"LR-{cls._year}-{cls._record_counter:06d}"

    @classmethod
    def generate_document_id(cls) -> str:
        cls._seed_from_disk()
        cls._doc_counter += 1
        return f"DOC-{cls._year}-{cls._doc_counter:06d}"

    @classmethod
    def generate_ingestion_id(cls) -> str:
        cls._seed_from_disk()
        cls._ing_counter += 1
        return f"ING-{cls._year}-{cls._ing_counter:06d}"

    @classmethod
    def reset_counters(cls) -> None:
        cls._record_counter = 0
        cls._doc_counter = 0
        cls._ing_counter = 0
        cls._seeded_from_disk = True
