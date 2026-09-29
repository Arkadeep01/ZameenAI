"""Stable filesystem anchors for the OCR subsystem (single authoritative definition).

Phase storage directories were historically computed as
``Path(__file__).parent[.parent]`` inside the flat ``app/ocr/*.py``
modules (``parent`` = ``app/ocr/``, ``parent.parent`` = ``backend/app/``).
After decomposition the implementation lives one level deeper
(``app/ocr/<package>/*.py``), so naive ``__file__`` arithmetic would
silently redirect every pipeline artifact. All decomposed modules must
use these anchors instead of ``__file__`` arithmetic.
"""
from __future__ import annotations

from pathlib import Path

OCR_DIR: Path = Path(__file__).resolve().parent
"""The ``backend/app/ocr/`` directory (legacy ``Path(__file__).parent``)."""

APP_DIR: Path = OCR_DIR.parent
"""The ``backend/app/`` directory (legacy ``Path(__file__).parent.parent``)."""

BACKEND_DIR: Path = APP_DIR.parent
"""The ``backend/`` directory (hosts the migrated ``tessdata/`` packs)."""


def project_tessdata_dirs() -> list[Path]:
    """Candidate project-local tessdata dirs, flat-layout precedence first."""
    return [APP_DIR / "tessdata", BACKEND_DIR / "tessdata"]


def resolve_project_tessdata_dir() -> Path | None:
    """First candidate tessdata dir containing ``eng.traineddata``, else None.

    Single authoritative implementation of the project-local tessdata
    fallback historically copied across the language/OCR-config modules.
    An explicitly configured ``TESSDATA_PREFIX`` always wins (callers
    return None early in that case); this only probes the repo trees.
    """
    for candidate in project_tessdata_dirs():
        if (candidate / "eng.traineddata").exists():
            return candidate
    return None
