"""
Automated Validation gate tests (authoritative Phase 09 implementation).

Engine + service + hermetic API + real RoR (disk fixture) + Phase 10 handoff.

Key invariants asserted throughout:
    * Phase 09 never approves — every decision goes to PHASE_10_ANOMALY_DUPLICATE_DETECTION.
    * Extracted values are never mutated (original_value preserved).
    * NOT_APPLICABLE fields are never treated as missing.
    * Without a reference DB location checks surface REFERENCE_DATA_UNAVAILABLE.
"""

import json
from pathlib import Path

import pytest

from src.phase09_automated_validation import (
    NEXT_PHASE,
    AutomatedValidationEngine,
    AutomatedValidationService,
    RuleCategory,
    ValidationDecision,
    ValidationErrorCode,
    ValidationFieldStatus,
    ValidationRunResult,
    get_automated_validation_service,
)
from src.phase10_anomaly_duplicate_detection import (
    DuplicateDetectionEngine,
    DuplicateMatchType,
    DuplicateStatus,
    build_record_profile,
    normalize_identifier,
    normalize_name,
    numeric_core,
    compare_name,
)
from src.phase08_confidence_completeness import FieldValueStatus


# ---------------------------------------------------------------------------
# Fixture builders (deterministic; do NOT collide with the real dataset)
# ---------------------------------------------------------------------------

def _assessment(value_status, value=None, raw_value=None, confidence=0.0,
                method="DETERMINISTIC", source_label=None, source_page=1,
                in_conflict=False, conflict_alternatives=None):
    result = {
        "field_name": "",
        "value_status": value_status,
        "confidence": confidence,
        "priority": "IMPORTANT",
        "confidence_factors": [],
        "in_conflict": in_conflict,
        "conflict_alternatives": conflict_alternatives or [],
    }
    if value is not None:
        result["value"] = value
    if raw_value is not None:
        result["raw_value"] = raw_value
    if value is not None:
        result.setdefault("raw_value", value)
    if method:
        result["method"] = method
    if source_label:
        result["source_label"] = source_label
    if source_page:
        result["source_page"] = source_page
    return result


PRESENT = FieldValueStatus.REQUIRED_AND_PRESENT.value
OPT_PRESENT = FieldValueStatus.OPTIONAL_AND_PRESENT.value
NOT_APP = FieldValueStatus.NOT_APPLICABLE.value


def clean_ror_fields(**overrides):
    """A fully-valid RECORD_OF_RIGHTS fields map (registration omitted so the
    NOT_APPLICABLE-absent edge is exercised)."""
    fields = {
        "owner.name": _assessment(PRESENT, "Ramesh Chandra Saha", confidence=0.91,
                                  source_label="owner.name"),
        "owner.father_husband_name": _assessment(PRESENT, "Haripada Saha",
                                                 confidence=0.85, source_label="owner.father_husband_name"),
        "owner.recorded_tenant": _assessment(PRESENT, "Safikul Islam",
                                             confidence=0.8, source_label="owner.recorded_tenant"),
        "land.plot_number": _assessment(PRESENT, "886", confidence=0.92,
                                        source_label="land.plot_number"),
        "land.khata_number": _assessment(PRESENT, "995", confidence=0.92,
                                         source_label="land.khata_number"),
        "land.area": _assessment(PRESENT, "0.50", confidence=0.9,
                                 source_label="land.area"),
        "land.area_unit": _assessment(PRESENT, "ACRE", confidence=0.9,
                                      source_label="land.area_unit"),
        "land.nature_of_land": _assessment(PRESENT, "HOMESTEAD", confidence=0.85,
                                           source_label="land.nature_of_land"),
        "location.state": _assessment(PRESENT, "West Bengal", confidence=0.9,
                                      source_label="location.state"),
        "location.district": _assessment(PRESENT, "Nadia", confidence=0.9,
                                         source_label="location.district"),
        "location.block": _assessment(PRESENT, "Krishnanagar-I", confidence=0.9,
                                      source_label="location.block"),
        "location.mouza": _assessment(PRESENT, "Mohisamura", confidence=0.85,
                                      source_label="location.mouza"),
        "document.document_title": _assessment(PRESENT, "Record of Rights (RoR)",
                                               confidence=0.9, source_label="document.document_title"),
        "document.department": _assessment(PRESENT, "Land and Land Reforms Department",
                                           confidence=0.88, source_label="document.department"),
        "document.document_date": _assessment(PRESENT, "2023-07-15", confidence=0.9,
                                              source_label="document.document_date"),
        # OPTIONAL present
        "owner.co_owner": _assessment(OPT_PRESENT, "Basanti Saha", confidence=0.7,
                                      source_label="owner.co_owner"),
        "land.survey_number": _assessment(OPT_PRESENT, "441", confidence=0.75,
                                          source_label="land.survey_number"),
        "land.khasra_number": _assessment(OPT_PRESENT, "995/886", confidence=0.75,
                                          source_label="land.khasra_number"),
        "land.land_type": _assessment(OPT_PRESENT, "BASTU", confidence=0.7,
                                      source_label="land.land_type"),
        "location.tehsil": _assessment(OPT_PRESENT, "Krishnanagar", confidence=0.8,
                                       source_label="location.tehsil"),
        "location.village": _assessment(OPT_PRESENT, "Bantola", confidence=0.8,
                                        source_label="location.village"),
        "document.map_number": _assessment(OPT_PRESENT, "M-88", confidence=0.7,
                                           source_label="document.map_number"),
        "mutation.mutation_number": _assessment(OPT_PRESENT, "8844", confidence=0.8,
                                                source_label="mutation.mutation_number"),
        "mutation.mutation_date": _assessment(OPT_PRESENT, "2023-09-02", confidence=0.8,
                                              source_label="mutation.mutation_date"),
    }
    for key, patch in overrides.items():
        if patch is None:
            fields.pop(key, None)
        else:
            fields[key] = patch
    return fields


