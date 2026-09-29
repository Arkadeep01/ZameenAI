"""Decomposed from phase10_resubmission.py: file_helpers. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import hashlib
import json
import logging
import re
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .models import *
from app.ocr.utils.file_utils import sanitize_filename as _canonical_sanitize
from app.ocr.utils.hashing import combined_sha256 as _canonical_combined
from app.ocr.utils.hashing import sha256_bytes as _canonical_bytes
from app.ocr.utils.hashing import sha256_file as _canonical_file
from app.ocr.utils.time_ids import new_prefixed_id as _canonical_new_id
from app.ocr.utils.time_ids import utc_now_iso as _canonical_now_iso

import logging
logger = logging.getLogger(__name__)

def _now_iso() -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.utc_now_iso."""
    return _canonical_now_iso()

def _new_id(prefix: str) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.new_prefixed_id."""
    return _canonical_new_id(prefix)

def _sha256_bytes(content: bytes) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.hashing.sha256_bytes."""
    return _canonical_bytes(content)

def _sha256_of(path: Path) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.hashing.sha256_file."""
    return _canonical_file(path)

def _combined_sha256(hashes: List[str]) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.hashing.combined_sha256."""
    return _canonical_combined(hashes)

def _mime_for_ext(ext: str) -> str:
    mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
        ".bmp": "image/bmp",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
    }
    return mime.get(ext, "application/octet-stream")

def _sanitize_filename(filename: str) -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.file_utils.sanitize_filename."""
    return _canonical_sanitize(filename)
