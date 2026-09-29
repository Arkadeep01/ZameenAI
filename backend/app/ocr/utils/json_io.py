"""Shared JSON persistence helpers (single authoritative implementation)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional


def atomic_write_json(path: Path, payload: Dict[str, Any]) -> None:
    """Write JSON atomically via a sibling ``.tmp`` file + rename."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
    tmp.replace(path)


def read_json(path: Path) -> Optional[Dict[str, Any]]:
    """Read a JSON document; ``None`` when missing or unparseable (never raises)."""
    if not path.is_file():
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None