def clean_ror(record_id="LR-TEST-0001", document_id="DOC-TEST-0001",
              ingestion_id="ING-TEST-0001", fields=None, status="REVIEW_REQUIRED"):
    return {
        "record_id": record_id,
        "document_id": document_id,
        "ingestion_id": ingestion_id,
        "status": status,
        "document_type": "RECORD_OF_RIGHTS",
        "fields": fields if fields is not None else clean_ror_fields(),
        "needs_review": False,
    }


def _write_reference_db(tmp_path, states=None):
    db = tmp_path / "reference.json"
    db.write_text(json.dumps(states or {
        "states": {"West Bengal": {"districts": ["Nadia", "Darjeeling"]}}
    }), encoding="utf-8")
    return str(db)


def _engine(tmp_path, db=None, dataset=None):
    return AutomatedValidationEngine(
        reference_db_path=db,
        dataset_dir=Path(dataset) if dataset else tmp_path,
    )


def _row_field(run, field_name):
    rows = run.validation_result["fields"].get(field_name) or []
    return rows


def _rows(run, field_name):
    return _row_field(run, field_name)


def _all_rows(run):
    return [c for rows in run.validation_result["fields"].values() for c in rows]


# ---------------------------------------------------------------------------
# 1. Contracts & constants
# ---------------------------------------------------------------------------

class TestContracts:
    def test_next_phase_is_phase_10_anomaly_duplicate(self):
        # Pipeline 01->11: validation hands off to Phase 10, then HITL-1.
        assert NEXT_PHASE == "PHASE_10_ANOMALY_DUPLICATE_DETECTION"

    def test_decision_enum_never_approves(self):
        values = {v.value for v in ValidationDecision}
        assert "APPROVED" not in values
        assert "APPROVE" not in values
        for expected in ("READY_FOR_HITL", "REVIEW_REQUIRED", "VALIDATION_FAILED",
                         "ANOMALY_DETECTED", "DUPLICATE_SUSPECTED", "BLOCKED"):
            assert expected in values

    def test_factory_returns_service(self):
        assert isinstance(get_automated_validation_service(), AutomatedValidationService)

    def test_rules_version_set(self):
        assert get_automated_validation_service().engine
        run = _run_manual(clean_ror(), "LR-TEST-0001", None, Path("."))
        assert run.rules_version == "1.0.0"


def _run_manual(phase08, record_id, db_path, dataset_dir,
                reprocessing_id=None, submission_id=None, remediation_id=None):
    engine = AutomatedValidationEngine(
        reference_db_path=db_path,
        dataset_dir=Path(dataset_dir) if dataset_dir else Path("."),
    )
    return engine.evaluate(
        record_id=phase08.get("record_id") or record_id,
        document_id=phase08.get("document_id", "DOC"),
        ingestion_id=phase08.get("ingestion_id", "ING"),
        phase08=phase08,
        classification=None,
        phase08_path=None,
        reprocessing_id=reprocessing_id,
        submission_id=submission_id,
        remediation_id=remediation_id,
    )


# ---------------------------------------------------------------------------
# 2. Clean path + reference data
# ---------------------------------------------------------------------------

class TestCleanPath:
    def test_reference_data_unavailable_surfaces_warning(self, tmp_path):
        run = _run_manual(clean_ror(), "LR-TEST-0001", None, tmp_path)
        assert isinstance(run, ValidationRunResult)
        assert run.status == "SUCCESS"
        assert run.decision == ValidationDecision.REVIEW_REQUIRED.value
        assert run.next_phase == NEXT_PHASE
        # honestly surfaced, never fabricated
        state_rows = _rows(run, "location.state")
        assert any(r["rule"] == RuleCategory.LOCATION_HIERARCHY.value and
                   r["status"] == ValidationFieldStatus.WARNING.value
                   for r in state_rows)
        assert any("reference_data=UNAVAILABLE" in " ".join(r.get("evidence", []))
                   for r in state_rows)
        assert run.validation_result["summary"]["warning"] >= 1

    def test_clean_record_with_reference_db_is_ready_for_hitl(self, tmp_path):
        db = _write_reference_db(tmp_path)
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        assert run.decision == ValidationDecision.READY_FOR_HITL.value
        assert run.next_phase == NEXT_PHASE
        summary = run.validation_result["summary"]
        assert summary["error"] == 0
        assert summary["critical"] == 0
        assert summary["warning"] == 0
        # 15 REQUIRED + 10 OPTIONAL (one absent->INFO) + 3 NOT_APPLICABLE
        assert summary["total_checks"] == 28
        assert summary["passed"] == 27
        assert summary["not_applicable"] == 3

    def test_not_applicable_fields_absent_from_assessment_are_not_missing(self, tmp_path):
        db = _write_reference_db(tmp_path)
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        for reg_field in ("registration.document_number",
                          "registration.registration_date",
                          "registration.issue_date"):
            rows = _rows(run, reg_field)
            assert rows, f"{reg_field} should produce a base row"
            assert rows[0]["status"] == ValidationFieldStatus.NOT_APPLICABLE.value
            assert rows[0]["severity"] == "NONE"
            assert "MISSING" not in rows[0]["status"]

    def test_values_never_mutated(self, tmp_path):
        db = _write_reference_db(tmp_path)
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        area_rows = _rows(run, "land.area")
        assert area_rows
        assert area_rows[0]["value"] == "0.50"
        assert area_rows[0]["original_value"] == "0.50"

    def test_deterministic_repeat(self, tmp_path):
        db = _write_reference_db(tmp_path)
        a = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        b = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        assert a.decision == b.decision == ValidationDecision.READY_FOR_HITL.value
        assert a.to_dict()["validation_result"] == b.to_dict()["validation_result"]
        assert a.anomalies == b.anomalies


