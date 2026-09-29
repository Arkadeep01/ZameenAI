"""Decomposed from phase08_confidence_completeness.py: service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import json
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from .models import *
from .engine import *

import logging
logger = logging.getLogger(__name__)

class ConfidenceCompletenessService:
    """Load Phase 07 output from disk, evaluate via the engine, persist result."""

    def __init__(self) -> None:
        self.engine = ConfidenceCompletenessEngine()
        self.storage_dir = PHASE_08_STORAGE_DIR

    def _load_phase07_result(self, record_id: str, document_id: str) -> Optional[Dict[str, Any]]:
        path = PHASE_07_STORAGE_DIR / record_id / f"{document_id}_extraction_metadata.json"
        if not path.is_file():
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _load_ocr_text(self, record_id: str, document_id: str) -> str:
        path = PHASE_06_STORAGE_DIR / record_id / f"{document_id}_ocr_text.txt"
        if not path.is_file():
            return ""
        with open(path, encoding="utf-8") as f:
            return f.read()

    def _save_result(self, result: ConfidenceCompletenessResult) -> None:
        out_dir = self.storage_dir / result.record_id
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"{result.document_id}_confidence_completeness.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

    def evaluate(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
    ) -> ConfidenceCompletenessResult:
        t0 = time.time()

        p7 = self._load_phase07_result(record_id, document_id)
        if (
            p7 is not None
            and p7.get("ingestion_id")
            and p7.get("ingestion_id") != ingestion_id
        ):
            # Stored extraction belongs to a previous run reusing this
            # record id: never evaluate stale evidence as current-run.
            p7 = None
        if p7 is None:
            return ConfidenceCompletenessResult(
                record_id=record_id,
                document_id=document_id,
                ingestion_id=ingestion_id,
                phase="CONFIDENCE_COMPLETENESS",
                status=RecordStatus.EXTRACTION_ERROR,
                error_code="PHASE_07_RESULT_NOT_FOUND",
                error_message=f"Phase 07 extraction metadata not found for record_id={record_id}, document_id={document_id}",
                next_phase="",
            )

        if p7.get("status") == "FAILED":
            return ConfidenceCompletenessResult(
                record_id=record_id,
                document_id=document_id,
                ingestion_id=ingestion_id,
                phase="CONFIDENCE_COMPLETENESS",
                status=RecordStatus.EXTRACTION_ERROR,
                error_code=p7.get("error_code", "PHASE_07_FAILED"),
                error_message=p7.get("error_message", "Phase 07 extraction failed."),
                next_phase="",
            )

        ocr_text = self._load_ocr_text(record_id, document_id)

        result = self.engine.evaluate(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=p7.get("ingestion_id", ingestion_id),
            document_type=p7.get("document_type", "UNKNOWN"),
            field_metadata=p7.get("field_metadata", {}),
            conflicts=p7.get("conflicts", []),
            needs_review=p7.get("needs_review", False),
            models=p7.get("models", {}),
            extracted_record=p7.get("extracted_record"),
            ocr_text=ocr_text,
        )

        result.timestamps = {
            "started_at": p7.get("timestamps", {}).get("started_at", ""),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        result.processing_time_seconds = round(time.time() - t0, 4)

        self._save_result(result)

        logger.info(
            "Phase 08 complete: record_id=%s status=%s confidence=%.2f completeness=%.2f",
            record_id,
            result.status.value,
            result.overall_confidence,
            result.completeness.score if result.completeness else 0.0,
        )

        return result

def get_confidence_completeness_service() -> ConfidenceCompletenessService:
    return ConfidenceCompletenessService()
