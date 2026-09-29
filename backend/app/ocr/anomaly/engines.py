"""Decomposed from phase10_anomaly_duplicate_detection.py: engines. (Authoritative implementation; verbatim move.)"""
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
from .models import (_IDENTIFIER_FIELDS)
from .normalize import (_value_of)

import logging
logger = logging.getLogger(__name__)

class DuplicateDetectionEngine:
    """Identifier-first duplicate detection against the LOCAL dataset."""

    def __init__(
        self,
        suspect_threshold: float = DUPLICATE_SUSPECT_THRESHOLD,
        confirm_threshold: float = DUPLICATE_CONFIRM_THRESHOLD,
    ) -> None:
        self.suspect_threshold = suspect_threshold
        self.confirm_threshold = confirm_threshold

    def detect(
        self,
        profile: Dict[str, Any],
        local_records: Iterable[Dict[str, Any]],
    ) -> Tuple[DuplicateStatus, List[DuplicateMatch]]:
        """Compare `profile` against the local dataset.

        Owner name is only ever used inside the composite fingerprint; a
        single identifier (khata, plot, ...) alone is NOT a duplicate signal.
        """
        record_id = profile["record_id"]
        document_id = profile["document_id"]
        identifiers = profile.get("identifiers") or {}
        fingerprint_parts = set(profile.get("fingerprint_parts") or [])
        fingerprint_fields = set(profile.get("fingerprint_fields") or [])

        matches: List[DuplicateMatch] = []

        for other in local_records:
            if other.get("record_id") == record_id and other.get("document_id") == document_id:
                continue
            o_identifiers = other.get("identifiers") or {}
            o_parts = set(other.get("fingerprint_parts") or [])
            o_fields = set(other.get("fingerprint_fields") or [])

            pair_overlap = set(identifiers) & set(o_identifiers)
            pair_matched = {
                f for f in pair_overlap
                if identifiers[f] and identifiers[f] == o_identifiers[f]
            }

            # record-level match: khata + plot both present and equal
            khata = pair_matched & {"land.khata_number"}
            plot = pair_matched & {"land.plot_number"}
            record_match = bool(khata and plot)

            # mutation / registration identifiers equal
            mutation_match = bool(
                {"mutation.mutation_number"} <= pair_matched
            )
            registration_match = bool(
                {"registration.document_number"} <= pair_matched
            )

            # composite fingerprint
            common_fields = fingerprint_fields & o_fields
            matched_fields = {
                f for f in common_fields
                if f in profile["canonical"] and f in other["canonical"]
                and bool(profile["canonical"][f])
                and profile["canonical"][f] == other["canonical"][f]
            }
            composite_ratio = (
                len(matched_fields) / len(common_fields)
                if common_fields else 0.0
            )

            evidence: List[Dict[str, Any]] = []
            best_type: Optional[DuplicateMatchType] = None
            confidence = 0.0
            fuzzy = False

            if record_match:
                best_type = DuplicateMatchType.RECORD
                confidence = 0.88
                for f in sorted(khata.union(plot)):
                    evidence.append({
                        "identifier": f,
                        "value": profile["present"].get(f),
                        "matched_value": other["present"].get(f),
                    })
                if compare_name(profile["present"].get("owner.name"),
                                other["present"].get("owner.name")):
                    confidence = 0.94
                    evidence.append({
                        "identifier": "owner.name",
                        "value": profile["present"].get("owner.name"),
                        "matched_value": other["present"].get("owner.name"),
                    })
            elif registration_match:
                best_type = DuplicateMatchType.IDENTIFIER
                confidence = 0.9
                evidence.append({
                    "identifier": "registration.document_number",
                    "value": profile["present"].get("registration.document_number"),
                    "matched_value": other["present"].get("registration.document_number"),
                })
            elif mutation_match:
                best_type = DuplicateMatchType.IDENTIFIER
                confidence = 0.7
                evidence.append({
                    "identifier": "mutation.mutation_number",
                    "value": profile["present"].get("mutation.mutation_number"),
                    "matched_value": other["present"].get("mutation.mutation_number"),
                })
            elif composite_ratio >= 0.5 and len(common_fields) >= 4:
                best_type = DuplicateMatchType.COMPOSITE
                confidence = round(0.5 + 0.45 * composite_ratio, 4)
                for f in sorted(matched_fields):
                    evidence.append({
                        "identifier": f,
                        "value": profile["present"].get(f),
                        "matched_value": other["present"].get(f),
                    })

            if best_type is None:
                # fuzzy review signal: at least two identifiers match only by
                # numeric core -> report as a fuzzy hint, never a finding.
                fuzzy_overlap = pair_overlap - pair_matched
                fuzzy_matches = {
                    f for f in fuzzy_overlap
                    if numeric_core(profile["present"].get(f)) is not None
                    and numeric_core(profile["present"].get(f))
                    == numeric_core(other["present"].get(f))
                }
                if len(fuzzy_matches) >= 2:
                    best_type = DuplicateMatchType.COMPOSITE
                    confidence = 0.5
                    fuzzy = True
                    for f in sorted(fuzzy_matches):
                        evidence.append({
                            "identifier": f,
                            "value": profile["present"].get(f),
                            "matched_value": other["present"].get(f),
                            "match": "numeric_core",
                        })

            if best_type is not None:
                matches.append(DuplicateMatch(
                    matched_record_id=other.get("record_id") or "",
                    matched_document_id=other.get("document_id") or "",
                    match_type=best_type,
                    confidence=round(confidence, 4),
                    fuzzy=fuzzy,
                    evidence=evidence,
                ))

        # dedupe by (record, type) keeping the highest confidence
        best: Dict[Tuple[str, str], DuplicateMatch] = {}
        for m in matches:
            key = (m.matched_record_id, m.match_type.value)
            if key not in best or m.confidence > best[key].confidence:
                best[key] = m
        matches = list(best.values())

        if any(m.confidence >= self.confirm_threshold for m in matches):
            status = DuplicateStatus.CONFIRMED
        elif any(m.confidence >= self.suspect_threshold for m in matches):
            status = DuplicateStatus.SUSPECTED
        else:
            status = DuplicateStatus.CLEAR
        return status, matches