# ---------------------------------------------------------------------------
# 3. Required presence
# ---------------------------------------------------------------------------

class TestRequiredPresence:
    def test_missing_required_field_is_error_and_fails(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["owner.name"] = _assessment(FieldValueStatus.REQUIRED_BUT_MISSING.value)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "owner.name")
        assert rows[0]["status"] == ValidationFieldStatus.MISSING.value
        assert rows[0]["severity"] in ("ERROR", "CRITICAL")
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value
        assert run.next_phase == NEXT_PHASE

    def test_missing_optional_field_is_info_not_error(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["owner.co_owner"] = None  # absent assessment, OPTIONAL applicability
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "owner.co_owner")
        assert rows[0]["status"] == ValidationFieldStatus.MISSING.value
        assert rows[0]["severity"] == "INFO"
        assert run.decision == ValidationDecision.READY_FOR_HITL.value

    def test_unreadable_required_field_triggers_remediation(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["owner.name"] = _assessment(FieldValueStatus.REQUIRED_BUT_UNREADABLE.value,
                                           confidence=0.3)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "owner.name")
        assert rows[0]["status"] == ValidationFieldStatus.UNREADABLE.value
        assert rows[0]["severity"] == "ERROR"
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value
        assert run.remediation["required"] is True
        reasons = {r["field"]: r["reason"] for r in run.remediation["reasons"]}
        assert reasons["owner.name"] == "UNREADABLE_FIELD"

    def test_conflict_field_never_auto_resolved(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["owner.father_husband_name"] = _assessment(
            FieldValueStatus.CONFLICTING.value, "Haripada Saha", confidence=0.5,
            in_conflict=True,
            conflict_alternatives=[
                {"value": "Haripada Saha", "confidence": 0.5},
                {"value": "Late Haripada Saha", "confidence": 0.49},
            ])
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "owner.father_husband_name")
        assert rows[0]["status"] == ValidationFieldStatus.CONFLICT.value
        assert rows[0]["severity"] == "ERROR"
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value
        reasons = {r["field"]: r["reason"] for r in run.remediation["reasons"]}
        assert reasons["owner.father_husband_name"] == "CONFLICTING_VALUES"


# ---------------------------------------------------------------------------
# 4. Data type / format / range / measurement
# ---------------------------------------------------------------------------

class TestValueChecks:
    def test_non_numeric_area(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["land.area"] = _assessment(PRESENT, "fifty cents", "fifty cents",
                                          confidence=0.6, source_label="land.area")
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "land.area")
        assert rows[0]["status"] == ValidationFieldStatus.INVALID.value
        assert rows[0]["rule"] == RuleCategory.DATA_TYPE.value
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value

    def test_negative_area(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["land.area"] = _assessment(PRESENT, "-3", "-3", confidence=0.6)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "land.area")
        assert rows[0]["status"] == ValidationFieldStatus.INVALID.value
        assert rows[0]["rule"] == RuleCategory.RANGE.value
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value

    def test_identifier_requires_digit(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["land.plot_number"] = _assessment(PRESENT, "A-PLOT", "A-PLOT",
                                                 confidence=0.6)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "land.plot_number")
        assert rows[0]["status"] == ValidationFieldStatus.INVALID.value
        assert rows[0]["rule"] == RuleCategory.FORMAT.value
        assert rows[0]["comparison_value"] == "APLOT"
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value

    def test_invalid_date_format(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["document.document_date"] = _assessment(PRESENT, "not-a-date",
                                                       "not-a-date", confidence=0.6)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "document.document_date")
        assert rows[0]["status"] == ValidationFieldStatus.INVALID.value
        assert rows[0]["rule"] == RuleCategory.FORMAT.value
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value

    def test_future_date(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["document.document_date"] = _assessment(PRESENT, "2126-01-01",
                                                       "2126-01-01", confidence=0.6)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "document.document_date")
        assert rows[0]["status"] == ValidationFieldStatus.INVALID.value
        assert rows[0]["rule"] == RuleCategory.RANGE.value

    def test_area_without_unit_is_measurement_error(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["land.area_unit"] = None
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "land.area_unit")
        assert any(r["rule"] == RuleCategory.MEASUREMENT.value and
                   r["status"] == ValidationFieldStatus.INVALID.value for r in rows)
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value

    def test_area_unit_unknown_is_warning_not_error(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["land.area_unit"] = _assessment(PRESENT, "GOLD-PLOTS", "GOLD-PLOTS",
                                               confidence=0.6)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "land.area_unit")
        assert rows[0]["status"] == ValidationFieldStatus.WARNING.value
        assert rows[0]["rule"] == RuleCategory.ENUM_CONTROLLED_VALUE.value
        assert run.decision == ValidationDecision.REVIEW_REQUIRED.value

    def test_nature_of_land_unknown_is_warning(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["land.nature_of_land"] = _assessment(PRESENT, "EMINENT DOMAIN",
                                                    "EMINENT DOMAIN", confidence=0.6)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "land.nature_of_land")
        assert rows[0]["status"] == ValidationFieldStatus.WARNING.value
        assert rows[0]["rule"] == RuleCategory.ENUM_CONTROLLED_VALUE.value


