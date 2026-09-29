"""Decomposed from phase10_anomaly_duplicate_detection.py: stage. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple
import time as _time
import uuid as _uuid
from datetime import datetime as _datetime, timezone as _timezone
from .models import *
from .normalize import *
from .engines import *
from app.ocr.utils.time_ids import new_dated_id as _canonical_dated_id
from app.ocr.utils.time_ids import utc_now_iso as _canonical_now_iso

import logging
logger = logging.getLogger(__name__)

__all__ = [
    "DUPLICATE_SCOPE_LOCAL_DATASET",
    "DUPLICATE_SUSPECT_THRESHOLD",
    "DUPLICATE_CONFIRM_THRESHOLD",
    "AREA_UNIT_VOCABULARY",
    "NATURE_OF_LAND_VOCABULARY",
    "Severity",
    "AnomalyCategory",
    "DuplicateMatchType",
    "DuplicateStatus",
    "normalize_identifier",
    "numeric_core",
    "normalize_name",
    "compare_name",
    "compare_identifier",
    "build_record_profile",
    "scan_local_dataset",
    "Anomaly",
    "DuplicateMatch",
    "DuplicateDetectionEngine",
    "AnomalyDetectionEngine",
    "get_anomaly_detection_engine",
    "get_duplicate_detection_engine",
    "STAGE_NEXT_PHASE",
    "PHASE_10_STORAGE_DIR",
    "StageWorkflowState",
    "StageErrorCode",
    "decide_workflow_state",
    "AnomalyDuplicateStageResult",
    "AnomalyDuplicateStageService",
    "get_anomaly_duplicate_stage_service",
]

def decide_workflow_state(
    anomalies: List[Dict[str, Any]],
    duplicates: Dict[str, Any],
) -> StageWorkflowState:
    """Route a record from gate findings.

    - duplicates CONFIRMED -> BLOCKED (still HITL-1 dispositioned, never dropped)
    - duplicates SUSPECTED, or any anomaly -> NEEDS_REVIEW (an anomaly is a
      review signal, never an invalidation by itself)
    - otherwise -> CLEAR
    """
    dup_status = str((duplicates or {}).get("status", "CLEAR")).upper()
    if dup_status == DuplicateStatus.CONFIRMED.value:
        return StageWorkflowState.BLOCKED
    if dup_status == DuplicateStatus.SUSPECTED.value:
        return StageWorkflowState.NEEDS_REVIEW
    if anomalies:
        return StageWorkflowState.NEEDS_REVIEW
    return StageWorkflowState.CLEAR

def _gen_stage_id() -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.new_dated_id."""
    return _canonical_dated_id("ADP")

def _utcnow() -> str:
    """Compatibility wrapper; authoritative impl: app.ocr.utils.time_ids.utc_now_iso."""
    return _canonical_now_iso()

def _summarize(
    anomalies: List[Dict[str, Any]], duplicates: Dict[str, Any]
) -> Dict[str, Any]:
    severities: Dict[str, int] = {}
    for a in anomalies or []:
        sev = str(a.get("severity", "UNKNOWN")).upper()
        severities[sev] = severities.get(sev, 0) + 1
    matched = (duplicates or {}).get("matched_records", []) or []
    return {
        "anomaly_count": len(anomalies or []),
        "anomaly_severities": severities,
        "duplicate_status": str((duplicates or {}).get("status", "CLEAR")).upper(),
        "duplicate_matches": len(matched),
        "duplicate_scope": str(
            (duplicates or {}).get("scope", DUPLICATE_SCOPE_LOCAL_DATASET)
        ),
    }

