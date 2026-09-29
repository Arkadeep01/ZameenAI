"""Decomposed from phase08_confidence_completeness.py: engine. (Authoritative implementation; verbatim move.)"""
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

import logging
logger = logging.getLogger(__name__)

def _field_priority(field_name: str) -> Tuple[str, float]:
    for priority_label, cfg in FIELD_PRIORITY.items():
        if field_name in cfg["fields"]:
            return priority_label, cfg["weight"]
    return "OPTIONAL", 0.25

def _field_aliases(field_name: str) -> List[str]:
    try:
        from ..extraction.terminology import LABEL_ALIASES, MULTILINGUAL_ALIASES
    except ImportError:
        return []
    aliases = []
    en = LABEL_ALIASES.get(field_name, [])
    aliases.extend(en)
    multilingual = MULTILINGUAL_ALIASES.get(field_name, [])
    aliases.extend(multilingual)
    return [a.lower() for a in aliases]

def _label_present_in_text(field_name: str, ocr_text: str) -> bool:
    if not ocr_text:
        return False
    text_lower = ocr_text.lower()
    for alias in _field_aliases(field_name):
        if alias in text_lower:
            return True
    return False

def _record_value(extracted_record: Optional[Dict[str, Any]], field_name: str) -> Any:
    if not extracted_record:
        return None
    section, key = field_name.split(".", 1)
    section_data = extracted_record.get(section, {})
    if not isinstance(section_data, dict):
        return None
    value = section_data.get(key)
    if value is None or value == "":
        return None
    return value

