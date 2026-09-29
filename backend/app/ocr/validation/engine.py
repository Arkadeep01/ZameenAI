"""Decomposed from phase09_automated_validation.py: engine. (Authoritative implementation; verbatim move.)"""
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
from app.ocr.anomaly.engines import (
    AnomalyDetectionEngine, DuplicateDetectionEngine,
)
from app.ocr.anomaly.models import (
    AREA_UNIT_VOCABULARY, DUPLICATE_SCOPE_LOCAL_DATASET, NATURE_OF_LAND_VOCABULARY, Anomaly, DuplicateStatus, Severity,
)
from app.ocr.anomaly.normalize import (
    build_record_profile, normalize_identifier, normalize_name, scan_local_dataset,
)
from app.ocr.confidence.models import (
    RemediationReason,
)
from app.ocr.extraction.terminology import (
    FIELD_APPLICABILITY,
)
from .models import *
from .rules import *
from .rules import (_base_field_check, _evidence_from_assessment, _parse_date, _to_number)

import logging
logger = logging.getLogger(__name__)

class AutomatedValidationEngine:
    """Deterministic Phase 09 rule engine. Inputs Phase 08 assessment; never mutates."""

    def __init__(
        self,
        anomaly_engine: Optional[AnomalyDetectionEngine] = None,
        duplicate_engine: Optional[DuplicateDetectionEngine] = None,
        reference_db_path: Optional[str] = None,
        dataset_dir: Optional[Path] = None,
    ) -> None:
        self.anomaly_engine = anomaly_engine or AnomalyDetectionEngine()
        self.duplicate_engine = duplicate_engine or DuplicateDetectionEngine()
        self.reference_db_path = reference_db_path or os.getenv(REFERENCE_DB_ENV)
        self.dataset_dir = dataset_dir or PHASE_08_STORAGE_DIR

    # -- value-level rule checks for present fields -------------------------

    def _field_value_checks(
        self,
        field_name: str,
        assessment: Optional[Dict[str, Any]],
    ) -> List[FieldValidationResult]:
        checks: List[FieldValidationResult] = []
        value = (assessment or {}).get("value")
        raw_value = (assessment or {}).get("raw_value")
        if value is None:
            value = raw_value
        if value is None:
            return checks

        section = field_name.split(".", 1)[0]

        # 2. DATA_TYPE / FORMAT / 3. RANGE / 4. MEASUREMENT -----------------
        if section == "land" and field_name in ("land.area",):
            number = _to_number(value)
            if number is None:
                checks.append(FieldValidationResult(
                    field=field_name, status=ValidationFieldStatus.INVALID,
                    severity=Severity.ERROR, rule=RuleCategory.DATA_TYPE,
                    reason="Area must be numeric.",
                    value=value, original_value=raw_value,
                    comparison_value=str(value),
                    evidence=_evidence_from_assessment(assessment)))
            else:
                if number <= 0:
                    checks.append(FieldValidationResult(
                        field=field_name, status=ValidationFieldStatus.INVALID,
                        severity=Severity.ERROR, rule=RuleCategory.RANGE,
                        reason="Area must be a positive value.",
                        value=value, original_value=raw_value,
                        evidence=_evidence_from_assessment(assessment)))

        if section == "land" and field_name in (
            "land.plot_number", "land.khata_number", "land.survey_number",
            "land.khasra_number", "land.map_number"):
            text = str(value).strip()
            if not text:
                checks.append(FieldValidationResult(
                    field=field_name, status=ValidationFieldStatus.INVALID,
                    severity=Severity.ERROR, rule=RuleCategory.FORMAT,
                    reason="Identifier is empty.",
                    value=value, original_value=raw_value,
                    evidence=_evidence_from_assessment(assessment)))
            elif not re.search(r"[0-9]", text):
                checks.append(FieldValidationResult(
                    field=field_name, status=ValidationFieldStatus.INVALID,
                    severity=Severity.ERROR, rule=RuleCategory.FORMAT,
                    reason="Identifier must contain at least one digit.",
                    value=value, original_value=raw_value,
                    comparison_value=normalize_identifier(value),
                    evidence=_evidence_from_assessment(assessment)))
            else:
                number = _to_number(text)
                if number is not None and number <= 0:
                    checks.append(FieldValidationResult(
                        field=field_name, status=ValidationFieldStatus.INVALID,
                        severity=Severity.ERROR, rule=RuleCategory.RANGE,
                        reason="Identifier must be a positive value.",
                        value=value, original_value=raw_value,
                        comparison_value=normalize_identifier(value),
                        evidence=_evidence_from_assessment(assessment)))

        if section in ("document", "mutation", "registration") and field_name in (
            "document.document_date", "mutation.mutation_date",
            "registration.registration_date", "registration.issue_date"):
            parsed = _parse_date(value)
            if parsed is None:
                checks.append(FieldValidationResult(
                    field=field_name, status=ValidationFieldStatus.INVALID,
                    severity=Severity.ERROR, rule=RuleCategory.FORMAT,
                    reason="Date is not parsable to a known calendar format.",
                    value=value, original_value=raw_value,
                    comparison_value=str(value),
                    evidence=_evidence_from_assessment(assessment)))
            elif parsed > date.today():
                checks.append(FieldValidationResult(
                    field=field_name, status=ValidationFieldStatus.INVALID,
                    severity=Severity.ERROR, rule=RuleCategory.RANGE,
                    reason="Date is in the future.",
                    value=value, original_value=raw_value,
                    comparison_value=str(value),
                    evidence=_evidence_from_assessment(assessment)))

        if section == "mutation" and field_name == "mutation.mutation_number":
            if not re.search(r"[0-9]", str(value)):
                checks.append(FieldValidationResult(
                    field=field_name, status=ValidationFieldStatus.INVALID,
                    severity=Severity.ERROR, rule=RuleCategory.FORMAT,
                    reason="Mutation number must contain a digit.",
                    value=value, original_value=raw_value,
                    comparison_value=normalize_identifier(value),
                    evidence=_evidence_from_assessment(assessment)))

        # 13. ENUM_CONTROLLED_VALUE ------------------------------------------
        if field_name == "land.area_unit":
            norm = normalize_identifier(value)
            if norm and norm not in AREA_UNIT_VOCABULARY:
                checks.append(FieldValidationResult(
                    field=field_name, status=ValidationFieldStatus.WARNING,
                    severity=Severity.WARNING,
                    rule=RuleCategory.ENUM_CONTROLLED_VALUE,
                    reason="Area unit is not in the reference vocabulary; "
                           "unusual-but-valid, verify against the scan.",
                    value=value, original_value=raw_value, comparison_value=norm,
                    evidence=_evidence_from_assessment(assessment)))
        if field_name == "land.nature_of_land":
            norm = normalize_name(value)
            upper = norm.upper().replace(" ", "_")
            if norm and upper not in NATURE_OF_LAND_VOCABULARY:
                checks.append(FieldValidationResult(
                    field=field_name, status=ValidationFieldStatus.WARNING,
                    severity=Severity.WARNING,
                    rule=RuleCategory.ENUM_CONTROLLED_VALUE,
                    reason="Nature of land is not in the reference vocabulary; "
                           "unusual-but-valid, verify against the scan.",
                    value=value, original_value=raw_value, comparison_value=upper,
                    evidence=_evidence_from_assessment(assessment)))

        # 14. EVIDENCE_BACKED -------------------------------------------------
        method = (assessment or {}).get("method")
        source_label = (assessment or {}).get("source_label")
        confidence = float((assessment or {}).get("confidence", 0.0) or 0.0)
        if not method and not source_label and confidence <= 0:
            checks.append(FieldValidationResult(
                field=field_name, status=ValidationFieldStatus.WARNING,
                severity=Severity.WARNING,
                rule=RuleCategory.EVIDENCE_BACKED,
                reason="A value is present but carries no extraction evidence "
                       "(method/label/confidence); treat as unverified.",
                value=value, original_value=raw_value,
                evidence=_evidence_from_assessment(assessment)))

        return checks

    # -- cross-field checks ---------------------------------------------------

    def _cross_field_checks(
        self,
        document_type: str,
        assessments: Dict[str, Dict[str, Any]],
    ) -> List[FieldValidationResult]:
        checks: List[FieldValidationResult] = []

        def present(field_name: str) -> Optional[Any]:
            assessment = assessments.get(field_name)
            if not assessment:
                return None
            value = assessment.get("value")
            if value is None:
                value = assessment.get("raw_value")
            if value is None or str(value).strip() == "":
                return None
            return value

        # 4. MEASUREMENT — area <-> area_unit pairing
        area = present("land.area")
        area_unit = present("land.area_unit")
        if area is not None and area_unit is None:
            checks.append(FieldValidationResult(
                field="land.area_unit", status=ValidationFieldStatus.INVALID,
                severity=Severity.ERROR, rule=RuleCategory.MEASUREMENT,
                reason="Area is present but its unit is missing; the measurement "
                       "cannot be interpreted.",
                value=None, original_value=None,
                evidence=["land.area present, land.area_unit absent"]))
        elif area is None and area_unit is not None:
            checks.append(FieldValidationResult(
                field="land.area", status=ValidationFieldStatus.WARNING,
                severity=Severity.WARNING, rule=RuleCategory.MEASUREMENT,
                reason="Area unit is present but no area value; cross-check the scan.",
                value=None, original_value=None,
                evidence=["land.area absent, land.area_unit present"]))

        # 5. CROSS_FIELD — mutation chronology
        doc_date = present("document.document_date")
        mutation_date = present("mutation.mutation_date")
        if doc_date and mutation_date:
            parsed_doc = _parse_date(doc_date)
            parsed_mut = _parse_date(mutation_date)
            if parsed_doc and parsed_mut and parsed_mut < parsed_doc:
                checks.append(FieldValidationResult(
                    field="mutation.mutation_date",
                    status=ValidationFieldStatus.CONFLICT,
                    severity=Severity.ERROR,
                    rule=RuleCategory.CROSS_FIELD,
                    reason="Mutation date predates the document date; mutation "
                           "cannot precede the instrument it modifies.",
                    value=mutation_date,
                    original_value=present("mutation.mutation_date"),
                    comparison_value=str(parsed_mut),
                    evidence=[f"document.document_date={doc_date}",
                              f"mutation.mutation_date={mutation_date}"]))

        # 10. MUTATION — completeness of the mutation block
        mutation_number = present("mutation.mutation_number")
        if mutation_number is not None and mutation_date is None:
            checks.append(FieldValidationResult(
                field="mutation.mutation_date",
                status=ValidationFieldStatus.WARNING,
                severity=Severity.WARNING,
                rule=RuleCategory.MUTATION,
                reason="Mutation number is present but the mutation date is missing; "
                       "mutation record is incomplete.",
                value=mutation_number, original_value=mutation_number,
                evidence=["mutation.mutation_number present, mutation_date absent"]))

        # 11. REGISTRATION — not-applicable-for-type but value present
        applicability = FIELD_APPLICABILITY.get(document_type, {})
        for reg_field in ("registration.document_number",
                          "registration.registration_date",
                          "registration.issue_date"):
            if applicability.get(reg_field) == "NOT_APPLICABLE" and present(reg_field) is not None:
                checks.append(FieldValidationResult(
                    field=reg_field, status=ValidationFieldStatus.WARNING,
                    severity=Severity.WARNING,
                    rule=RuleCategory.REGISTRATION,
                    reason="A value exists for a NOT_APPLICABLE registration field; "
                           "likely extraction leakage or a misapplied schema.",
                    value=present(reg_field),
                    original_value=present(reg_field),
                    evidence=[f"applicability={applicability.get(reg_field)}"]))

        # 12. DOCUMENT_METADATA — title/type consistency
        title = str(present("document.document_title") or "").lower()
        if document_type == "RECORD_OF_RIGHTS" and title and "record of rights" not in title:
            checks.append(FieldValidationResult(
                field="document.document_title",
                status=ValidationFieldStatus.WARNING,
                severity=Severity.WARNING,
                rule=RuleCategory.DOCUMENT_METADATA,
                reason="Document title does not echo the classified document type.",
                value=title, original_value=title,
                evidence=[f"document_type={document_type}",
                          f"document.document_title={title}"]))

        return checks

    # -- reference-data location hierarchy -------------------------------------

    def _location_hierarchy_checks(
        self,
        assessments: Dict[str, Dict[str, Any]],
    ) -> List[FieldValidationResult]:
        checks: List[FieldValidationResult] = []

        def present(field_name: str) -> Optional[str]:
            assessment = assessments.get(field_name)
            if not assessment:
                return None
            value = assessment.get("value") or assessment.get("raw_value")
            if value is None or str(value).strip() == "":
                return None
            return str(value).strip()

        state = present("location.state")
        district = present("location.district")
        block = present("location.block")
        mouza = present("location.mouza")
        if not (state or district or block or mouza):
            return checks

        reference: Optional[Dict[str, Any]] = self._load_reference_db()
        if reference is None:
            checks.append(FieldValidationResult(
                field="location.state",
                status=ValidationFieldStatus.WARNING,
                severity=Severity.WARNING,
                rule=RuleCategory.LOCATION_HIERARCHY,
                reason="Location hierarchy cannot be validated: no authoritative "
                       "reference database is configured "
                       f"(env {REFERENCE_DB_ENV}). Never fabricated.",
                value=state or district or block or mouza,
                original_value=state or district or block or mouza,
                evidence=[f"state={state}", f"district={district}",
                          f"block={block}", f"mouza={mouza}",
                          "reference_data=UNAVAILABLE"]))
            return checks

        if state:
            states = [s.casefold() for s in reference.get("states", {}).keys()]
            if states and state.casefold() not in states:
                checks.append(FieldValidationResult(
                    field="location.state",
                    status=ValidationFieldStatus.INVALID,
                    severity=Severity.ERROR,
                    rule=RuleCategory.LOCATION_HIERARCHY,
                    reason="State is not present in the authoritative reference.",
                    value=state, original_value=state,
                    evidence=[f"state={state}", "reference_data=LOADED"]))
        if state and district:
            districts = [d.casefold() for d in
                         reference.get("states", {}).get(state, {}).get("districts", [])]
            if districts and district.casefold() not in districts:
                checks.append(FieldValidationResult(
                    field="location.district",
                    status=ValidationFieldStatus.INVALID,
                    severity=Severity.ERROR,
                    rule=RuleCategory.LOCATION_HIERARCHY,
                    reason="District is not listed under the state in the reference.",
                    value=district, original_value=district,
                    evidence=[f"state={state}", f"district={district}",
                              "reference_data=LOADED"]))
        return checks

    def _load_reference_db(self) -> Optional[Dict[str, Any]]:
        if not self.reference_db_path:
            return None
        path = Path(self.reference_db_path)
        if not path.is_file():
            logger.warning("phase12: configured reference DB not found: %s", path)
            return None
        try:
            with open(path, encoding="utf-8") as handle:
                data = json.load(handle)
            return data if isinstance(data, dict) else None
        except Exception as exc:
            logger.warning("phase12: reference DB unreadable: %s", exc)
            return None

    # -- main evaluation -------------------------------------------------------

    def evaluate(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        phase08: Dict[str, Any],
        *,
        classification: Optional[Dict[str, Any]] = None,
        phase08_path: Optional[str] = None,
        reprocessing_id: Optional[str] = None,
        submission_id: Optional[str] = None,
        remediation_id: Optional[str] = None,
        attempt_number: Optional[int] = None,
    ) -> ValidationRunResult:
        t0 = time.time()
        run = ValidationRunResult(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            timestamps={"started_at": datetime.now(timezone.utc).isoformat()},
            input_reference={
                "source_phase": "PHASE_08",
                "record_id": record_id,
                "document_id": document_id,
                "ingestion_id": ingestion_id,
                **({"phase08_path": phase08_path} if phase08_path else {}),
                **({"reprocessing_id": reprocessing_id} if reprocessing_id else {}),
                **({"submission_id": submission_id} if submission_id else {}),
                **({"remediation_id": remediation_id} if remediation_id else {}),
            },
        )

        status = (phase08 or {}).get("status", "")
        if status in ("EXTRACTION_ERROR", "MODEL_UNAVAILABLE"):
            return run._mark_failed(
                ValidationErrorCode.PREVIOUS_PHASE_FAILED.value,
                f"Phase 08 did not produce a validatable assessment "
                f"(status={status}).",)

        document_type = (phase08 or {}).get("document_type", "UNKNOWN")
        run.document_type = document_type
        assessments: Dict[str, Dict[str, Any]] = (phase08 or {}).get("fields", {}) or {}

        applicability = FIELD_APPLICABILITY.get(document_type)
        if applicability is None:
            # No authoritative applicability matrix for this document type:
            # treat every canonical field as OPTIONAL (no hard failures) and
            # surface an honest reference-data warning.
            applicability = {}
            from src.phase07_semantic_field_extraction import ALL_CANONICAL_FIELDS
            applicability = {f: "OPTIONAL" for f in ALL_CANONICAL_FIELDS}
            for f in (phase08 or {}).get("fields", {}):
                applicability.setdefault(f, "OPTIONAL")

        checks: List[FieldValidationResult] = []
        fields_by_name: Dict[str, List[FieldValidationResult]] = {}
        for field_name in sorted(set(applicability) | set(assessments)):
            level = applicability.get(field_name, "OPTIONAL")
            assessment = assessments.get(field_name)
            base = _base_field_check(field_name, (assessment or {}), level)
            if base is None:
                if assessment:
                    value_checks = self._field_value_checks(field_name, assessment)
                    if value_checks:
                        checks.extend(value_checks)
                        fields_by_name.setdefault(field_name, []).extend(value_checks)
                    else:
                        checks.append(FieldValidationResult(
                            field=field_name,
                            status=ValidationFieldStatus.VALID,
                            severity=Severity.NONE,
                            rule=RuleCategory.APPLICABILITY_AWARE,
                            reason=f"Present and passes data-type/format/range checks "
                                   f"(applicability={level}).",
                            value=(assessment).get("value", assessment.get("raw_value")),
                            original_value=(assessment).get("raw_value"),
                            comparison_value=(assessment).get("value"),
                            evidence=_evidence_from_assessment(assessment)))
                        fields_by_name.setdefault(field_name, []).append(checks[-1])
            else:
                checks.append(base)
                fields_by_name.setdefault(field_name, []).append(base)

        cross = self._cross_field_checks(document_type, assessments)
        checks.extend(cross)
        for c in cross:
            fields_by_name.setdefault(c.field, []).append(c)
        loc = self._location_hierarchy_checks(assessments)
        checks.extend(loc)
        for c in loc:
            fields_by_name.setdefault(c.field, []).append(c)

        # --- Phase 10 anomaly + duplicate legs -----------------------------
        profile = build_record_profile(record_id, document_id, assessments)
        local_records = scan_local_dataset(self.dataset_dir)
        dup_status, matches = self.duplicate_engine.detect(profile, local_records)
        duplicates: Dict[str, Any] = {
            "status": dup_status.value,
            "scope": DUPLICATE_SCOPE_LOCAL_DATASET,
            "matched_records": [m.to_dict() for m in matches],
        }

        anomalies: List[Anomaly] = self.anomaly_engine.detect(
            assessments,
            document_type=document_type,
            classification=classification,
            duplicates=(dup_status, matches),
        )

        summary = ValidationSummary.from_checks(checks)

        # --- decision -------------------------------------------------------
        v_counts = Counter(c.severity.value for c in checks)
        a_counts = Counter(a.severity.value for a in anomalies)
        needs_review = bool((phase08 or {}).get("needs_review"))

        if v_counts[Severity.CRITICAL.value] or v_counts[Severity.ERROR.value]:
            decision = ValidationDecision.VALIDATION_FAILED
            decision_msg = ("Validation found blocking errors "
                            f"({v_counts[Severity.CRITICAL.value]} critical, "
                            f"{v_counts[Severity.ERROR.value]} error).")
        elif dup_status == DuplicateStatus.CONFIRMED:
            decision = ValidationDecision.BLOCKED
            decision_msg = (f"Confirmed duplicate against local dataset "
                            f"({len(matches)} match(es)); blocked until HITL "
                            f"adjudication.")
        elif dup_status == DuplicateStatus.SUSPECTED:
            decision = ValidationDecision.DUPLICATE_SUSPECTED
            decision_msg = (f"Duplicate suspected against local dataset "
                            f"({len(matches)} match(es)); review required.")
        elif a_counts[Severity.ERROR.value] or a_counts[Severity.CRITICAL.value]:
            decision = ValidationDecision.ANOMALY_DETECTED
            decision_msg = (f"Anomalies detected "
                            f"({a_counts[Severity.ERROR.value]} error, "
                            f"{a_counts[Severity.CRITICAL.value]} critical).")
        elif v_counts[Severity.WARNING.value] or a_counts[Severity.WARNING.value] or needs_review:
            decision = ValidationDecision.REVIEW_REQUIRED
            decision_msg = ("Human review required: warnings present "
                            f"({v_counts[Severity.WARNING.value]} validation, "
                            f"{a_counts[Severity.WARNING.value]} anomaly).")
        else:
            decision = ValidationDecision.READY_FOR_HITL
            decision_msg = ("No validation errors, anomalies or duplicates; record is "
                            "eligible for human-in-the-loop confirmation.")

        # --- remediation signal (never auto-triggers; Phase 09 decides) -----
        remediation_reasons: List[Dict[str, Any]] = []
        for c in checks:
            if c.status == ValidationFieldStatus.MISSING and c.severity in (
                    Severity.ERROR, Severity.CRITICAL):
                remediation_reasons.append({
                    "field": c.field,
                    "reason": RemediationReason.CRITICAL_FIELD_MISSING.value
                    if c.severity == Severity.CRITICAL
                    else RemediationReason.MISSING_FIELD.value,
                    "message": f"Required field {c.field} missing "
                               f"(severity {c.severity.value}).",
                })
            elif c.status == ValidationFieldStatus.UNREADABLE:
                remediation_reasons.append({
                    "field": c.field,
                    "reason": RemediationReason.UNREADABLE_FIELD.value,
                    "message": f"Required field {c.field} unreadable; clearer "
                               f"evidence is required.",
                })
            elif c.status == ValidationFieldStatus.CONFLICT:
                remediation_reasons.append({
                    "field": c.field,
                    "reason": RemediationReason.CONFLICTING_VALUES.value,
                    "message": f"Conflicting values for {c.field}; human review "
                               f"required.",
                })
            elif c.status == ValidationFieldStatus.INVALID:
                remediation_reasons.append({
                    "field": c.field,
                    "reason": RemediationReason.CRITICAL_FIELD_MISSING.value,
                    "message": f"Invalid value for {c.field}: {c.reason}",
                })

        remediation_required = bool(
            decision in (ValidationDecision.VALIDATION_FAILED,
                         ValidationDecision.ANOMALY_DETECTED)
            and any(
                r["reason"] in (
                    RemediationReason.CRITICAL_FIELD_MISSING.value,
                    RemediationReason.MISSING_FIELD.value,
                    RemediationReason.UNREADABLE_FIELD.value,
                    RemediationReason.CONFLICTING_VALUES.value,
                )
                for r in remediation_reasons
            )
        )
        remediation = {
            "required": remediation_required,
            "reasons": remediation_reasons,
            "next_phase": NEXT_PHASE,
        }

        run.validation_run_id = _gen_validation_run_id()
        run.status = "SUCCESS"
        run.needs_review = needs_review
        run.decision = decision.value
        run.summary = decision_msg
        run.next_phase = NEXT_PHASE
        run.validation_result = {
            "summary": summary.to_dict(),
            "fields": {name: [c.to_dict() for c in rows] for name, rows in fields_by_name.items()},
        }
        run.anomalies = [a.to_dict() for a in anomalies]
        run.duplicates = duplicates
        run.remediation = remediation
        run.hitl_1 = {
            "reason": "Phase 09 NEVER approves; every decision — including "
                      "READY_FOR_HITL — is handed to a human reviewer (Phase 11 HITL-1).",
            "handoff": {
                "record_id": record_id,
                "document_id": document_id,
                "validation_run_id": run.validation_run_id,
                "rules_version": RULES_VERSION,
                "decision": decision.value,
                "validation_summary": summary.to_dict(),
                "anomaly_count": len(anomalies),
                "duplicate_status": dup_status.value,
                "duplicate_matches": len(matches),
            },
            "status": "PENDING_HUMAN_REVIEW",
        }
        run.models = {"rule_engine": "DETERMINISTIC", "llm_used": False, "rules_version": RULES_VERSION}
        run.timestamps["completed_at"] = datetime.now(timezone.utc).isoformat()
        run.processing_time_seconds = round(time.time() - t0, 4)

        logger.info(
            "Phase 09 complete: record_id=%s decision=%s checks=%d anomalies=%d dup=%s",
            record_id, run.decision, summary.total_checks, len(anomalies), dup_status.value,
        )
        return run

def _gen_validation_run_id() -> str:
    return f"VLD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:10]}"