class AnomalyDuplicateStageService:
    """Build Phase 10 stage records.

    Chained mode reads an existing Phase 09 validation run (no recompute);
    standalone mode runs the engines directly on the Phase 08 assessment.
    Both paths produce the same stage shape and the same routing decision.
    """

    def __init__(
        self,
        storage_dir: Optional[Path] = None,
        validation_runs_dir: Optional[Path] = None,
        phase08_dir: Optional[Path] = None,
    ) -> None:
        self.storage_dir = storage_dir or PHASE_10_STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.validation_runs_dir = validation_runs_dir or PHASE_09_RUNS_DIR
        self.phase08_dir = phase08_dir or PHASE_08_STORAGE_DIR
        self.anomaly_engine = AnomalyDetectionEngine()
        self.duplicate_engine = DuplicateDetectionEngine()

    # -- loaders ---------------------------------------------------------

    def _load_validation_run(self, validation_run_id: str) -> Optional[Dict[str, Any]]:
        if not validation_run_id or not self.validation_runs_dir.is_dir():
            return None
        for path in self.validation_runs_dir.glob(f"**/{validation_run_id}.json"):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    return data
            except Exception:
                continue
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

    # -- persistence ------------------------------------------------------

    def _save(self, result: AnomalyDuplicateStageResult) -> None:
        out_dir = self.storage_dir / result.record_id
        out_dir.mkdir(parents=True, exist_ok=True)
        with open(out_dir / f"{result.stage_id}.json", "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

    def get_stage(self, stage_id: str) -> Optional[Dict[str, Any]]:
        if not stage_id or not self.storage_dir.is_dir():
            return None
        for path in self.storage_dir.glob(f"**/{stage_id}.json"):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    return data
            except Exception:
                continue
        return None

    # -- stage builders ----------------------------------------------------

    def _finalize(
        self,
        *,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        validation_run_id: Optional[str],
        source: str,
        anomalies: List[Dict[str, Any]],
        duplicates: Dict[str, Any],
        t0: float,
        started_at: str,
    ) -> AnomalyDuplicateStageResult:
        state = decide_workflow_state(anomalies, duplicates)
        result = AnomalyDuplicateStageResult(
            stage_id=_gen_stage_id(),
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            validation_run_id=validation_run_id,
            source=source,
            anomalies=[dict(a) for a in anomalies or []],
            duplicates=dict(duplicates or {}),
            summary=_summarize(anomalies, duplicates),
            workflow_state=state.value,
            next_phase=STAGE_NEXT_PHASE,
            needs_review=state != StageWorkflowState.CLEAR,
            timestamps={"started_at": started_at, "completed_at": _utcnow()},
            processing_time_seconds=round(_time.time() - t0, 4),
        )
        self._save(result)
        logger.info(
            "Phase 10 stage complete: record_id=%s state=%s anomalies=%d dup=%s",
            record_id, state.value, len(anomalies or []),
            str((duplicates or {}).get("status", "CLEAR")),
        )
        return result

    def _failed(
        self,
        *,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        error_code: StageErrorCode,
        message: str,
        t0: float,
        started_at: str,
    ) -> AnomalyDuplicateStageResult:
        return AnomalyDuplicateStageResult(
            status="FAILED",
            stage_id=_gen_stage_id(),
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            error_code=error_code.value,
            error_message=message,
            timestamps={"started_at": started_at, "completed_at": _utcnow()},
            processing_time_seconds=round(_time.time() - t0, 4),
        )

    def create_from_validation_run(
        self, validation_run_id: str
    ) -> AnomalyDuplicateStageResult:
        """Chain off a Phase 09 run: reuse its findings, decide routing."""
        t0 = _time.time()
        started_at = _utcnow()
        if not validation_run_id:
            return self._failed(
                record_id="", document_id="", ingestion_id="",
                error_code=StageErrorCode.INVALID_REQUEST,
                message="validation_run_id is required",
                t0=t0, started_at=started_at,
            )
        run = self._load_validation_run(validation_run_id)
        if not run:
            return self._failed(
                record_id="", document_id="", ingestion_id="",
                error_code=StageErrorCode.VALIDATION_RUN_NOT_FOUND,
                message=f"validation run not found: {validation_run_id}",
                t0=t0, started_at=started_at,
            )
        return self._finalize(
            record_id=str(run.get("record_id", "")),
            document_id=str(run.get("document_id", "")),
            ingestion_id=str(run.get("ingestion_id", "")),
            validation_run_id=validation_run_id,
            source="VALIDATION_RUN",
            anomalies=run.get("anomalies", []) or [],
            duplicates=run.get("duplicates", {}) or {},
            t0=t0, started_at=started_at,
        )

    def create_standalone(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        dataset_dir: Optional[Path] = None,
    ) -> AnomalyDuplicateStageResult:
        """Run the engines directly on the Phase 08 assessment."""
        t0 = _time.time()
        started_at = _utcnow()
        if not all([record_id, document_id, ingestion_id]):
            return self._failed(
                record_id=record_id or "", document_id=document_id or "",
                ingestion_id=ingestion_id or "",
                error_code=StageErrorCode.INVALID_REQUEST,
                message="record_id, document_id, and ingestion_id are required",
                t0=t0, started_at=started_at,
            )
        phase08 = self._load_phase08(record_id, document_id)
        if not phase08:
            return self._failed(
                record_id=record_id, document_id=document_id,
                ingestion_id=ingestion_id,
                error_code=StageErrorCode.PHASE_08_RESULT_NOT_FOUND,
                message="Phase 08 assessment could not be located",
                t0=t0, started_at=started_at,
            )
        fields = phase08.get("fields", {}) or {}
        document_type = str(phase08.get("document_type", "") or "")
        profile = build_record_profile(record_id, document_id, fields)
        local_records = scan_local_dataset(
            Path(dataset_dir) if dataset_dir else self.phase08_dir
        )
        dup_status, matches = self.duplicate_engine.detect(profile, local_records)
        duplicates: Dict[str, Any] = {
            "status": dup_status.value,
            "scope": DUPLICATE_SCOPE_LOCAL_DATASET,
            "matched_records": [m.to_dict() for m in matches],
        }
        anomalies = self.anomaly_engine.detect(
            fields,
            document_type=document_type,
            classification=None,
            duplicates=(dup_status, matches),
        )
        return self._finalize(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            validation_run_id=None,
            source="STANDALONE_ASSESSMENT",
            anomalies=[a.to_dict() for a in anomalies],
            duplicates=duplicates,
            t0=t0, started_at=started_at,
        )

def get_anomaly_duplicate_stage_service() -> AnomalyDuplicateStageService:
    return AnomalyDuplicateStageService()