# ---------------------------------------------------------------------------
# 5. Cross-field / consistency
# ---------------------------------------------------------------------------

class TestCrossField:
    def test_mutation_before_document_date_is_conflict(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["mutation.mutation_date"] = _assessment(OPT_PRESENT, "2019-01-01",
                                                       "2019-01-01", confidence=0.8)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "mutation.mutation_date")
        assert any(r["rule"] == RuleCategory.CROSS_FIELD.value and
                   r["status"] == ValidationFieldStatus.CONFLICT.value for r in rows)
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value

    def test_mutation_number_without_date_is_warning(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["mutation.mutation_date"] = None
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "mutation.mutation_date")
        assert any(r["rule"] == RuleCategory.MUTATION.value and
                   r["status"] == ValidationFieldStatus.WARNING.value for r in rows)
        assert run.decision == ValidationDecision.REVIEW_REQUIRED.value

    def test_not_applicable_registration_value_is_warning(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["registration.document_number"] = _assessment(
            NOT_APP, "REG-90210", "REG-90210", confidence=0.6)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "registration.document_number")
        assert any(r["rule"] == RuleCategory.REGISTRATION.value and
                   r["status"] == ValidationFieldStatus.WARNING.value for r in rows)

    def test_title_type_mismatch_is_warning(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["document.document_title"] = _assessment(PRESENT, "Tax Receipt",
                                                        "Tax Receipt", confidence=0.9)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "document.document_title")
        assert any(r["rule"] == RuleCategory.DOCUMENT_METADATA.value and
                   r["status"] == ValidationFieldStatus.WARNING.value for r in rows)
        assert run.decision == ValidationDecision.REVIEW_REQUIRED.value

    def test_evidence_backed_warning_for_unsourced_value(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["land.area"] = _assessment(PRESENT, "0.50", "0.50",
                                          confidence=0.0, method=None,
                                          source_label=None)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "land.area")
        assert any(r["rule"] == RuleCategory.EVIDENCE_BACKED.value and
                   r["status"] == ValidationFieldStatus.WARNING.value for r in rows)


# ---------------------------------------------------------------------------
# 6. Reference-data hierarchy
# ---------------------------------------------------------------------------

class TestLocationHierarchy:
    def test_state_not_in_reference_is_error(self, tmp_path):
        db = _write_reference_db(tmp_path, {
            "states": {"Punjab": {"districts": ["Ludhiana"]}}})
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "location.state")
        assert any(r["rule"] == RuleCategory.LOCATION_HIERARCHY.value and
                   r["status"] == ValidationFieldStatus.INVALID.value for r in rows)
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value

    def test_district_not_under_state_is_error(self, tmp_path):
        db = _write_reference_db(tmp_path, {
            "states": {"West Bengal": {"districts": ["Darjeeling"]}}})
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        rows = _rows(run, "location.district")
        assert any(r["rule"] == RuleCategory.LOCATION_HIERARCHY.value and
                   r["status"] == ValidationFieldStatus.INVALID.value for r in rows)

    def test_configured_but_unreadable_db_is_reference_unavailable(self, tmp_path):
        missing = tmp_path / "nope.json"
        run = _run_manual(clean_ror(), "LR-TEST-0001", str(missing), tmp_path)
        assert run.decision == ValidationDecision.REVIEW_REQUIRED.value
        state_rows = _rows(run, "location.state")
        assert any("reference_data=UNAVAILABLE" in " ".join(r.get("evidence", []))
                   for r in state_rows)


# ---------------------------------------------------------------------------
# 7. Duplicate detection (local dataset scans)
# ---------------------------------------------------------------------------

def _write_phase08_record(dataset_dir, record_id, document_id, fields):
    rec_dir = Path(dataset_dir) / record_id
    rec_dir.mkdir(parents=True, exist_ok=True)
    path = rec_dir / f"{document_id}_confidence_completeness.json"
    path.write_text(json.dumps(clean_ror(record_id, document_id, f"ING-{record_id}",
                                         fields=fields)), encoding="utf-8")
    return path


