"""Ownership registry — citizen own-record bindings (file-truth backed).

Tracks record_id/document_id/job ownership by (user_id, username) so citizen
scopes survive restarts without a Postgres dependency. Authoritative for
citizen isolation; ScopeService consults it via owned_records_for().
"""
from __future__ import annotations

import json
import threading
from pathlib import Path

_LOCK = threading.Lock()
_FILE = Path(__file__).resolve().parent.parent.parent / "zameenai_ownership.json"


def _load() -> dict:
    try:
        if _FILE.exists():
            return json.loads(_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"records": {}}


def _save(data: dict) -> None:
    try:
        _FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception:
        pass


def register_record(*, record_id: str, document_id: str = "", job_id: str = "",
                    owner_id: str = "", owner_username: str = "",
                    project_id: str = "1") -> None:
    if not record_id:
        return
    with _LOCK:
        data = _load()
        recs = data.setdefault("records", {})
        recs[record_id] = {"document_id": document_id, "job_id": job_id,
                           "owner_id": owner_id, "owner_username": owner_username,
                           "project_id": str(project_id or "1")}
        _save(data)
    try:
        from app.core.scopes import seed_assignment

        seed_assignment(record_id, project_id=str(project_id or "1"))
    except Exception:
        pass


def owner_of(record_id: str) -> dict | None:
    with _LOCK:
        return (_load().get("records", {}) or {}).get(record_id)


def owned_records_for(user_id: str, username: str = "") -> list[str]:
    with _LOCK:
        recs = (_load().get("records", {}) or {})
    out = []
    for rid, info in recs.items():
        if not isinstance(info, dict):
            continue
        if (user_id and info.get("owner_id") == user_id) or \
                (username and info.get("owner_username") == username):
            out.append(rid)
    return out


def is_owner(user_id: str, username: str, record_id: str) -> bool:
    info = owner_of(record_id)
    if not info:
        return False
    return info.get("owner_id") == user_id or \
        (bool(username) and info.get("owner_username") == username)