class ConfidenceCompletenessEngine:
    """Evaluate Phase 07 extraction quality without modifying any data."""

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        band_thresholds: Optional[Dict[str, float]] = None,
    ) -> None:
        self.weights = dict(weights) if weights else dict(CONFIDENCE_WEIGHTS)
        self.band_thresholds = dict(band_thresholds) if band_thresholds else dict(CONFIDENCE_BAND_THRESHOLDS)

    def _field_confidence(
        self,
        field_meta: Dict[str, Any],
        conflict_alternatives: List[Dict[str, Any]],
    ) -> Tuple[float, ConfidenceFactors]:
        status = field_meta.get("status", "MISSING")
        if status != "EXTRACTED":
            return 0.0, ConfidenceFactors()

        semantic = field_meta.get("confidence", 0.0)
        method = field_meta.get("method", "")
        source = field_meta.get("source", {})

        ocr = min(1.0, semantic * 1.02) if source else semantic
        evidence = METHOD_STRUCTURAL_CONFIDENCE.get(method, 0.8)
        structural = 1.0 if method in ("TABLE_CELL", "TABLE_COLUMN_HEADER", "DETERMINISTIC", "RECONCILED") else 0.85

        normalized = field_meta.get("normalized_value")
        raw = field_meta.get("raw_value")
        if normalized is not None and raw is not None:
            validation = 1.0
        elif normalized is not None:
            validation = 0.95
        else:
            validation = 0.8

        in_conflict = bool(conflict_alternatives)
        agreement = 0.5 if in_conflict else 1.0

        factors = ConfidenceFactors(
            semantic=semantic,
            ocr=ocr,
            evidence=evidence,
            structural=structural,
            validation=validation,
            agreement=agreement,
        )

        weighted = (
            self.weights["semantic"] * semantic
            + self.weights["ocr"] * ocr
            + self.weights["evidence"] * evidence
            + self.weights["structural"] * structural
            + self.weights["validation"] * validation
            + self.weights["agreement"] * agreement
        )
        final = round(min(0.99, max(0.0, weighted)), 4)
        return final, factors

    def _completeness(
        self,
        field_assessments: Dict[str, FieldAssessment],
        applicability: Dict[str, str],
    ) -> CompletenessResult:
        applicable_fields = [fn for fn, level in applicability.items() if level in ("REQUIRED", "OPTIONAL")]

        present = 0
        missing = 0
        unreadable = 0
        not_applicable_count = 0
        critical_missing: List[str] = []
        important_missing: List[str] = []
        total_weight = 0.0
        earned_weight = 0.0

        for fn in applicability:
            fa = field_assessments.get(fn)
            if fa is None:
                continue
            if fa.value_status == FieldValueStatus.NOT_APPLICABLE:
                not_applicable_count += 1
                continue

            _pri, w = _field_priority(fn)
            is_present = fa.value_status in (
                FieldValueStatus.REQUIRED_AND_PRESENT,
                FieldValueStatus.OPTIONAL_AND_PRESENT,
                FieldValueStatus.CONFLICTING,
            )
            is_unreadable = fa.value_status == FieldValueStatus.REQUIRED_BUT_UNREADABLE

            if is_present:
                present += 1
                earned_weight += w
            elif is_unreadable:
                unreadable += 1
                earned_weight += w * 0.3
            else:
                missing += 1
                if applicability.get(fn) == "REQUIRED":
                    if _pri == "CRITICAL":
                        critical_missing.append(fn)
                    elif _pri == "IMPORTANT":
                        important_missing.append(fn)
            total_weight += w

        score = earned_weight / total_weight if total_weight > 0 else 0.0
        score = round(min(1.0, max(0.0, score)), 4)

        if score >= self.band_thresholds["HIGH"]:
            band = ConfidenceBand.HIGH
        elif score >= self.band_thresholds["MEDIUM"]:
            band = ConfidenceBand.MEDIUM
        else:
            band = ConfidenceBand.LOW

        return CompletenessResult(
            score=score,
            band=band,
            applicable_fields=len(applicable_fields),
            present_fields=present,
            missing_fields=missing,
            unreadable_fields=unreadable,
            not_applicable_fields=not_applicable_count,
            critical_missing=critical_missing,
            important_missing=important_missing,
        )

    def _determine_status(
        self,
        overall_confidence: float,
        completeness: CompletenessResult,
        critical_issues: List[str],
        conflicting_fields: List[str],
        models: Dict[str, str],
    ) -> RecordStatus:
        if models.get("indicbart") == "ERROR" or models.get("mistral") == "ERROR":
            return RecordStatus.MODEL_UNAVAILABLE

        if completeness.critical_missing:
            return RecordStatus.REMEDIATION_REQUIRED

        if completeness.score < 0.25:
            return RecordStatus.INCOMPLETE

        if completeness.score < REMEDIATION_REQUIRED_MIN_COMPLETENESS:
            return RecordStatus.REMEDIATION_REQUIRED

        if conflicting_fields and any(
            _field_priority(fn)[0] == "CRITICAL" for fn in conflicting_fields
        ):
            return RecordStatus.REVIEW_REQUIRED

        if (
            overall_confidence >= READY_FOR_VALIDATION_MIN_CONFIDENCE
            and completeness.score >= READY_FOR_VALIDATION_MIN_COMPLETENESS
            and not critical_issues
        ):
            return RecordStatus.READY_FOR_VALIDATION

        if overall_confidence >= REVIEW_REQUIRED_MIN_CONFIDENCE:
            return RecordStatus.REVIEW_REQUIRED

        return RecordStatus.REMEDIATION_REQUIRED

    def _build_remediation(
        self,
        field_assessments: Dict[str, FieldAssessment],
        completeness: CompletenessResult,
    ) -> List[RemediationSignal]:
        signals: List[RemediationSignal] = []

        for fn, fa in field_assessments.items():
            if fa.value_status == FieldValueStatus.REQUIRED_BUT_MISSING:
                signals.append(
                    RemediationSignal(
                        field=fn,
                        reason=RemediationReason.MISSING_FIELD,
                        page=fa.source_page,
                        message=f"Required field '{fn}' has no extracted value.",
                    )
                )
            elif fa.value_status == FieldValueStatus.REQUIRED_BUT_UNREADABLE:
                signals.append(
                    RemediationSignal(
                        field=fn,
                        reason=RemediationReason.UNREADABLE_FIELD,
                        page=fa.source_page,
                        message=f"Label for '{fn}' found in document but value could not be read.",
                    )
                )
            elif fa.value_status == FieldValueStatus.CONFLICTING:
                signals.append(
                    RemediationSignal(
                        field=fn,
                        reason=RemediationReason.CONFLICTING_VALUES,
                        page=fa.source_page,
                        message=f"Multiple values proposed for '{fn}'; human review required.",
                    )
                )
            elif fa.value_status == FieldValueStatus.LOW_CONFIDENCE:
                signals.append(
                    RemediationSignal(
                        field=fn,
                        reason=RemediationReason.LOW_OCR_CONFIDENCE,
                        page=fa.source_page,
                        message=f"Low confidence ({fa.confidence:.2f}) for '{fn}'.",
                    )
                )

        for fn in completeness.critical_missing:
            if not any(s.field == fn for s in signals):
                signals.append(
                    RemediationSignal(
                        field=fn,
                        reason=RemediationReason.CRITICAL_FIELD_MISSING,
                        message=f"Critical field '{fn}' is missing from extraction.",
                    )
                )

        return signals

    def evaluate(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        document_type: str,
        field_metadata: Dict[str, Dict[str, Any]],
        conflicts: List[Dict[str, Any]],
        needs_review: bool,
        models: Dict[str, str],
        extracted_record: Optional[Dict[str, Any]] = None,
        ocr_text: str = "",
    ) -> ConfidenceCompletenessResult:
        try:
            from ..extraction.terminology import FIELD_APPLICABILITY, ALL_CANONICAL_FIELDS
        except ImportError as exc:
            return ConfidenceCompletenessResult(
                record_id=record_id,
                document_id=document_id,
                document_type=document_type,
                status=RecordStatus.EXTRACTION_ERROR,
                error_code="PHASE_07_IMPORT_ERROR",
                error_message=f"Cannot import Phase 07 constants: {exc}",
            )

        applicability = dict(FIELD_APPLICABILITY.get(document_type, {}))
        for fn in ALL_CANONICAL_FIELDS:
            applicability.setdefault(fn, "OPTIONAL")

        conflict_map: Dict[str, List[Dict[str, Any]]] = {}
        for c in conflicts:
            fn = c.get("field", "")
            alts = c.get("alternatives", [])
            conflict_map[fn] = alts

        all_fields = list(applicability.keys())
        field_assessments: List[FieldAssessment] = []
        total_confidence = 0.0
        extracted_count = 0
        conflicting_fields: List[str] = []
        critical_issues: List[str] = []

        for fn in all_fields:
            meta = field_metadata.get(fn) if field_metadata else None
            level, _w = _field_priority(fn)
            applicability_level = applicability.get(fn, "OPTIONAL")

            if applicability_level == "NOT_APPLICABLE":
                fa = FieldAssessment(
                    field_name=fn,
                    value_status=FieldValueStatus.NOT_APPLICABLE,
                    confidence=1.0,
                    priority=level,
                )
                field_assessments.append(fa)
                continue

            if meta is None:
                record_val = _record_value(extracted_record, fn)
                if record_val is not None:
                    if applicability_level == "REQUIRED":
                        value_status = FieldValueStatus.REQUIRED_AND_PRESENT
                    else:
                        value_status = FieldValueStatus.OPTIONAL_AND_PRESENT
                    fa = FieldAssessment(
                        field_name=fn,
                        value_status=value_status,
                        confidence=0.7,
                        priority=level,
                        value=record_val,
                    )
                    field_assessments.append(fa)
                    total_confidence += 0.7
                    extracted_count += 1
                    continue
                else:
                    if applicability_level == "REQUIRED":
                        value_status = FieldValueStatus.REQUIRED_BUT_MISSING
                    else:
                        value_status = FieldValueStatus.OPTIONAL_AND_MISSING
                    fa = FieldAssessment(
                        field_name=fn,
                        value_status=value_status,
                        confidence=0.0,
                        priority=level,
                    )
                    field_assessments.append(fa)
                    if applicability_level == "REQUIRED" and level == "CRITICAL":
                        critical_issues.append(f"Required field '{fn}' missing from Phase 07 output")
                    continue

            status = meta.get("status", "MISSING")
            alts = conflict_map.get(fn, [])

            if status == "EXTRACTED":
                conf, factors = self._field_confidence(meta, alts)
                in_conflict = bool(alts)

                if in_conflict:
                    value_status = FieldValueStatus.CONFLICTING
                    conflicting_fields.append(fn)
                elif conf < CONFIDENCE_BAND_THRESHOLDS["MEDIUM"]:
                    value_status = FieldValueStatus.LOW_CONFIDENCE
                elif applicability_level == "REQUIRED":
                    value_status = FieldValueStatus.REQUIRED_AND_PRESENT
                else:
                    value_status = FieldValueStatus.OPTIONAL_AND_PRESENT

                src = meta.get("source") or {}
                fa = FieldAssessment(
                    field_name=fn,
                    value_status=value_status,
                    confidence=conf,
                    priority=level,
                    confidence_factors=factors,
                    value=meta.get("normalized_value"),
                    raw_value=meta.get("raw_value"),
                    method=meta.get("method"),
                    source_page=src.get("page"),
                    source_label=src.get("label"),
                    in_conflict=in_conflict,
                    conflict_alternatives=alts,
                )
                field_assessments.append(fa)

                if value_status in (
                    FieldValueStatus.REQUIRED_AND_PRESENT,
                    FieldValueStatus.OPTIONAL_AND_PRESENT,
                    FieldValueStatus.CONFLICTING,
                ):
                    total_confidence += conf
                    extracted_count += 1
                continue

            if status == "NOT_APPLICABLE":
                fa = FieldAssessment(
                    field_name=fn,
                    value_status=FieldValueStatus.NOT_APPLICABLE,
                    confidence=1.0,
                    priority=level,
                )
                field_assessments.append(fa)
                continue

            # status is MISSING or unknown: fall back to record value, else
            # distinguish unreadable (label in OCR, value absent) from missing.
            record_val = _record_value(extracted_record, fn)
            if record_val is not None:
                if applicability_level == "REQUIRED":
                    value_status = FieldValueStatus.REQUIRED_AND_PRESENT
                else:
                    value_status = FieldValueStatus.OPTIONAL_AND_PRESENT
                fa = FieldAssessment(
                    field_name=fn,
                    value_status=value_status,
                    confidence=0.7,
                    priority=level,
                    value=record_val,
                )
                field_assessments.append(fa)
                total_confidence += 0.7
                extracted_count += 1
                continue

            if applicability_level == "REQUIRED" and _label_present_in_text(fn, ocr_text):
                value_status = FieldValueStatus.REQUIRED_BUT_UNREADABLE
                conf = 0.3
            elif applicability_level == "REQUIRED":
                value_status = FieldValueStatus.REQUIRED_BUT_MISSING
                conf = 0.0
            else:
                value_status = FieldValueStatus.OPTIONAL_AND_MISSING
                conf = 0.0

            fa = FieldAssessment(
                field_name=fn,
                value_status=value_status,
                confidence=conf,
                priority=level,
            )
            field_assessments.append(fa)
            if value_status == FieldValueStatus.REQUIRED_BUT_MISSING and level == "CRITICAL":
                critical_issues.append(f"Critical field '{fn}' missing")

        assessments_dict = {fa.field_name: fa for fa in field_assessments}

        contributing = [
            fa.confidence
            for fa in assessments_dict.values()
            if fa.value_status in (
                FieldValueStatus.REQUIRED_AND_PRESENT,
                FieldValueStatus.OPTIONAL_AND_PRESENT,
                FieldValueStatus.CONFLICTING,
            )
        ]
        overall_confidence = sum(contributing) / len(contributing) if contributing else 0.0
        overall_confidence = round(min(0.99, max(0.0, overall_confidence)), 4)

        if overall_confidence >= self.band_thresholds["HIGH"]:
            conf_band = ConfidenceBand.HIGH
        elif overall_confidence >= self.band_thresholds["MEDIUM"]:
            conf_band = ConfidenceBand.MEDIUM
        else:
            conf_band = ConfidenceBand.LOW

        completeness = self._completeness(assessments_dict, applicability)

        missing_fields = [
            fn
            for fn, fa in assessments_dict.items()
            if fa.value_status in (
                FieldValueStatus.REQUIRED_BUT_MISSING,
                FieldValueStatus.OPTIONAL_AND_MISSING,
            )
        ]
        unreadable_fields = [
            fn
            for fn, fa in assessments_dict.items()
            if fa.value_status == FieldValueStatus.REQUIRED_BUT_UNREADABLE
        ]

        record_status = self._determine_status(
            overall_confidence,
            completeness,
            critical_issues,
            conflicting_fields,
            models,
        )

        needs_review_flag = (
            needs_review
            or bool(conflicting_fields)
            or bool(critical_issues)
            or (
                bool(completeness.critical_missing)
                if completeness
                else record_status
                in (
                    RecordStatus.REVIEW_REQUIRED,
                    RecordStatus.REMEDIATION_REQUIRED,
                    RecordStatus.INCOMPLETE,
                )
            )
        )

        remediation_signals = self._build_remediation(assessments_dict, completeness)
        remediation = None
        if remediation_signals:
            remediation = {
                "required": record_status
                in (RecordStatus.REMEDIATION_REQUIRED, RecordStatus.INCOMPLETE),
                "reasons": [s.to_dict() for s in remediation_signals],
            }

        if record_status == RecordStatus.READY_FOR_VALIDATION:
            next_phase = "PHASE_09_AUTOMATED_VALIDATION"
        elif record_status in (RecordStatus.REMEDIATION_REQUIRED, RecordStatus.INCOMPLETE):
            next_phase = "PHASE_12_CORRECTION_REVALIDATION"
        elif record_status == RecordStatus.EXTRACTION_ERROR:
            next_phase = ""
        else:
            next_phase = "PHASE_09_AUTOMATED_VALIDATION"

        return ConfidenceCompletenessResult(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            document_type=document_type,
            status=record_status,
            overall_confidence=overall_confidence,
            confidence_band=conf_band,
            completeness=completeness,
            field_assessments=assessments_dict,
            missing_fields=missing_fields,
            unreadable_fields=unreadable_fields,
            conflicting_fields=conflicting_fields,
            critical_issues=critical_issues,
            needs_review=needs_review_flag,
            remediation=remediation,
            next_phase=next_phase,
            models=models,
        )
