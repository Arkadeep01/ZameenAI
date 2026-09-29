"""Decomposed from phase09_automated_validation.py: service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import os
import re
import time
import uuid
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from .models import *
from .rules import *
from .engine import *

import logging
logger = logging.getLogger(__name__)

__all__ = [
    "NEXT_PHASE",
    "RULES_VERSION",
    "REFERENCE_DB_ENV",
    "PHASE_09_STORAGE_DIR",
    "PHASE_08_STORAGE_DIR",
    "PHASE_07_STORAGE_DIR",
    "PHASE_11_STORAGE_DIR",
    "RuleCategory",
    "ValidationFieldStatus",
    "ValidationDecision",
    "ValidationErrorCode",
    "FieldValidationResult",
    "ValidationSummary",
    "ValidationRunResult",
    "AutomatedValidationEngine",
    "AutomatedValidationService",
    "get_automated_validation_service",
]

class AutomatedValidationService:
    """Load Phase 08 assessment (canonical or Phase 11 run snapshot), evaluate,
    persist the Phase 09 run."""

    def __init__(
        self,
        storage_dir: Optional[Path] = None,
        phase08_dir: Optional[Path] = None,
        phase07_dir: Optional[Path] = None,
        phase11_dir: Optional[Path] = None,
        dataset_dir: Optional[Path] = None,
    ) -> None:
        self.storage_dir = storage_dir or PHASE_09_STORAGE_DIR
        self.phase08_dir = phase08_dir or PHASE_08_STORAGE_DIR
        self.phase07_dir = phase07_dir or PHASE_07_STORAGE_DIR
        self.phase11_dir = phase11_dir or PHASE_11_STORAGE_DIR
        self.engine = AutomatedValidationEngine(dataset_dir=dataset_dir)

    # -- loading -------------------------------------------------------------

    def _load_phase08(self, record_id: str, document_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        path = self.phase08_dir / record_id / f"{document_id}_confidence_completeness.json"
        if not path.is_file():
            return None, None
        try:
            with open(path, encoding="utf-8") as handle:
                return json.load(handle), str(path)
        except Exception:
            return None, None

    def _load_reprocessing_snapshot(self, reprocessing_id: str) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
        """Load a fresh Phase 08 snapshot from a legacy reprocessing run record."""
        if not self.phase11_dir.is_dir():
            return None, {}
        matches = list(self.phase11_dir.glob(f"**/runs/{reprocessing_id}.json"))
        if not matches:
            return None, {}
        try:
            with open(matches[0], encoding="utf-8") as handle:
                run = json.load(handle)
        except Exception:
            return None, {}
        snapshot = (run.get("result") or {}).get("new_result")
        if not isinstance(snapshot, dict):
            return None, {}
        meta = {
            "reprocessing_id": reprocessing_id,
            "submission_id": run.get("submission_id") or "",
            "remediation_id": run.get("remediation_id") or "",
            "attempt_number": run.get("attempt_number"),
        }
        return snapshot, {k: v for k, v in meta.items() if v}

    # -- persistence -----------------------------------------------------------

    def _save_result(self, result: ValidationRunResult) -> None:
        record_dir = self.storage_dir / result.record_id
        record_dir.mkdir(parents=True, exist_ok=True)
        with open(record_dir / f"{result.validation_run_id}.json", "w", encoding="utf-8") as handle:
            json.dump(result.to_dict(), handle, indent=2, ensure_ascii=False)

    def get_validation_run(self, validation_run_id: str) -> Optional[Dict[str, Any]]:
        if not self.storage_dir.is_dir():
            return None
        for path in self.storage_dir.glob(f"**/{validation_run_id}.json"):
            try:
                with open(path, encoding="utf-8") as handle:
                    return json.load(handle)
            except Exception:
                return None
        return None

    def get_record_validations(self, record_id: str) -> Dict[str, Any]:
        record_dir = self.storage_dir / record_id
        runs: List[Dict[str, Any]] = []
        if record_dir.is_dir():
            for path in sorted(record_dir.glob("VLD-*.json")):
                try:
                    with open(path, encoding="utf-8") as handle:
                        runs.append(json.load(handle))
                except Exception:
                    continue
        return {
            "phase": "AUTOMATED_VALIDATION",
            "record_id": record_id,
            "count": len(runs),
            "runs": runs,
        }

    # -- evaluate ---------------------------------------------------------------

    def evaluate(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        *,
        reprocessing_id: Optional[str] = None,
        classification: Optional[Dict[str, Any]] = None,
        phase08_dict: Optional[Dict[str, Any]] = None,
    ) -> ValidationRunResult:
        t0 = time.time()
        input_ref_meta: Dict[str, Any] = {}

        if phase08_dict:
            phase08, phase08_path = phase08_dict, None
        elif reprocessing_id:
            snapshot, meta = self._load_reprocessing_snapshot(reprocessing_id)
            input_ref_meta.update(meta)
            if snapshot is None:
                return ValidationRunResult(
                    record_id=record_id, document_id=document_id,
                    ingestion_id=ingestion_id,
                    timestamps={"started_at": datetime.now(timezone.utc).isoformat()},
                )._mark_failed(
                    ValidationErrorCode.REPROCESSING_RUN_NOT_FOUND.value,
                    f"Phase 11 reprocessing run {reprocessing_id} not found or has "
                    f"no completed Phase 08 snapshot.",)
            phase08, phase08_path = snapshot, None
        else:
            phase08, phase08_path = self._load_phase08(record_id, document_id)
            if (
                phase08 is not None
                and phase08.get("ingestion_id")
                and phase08.get("ingestion_id") != ingestion_id
            ):
                # Stored assessment belongs to a previous run reusing this
                # record id: never validate stale evidence as current-run.
                phase08, phase08_path = None, None
            if phase08 is None:
                return ValidationRunResult(
                    record_id=record_id, document_id=document_id,
                    ingestion_id=ingestion_id,
                    timestamps={"started_at": datetime.now(timezone.utc).isoformat()},
                )._mark_failed(
                    ValidationErrorCode.PHASE_08_RESULT_NOT_FOUND.value,
                    f"Phase 08 assessment not found for record_id={record_id}, "
                    f"document_id={document_id}.",)

        result = self.engine.evaluate(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=phase08.get("ingestion_id") or ingestion_id,
            phase08=phase08,
            classification=classification,
            phase08_path=phase08_path,
            **input_ref_meta,
        )
        result.timestamps["started_at"] = datetime.now(timezone.utc).isoformat()
        result.processing_time_seconds = round(time.time() - t0, 4)
        result.input_reference.update(input_ref_meta)

        self._save_result(result)
        return result

def get_automated_validation_service() -> AutomatedValidationService:
    return AutomatedValidationService()