class AnomalyDetectionEngine:
    """Deterministic analyzer producing typed, explainable anomalies."""

    def __init__(self, thresholds: Optional[Dict[str, float]] = None) -> None:
        self.thresholds = dict(ANOMALY_THRESHOLDS)
        if thresholds:
            self.thresholds.update(thresholds)

    def detect(
        self,
        fields: Dict[str, Dict[str, Any]],
        document_type: str,
        classification: Optional[Dict[str, Any]] = None,
        duplicates: Optional[Tuple[DuplicateStatus, List[DuplicateMatch]]] = None,
    ) -> List[Anomaly]:
        anomalies: List[Anomaly] = []

        present: Dict[str, Any] = {}
        conflicted: Dict[str, Any] = {}
        for fn, assessment in (fields or {}).items():
            value = _value_of(assessment)
            status = (assessment or {}).get("value_status", "")
            if status == "CONFLICTING" and assessment.get("in_conflict"):
                conflicted[fn] = (value, assessment)
                continue
            if value is None or value == "" or status in (
                "NOT_APPLICABLE", "REQUIRED_BUT_UNREADABLE", "REQUIRED_BUT_MISSING",
                "OPTIONAL_AND_MISSING",
            ):
                continue
            present[fn] = value

        # 1. OWNERSHIP_CONFLICT ---------------------------------------------
        owner_name = present.get("owner.name")
        recorded_tenant = present.get("owner.recorded_tenant")
        if owner_name and recorded_tenant:
            if compare_name(owner_name, recorded_tenant):
                anomalies.append(Anomaly(
                    category=AnomalyCategory.OWNERSHIP_CONFLICT,
                    severity=Severity.WARNING,
                    target_field="owner.name",
                    explanation="owner.name and owner.recorded_tenant resolve to the "
                                "same person; odd but possible — review advised.",
                    evidence=[{"owner.name": owner_name,
                               "owner.recorded_tenant": recorded_tenant}],
                ))

        # 2. MUTATION_CONFLICT ----------------------------------------------
        mutation_number = present.get("mutation.mutation_number")
        mutation_date = present.get("mutation.mutation_date")
        if mutation_number and not owner_name:
            anomalies.append(Anomaly(
                category=AnomalyCategory.MUTATION_CONFLICT,
                severity=Severity.WARNING,
                target_field="mutation.mutation_number",
                explanation="A mutation is recorded but the owning party's name is "
                            "not available; the mutation cannot be attributed.",
                evidence=[{"mutation.mutation_number": mutation_number,
                           "owner.name": None}],
            ))

        # 3. BOUNDARY_PARCEL_CONFLICT ---------------------------------------
        plot = present.get("land.plot_number")
        plot_assessment = (fields or {}).get("land.plot_number") or {}
        plot_alternatives = plot_assessment.get("conflict_alternatives") or []
        if plot and plot_alternatives:
            anomalies.append(Anomaly(
                category=AnomalyCategory.BOUNDARY_PARCEL_CONFLICT,
                severity=Severity.ERROR,
                target_field="land.plot_number",
                explanation="The parcel identifier has competing OCR candidates; a "
                            "parcel boundary conflict is possible.",
                evidence=[{"land.plot_number": plot,
                           "conflict_alternatives": plot_alternatives}],
            ))

        # 4. AREA_INCONSISTENCY ---------------------------------------------
        area_assessment = (fields or {}).get("land.area") or {}
        area_alternatives = area_assessment.get("conflict_alternatives") or []
        if area_alternatives and area_assessment.get("in_conflict"):
            anomalies.append(Anomaly(
                category=AnomalyCategory.AREA_INCONSISTENCY,
                severity=Severity.ERROR,
                target_field="land.area",
                explanation="The measured area has competing values; the extracted "
                            "area is not self-consistent.",
                evidence=[{"conflict_alternatives": area_alternatives}],
            ))
        else:
            area_value = present.get("land.area")
            upper = self.thresholds.get("AREA_ACRES_UPPER", 10000.0)
            lower = self.thresholds.get("AREA_ACRES_LOWER", 0.01)
            try:
                area_num = float(area_value or 0.0)
            except (TypeError, ValueError):
                area_num = 0.0
            if area_value is not None and area_value != "":
                if area_num > upper or (0 < area_num < lower):
                    anomalies.append(Anomaly(
                        category=AnomalyCategory.AREA_INCONSISTENCY,
                        severity=Severity.WARNING,
                        target_field="land.area",
                        explanation=(
                            f"Extracted area {area_value!r} is outside the expected "
                            f"range for an acre-denominated record "
                            f"({lower}–{upper}); verify units.")
                        if area_num > upper or area_num < lower
                        else "Extracted area out of expected range.",
                        evidence=[{"land.area": area_value}],
                    ))

        # 5. LOCATION_INCONSISTENCY -----------------------------------------
        district = present.get("location.district")
        block = present.get("location.block")
        mouza = present.get("location.mouza")
        if district and block and normalize_name(district) == normalize_name(block):
            anomalies.append(Anomaly(
                category=AnomalyCategory.LOCATION_INCONSISTENCY,
                severity=Severity.WARNING,
                target_field="location.block",
                explanation="Distinct location levels resolve to the same name "
                            "(district == block); verify hierarchy.",
                evidence=[{"location.district": district, "location.block": block}],
            ))
        if block and mouza and normalize_name(block) == normalize_name(mouza):
            anomalies.append(Anomaly(
                category=AnomalyCategory.LOCATION_INCONSISTENCY,
                severity=Severity.WARNING,
                target_field="location.mouza",
                explanation="Distinct location levels resolve to the same name "
                            "(block == mouza); verify hierarchy.",
                evidence=[{"location.block": block, "location.mouza": mouza}],
            ))

        # 6. CLASSIFICATION_CONFLICT ----------------------------------------
        if classification:
            predicted = (classification.get("predicted_document_type") or "").upper()
            used_type = (document_type or "").upper()
            predicted_status = (classification.get("classification_status") or "")
            if predicted and predicted not in ("UNKNOWN", "AMBIGUOUS") and used_type and predicted != used_type:
                anomalies.append(Anomaly(
                    category=AnomalyCategory.CLASSIFICATION_CONFLICT,
                    severity=Severity.INFO,
                    explanation="Phase 04 predicted a different document type than the "
                                "type used for extraction.",
                    evidence=[{"predicted_document_type": classification.get(
                        "predicted_document_type"),
                        "document_type_used": document_type,
                        "classification_status": predicted_status}],
                ))

        # 7-9. DUPLICATE_* (from the duplicate engine if wired) -------------
        if duplicates:
            dup_status, matches = duplicates
            for m in matches:
                if m.match_type == DuplicateMatchType.DOCUMENT:
                    cat = AnomalyCategory.DUPLICATE_DOCUMENT
                    sev = Severity.ERROR
                elif m.match_type == DuplicateMatchType.RECORD:
                    cat = AnomalyCategory.DUPLICATE_RECORD
                    sev = Severity.ERROR
                else:
                    cat = AnomalyCategory.DUPLICATE_IDENTIFIER
                    sev = Severity.WARNING
                if m.fuzzy:
                    explanation = ("Fuzzy identifier overlap with another local "
                                   "record (numeric-core review signal).")
                else:
                    explanation = (
                        f"Matched local record {m.matched_record_id} "
                        f"({m.match_type.value}, confidence {m.confidence:.2f}).")
                anomalies.append(Anomaly(
                    category=cat,
                    severity=sev,
                    explanation=explanation,
                    evidence=m.evidence,
                ))

        # 10. SUSPICIOUS_REPEATED_VALUES -------------------------------------
        repeated: Dict[str, List[str]] = {}
        for fn, value in present.items():
            if fn in _IDENTIFIER_FIELDS:
                key = normalize_identifier(value)
            else:
                key = normalize_name(value)
            if not key:
                continue
            repeated.setdefault(key, []).append(fn)
        min_repeated = int(self.thresholds.get("REPEATED_VALUE_FIELD_MIN", 5))
        for key, field_list in sorted(repeated.items()):
            if len(field_list) >= min_repeated:
                anomalies.append(Anomaly(
                    category=AnomalyCategory.SUSPICIOUS_REPEATED_VALUES,
                    severity=Severity.ERROR,
                    explanation=(
                        f"The same value appears across {len(field_list)} canonical "
                        f"fields; suspicious of an OCR/duplication artifact."),
                    evidence=[{"normalized_value": key, "fields": field_list}],
                ))

        # 11. CONFLICTING_OCR_CANDIDATES / 12. CONFLICTING_SEMANTIC ---------
        slack = self.thresholds.get("CONFLICT_CONFIDENCE_SLACK", 0.1)
        for fn, (value, assessment) in sorted(conflicted.items()):
            chosen_conf = float(assessment.get("confidence", 0.0) or 0.0)
            alternatives = assessment.get("conflict_alternatives") or []
            close_alternatives = [
                alt for alt in alternatives
                if float(alt.get("confidence", 0.0) or 0.0) >= chosen_conf - slack
            ]
            evidence = [{"chosen_value": value,
                         "chosen_confidence": chosen_conf,
                         "conflict_alternatives": alternatives}]
            if close_alternatives:
                anomalies.append(Anomaly(
                    category=AnomalyCategory.CONFLICTING_OCR_CANDIDATES,
                    severity=Severity.WARNING,
                    target_field=fn,
                    explanation="The extracted value was chosen from competing OCR "
                                "candidates of near-equal confidence.",
                    evidence=evidence,
                ))
            else:
                anomalies.append(Anomaly(
                    category=AnomalyCategory.CONFLICTING_SEMANTIC_CANDIDATES,
                    severity=Severity.WARNING,
                    target_field=fn,
                    explanation="A same-line semantic interpretation still surfaced "
                                "conflicting candidates (Phase 08 flagged the field).",
                    evidence=evidence,
                ))

        # 13. UNUSUAL_BUT_VALID ----------------------------------------------
        for fn, value in sorted(present.items()):
            if fn in ("land.plot_number", "land.khata_number"):
                core = numeric_core(value)
                upper = self.thresholds.get("PLOT_OR_KHATA_NUMBER_UPPER", 1000000.0)
                if core is not None and core > upper:
                    anomalies.append(Anomaly(
                        category=AnomalyCategory.UNUSUAL_BUT_VALID,
                        severity=Severity.INFO,
                        target_field=fn,
                        explanation=f"Identifier value {value!r} is unusually large; "
                                    "syntactically valid but verify against the scan.",
                        evidence=[{fn: value}],
                    ))

        return anomalies

def get_anomaly_detection_engine() -> AnomalyDetectionEngine:
    return AnomalyDetectionEngine()

def get_duplicate_detection_engine() -> DuplicateDetectionEngine:
    return DuplicateDetectionEngine()