class TestDuplicates:
    def test_duplicate_record_confirmed_blocks(self, tmp_path):
        db = _write_reference_db(tmp_path)
        seed = clean_ror_fields()
        seed["land.khata_number"] = _assessment(PRESENT, "995", "995", confidence=0.92)
        seed["land.plot_number"] = _assessment(PRESENT, "886", "886", confidence=0.92)
        seed["owner.name"] = _assessment(PRESENT, "Ramesh Chandra Saha",
                                         "Ramesh Chandra Saha", confidence=0.91)
        _write_phase08_record(tmp_path, "LR-SEED-0001", "DOC-SEED-0001", seed)
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        assert run.duplicates["status"] == DuplicateStatus.CONFIRMED.value
        assert run.decision == ValidationDecision.BLOCKED.value
        assert run.next_phase == NEXT_PHASE
        matches = run.duplicates["matched_records"]
        assert matches[0]["matched_record_id"] == "LR-SEED-0001"
        assert matches[0]["match_type"] == DuplicateMatchType.RECORD.value
        assert matches[0]["confidence"] >= 0.9
        assert matches[0]["fuzzy"] is False

    def test_duplicate_record_suspected_not_blocked(self, tmp_path):
        db = _write_reference_db(tmp_path)
        seed = clean_ror_fields()
        seed["land.khata_number"] = _assessment(PRESENT, "995", "995", confidence=0.92)
        seed["land.plot_number"] = _assessment(PRESENT, "886", "886", confidence=0.92)
        seed["owner.name"] = _assessment(PRESENT, "Differing Owner",
                                         "Differing Owner", confidence=0.91)
        _write_phase08_record(tmp_path, "LR-SEED-0001", "DOC-SEED-0001", seed)
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        assert run.duplicates["status"] == DuplicateStatus.SUSPECTED.value
        assert run.decision == ValidationDecision.DUPLICATE_SUSPECTED.value
        matches = run.duplicates["matched_records"]
        assert matches[0]["confidence"] < 0.9

    def test_identifier_duplicate_suspected(self, tmp_path):
        db = _write_reference_db(tmp_path)
        seed = clean_ror_fields()
        seed["land.khata_number"] = _assessment(PRESENT, "500", "500", confidence=0.92)
        seed["land.plot_number"] = _assessment(PRESENT, "610", "610", confidence=0.92)
        seed["mutation.mutation_number"] = _assessment(OPT_PRESENT, "8844",
                                                       "8844", confidence=0.8)
        _write_phase08_record(tmp_path, "LR-SEED-0002", "DOC-SEED-0002", seed)
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        assert run.duplicates["status"] == DuplicateStatus.SUSPECTED.value
        assert run.decision == ValidationDecision.DUPLICATE_SUSPECTED.value
        matches = run.duplicates["matched_records"]
        assert matches[0]["match_type"] == DuplicateMatchType.IDENTIFIER.value

    def test_fuzzy_identifier_overlap_is_review_signal(self):
        # Unit-level: two identifiers overlap only by numeric core -> a fuzzy
        # review hint, never a confirmed duplicate.
        def profile(record_id, khata, plot, owner, mut):
            fields = {
                "land.khata_number": _assessment(PRESENT, khata, khata, confidence=0.9),
                "land.plot_number": _assessment(PRESENT, plot, plot, confidence=0.9),
                "owner.name": _assessment(PRESENT, owner, owner, confidence=0.9),
                "mutation.mutation_number": _assessment(OPT_PRESENT, mut, mut, confidence=0.8),
            }
            return build_record_profile(record_id, f"DOC-{record_id}", fields)

        current = profile("LR-TEST-0001", "45/A", "112B", "Ramesh Chandra Saha", "8844")
        seed = profile("LR-SEED-0003", "45", "112", "Someone Else", "9999")
        engine = DuplicateDetectionEngine()
        status, matches = engine.detect(current, [seed])
        assert status == DuplicateStatus.SUSPECTED
        assert len(matches) == 1
        assert matches[0].fuzzy is True
        assert matches[0].match_type == DuplicateMatchType.COMPOSITE
        assert any(m.get("match") == "numeric_core" for m in matches[0].evidence)

    def test_self_is_never_a_duplicate(self, tmp_path):
        db = _write_reference_db(tmp_path)
        _write_phase08_record(tmp_path, "LR-TEST-0001", "DOC-TEST-0001",
                              clean_ror_fields())
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        assert run.duplicates["status"] == DuplicateStatus.CLEAR.value


# ---------------------------------------------------------------------------
# 8. Anomaly categories (Phase 13 engine contracts)
# ---------------------------------------------------------------------------

