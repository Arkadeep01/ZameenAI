"""Decomposed from phase11_hitl_verification.py: service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from .models import *
from .store import *
from .store import (_flagged_from_assessment, _gen_hitl1_id, _utcnow)

import logging
logger = logging.getLogger(__name__)

__all__ = [
    "HITL1_STORAGE_DIR",
    "Hitl1Status",
    "FieldReviewAction",
    "Hitl1ErrorCode",
    "Hitl1Session",
    "Hitl1Service",
    "get_hitl1_service",
]

class Hitl1Service:
    """Open, review, and decide HITL-1 verification sessions."""

    def __init__(
        self,
        storage_dir: Optional[Path] = None,
        phase08_dir: Optional[Path] = None,
    ) -> None:
        self.storage_dir = storage_dir or HITL1_STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.phase08_dir = (
            phase08_dir
            or APP_DIR / "uploads" / "processing" / "phase_08"
        )

    # -- persistence ------------------------------------------------------

    def _path(self, hitl1_id: str) -> Optional[Path]:
        if not hitl1_id or not self.storage_dir.is_dir():
            return None
        for path in self.storage_dir.glob(f"**/{hitl1_id}.json"):
            return path
        return None

    def _save(self, session: Hitl1Session) -> None:
        out_dir = self.storage_dir / session.record_id
        out_dir.mkdir(parents=True, exist_ok=True)
        with open(out_dir / f"{session.hitl1_id}.json", "w", encoding="utf-8") as f:
            json.dump(session.to_dict(), f, indent=2, ensure_ascii=False)

    def get_session(self, hitl1_id: str) -> Optional[Dict[str, Any]]:
        path = self._path(hitl1_id)
        if not path:
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else None
        except Exception:
            return None

    def get_record_sessions(self, record_id: str) -> List[Dict[str, Any]]:
        record_dir = self.storage_dir / record_id
        if not record_dir.is_dir():
            return []
        out: List[Dict[str, Any]] = []
        for path in sorted(record_dir.glob("HITL1-*.json")):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    out.append(data)
            except Exception:
                continue
        return out

    # -- loaders (read-only; upstream outputs never mutated) ---------------

    def _load_validation_run(self, validation_run_id: str) -> Optional[Dict[str, Any]]:
        from ..validation.service import get_automated_validation_service

        try:
            return get_automated_validation_service().get_validation_run(
                validation_run_id
            )
        except Exception:
            logger.warning("HITL-1 could not load validation run", exc_info=True)
            return None

    def _load_phase08(self, record_id: str, document_id: str) -> Optional[Dict[str, Any]]:
        record_dir = self.phase08_dir / record_id
        if not record_dir.is_dir():
            return None
        candidates = sorted(record_dir.glob(f"{document_id}_confidence_completeness.json"))
        if not candidates:
            candidates = sorted(record_dir.glob("*_confidence_completeness.json"))
        for path in candidates:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    return data
            except Exception:
                continue
        return None

    def _latest_stage_id(self, record_id: str) -> Optional[str]:
        try:
            from ..anomaly.models import PHASE_10_STORAGE_DIR

            record_dir = PHASE_10_STORAGE_DIR / record_id
            if not record_dir.is_dir():
                return None
            stages = sorted(record_dir.glob("ADP-*.json"))
            return stages[-1].stem if stages else None
        except Exception:
            return None

    # -- workflow -----------------------------------------------------------

    def _transition(
        self, session: Hitl1Session, to: Hitl1Status, by: str, reason: str = ""
    ) -> None:
        session.history.append(
            {
                "from": session.status,
                "to": to.value,
                "by": by,
                "at": _utcnow(),
                "reason": reason,
            }
        )
        session.status = to.value

    def open_session(
        self, validation_run_id: str, reviewer: str
    ) -> Hitl1Session:
        """Open an HITL-1 session from a Phase 09 validation run."""
        if not validation_run_id or not reviewer:
            session = Hitl1Session(
                error_code=Hitl1ErrorCode.INVALID_REQUEST.value,
                error_message="validation_run_id and reviewer are required",
                timestamps={"started_at": _utcnow()},
            )
            return session
        run = self._load_validation_run(validation_run_id)
        if not run:
            return Hitl1Session(
                error_code=Hitl1ErrorCode.VALIDATION_RUN_NOT_FOUND.value,
                error_message=f"validation run not found: {validation_run_id}",
                timestamps={"started_at": _utcnow()},
            )
        record_id = str(run.get("record_id", ""))
        document_id = str(run.get("document_id", ""))
        ingestion_id = str(run.get("ingestion_id", ""))
        phase08 = self._load_phase08(record_id, document_id) or {}
        snapshot: Dict[str, Any] = {}
        for fn, assessment in ((phase08.get("fields", {}) or {}).items()):
            if isinstance(assessment, dict):
                snapshot[fn] = {
                    "value": assessment.get("value"),
                    "raw_value": assessment.get("raw_value"),
                    "value_status": assessment.get("value_status"),
                }
        session = Hitl1Session(
            hitl1_id=_gen_hitl1_id(),
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            validation_run_id=validation_run_id,
            stage_id=self._latest_stage_id(record_id),
            field_snapshot=snapshot,
            flagged_fields=_flagged_from_assessment(phase08),
            evidence={
                "validation_decision": run.get("decision"),
                "validation_summary": (run.get("validation_result") or {}).get("summary"),
                "duplicate_status": (run.get("duplicates") or {}).get("status"),
                "anomaly_count": len(run.get("anomalies", []) or []),
                "phase08_status": phase08.get("status"),
            },
            timestamps={"started_at": _utcnow(), "opened_at": _utcnow()},
        )
        session.history.append(
            {
                "from": "",
                "to": Hitl1Status.READY_FOR_HITL.value,
                "by": reviewer,
                "at": _utcnow(),
                "reason": f"opened from validation run {validation_run_id}",
            }
        )
        if not session.stage_id:
            session.notes.append(
                {
                    "by": "system",
                    "at": _utcnow(),
                    "text": "No Phase 10 stage record found for this record; "
                            "review proceeds on validation findings. Run Phase 10 "
                            "before HITL-1 in the production pipeline.",
                }
            )
        self._save(session)
        logger.info(
            "HITL-1 opened: %s record=%s decision=%s flagged=%d",
            session.hitl1_id, record_id,
            run.get("decision"), len(session.flagged_fields),
        )
        return session

    def review_field(
        self,
        hitl1_id: str,
        field: str,
        action: str,
        value: Optional[Any] = None,
        note: str = "",
        reviewer: str = "",
    ) -> Hitl1Session:
        """Record one field review. CORRECT keeps the original value."""
        stored = self.get_session(hitl1_id)
        if not stored:
            return Hitl1Session(
                hitl1_id=hitl1_id,
                error_code=Hitl1ErrorCode.SESSION_NOT_FOUND.value,
                error_message=f"HITL-1 session not found: {hitl1_id}",
                timestamps={"started_at": _utcnow()},
            )
        session = Hitl1Session.from_dict(stored)
        if session.status in {s.value for s in TERMINAL_STATES}:
            session.error_code = Hitl1ErrorCode.SESSION_TERMINAL.value
            session.error_message = (
                f"session is {session.status}; terminal sessions are immutable"
            )
            return session
        try:
            act = FieldReviewAction(str(action).upper())
        except ValueError:
            session.error_code = Hitl1ErrorCode.INVALID_REQUEST.value
            session.error_message = (
                f"action must be one of {[a.value for a in FieldReviewAction]}"
            )
            return session
        if not field or not reviewer:
            session.error_code = Hitl1ErrorCode.INVALID_REQUEST.value
            session.error_message = "field and reviewer are required"
            return session
        if act == FieldReviewAction.CORRECT and (value is None or str(value) == ""):
            session.error_code = Hitl1ErrorCode.INVALID_REQUEST.value
            session.error_message = "CORRECT requires a corrected value"
            return session
        if session.status == Hitl1Status.READY_FOR_HITL.value:
            self._transition(session, Hitl1Status.UNDER_REVIEW, reviewer,
                             reason="first field review recorded")
        original = (session.field_snapshot.get(field) or {}).get("value")
        session.field_reviews[field] = {
            "action": act.value,
            "value": value if act == FieldReviewAction.CORRECT else original,
            "original_value": original,
            "note": note or "",
            "reviewer": reviewer,
            "reviewed_at": _utcnow(),
        }
        session.error_code = None
        session.error_message = None
        self._save(session)
        return session

    def add_note(self, hitl1_id: str, reviewer: str, text: str) -> Hitl1Session:
        stored = self.get_session(hitl1_id)
        if not stored:
            return Hitl1Session(
                hitl1_id=hitl1_id,
                error_code=Hitl1ErrorCode.SESSION_NOT_FOUND.value,
                error_message=f"HITL-1 session not found: {hitl1_id}",
                timestamps={"started_at": _utcnow()},
            )
        session = Hitl1Session.from_dict(stored)
        if session.status in {s.value for s in TERMINAL_STATES}:
            session.error_code = Hitl1ErrorCode.SESSION_TERMINAL.value
            session.error_message = (
                f"session is {session.status}; terminal sessions are immutable"
            )
            return session
        if not reviewer or not (text or "").strip():
            session.error_code = Hitl1ErrorCode.INVALID_REQUEST.value
            session.error_message = "reviewer and non-empty text are required"
            return session
        session.notes.append({"by": reviewer, "at": _utcnow(), "text": text.strip()})
        if session.status == Hitl1Status.READY_FOR_HITL.value:
            self._transition(session, Hitl1Status.UNDER_REVIEW, reviewer,
                             reason="reviewer note recorded")
        session.error_code = None
        session.error_message = None
        self._save(session)
        return session

    def submit(
        self,
        hitl1_id: str,
        decision: str,
        reviewer: str,
        notes: str = "",
    ) -> Hitl1Session:
        """Submit the human decision. Only a human submit() decides."""
        stored = self.get_session(hitl1_id)
        if not stored:
            return Hitl1Session(
                hitl1_id=hitl1_id,
                error_code=Hitl1ErrorCode.SESSION_NOT_FOUND.value,
                error_message=f"HITL-1 session not found: {hitl1_id}",
                timestamps={"started_at": _utcnow()},
            )
        session = Hitl1Session.from_dict(stored)
        if session.status in {s.value for s in TERMINAL_STATES}:
            session.error_code = Hitl1ErrorCode.SESSION_TERMINAL.value
            session.error_message = (
                f"session is {session.status}; terminal sessions are immutable"
            )
            return session
        try:
            target = Hitl1Status(str(decision).upper())
        except ValueError:
            session.error_code = Hitl1ErrorCode.INVALID_REQUEST.value
            session.error_message = (
                "decision must be VERIFIED, CORRECTION_REQUIRED, or REJECTED"
            )
            return session
        if target not in TERMINAL_STATES:
            session.error_code = Hitl1ErrorCode.INVALID_REQUEST.value
            session.error_message = (
                "decision must be VERIFIED, CORRECTION_REQUIRED, or REJECTED"
            )
            return session
        if not reviewer:
            session.error_code = Hitl1ErrorCode.INVALID_REQUEST.value
            session.error_message = "reviewer is required: no anonymous decisions"
            return session
        if target == Hitl1Status.VERIFIED:
            missing = [
                fn for fn in session.flagged_fields
                if fn not in session.field_reviews
            ]
            if missing:
                session.error_code = Hitl1ErrorCode.FIELD_REVIEW_INCOMPLETE.value
                session.error_message = (
                    "VERIFIED requires reviews for all flagged fields; "
                    f"pending: {sorted(missing)}"
                )
                return session
        else:
            reason = (notes or "").strip()
            if not reason:
                session.error_code = Hitl1ErrorCode.REASON_REQUIRED.value
                session.error_message = (
                    f"{target.value} requires a reason note"
                )
                return session
            session.notes.append(
                {"by": reviewer, "at": _utcnow(), "text": reason}
            )
        self._transition(session, target, reviewer,
                         reason=f"human decision: {target.value}")
        session.timestamps["decided_at"] = _utcnow()
        session.error_code = None
        session.error_message = None
        self._save(session)
        logger.info(
            "HITL-1 decided: %s record=%s decision=%s by=%s",
            session.hitl1_id, session.record_id, target.value, reviewer,
        )
        return session

def get_hitl1_service() -> Hitl1Service:
    return Hitl1Service()
