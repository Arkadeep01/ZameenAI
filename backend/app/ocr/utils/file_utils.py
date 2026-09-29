"""Shared filename helpers (single authoritative implementation)."""
from __future__ import annotations

import re


def sanitize_filename(filename: str) -> str:
    """Make an uploader-supplied filename safe for storage."""
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", filename or "evidence").strip("._-")
    return cleaned or "evidence"