class TestAnomalyCategories:
    def test_mutation_without_owner_is_anomaly(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["owner.name"] = None
        fields["mutation.mutation_number"] = _assessment(OPT_PRESENT, "550",
                                                         "550", confidence=0.8)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        categories = {a["category"] for a in run.anomalies}
        assert "MUTATION_CONFLICT" in categories
        assert "OWNERSHIP_CONFLICT" not in categories

    def test_repeated_value_across_fields_is_error(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        # spread the same value across >= 5 canonical fields -> suspicious
        shared = "455"
        for name in ("location.block", "location.mouza", "location.tehsil",
                     "location.village", "document.map_number", "owner.co_owner"):
            if name in fields:
                fields[name] = _assessment(OPT_PRESENT, shared, shared, confidence=0.7)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        categories = {a["category"] for a in run.anomalies}
        assert "SUSPICIOUS_REPEATED_VALUES" in categories
        anomaly = next(a for a in run.anomalies
                       if a["category"] == "SUSPICIOUS_REPEATED_VALUES")
        assert anomaly["severity"] == "ERROR"

    def test_conflicting_semantic_candidates_surface(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["owner.father_husband_name"] = _assessment(
            FieldValueStatus.CONFLICTING.value, "Haripada Saha", confidence=0.8,
            in_conflict=True,
            conflict_alternatives=[
                {"value": "Haripada Saha", "confidence": 0.5},
                {"value": "Late Haripada Saha", "confidence": 0.49},
            ])
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        categories = {a["category"] for a in run.anomalies}
        assert "CONFLICTING_SEMANTIC_CANDIDATES" in categories

    def test_unusual_but_valid_large_identifier_is_info(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        fields["land.plot_number"] = _assessment(PRESENT, "99999999",
                                                 "99999999", confidence=0.92)
        fields["location.block"] = _assessment(PRESENT, "Krishnanagar-I",
                                               "Krishnanagar-I", confidence=0.9)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        categories = {a["category"]: a for a in run.anomalies}
        assert "UNUSUAL_BUT_VALID" in categories
        assert categories["UNUSUAL_BUT_VALID"]["severity"] == "INFO"
        assert "field" in categories["UNUSUAL_BUT_VALID"]

    def test_clean_record_has_no_anomalies(self, tmp_path):
        db = _write_reference_db(tmp_path)
        run = _run_manual(clean_ror(), "LR-TEST-0001", db, tmp_path)
        assert run.anomalies == []


# ---------------------------------------------------------------------------
# 9. Normalizers (comparison only, never mutate originals)
# ---------------------------------------------------------------------------

class TestNormalizers:
    def test_normalize_identifier_collapses_separators(self):
        assert normalize_identifier("KH-456") == "KH456"
        assert normalize_identifier("KH 456") == "KH456"
        assert normalize_identifier("kh/456") == "KH456"
        assert normalize_identifier("Plot#12") == "PLOT12"

    def test_normalize_identifier_handles_unicode(self):
        assert normalize_identifier("１２３") == "123"  # full-width

    def test_numeric_core_first_digit_group(self):
        assert numeric_core("P-112") == 112
        assert numeric_core("112B") == 112
        assert numeric_core("no digits") is None

    def test_normalize_name_is_casefolded(self):
        assert normalize_name("Ramesh Chandra Saha") == normalize_name("ramesh chandra saha")

    def test_compare_name_script_stable(self):
        assert compare_name("রমেশ চন্দ্র সাহা", "রমেশ চন্দ্র সাহা") is True
        assert compare_name("Ramesh Chandra Saha", "Safikul Islam") is False

    def test_profile_normalization_is_comparison_only(self):
        fields = {
            "land.plot_number": _assessment(PRESENT, "P-112", "P-112",
                                            confidence=0.9, source_label="x"),
            "owner.name": _assessment(PRESENT, "Ramesh Chandra Saha",
                                      "Ramesh Chandra Saha", confidence=0.9, source_label="x"),
        }
        profile = build_record_profile("LR-X", "DOC-X", fields)
        assert profile["present"]["land.plot_number"] == "P-112"
        assert profile["canonical"]["land.plot_number"] == "P112"
        assert profile["identifiers"]["land.plot_number"] == "P112"
        assert fields["land.plot_number"]["value"] == "P-112"  # untouched


# ---------------------------------------------------------------------------
# 10. Decision precedence
# ---------------------------------------------------------------------------

class TestDecisionPrecedence:
    def test_validation_error_beats_duplicate(self, tmp_path):
        db = _write_reference_db(tmp_path)
        seed = clean_ror_fields()
        seed["land.khata_number"] = _assessment(PRESENT, "995", "995", confidence=0.92)
        seed["land.plot_number"] = _assessment(PRESENT, "886", "886", confidence=0.92)
        seed["owner.name"] = _assessment(PRESENT, "Ramesh Chandra Saha",
                                         "Ramesh Chandra Saha", confidence=0.91)
        _write_phase08_record(tmp_path, "LR-SEED-0001", "DOC-SEED-0001", seed)
        fields = clean_ror_fields()
        # owner stays readable (so khata+plot+owner = 0.94 confirmed), but the
        # area is invalid -> a validation ERROR dominates the confirmed duplicate
        fields["land.area"] = _assessment(PRESENT, "not-a-number", "not-a-number",
                                          confidence=0.6)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        assert run.duplicates["status"] == DuplicateStatus.CONFIRMED.value
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value

    def test_suspected_duplicate_beats_anomaly_errors(self, tmp_path):
        db = _write_reference_db(tmp_path)
        seed = clean_ror_fields()
        seed["land.khata_number"] = _assessment(PRESENT, "995", "995", confidence=0.92)
        seed["land.plot_number"] = _assessment(PRESENT, "886", "886", confidence=0.92)
        seed["owner.name"] = _assessment(PRESENT, "Differing Owner",
                                         "Differing Owner", confidence=0.91)
        _write_phase08_record(tmp_path, "LR-SEED-0001", "DOC-SEED-0001", seed)
        fields = clean_ror_fields()
        shared = "999"
        for name in ("location.block", "location.mouza", "location.tehsil",
                     "location.village", "document.map_number"):
            if name in fields:
                fields[name] = _assessment(OPT_PRESENT, shared, shared, confidence=0.7)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        # SUSPICIOUS_REPEATED_VALUES ERROR exists, but SUSPECTED duplicate
        # precedes anomaly errors in the decision order.
        assert run.duplicates["status"] == DuplicateStatus.SUSPECTED.value
        assert any(a["severity"] == "ERROR" for a in run.anomalies)
        assert run.decision == ValidationDecision.DUPLICATE_SUSPECTED.value

    def test_anomaly_error_beats_warnings(self, tmp_path):
        db = _write_reference_db(tmp_path)
        fields = clean_ror_fields()
        shared = "999"
        for name in ("location.block", "location.mouza", "location.tehsil",
                     "location.village", "document.map_number"):
            if name in fields:
                fields[name] = _assessment(OPT_PRESENT, shared, shared, confidence=0.7)
        run = _run_manual(clean_ror(fields=fields), "LR-TEST-0001", db, tmp_path)
        # SUSPICIOUS_REPEATED_VALUES ERROR -> ANOMALY_DETECTED
        assert run.decision == ValidationDecision.ANOMALY_DETECTED.value


# ---------------------------------------------------------------------------
# 11. Engine failure paths
# ---------------------------------------------------------------------------

class TestFailurePaths:
    def test_extraction_error_blocks(self, tmp_path):
        engine = AutomatedValidationEngine(dataset_dir=tmp_path)
        run = engine.evaluate("LR-TEST-0001", "DOC-TEST-0001", "ING-TEST-0001",
                              phase08={"status": "EXTRACTION_ERROR", "document_type": "RECORD_OF_RIGHTS",
                                       "fields": {}})
        assert run.status == "FAILED"
        assert run.decision == ValidationDecision.BLOCKED.value
        assert run.error_code == ValidationErrorCode.PREVIOUS_PHASE_FAILED.value
        assert run.next_phase == ""

    def test_model_unavailable_blocks(self, tmp_path):
        engine = AutomatedValidationEngine(dataset_dir=tmp_path)
        run = engine.evaluate("LR-TEST-0001", "DOC-TEST-0001", "ING-TEST-0001",
                              phase08={"status": "MODEL_UNAVAILABLE", "document_type": "RECORD_OF_RIGHTS",
                                       "fields": {}})
        assert run.status == "FAILED"
        assert run.decision == ValidationDecision.BLOCKED.value

    def test_unknown_document_type_all_optional(self, tmp_path):
        db = _write_reference_db(tmp_path)
        engine = AutomatedValidationEngine(reference_db_path=db, dataset_dir=tmp_path)
        phase08 = {
            "status": "REVIEW_REQUIRED",
            "document_type": "MYSTERY_FORM",
            "fields": {"owner.name": _assessment(PRESENT, "Ramesh Chandra Saha", confidence=0.9)},
        }
        run = engine.evaluate("LR-TEST-0001", "DOC-TEST-0001", "ING-TEST-0001", phase08=phase08)
        # everything OPTIONAL -> everything MISSING is INFO; no errors -> HITL
        assert run.decision == ValidationDecision.READY_FOR_HITL.value


# ---------------------------------------------------------------------------
# 12. Service layer + Phase 11 handoff
# ---------------------------------------------------------------------------

class TestService:
    def test_phase08_not_found_fails(self, tmp_path):
        svc = AutomatedValidationService(storage_dir=tmp_path / "p12",
                                         phase08_dir=tmp_path / "p08",
                                         phase11_dir=tmp_path / "p11")
        run = svc.evaluate("LR-NOPE", "DOC-NOPE", "ING-NOPE")
        assert run.status == "FAILED"
        assert run.error_code == ValidationErrorCode.PHASE_08_RESULT_NOT_FOUND.value
        assert run.decision == ValidationDecision.BLOCKED.value

    def test_phase11_run_not_found_fails(self, tmp_path):
        svc = AutomatedValidationService(storage_dir=tmp_path / "p12",
                                         phase08_dir=tmp_path / "p08",
                                         phase11_dir=tmp_path / "p11")
        run = svc.evaluate("LR-NOPE", "DOC-NOPE", "ING-NOPE",
                           reprocessing_id="REP-99999999-deadbeef00")
        assert run.status == "FAILED"
        assert run.error_code == ValidationErrorCode.REPROCESSING_RUN_NOT_FOUND.value

    def test_phase11_snapshot_handoff(self, tmp_path):
        p08 = tmp_path / "p08"
        p11 = tmp_path / "p11"
        p12 = tmp_path / "p12"
        # phase08 dir empty; snapshot comes from the phase11 run record
        snapshot = clean_ror(record_id="LR-SNAP-1", document_id="DOC-SNAP-1",
                             fields=clean_ror_fields())
        snapshot["fields"]["owner.name"] = _assessment(
            FieldValueStatus.REQUIRED_BUT_UNREADABLE.value, confidence=0.3)
        run_dir = p11 / "LR-SNAP-1" / "SUB-abc" / "runs"
        run_dir.mkdir(parents=True, exist_ok=True)
        (run_dir / "REP-20260915-abcdef1234.json").write_text(json.dumps({
            "reprocessing_id": "REP-20260915-abcdef1234",
            "submission_id": "SUB-abc",
            "remediation_id": "REM-xyz",
            "attempt_number": 2,
            "result": {"new_result": snapshot},
        }), encoding="utf-8")
        svc = AutomatedValidationService(storage_dir=p12, phase08_dir=p08,
                                         phase11_dir=p11)
        run = svc.evaluate("LR-SNAP-1", "DOC-SNAP-1", "ING-SNAP-1",
                           reprocessing_id="REP-20260915-abcdef1234")
        assert run.status == "SUCCESS"
        assert run.document_type == "RECORD_OF_RIGHTS"
        assert run.input_reference["reprocessing_id"] == "REP-20260915-abcdef1234"
        assert run.input_reference["submission_id"] == "SUB-abc"
        assert run.input_reference["attempt_number"] == 2
        assert run.input_reference.get("phase08_path") is None
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value
        # persisted under the record
        saved = list((p12 / "LR-SNAP-1").glob("VLD-*.json"))
        assert saved

    def test_service_evaluate_from_phase08_dir(self, tmp_path, monkeypatch):
        db = _write_reference_db(tmp_path)
        monkeypatch.setenv("ZAMEENAI_VALIDATION_REFERENCE_DB", db)
        p08 = tmp_path / "p08"
        _write_phase08_record(p08, "LR-LOADED", "DOC-LOADED", clean_ror_fields())
        p12 = tmp_path / "p12"
        svc = AutomatedValidationService(storage_dir=p12, phase08_dir=p08,
                                         phase11_dir=tmp_path / "p11",
                                         dataset_dir=p08)
        # _write_phase08_record stores ingestion_id="ING-LR-LOADED": the
        # service must be called with that same ingestion.
        run = svc.evaluate("LR-LOADED", "DOC-LOADED", "ING-LR-LOADED")
        assert run.status == "SUCCESS"
        assert run.input_reference["source_phase"] == "PHASE_08"
        assert "phase08_path" in run.input_reference
        assert run.decision == ValidationDecision.READY_FOR_HITL.value
        # read-back endpoints
        listed = svc.get_record_validations("LR-LOADED")
        assert listed["count"] == 1
        rid = listed["runs"][0]["validation_run_id"]
        fetched = svc.get_validation_run(rid)
        assert fetched["decision"] == ValidationDecision.READY_FOR_HITL.value


# ---------------------------------------------------------------------------
# 13. Hermetic API
# ---------------------------------------------------------------------------

class TestAPI:
    def test_missing_parameters(self, client):
        r = client.post("/api/digitization/automated-validation", json={})
        assert r.status_code == 400
        assert r.get_json()["error_code"] == ValidationErrorCode.MISSING_PARAMETERS.value

    def test_bad_json(self, client):
        r = client.post("/api/digitization/automated-validation", data="notjson",
                        content_type="application/json")
        assert r.status_code == 400
        assert r.get_json()["error_code"] == ValidationErrorCode.INVALID_REQUEST.value

    def test_run_not_found(self, client):
        r = client.get("/api/digitization/validation/VLD-NOPE")
        assert r.status_code == 404
        assert r.get_json()["error_code"] == ValidationErrorCode.RUN_NOT_FOUND.value

    def test_phase08_not_found_400(self, client):
        r = client.post("/api/digitization/automated-validation", json={
            "record_id": "LR-NOPE", "document_id": "DOC-NOPE",
            "ingestion_id": "ING-NOPE"})
        assert r.status_code == 400
        assert r.get_json()["error_code"] == ValidationErrorCode.PHASE_08_RESULT_NOT_FOUND.value


# ---------------------------------------------------------------------------
# 14. Real RoR LR-2026-000002 (disk fixture) + Phase 11 handoff
# ---------------------------------------------------------------------------

REAL_P08 = Path("uploads/processing/phase_08/LR-2026-000002/"
                "DOC-2026-000002_confidence_completeness.json")
REAL_REP = Path("uploads/processing/phase_11/LR-2026-000002")


@pytest.mark.skipif(
    not Path("uploads/originals/ING-2026-000002.png").is_file()
    or not REAL_P08.is_file(),
    reason="real RoR fixture files are environment-provided",
)
class TestRealRoR:
    def test_real_ror_validates_honestly(self, tmp_path):
        engine = AutomatedValidationEngine(reference_db_path=None,
                                           dataset_dir=tmp_path)
        phase08 = json.loads(REAL_P08.read_text(encoding="utf-8"))
        run = engine.evaluate(
            record_id="LR-2026-000002",
            document_id="DOC-2026-000002",
            ingestion_id=phase08.get("ingestion_id", "ING-2026-000002"),
            phase08=phase08,
        )
        # unreadable owner.name + location.block and a conflict are hard errors
        assert run.decision == ValidationDecision.VALIDATION_FAILED.value
        assert run.next_phase == NEXT_PHASE
        # remediation reasons surface the phase08 signals
        reasons = {r["field"]: r["reason"] for r in run.remediation["reasons"]}
        assert reasons["owner.name"] == "UNREADABLE_FIELD"
        assert reasons["location.block"] == "UNREADABLE_FIELD"
        assert reasons["owner.father_husband_name"] == "CONFLICTING_VALUES"
        # the scan (khata 45 / plot 112) collides with LR-2026-000001 only when
        # that record participates; an empty tmp dataset => CLEAR
        assert run.duplicates["status"] == DuplicateStatus.CLEAR.value

    def test_real_ror_with_local_dataset_flags_duplicate(self, tmp_path):
        engine = AutomatedValidationEngine(
            reference_db_path=None,
            dataset_dir=Path("uploads/processing/phase_08"))
        phase08 = json.loads(REAL_P08.read_text(encoding="utf-8"))
        run = engine.evaluate(
            record_id="LR-2026-000002",
            document_id="DOC-2026-000002",
            ingestion_id=phase08.get("ingestion_id", "ING-2026-000002"),
            phase08=phase08,
        )
        # khata 45 + plot 112 also live in the earlier LR-2026-000001 run and
        # this identical scan -> at least a SUSPECTED (0.88 without owner match)
        assert run.duplicates["status"] in (
            DuplicateStatus.SUSPECTED.value, DuplicateStatus.CONFIRMED.value)
        matched = run.duplicates["matched_records"]
        assert any(m["matched_record_id"] != "LR-2026-000002" for m in matched)

    def test_real_ror_phase11_snapshot_handoff(self, tmp_path):
        runs = list(REAL_REP.glob("**/runs/REP-*.json"))
        if not runs:
            pytest.skip("no real Phase 11 run record on disk")
        p11 = REAL_REP.parent
        p12 = tmp_path / "p12"
        svc = AutomatedValidationService(storage_dir=p12,
                                         phase08_dir=tmp_path / "p08",
                                         phase11_dir=p11)
        run = svc.evaluate("LR-2026-000002", "DOC-2026-000002", "ING-2026-000002",
                           reprocessing_id=runs[0].stem)
        assert run.status == "SUCCESS"
        assert run.input_reference.get("reprocessing_id") == runs[0].stem
        assert run.document_type == "RECORD_OF_RIGHTS"
        assert run.decision in (
            ValidationDecision.VALIDATION_FAILED.value,
            ValidationDecision.REVIEW_REQUIRED.value,
        )
        # a persisted Phase 12 artifact was created
        assert list((p12 / "LR-2026-000002").glob("VLD-*.json"))