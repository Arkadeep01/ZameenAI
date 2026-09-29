"""
Phase 08 Confidence & Completeness Check tests.

Covers src/phase08_confidence_completeness.py:
- Document-type-aware applicability (RoR / Khatian / registration-absent)
- Field-level and overall confidence (weighted formula, configurable)
- Priority-weighted completeness scoring
- Missing vs unreadable distinction
- Conflict propagation from Phase 07
- Remediation signal generation
- Status decision (READY_FOR_VALIDATION / REVIEW_REQUIRED / REMEDIATION_REQUIRED / etc.)
- No-hallucination: Phase 08 never invents or modifies values
- Malformed / missing Phase 07 input handling
- Model availability handling
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from src.phase08_confidence_completeness import (
    ConfidenceCompletenessEngine,
    ConfidenceCompletenessService,
    RecordStatus,
    FieldValueStatus,
    ConfidenceBand,
    RemediationReason,
    CONFIDENCE_WEIGHTS,
    FIELD_PRIORITY,
)


# ---------------------------------------------------------------------------
# Helpers — build synthetic Phase 07 output dicts
# ---------------------------------------------------------------------------

def _src(label, text, page=1):
    return {
        "page": page,
        "label": label,
        "text": text,
        "bbox": {"x": 0, "y": 0, "width": 100, "height": 20},
    }


def _meta(
    conf,
    status="EXTRACTED",
    method="LABEL_VALUE_SAME_LINE",
    raw="v",
    normalized="v",
    source=None,
):
    m = {"field_name": "", "status": status, "confidence": conf}
    if method:
        m["method"] = method
    if raw is not None:
        m["raw_value"] = raw
    if normalized is not None:
        m["normalized_value"] = normalized
    if source:
        m["source"] = source
    return m


def _ror_field_metadata():
    """Full set matching a complete/high-confidence RoR extraction."""
    md = {
        "document.document_title": _meta(0.95, method="DETERMINISTIC",
                                         raw="Record of Rights (RoR)", normalized="Record of Rights (RoR)",
                                         source=_src("Record of Rights", "Record of Rights (RoR)")),
        "document.department": _meta(0.95, method="DETERMINISTIC",
                                     raw="Land and Land Reforms Department",
                                     normalized="Land and Land Reforms Department",
                                     source=_src("Dept", "Land and Land Reforms Department")),
        "document.document_date": _meta(0.94, raw="15-07-2023", normalized="2023-07-15",
                                        source=_src("Date", "Date : 15-07-2023")),
        "document.map_number": _meta(0.0, status="MISSING"),
        "location.state": _meta(0.93, method="DETERMINISTIC", raw="WEST BENGAL", normalized="West Bengal",
                                source=_src("State", "WEST BENGAL")),
        "location.district": _meta(0.94, raw="Nadia", normalized="Nadia",
                                   source=_src("District", "District : Nadia")),
        "location.block": _meta(0.93, raw="Nabadwip", normalized="Nabadwip",
                                source=_src("Block", "Block : Nabadwip")),
        "location.tehsil": _meta(0.0, status="MISSING"),
        "location.mouza": _meta(0.94, raw="Krishnanagar", normalized="Krishnanagar",
                                source=_src("Mouza", "Mouza : Krishnanagar")),
        "location.village": _meta(0.0, status="MISSING"),
        "land.survey_number": _meta(0.0, status="MISSING"),
        "land.khasra_number": _meta(0.0, status="MISSING"),
        "land.plot_number": _meta(0.96, method="TABLE_CELL", raw="112", normalized="112",
                                  source=_src("Plot No.", "table[1] r1 c0")),
        "land.khata_number": _meta(0.90, raw="45", normalized="45",
                                   source=_src("Khaitan", "KhaitanNo. : 45")),
        "land.area": _meta(0.96, method="TABLE_CELL", raw="0.32", normalized=0.32,
                           source=_src("Area (Acre)", "table[1] r1 c2")),
        "land.area_unit": _meta(0.96, method="TABLE_COLUMN_HEADER", raw="ACRE", normalized="ACRE",
                                source=_src("Area (Acre)", "Area (Acre)")),
        "land.nature_of_land": _meta(0.95, method="TABLE_CELL", raw="Bastu", normalized="HOMESTEAD",
                                     source=_src("Classification", "table[1] r1 c1")),
        "land.land_type": _meta(0.0, status="MISSING"),
        "owner.name": _meta(0.94, raw="Ramesh Chandra Saha", normalized="Ramesh Chandra Saha",
                            source=_src("Name", "Ramesh Chandra Saha")),
        "owner.father_husband_name": _meta(0.94, raw="Late Haripada Saha", normalized="Haripada Saha",
                                           source=_src("Father's / Husband's Name", "Late Haripada Saha")),
        "owner.co_owner": _meta(0.0, status="MISSING"),
        "owner.recorded_tenant": _meta(0.93, raw="Ramesh Chandra Saha", normalized="Ramesh Chandra Saha",
                                       source=_src("Name of Recorded Tenant", "Ramesh Chandra Saha")),
        "mutation.mutation_number": _meta(0.9, raw="1023", normalized="1023",
                                          source=_src("Mutation No.", "Mutation No. : 1023")),
        "mutation.mutation_date": _meta(0.9, raw="12-06-2018", normalized="2018-06-12",
                                        source=_src("Date of Mutation", "Date of Mutation : 12-06-2018")),
        "registration.document_number": _meta(1.0, status="NOT_APPLICABLE"),
        "registration.registration_date": _meta(1.0, status="NOT_APPLICABLE"),
        "registration.issue_date": _meta(1.0, status="NOT_APPLICABLE"),
        "additional.remarks": _meta(0.0, status="MISSING"),
    }
    for field_name, m in md.items():
        m["field_name"] = field_name
    return md


def _ror_record():
    """Canonical record matching _ror_field_metadata()."""
    return {
        "record_id": "LR-2026-TEST",
        "document_id": "DOC-TEST",
        "ingestion_id": "ING-TEST",
        "document": {
            "document_title": "Record of Rights (RoR)",
            "department": "Land and Land Reforms Department",
            "document_date": "2023-07-15",
        },
        "owner": {
            "name": "Ramesh Chandra Saha",
            "father_husband_name": "Haripada Saha",
            "recorded_tenant": "Ramesh Chandra Saha",
        },
        "land": {
            "plot_number": "112",
            "khata_number": "45",
            "area": 0.32,
            "area_unit": "ACRE",
            "nature_of_land": "HOMESTEAD",
        },
        "location": {
            "state": "West Bengal",
            "district": "Nadia",
            "block": "Nabadwip",
            "mouza": "Krishnanagar",
        },
        "registration": {},
        "mutation": {
            "mutation_number": "1023",
            "mutation_date": "2018-06-12",
        },
        "additional": {},
    }


def _ror_full_field_metadata():
    """Fully complete RoR field metadata — every applicable field EXTRACTED."""
    md = _ror_field_metadata()
    extras = {
        "location.state": _meta(0.93, method="DETERMINISTIC", raw="WEST BENGAL",
                                normalized="West Bengal", source=_src("State", "WEST BENGAL")),
        "location.tehsil": _meta(0.92, raw="Nabadwip Tehsil", normalized="Nabadwip Tehsil",
                                 source=_src("Tehsil", "Tehsil : Nabadwip Tehsil")),
        "location.village": _meta(0.91, raw="Krishnanagar", normalized="Krishnanagar",
                                  source=_src("Village", "Village : Krishnanagar")),
        "land.survey_number": _meta(0.93, raw="SRV-12", normalized="SRV-12",
                                    source=_src("Survey No.", "Survey No. : SRV-12")),
        "land.khasra_number": _meta(0.92, raw="KH-45", normalized="KH-45",
                                    source=_src("Khasra No.", "Khasra No. : KH-45")),
        "land.land_type": _meta(0.91, raw="DEVELOPED", normalized="DEVELOPED",
                                source=_src("Land Type", "Land Type : DEVELOPED")),
        "owner.co_owner": _meta(0.90, raw="Smt. Malati Saha", normalized="Smt. Malati Saha",
                                source=_src("Co-Owner", "Co-Owner : Smt. Malati Saha")),
        "document.map_number": _meta(0.91, raw="MAP-07", normalized="MAP-07",
                                     source=_src("Map No.", "Map No. : MAP-07")),
        "additional.remarks": _meta(0.90, raw="None recorded", normalized="None recorded",
                                    source=_src("Remarks", "Remarks : None recorded")),
    }
    for field_name, m in extras.items():
        m["field_name"] = field_name
    md.update(extras)
    return md


def _ror_full_record():
    """Fully complete record matching _ror_full_field_metadata()."""
    rec = _ror_record()
    rec["location"]["tehsil"] = "Nabadwip Tehsil"
    rec["location"]["village"] = "Krishnanagar"
    rec["land"]["survey_number"] = "SRV-12"
    rec["land"]["khasra_number"] = "KH-45"
    rec["land"]["land_type"] = "DEVELOPED"
    rec["owner"]["co_owner"] = "Smt. Malati Saha"
    rec["document"]["map_number"] = "MAP-07"
    rec["additional"]["remarks"] = "None recorded"
    return rec


def _ror_ocr_text():
    return "\n".join([
        "Record of Rights (RoR)",
        "Land and Land Reforms Department",
        "WEST BENGAL",
        "District : Nadia",
        "Block : Nabadwip",
        "Mouza : Krishnanagar",
        "KhaitanNo. : 45",
        "Name of Recorded Tenant : Ramesh Chandra Saha",
        "Father's / Husband's Name : Late Haripada Saha",
        "Date of Mutation : 12-06-2018",
        "Mutation No. : 1023",
        "Plot No. 112  Bastu  0.32 Acre",
    ])


def _run(
    field_metadata=None,
    conflicts=None,
    needs_review=False,
    models=None,
    extracted_record=None,
    document_type="RECORD_OF_RIGHTS",
    ocr_text=None,
    record_id="LR-2026-TEST",
    document_id="DOC-TEST",
    ingestion_id="ING-TEST",
):
    engine = ConfidenceCompletenessEngine()
    return engine.evaluate(
        record_id=record_id,
        document_id=document_id,
        ingestion_id=ingestion_id,
        document_type=document_type,
        field_metadata=field_metadata if field_metadata is not None else _ror_field_metadata(),
        conflicts=conflicts or [],
        needs_review=needs_review,
        models=models or {"indicbart": "DISABLED", "mistral": "UNAVAILABLE"},
        extracted_record=extracted_record if extracted_record is not None else _ror_record(),
        ocr_text=ocr_text if ocr_text is not None else _ror_ocr_text(),
    )


# ---------------------------------------------------------------------------
# Basic evaluation
# ---------------------------------------------------------------------------

class TestBasicEvaluation:
    def test_high_confidence_complete_record_ready_for_validation(self):
        result = _run(field_metadata=_ror_full_field_metadata(),
                      extracted_record=_ror_full_record())
        assert result.status == RecordStatus.READY_FOR_VALIDATION
        assert result.confidence_band == ConfidenceBand.HIGH
        assert result.overall_confidence > 0.85
        assert result.completeness.score > 0.85
        assert result.next_phase == "PHASE_09_AUTOMATED_VALIDATION"
        assert result.needs_review is False

    def test_field_level_and_overall_confidence(self):
        result = _run()
        plot = result.field_assessments["land.plot_number"]
        assert plot.value_status == FieldValueStatus.REQUIRED_AND_PRESENT
        assert plot.confidence > 0.9
        # Table-derived should score structurally high
        assert plot.confidence_factors.structural == 1.0
        assert 0.0 < result.overall_confidence <= 0.99

    def test_to_dict_contract(self):
        d = _run().to_dict()
        assert d["phase"] == "CONFIDENCE_COMPLETENESS"
        assert "confidence" in d and "overall" in d["confidence"] and "band" in d["confidence"]
        assert "completeness" in d and "score" in d["completeness"]
        assert "fields" in d
        assert "missing_fields" in d
        assert "unreadable_fields" in d
        assert "conflicting_fields" in d
        assert "critical_issues" in d
        assert "next_phase" in d
        assert "models" in d


# ---------------------------------------------------------------------------
# Completeness / applicability
# ---------------------------------------------------------------------------

class TestCompletenessAndApplicability:
    def test_missing_optional_field_not_penalized(self):
        md = _ror_field_metadata()
        md["document.map_number"] = _meta(0.0, status="MISSING")
        md["document.map_number"]["field_name"] = "document.map_number"
        result = _run(field_metadata=md)
        assert result.field_assessments["document.map_number"].value_status == (
            FieldValueStatus.OPTIONAL_AND_MISSING
        )
        assert "document.map_number" not in result.critical_issues

    def test_missing_critical_field_flags_critical(self):
        md = _ror_field_metadata()
        md["land.plot_number"] = _meta(0.0, status="MISSING")
        md["land.plot_number"]["field_name"] = "land.plot_number"
        record = _ror_record()
        record["land"].pop("plot_number", None)
        result = _run(field_metadata=md, extracted_record=record, ocr_text="no label evidence")
        assert result.field_assessments["land.plot_number"].value_status == (
            FieldValueStatus.REQUIRED_BUT_MISSING
        )
        assert "land.plot_number" in result.completeness.critical_missing
        assert result.status == RecordStatus.REMEDIATION_REQUIRED
        assert result.next_phase == "PHASE_12_CORRECTION_REVALIDATION"

    def test_registration_absent_from_ror_is_not_applicable(self):
        result = _run()
        for fn in ("registration.document_number", "registration.registration_date", "registration.issue_date"):
            assert result.field_assessments[fn].value_status == FieldValueStatus.NOT_APPLICABLE
            assert fn not in result.missing_fields

    def test_khatian_applicability_distinct_from_ror(self):
        # Khatian marks survey_number REQUIRED and registration NOT_APPLICABLE
        result = _run(document_type="KHATIAN")
        assert result.field_assessments["land.survey_number"].value_status != FieldValueStatus.NOT_APPLICABLE
        assert result.field_assessments["registration.document_number"].value_status == (
            FieldValueStatus.NOT_APPLICABLE
        )

    def test_completeness_priority_weighting(self):
        # Dropping a CRITICAL field hurts the score more than an OPTIONAL field
        base_md = _ror_full_field_metadata()
        base_rec = _ror_full_record()
        base = _run(field_metadata=base_md, extracted_record=base_rec)

        # Variant A: drop an OPTIONAL field (remarks)
        md_opt = _ror_full_field_metadata()
        md_opt["additional.remarks"] = _meta(0.0, status="MISSING")
        md_opt["additional.remarks"]["field_name"] = "additional.remarks"
        rec_opt = _ror_full_record()
        rec_opt["additional"].pop("remarks", None)
        with_optional_missing = _run(field_metadata=md_opt, extracted_record=rec_opt)

        # Variant B: drop a CRITICAL field (plot_number)
        md_crit = _ror_full_field_metadata()
        md_crit["land.plot_number"] = _meta(0.0, status="MISSING")
        md_crit["land.plot_number"]["field_name"] = "land.plot_number"
        rec_crit = _ror_full_record()
        rec_crit["land"].pop("plot_number", None)
        with_critical_missing = _run(field_metadata=md_crit, extracted_record=rec_crit)

        drop_optional = base.completeness.score - with_optional_missing.completeness.score
        drop_critical = base.completeness.score - with_critical_missing.completeness.score
        assert drop_critical > drop_optional
        assert base.completeness.score > with_critical_missing.completeness.score

    def test_available_fields_count(self):
        result = _run()
        assert result.completeness.applicable_fields == 25
        assert result.completeness.not_applicable_fields == 3


# ---------------------------------------------------------------------------
# Missing vs unreadable
# ---------------------------------------------------------------------------

class TestMissingVsUnreadable:
    def test_label_present_but_no_value_is_unreadable(self):
        md = _ror_field_metadata()
        md["owner.father_husband_name"] = _meta(0.0, status="MISSING")
        md["owner.father_husband_name"]["field_name"] = "owner.father_husband_name"
        record = _ror_record()
        record["owner"].pop("father_husband_name", None)
        result = _run(field_metadata=md, extracted_record=record)
        # OCR text contains "Father's / Husband's Name :"
        assert result.field_assessments["owner.father_husband_name"].value_status == (
            FieldValueStatus.REQUIRED_BUT_UNREADABLE
        )
        assert "owner.father_husband_name" in result.unreadable_fields
        assert "owner.father_husband_name" not in result.missing_fields

    def test_no_label_evidence_is_missing_not_unreadable(self):
        md = _ror_field_metadata()
        md["land.survey_number"] = _meta(0.0, status="MISSING")
        md["land.survey_number"]["field_name"] = "land.survey_number"
        record = _ror_record()
        result = _run(field_metadata=md, extracted_record=record, ocr_text="nothing about survey here")
        # survey_number alias not present in ocr text → MISSING, not UNREADABLE
        assert result.field_assessments["land.survey_number"].value_status == (
            FieldValueStatus.OPTIONAL_AND_MISSING
        )

    def test_required_field_no_label_is_required_but_missing(self):
        md = _ror_field_metadata()
        md["land.area"] = _meta(0.0, status="MISSING")
        md["land.area"]["field_name"] = "land.area"
        record = _ror_record()
        record["land"].pop("area", None)
        record["land"].pop("area_unit", None)
        result = _run(field_metadata=md, extracted_record=record, ocr_text="no labels here")
        assert result.field_assessments["land.area"].value_status == (
            FieldValueStatus.REQUIRED_BUT_MISSING
        )

    def test_record_backed_value_without_metadata_is_present(self):
        # Phase 07 stores area_unit in the record but omits its metadata entry
        md = dict(_ror_field_metadata())
        md.pop("land.area_unit", None)
        record = _ror_record()
        result = _run(field_metadata=md, extracted_record=record)
        assert result.field_assessments["land.area_unit"].value_status == (
            FieldValueStatus.REQUIRED_AND_PRESENT
        )
        assert result.field_assessments["land.area_unit"].value == "ACRE"


# ---------------------------------------------------------------------------
# Confidence
# ---------------------------------------------------------------------------

class TestConfidence:
    def test_ocr_low_confidence_field_is_low_confidence(self):
        md = _ror_field_metadata()
        md["owner.recorded_tenant"] = _meta(0.25, raw="Ramesh Chandra Saha", normalized="Ramesh Chandra Saha",
                                            method="LABEL_VALUE_NEXT_LINE", source=_src("Tenant", "Ramesh Chandra Saha"))
        md["owner.recorded_tenant"]["field_name"] = "owner.recorded_tenant"
        result = _run(field_metadata=md)
        fa = result.field_assessments["owner.recorded_tenant"]
        assert fa.value_status == FieldValueStatus.LOW_CONFIDENCE
        assert fa.confidence < 0.6

    def test_table_derived_high_confidence(self):
        result = _run()
        plot = result.field_assessments["land.plot_number"]
        assert plot.method == "TABLE_CELL"
        assert plot.confidence > 0.9
        assert plot.confidence_factors.structural == 1.0
        assert plot.value == "112"

    def test_weights_configurable(self):
        engine = ConfidenceCompletenessEngine(weights={
            "semantic": 1.0, "ocr": 0.0, "evidence": 0.0,
            "structural": 0.0, "validation": 0.0, "agreement": 0.0,
        })
        md = _ror_field_metadata()
        result = engine.evaluate(
            record_id="LR", document_id="DOC", ingestion_id="ING",
            document_type="RECORD_OF_RIGHTS",
            field_metadata=md, conflicts=[], needs_review=False,
            models={"indicbart": "DISABLED", "mistral": "UNAVAILABLE"},
            extracted_record=_ror_record(), ocr_text=_ror_ocr_text(),
        )
        # semantic-only weighting → confidence mirrors semantic value
        assert result.field_assessments["land.plot_number"].confidence == pytest.approx(0.96, abs=0.001)

    def test_confidence_factors_explained(self):
        result = _run()
        fa = result.field_assessments["land.plot_number"]
        factors = fa.confidence_factors.to_dict()
        assert set(factors) == {"semantic", "ocr", "evidence", "structural", "validation", "agreement"}
        assert all(0.0 <= v <= 1.0 for v in factors.values())


# ---------------------------------------------------------------------------
# Conflicts
# ---------------------------------------------------------------------------

class TestConflicts:
    def test_phase07_conflict_propagates(self):
        conflicts = [{
            "field": "owner.father_husband_name",
            "selected": "Haripada Saha",
            "alternatives": [{"field": "owner.father_husband_name", "value": "Pemty Conereted", "confidence": 0.31}],
        }]
        result = _run(conflicts=conflicts, needs_review=True)
        fa = result.field_assessments["owner.father_husband_name"]
        assert fa.value_status == FieldValueStatus.CONFLICTING
        assert fa.in_conflict is True
        assert "owner.father_husband_name" in result.conflicting_fields
        assert result.needs_review is True
        # losing candidate preserved in audit layer
        assert fa.conflict_alternatives[0]["value"] == "Pemty Conereted"

    def test_no_silent_correction(self):
        conflicts = [{
            "field": "land.plot_number",
            "selected": "112",
            "alternatives": [{"field": "land.plot_number", "value": "214", "confidence": 0.6}],
        }]
        result = _run(conflicts=conflicts, needs_review=True)
        fa = result.field_assessments["land.plot_number"]
        assert fa.value_status == FieldValueStatus.CONFLICTING
        # Phase 08 must not rewrite the value
        assert fa.value == "112"

    def test_conflict_remediation_reason(self):
        conflicts = [{
            "field": "owner.father_husband_name",
            "selected": "Haripada Saha",
            "alternatives": [{"field": "owner.father_husband_name", "value": "Pemty Conereted", "confidence": 0.31}],
        }]
        md = _ror_field_metadata()
        md["land.plot_number"] = _meta(0.0, status="MISSING")
        md["land.plot_number"]["field_name"] = "land.plot_number"
        record = _ror_record()
        record["land"].pop("plot_number", None)
        result = _run(field_metadata=md, extracted_record=record,
                      conflicts=conflicts, needs_review=True)
        assert result.remediation is not None
        reasons = {r["field"] for r in result.remediation["reasons"]}
        assert "owner.father_husband_name" in reasons
        assert "land.plot_number" in reasons


# ---------------------------------------------------------------------------
# Status decisions
# ---------------------------------------------------------------------------

class TestStatusDecisions:
    def test_low_confidence_record_remediation_required(self):
        md = _ror_field_metadata()
        for fn in md:
            if md[fn]["status"] == "EXTRACTED":
                md[fn] = _meta(0.30, method="REGEX_PATTERN", raw="v", normalized="v")
                md[fn]["field_name"] = fn
        record = _ror_record()
        result = _run(field_metadata=md, extracted_record=record)
        assert result.confidence_band == ConfidenceBand.LOW
        assert result.status in (RecordStatus.REMEDIATION_REQUIRED, RecordStatus.REVIEW_REQUIRED)
        assert result.next_phase in ("PHASE_12_CORRECTION_REVALIDATION", "PHASE_09_AUTOMATED_VALIDATION")

    def test_very_low_completeness_is_incomplete(self):
        # Only the title is extracted; all CRITICAL required fields have a
        # label in the OCR text but no value → UNREADABLE (not missing), so
        # no critical_missing blocks the INCOMPLETE decision. Completeness
        # sinks below 0.25.
        md = {
            "document.document_title": _meta(0.9, method="DETERMINISTIC", raw="x", normalized="x",
                                             source=_src("Title", "RoR")),
            "document.department": _meta(0.0, status="MISSING"),
            "document.document_date": _meta(0.0, status="MISSING"),
            "land.plot_number": _meta(0.0, status="MISSING"),
            "land.area": _meta(0.0, status="MISSING"),
            "land.area_unit": _meta(0.0, status="MISSING"),
            "land.khata_number": _meta(0.0, status="MISSING"),
            "owner.recorded_tenant": _meta(0.0, status="MISSING"),
            "location.mouza": _meta(0.0, status="MISSING"),
        }
        for fn, m in md.items():
            m["field_name"] = fn
        ocr = "\n".join([
            "Land and Land Reforms Department",
            "Date :",
            "Plot No.",
            "Khata No. :",
            "Name of Recorded Tenant :",
            "0.32 Area (Acre)",
            "Mouza :",
        ])
        result = _run(field_metadata=md, extracted_record={}, ocr_text=ocr)
        assert result.status == RecordStatus.INCOMPLETE
        assert result.next_phase == "PHASE_12_CORRECTION_REVALIDATION"

    def test_ready_for_validation_requires_no_critical_issues(self):
        result = _run(field_metadata=_ror_full_field_metadata(),
                      extracted_record=_ror_full_record())
        assert result.status == RecordStatus.READY_FOR_VALIDATION
        assert result.critical_issues == []

    def test_review_required_on_noncritical_conflict(self):
        conflicts = [{
            "field": "owner.father_husband_name",
            "selected": "Haripada Saha",
            "alternatives": [{"field": "owner.father_husband_name", "value": "x", "confidence": 0.4}],
        }]
        result = _run(conflicts=conflicts, needs_review=True)
        assert result.status == RecordStatus.REVIEW_REQUIRED
        assert result.needs_review is True


# ---------------------------------------------------------------------------
# Model availability
# ---------------------------------------------------------------------------

class TestModelAvailability:
    def test_unavailable_models_do_not_lower_everything(self, monkeypatch):
        # Mistral/IndicBART UNAVAILABLE is normal — deterministic evidence survives
        result = _run(models={"indicbart": "UNAVAILABLE", "mistral": "UNAVAILABLE"})
        assert result.status != RecordStatus.MODEL_UNAVAILABLE
        assert result.field_assessments["land.plot_number"].confidence > 0.9
        assert result.models["indicbart"] == "UNAVAILABLE"

    def test_model_error_is_model_unavailable(self):
        result = _run(models={"indicbart": "ERROR", "mistral": "UNAVAILABLE"})
        assert result.status == RecordStatus.MODEL_UNAVAILABLE

    def test_disabled_model_reported(self):
        result = _run(models={"indicbart": "DISABLED", "mistral": "UNAVAILABLE"})
        assert result.models["indicbart"] == "DISABLED"
        assert result.status != RecordStatus.MODEL_UNAVAILABLE


# ---------------------------------------------------------------------------
# Remediation signals
# ---------------------------------------------------------------------------

class TestRemediation:
    def test_remediation_reason_generation(self):
        md = _ror_field_metadata()
        md["land.plot_number"] = _meta(0.0, status="MISSING")
        md["land.plot_number"]["field_name"] = "land.plot_number"
        md["owner.father_husband_name"] = _meta(0.0, status="MISSING")
        md["owner.father_husband_name"]["field_name"] = "owner.father_husband_name"
        record = _ror_record()
        record["owner"].pop("father_husband_name", None)
        record["land"].pop("plot_number", None)
        # father label present → unreadable; plot label absent → missing
        ocr = "Father's / Husband's Name : Late Haripada Saha"
        result = _run(field_metadata=md, extracted_record=record, ocr_text=ocr)
        assert result.remediation is not None
        assert result.remediation["required"] is True
        reasons = result.remediation["reasons"]
        assert len(reasons) >= 2
        missing = [r for r in reasons if r["reason"] == "MISSING_FIELD"]
        unreadable = [r for r in reasons if r["reason"] == "UNREADABLE_FIELD"]
        assert any(r["field"] == "land.plot_number" for r in missing)
        assert any(r["field"] == "owner.father_husband_name" for r in unreadable)

    def test_ready_record_has_no_remediation(self):
        result = _run()
        assert result.remediation is None or result.remediation["required"] is False


# ---------------------------------------------------------------------------
# No-hallucination / integrity
# ---------------------------------------------------------------------------

class TestNoHallucination:
    def test_phase08_does_not_invent_missing_values(self):
        result = _run()
        for fa in result.field_assessments.values():
            if fa.value_status not in (
                FieldValueStatus.REQUIRED_AND_PRESENT,
                FieldValueStatus.OPTIONAL_AND_PRESENT,
                FieldValueStatus.CONFLICTING,
            ):
                assert fa.value is None

    def test_phase08_does_not_modify_values(self):
        md = _ror_field_metadata()
        result = _run(field_metadata=md)
        assert result.field_assessments["land.plot_number"].value == "112"
        assert result.field_assessments["document.document_date"].value == "2023-07-15"


# ---------------------------------------------------------------------------
# Malformed / missing input
# ---------------------------------------------------------------------------

class TestRobustness:
    def test_missing_field_metadata_does_not_crash(self):
        result = _run(field_metadata={}, extracted_record={})
        assert result.status in (
            RecordStatus.INCOMPLETE, RecordStatus.REMEDIATION_REQUIRED,
        )
        assert result.missing_fields

    def test_unknown_document_type_falls_back_optional(self):
        result = _run(document_type="MYSTERY_DOC")
        # every canonical field gets a default OPTIONAL assessment
        assert "land.plot_number" in result.field_assessments

    def test_missing_provenance_field(self):
        md = _ror_field_metadata()
        md["land.plot_number"] = _meta(0.96, method=None, raw=None, normalized="112", source=None)
        md["land.plot_number"]["field_name"] = "land.plot_number"
        result = _run(field_metadata=md)
        assert result.field_assessments["land.plot_number"].value == "112"
        assert result.status in (RecordStatus.READY_FOR_VALIDATION, RecordStatus.REVIEW_REQUIRED)

    def test_malformed_source(self):
        md = _ror_field_metadata()
        md["land.plot_number"] = _meta(0.96, source={"page": 1})
        md["land.plot_number"]["field_name"] = "land.plot_number"
        result = _run(field_metadata=md)
        assert result.field_assessments["land.plot_number"].confidence > 0.5


# ---------------------------------------------------------------------------
# Service / API layer
# ---------------------------------------------------------------------------

class TestService:
    def test_service_returns_extraction_error_for_missing_phase07(self):
        svc = ConfidenceCompletenessService()
        result = svc.evaluate(
            record_id="LR-2026-NOPE",
            document_id="DOC-NOPE",
            ingestion_id="ING-NOPE",
        )
        assert result.status == RecordStatus.EXTRACTION_ERROR
        assert result.error_code == "PHASE_07_RESULT_NOT_FOUND"

    def test_service_real_ror_run(self):
        # The real LR-2026-000002 Phase 07 output exists on disk.
        svc = ConfidenceCompletenessService()
        result = svc.evaluate(
            record_id="LR-2026-000002",
            document_id="DOC-2026-000002",
            ingestion_id="ING-2026-000002",
        )
        assert result.status == RecordStatus.REVIEW_REQUIRED
        assert result.completeness.score > 0.5
        assert "owner.father_husband_name" in result.conflicting_fields
        assert result.needs_review is True


class TestAPI:
    def test_confidence_completeness_endpoint(self, client):
        resp = client.post("/api/digitization/confidence-completeness", json={
            "record_id": "LR-2026-000002",
            "document_id": "DOC-2026-000002",
            "ingestion_id": "ING-2026-000002",
        })
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["phase"] == "CONFIDENCE_COMPLETENESS"
        assert body["status"] == "REVIEW_REQUIRED"
        assert "confidence" in body and "overall" in body["confidence"]
        assert "completeness" in body

    def test_endpoint_requires_params(self, client):
        resp = client.post("/api/digitization/confidence-completeness", json={})
        assert resp.status_code == 400
        assert resp.get_json()["error_code"] == "MISSING_PARAMETERS"

    def test_endpoint_missing_phase07(self, client):
        resp = client.post("/api/digitization/confidence-completeness", json={
            "record_id": "LR-2026-NOPE",
            "document_id": "DOC-NOPE",
            "ingestion_id": "ING-NOPE",
        })
        assert resp.status_code == 400
        body = resp.get_json()
        assert body["error_code"] == "PHASE_07_RESULT_NOT_FOUND"