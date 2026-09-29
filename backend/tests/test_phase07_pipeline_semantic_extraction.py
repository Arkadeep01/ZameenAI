"""
Phase 07 authoritative pipeline tests.

Covers the rebuild of src/phase07_semantic_field_extraction.py:
- Lossless OCR evidence model (OCRDocument: lines, tables, language/gov evidence)
- Multilingual terminology candidate generation
- Table-driven extraction (TABLE_CELL / TABLE_COLUMN_HEADER)
- Deterministic validation + candidate reconciliation (agreement / conflicts)
- Honest model status reporting (IndicBART DISABLED, Mistral UNAVAILABLE without key)
- No-hallucination guarantee: fields absent from the document stay null
"""

import json
import os
from unittest.mock import patch

import pytest

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ocr.extraction.evidence import OCRDocument
from app.ocr.extraction.candidates import CandidateGenerator, CandidateReconciler, FieldValidator
from app.ocr.extraction.pipeline import SemanticExtractionPipeline
from app.ocr.extraction.models import ExtractionStatus, FieldStatus, ExtractionMethod, EvidenceCandidate
from app.ocr.extraction.llm import MistralExtractor, OllamaExtractor, _ground_llm_candidates, _llm_provider, _strip_think_blocks, _extract_json_object
from app.ocr.extraction.normalization import normalize_date, normalize_area, normalize_name, extract_number, pick_best_label, clean_value
from app.ocr.extraction.terminology import resolve_aliases


def _word(text, x, y, line_num, word_num, conf=0.9, page=1):
    return {
        "text": text,
        "confidence": conf,
        "bbox": {"x": x, "y": y, "width": len(text) * 7, "height": 12},
        "page_number": page,
        "line_num": line_num,
        "word_num": word_num,
    }


def _line(text, reading_order, region="BODY", conf=0.9, page=1):
    words = []
    x = 10
    for i, tok in enumerate(text.split(" ")):
        words.append(_word(tok, x, reading_order * 30, page, i, conf=conf, page=page))
        x += len(tok) * 8
    return {
        "text": text,
        "confidence": conf,
        "reading_order": reading_order,
        "region": region,
        "page_number": page,
        "words": words,
    }


def _srow(text, reading_order, x, y, w=120, h=24, region="BODY", conf=0.9, page=1):
    """A line with an explicit bbox and word bboxes all on one visual row (y).

    Two-column RoR documents print the label and its value on the SAME visual
    row but OCR can emit them as two separate SemanticLines (the value may even
    precede the label in reading order, or a foreign label can intervene
    between them). These tests drive the same-row spatial bridge.
    """
    words = []
    xx = x
    for i, tok in enumerate(text.split(" ")):
        words.append(_word(tok, xx, y, page, i, conf=conf, page=page))
        xx += len(tok) * 8
    return {
        "text": text,
        "confidence": conf,
        "reading_order": reading_order,
        "region": region,
        "page_number": page,
        "words": words,
        "bbox": {"x": x, "y": y, "width": w, "height": h},
    }


def _cell(column_index, text, row_index, conf=0.9):
    return {
        "column_index": column_index,
        "row_index": row_index,
        "text": text,
        "confidence": conf,
    }


def _build_ocr(lines, tables=None, page_data=None, gov=None, language=None):
    page = {
        "page_number": 1,
        "text": lines[0]["text"] if lines else "",
        "lines": lines,
        "tables": tables or [],
    }
    if gov is not None:
        page["government_document_evidence"] = gov
    if page_data is not None:
        page.update(page_data)
    return {
        "record_id": "LR-2026-TEST",
        "document_id": "DOC-2026-TEST",
        "ingestion_id": "ING-2026-TEST",
        "status": "SUCCESS",
        "full_text": "\n".join(l["text"] for l in lines),
        "pages": [page],
        "language": language or {"language": "english", "script": "latin",
                                 "confidence": 0.9, "multilingual": False,
                                 "tesseract_codes": ["eng"]},
    }


class TestOCRDocumentEvidence:
    """Lossless evidence model built from Phase 06 output."""

    def test_build_preserves_ids_and_full_text(self):
        ocr = _build_ocr([_line("Record of Rights (RoR)", 1, "TITLE")])
        doc = OCRDocument.build(ocr)
        assert doc.record_id == "LR-2026-TEST"
        assert doc.document_id == "DOC-2026-TEST"
        assert doc.ingestion_id == "ING-2026-TEST"
        assert "Record of Rights (RoR)" in doc.full_text

    def test_build_structured_lines(self):
        ocr = _build_ocr([
            _line("District : Nadia", 2),
            _line("Mouza : Krishnanagar", 3),
        ])
        doc = OCRDocument.build(ocr)
        assert len(doc.lines) == 2
        assert doc.lines[0].text == "District : Nadia"
        assert doc.lines[1].region == "BODY"

    def test_build_evidence_tables(self):
        tables = [{
            "table_index": 1,
            "structure_status": "RULING_LINES",
            "source": "ruling-lines",
            "rows": [
                {"row_index": 0, "cells": [_cell(0, "Plot No.", 0), _cell(1, "Area (Acre)", 0)]},
                {"row_index": 1, "cells": [_cell(0, "112", 1), _cell(1, "0.32", 1)]},
            ],
        }]
        ocr = _build_ocr([_line("Record of Rights (RoR)", 1, "TITLE")], tables=tables)
        doc = OCRDocument.build(ocr)
        assert len(doc.tables) == 1
        table = doc.tables[0]
        assert table.structure_status == "RULING_LINES"
        assert len(table.header_cells) == 2
        assert len(table.data_rows) == 1
        assert table.data_rows[0][0].text == "112"

    def test_build_government_evidence_and_scripts(self):
        ocr = _build_ocr(
            [_line("Record of Rights (RoR)", 1, "TITLE")],
            gov={"header_detected": True, "department_detected": True},
            page_data={"scripts_present": ["Latin", "Bengali"]},
        )
        doc = OCRDocument.build(ocr)
        assert doc.government_evidence.get("header_detected") is True
        assert "Latin" in doc.scripts_present
        assert "Bengali" in doc.scripts_present

    def test_build_language_evidence(self):
        ocr = _build_ocr(
            [_line("Record of Rights (RoR)", 1, "TITLE")],
            language={"language": "bengali", "script": "bengali",
                      "confidence": 0.88, "multilingual": True,
                      "tesseract_codes": ["ben", "eng"]},
        )
        doc = OCRDocument.build(ocr)
        assert doc.language.language == "bengali"
        assert doc.language.script == "bengali"
        assert doc.language.multilingual is True
        assert doc.language.tesseract_codes == ["ben", "eng"]


class TestCandidateGenerator:
    """Semantic terminology candidate generation (label -> value)."""

    def test_line_same_line_value(self):
        ocr = _build_ocr([_line("Khatan No.", 1), _line("Khata No. : 45", 2)])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        khata = [c for c in cands if c.field_name == "land.khata_number"]
        assert khata, "expected khata candidate"
        assert khata[0].value == "45"
        assert khata[0].method == ExtractionMethod.LABEL_VALUE_SAME_LINE

    def test_line_next_line_wrapped_value(self):
        ocr = _build_ocr([
            _line("Name of Recorded Tenant", 1),
            _line("Ramesh Chandra Saha", 2),
            _line("Late Haripada Saha", 3),
        ])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        tenant = [c for c in cands if c.field_name == "owner.recorded_tenant"]
        assert tenant, "expected recorded_tenant candidate"
        assert "Ramesh" in tenant[0].value
        assert tenant[0].method == ExtractionMethod.LABEL_VALUE_NEXT_LINE

    def test_multilingual_aliases_resolved(self):
        # Bengali labels should map to canonical fields.
        ocr = _build_ocr([_line("জেলা : নদিয়া", 1)])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        districts = [c for c in cands if c.field_name == "location.district"]
        assert districts, "expected district from Bengali alias"
        assert districts[0].value == "নদিয়া"

    def test_table_cell_and_area_unit(self):
        tables = [{
            "table_index": 1,
            "structure_status": "RULING_LINES",
            "rows": [
                {"row_index": 0, "cells": [
                    _cell(0, "Plot No.", 0), _cell(1, "Classification", 0), _cell(2, "Area (Acre)", 0)]},
                {"row_index": 1, "cells": [
                    _cell(0, "112", 1), _cell(1, "Bastu", 1), _cell(2, "0.32", 1)]},
            ],
        }]
        ocr = _build_ocr([_line("Record of Rights (RoR)", 1, "TITLE")], tables=tables)
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        plot = [c for c in cands if c.field_name == "land.plot_number"]
        unit = [c for c in cands if c.field_name == "land.area_unit"]
        nature = [c for c in cands if c.field_name == "land.nature_of_land"]
        assert plot and plot[0].value == "112"
        assert plot[0].method == ExtractionMethod.TABLE_CELL
        assert unit and unit[0].value == "ACRE"
        assert unit[0].method == ExtractionMethod.TABLE_COLUMN_HEADER
        assert nature and nature[0].value == "Bastu"

    def test_static_title_department_state(self):
        ocr = _build_ocr([
            _line("Record of Rights (RoR)", 1, "TITLE"),
            _line("Land and Land Reforms Department", 2, "HEADER"),
            _line("WEST BENGAL", 3, "HEADER"),
        ], gov={"header_detected": True})
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        by_field = {c.field_name: c.value for c in cands}
        assert by_field["document.document_title"].startswith("Record of Rights")
        assert by_field["document.department"] == "Land and Land Reforms Department"
        assert by_field["location.state"] == "West Bengal"

    def test_no_hallucination_when_label_absent(self):
        ocr = _build_ocr([_line("Some arbitrary text without labels", 1)])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        assert all(c.field_name != "owner.name" for c in cands)

    def test_embedded_alias_ignored_for_same_line_value(self):
        # "Rght (RoR) Nery" has "RoR" embedded mid-line; the trailing token
        # must NOT become the document title value (OCR artifact, not a label).
        ocr = _build_ocr([_line("Rght (RoR) Nery", 1, "TITLE")])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        titles = [c for c in cands if c.field_name == "document.document_title"]
        assert all(c.value != "Nery" for c in titles)

    def test_late_kin_extracted_as_father_husband(self):
        ocr = _build_ocr([
            _line("Name of Recorded Tenant", 1),
            _line("Ramesh Chandra Saha", 2),
            _line("Late Haripada Saha", 3),
        ])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        father = [c for c in cands if c.field_name == "owner.father_husband_name"]
        assert father and father[0].value == "Haripada Saha"
        assert father[0].method == ExtractionMethod.DETERMINISTIC

    def test_wrapped_person_name_single_line_only(self):
        ocr = _build_ocr([
            _line("Name of Recorded Tenant", 1),
            _line("Ramesh Chandra Saha", 2),
            _line("Late Haripada Saha", 3),
        ])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        tenant = [c for c in cands if c.field_name == "owner.recorded_tenant"]
        assert tenant and tenant[0].value == "Ramesh Chandra Saha"

    def test_same_row_spatial_block_last_col_with_pipe_to_i(self):
        # Two-column RoR (real LR-2026-000002 layout): the label "Block :" and its
        # value "Krishnanagar - I" share one visual row, a foreign label
        # ("Mouza : Krishnanagar") intervenes in reading order between them, and
        # OCR renders the trailing "I" as a pipe. The same-row spatial bridge must
        # recover the value and the OCR pipe must normalize to a capital I.
        ocr = _build_ocr([
            _line("Record of Rights (RoR)", 1, "TITLE"),
            _srow("Block :", 2, 40, 745, 120, 30),
            _srow("Mouza : Krishnanagar", 3, 40, 805, 300, 30),
            _srow("Krishnanagar - |", 4, 316, 745, 700, 30),
        ])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        blocks = [c for c in cands if c.field_name == "location.block"]
        assert blocks, "expected a spatial same-row block candidate"
        assert blocks[0].value == "Krishnanagar - I"
        assert blocks[0].method == ExtractionMethod.LABEL_VALUE_SPATIAL

    def test_same_row_spatial_date_of_mutation_with_pipe_to_i(self):
        # Two-column RoR: the label "Date of Mutation :" and its value
        # "12-06-2018" share one visual row, a foreign label intervenes in
        # reading order between them, and a trailing OCR pipe is present. The
        # same-row spatial bridge must recover the date token (LABEL_VALUE_SPATIAL).
        ocr = _build_ocr([
            _line("Record of Rights (RoR)", 1, "TITLE"),
            _srow("Date of Mutation :", 2, 40, 745, 240, 30),
            _srow("Name of Recorded Tenant", 3, 40, 805, 300, 30),
            _srow("12-06-2018 of Wee", 4, 316, 745, 700, 30),
        ])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        dates = [c for c in cands if c.field_name == "mutation.mutation_date"]
        assert dates, "expected a spatial same-row mutation-date candidate"
        assert dates[0].value == "12-06-2018"
        assert dates[0].method == ExtractionMethod.LABEL_VALUE_SPATIAL


class TestDeterministicValidation:
    """FieldValidator + normalization guards."""

    def test_date_normalization(self):
        assert normalize_date("12-06-2018") == "2018-06-12"
        assert normalize_date("15/07/2023") == "2023-07-15"
        assert normalize_date("garbage") is None
        ok, value = FieldValidator.validate("mutation.mutation_date", "12-06-2018")
        assert ok and value == "2018-06-12"

    def test_rejects_invalid_date(self):
        ok, value = FieldValidator.validate("document.document_date", "not-a-date")
        assert not ok

    def test_numeric_field_validation(self):
        ok, value = FieldValidator.validate("land.plot_number", "112")
        assert ok and value == "112"
        assert extract_number("112") == "112"
        assert extract_number("1234A") == "1234A"
        assert extract_number("Plot 112") is None

    def test_person_name_validation(self):
        ok, value = FieldValidator.validate("owner.name", "Ramesh Chandra Saha")
        assert ok and value == "Ramesh Chandra Saha"

    def test_nature_of_land_normalization(self):
        ok, value = FieldValidator.validate("land.nature_of_land", "Bastu")
        assert ok and value == "HOMESTEAD"

    def test_area_unit_extraction(self):
        area_val, unit = normalize_area("0.32 Acre")
        assert area_val == 0.32
        assert unit == "ACRE"

    def test_clean_value_removes_noise(self):
        assert clean_value(" : 45 || ") == "45"


class TestCandidateReconciler:
    """Multi-source agreement, weighted confidence, conflict detection."""

    def _cand(self, field_name, value, method=ExtractionMethod.TABLE_CELL, conf=0.9):
        return EvidenceCandidate(
            field_name=field_name,
            value=value,
            raw_value=value,
            label=field_name,
            label_score=conf,
            confidence=conf,
            method=method,
            page=1,
        )

    def test_agreement_boost(self):
        cands = [
            self._cand("land.plot_number", "112", ExtractionMethod.TABLE_CELL),
            self._cand("land.plot_number", "112", ExtractionMethod.LABEL_VALUE_SAME_LINE, 0.85),
        ]
        single = CandidateReconciler().reconcile(cands[:1])[0]["land.plot_number"].confidence
        selected, conflicts = CandidateReconciler().reconcile(cands)
        assert selected["land.plot_number"].value == "112"
        assert selected["land.plot_number"].confidence > single
        assert conflicts == []

    def test_conflict_detected(self):
        cands = [
            self._cand("land.plot_number", "112", ExtractionMethod.TABLE_CELL, 0.9),
            self._cand("land.plot_number", "214", ExtractionMethod.LABEL_VALUE_SAME_LINE, 0.88),
        ]
        selected, conflicts = CandidateReconciler().reconcile(cands)
        assert selected["land.plot_number"].value == "112"
        assert conflicts and conflicts[0]["field"] == "land.plot_number"
        assert conflicts[0]["alternatives"]

    def test_invalid_candidate_dropped(self):
        cands = [self._cand("mutation.mutation_date", "garbage")]
        selected, conflicts = CandidateReconciler().reconcile(cands)
        assert "mutation.mutation_date" not in selected

    def test_area_unit_aligned_and_merged(self):
        # Table cell "0.32" (no unit) + label line "0.32 Acre": must reconcile
        # to the SAME value, not a false conflict.
        cands = [
            self._cand("land.area", "0.32", ExtractionMethod.TABLE_CELL),
            self._cand("land.area", "0.32 Acre", ExtractionMethod.LABEL_VALUE_SAME_LINE),
        ]
        selected, conflicts = CandidateReconciler().reconcile(cands)
        assert selected["land.area"].value == "0.32 ACRE"
        assert conflicts == []

    def test_nature_of_land_spatial_beats_table_cell(self):
        # Two-column RoR (real LR-2026-000002): the value is printed against the
        # explicit label "Nature of Land" but lands at LABEL_VALUE_SPATIAL (0.8)
        # while a table cell under the aliased "Classification" header reads a
        # different semantic ("Bastu" = HOMESTEAD). The canonical-primary-label
        # precedence must outrank the raw higher-weighted group.
        table = {
            "table_index": 1,
            "structure_status": "RULING_LINES",
            "source": "ruling-lines",
            "rows": [
                {
                    "row_index": 0,
                    "cells": [
                        _cell(0, "Plot No.", 0), _cell(1, "Classification", 0), _cell(2, "Area (Acre)", 0),
                    ],
                },
                {
                    "row_index": 1,
                    "cells": [
                        _cell(0, "112", 1), _cell(1, "Bastu", 1), _cell(2, "0.32", 1),
                    ],
                },
            ],
        }
        ocr = _build_ocr([_line("Record of Rights (RoR)", 1, "TITLE")], tables=[table])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        spatial = self._cand("land.nature_of_land", "Agricultural", ExtractionMethod.LABEL_VALUE_SPATIAL, 0.7)
        spatial.label = "Nature of Land"
        cands.append(spatial)
        selected, conflicts = CandidateReconciler().reconcile(cands)
        assert selected["land.nature_of_land"].value == "AGRICULTURAL"
        assert selected["land.nature_of_land"].method == ExtractionMethod.LABEL_VALUE_SPATIAL
        assert conflicts, "expected a surfaced HOMESTEAD conflict"
        assert any(a["value"] == "HOMESTEAD" for a in conflicts[0]["alternatives"])

    def test_nature_of_land_table_wins_without_primary_label(self):
        # No explicit "Nature of Land" label hits the field, so a lone table
        # cell must NOT be hijacked by a stray low-confidence alias line.
        table = {
            "table_index": 1,
            "structure_status": "RULING_LINES",
            "source": "ruling-lines",
            "rows": [
                {
                    "row_index": 0,
                    "cells": [
                        _cell(0, "Plot No.", 0), _cell(1, "Classification", 0), _cell(2, "Area (Acre)", 0),
                    ],
                },
                {
                    "row_index": 1,
                    "cells": [
                        _cell(0, "112", 1), _cell(1, "Bastu", 1), _cell(2, "0.32", 1),
                    ],
                },
            ],
        }
        ocr = _build_ocr([_line("Record of Rights (RoR)", 1, "TITLE")], tables=[table])
        doc = OCRDocument.build(ocr)
        cands = CandidateGenerator().generate(doc)
        selected, conflicts = CandidateReconciler().reconcile(cands)
        assert selected["land.nature_of_land"].value == "HOMESTEAD"
        assert selected["land.nature_of_land"].method == ExtractionMethod.TABLE_CELL


class TestSemanticExtractionPipeline:
    """End-to-end pipeline on a synthetic RoR mirroring the real sample."""

    def _ror_ocr(self):
        lines = [
            _line("Record of Rights (RoR)", 1, "TITLE"),
            _line("Land and Land Reforms Department", 2, "HEADER"),
            _line("WEST BENGAL", 3, "HEADER"),
            _line("District : Nadia", 4),
            _line("Mouza : Krishnanagar", 5),
            _line("KhaitanNo. : 45", 6),
            _line("Name of Recorded Tenant : Ramesh Chandra Saha", 7),
            _line("Late Haripada Saha", 8),
            _line("Mutation No. : 1023", 9),
            _line("Date of Mutation : 12-06-2018", 10),
            _line("Date : 15-07-2023", 11),
        ]
        tables = [{
            "table_index": 1,
            "structure_status": "RULING_LINES",
            "source": "ruling-lines",
            "rows": [
                {"row_index": 0, "cells": [
                    _cell(0, "Plot No.", 0), _cell(1, "Classification", 0), _cell(2, "Area (Acre)", 0)]},
                {"row_index": 1, "cells": [
                    _cell(0, "112", 1), _cell(1, "Bastu", 1), _cell(2, "0.32", 1)]},
            ],
        }]
        ocr = _build_ocr(lines, tables=tables, gov={"header_detected": True})
        return ocr

    def test_full_pipeline_extracts_fields(self):
        with patch.dict(os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "1"}, clear=False):
            pipe = SemanticExtractionPipeline(self._ror_ocr(), document_type="RECORD_OF_RIGHTS")
            record, metadata, info = pipe.run()

        assert record.document["document_title"].startswith("Record of Rights")
        assert record.document["department"] == "Land and Land Reforms Department"
        assert record.document["document_date"] == "2023-07-15"
        assert record.location["district"] == "Nadia"
        assert record.location["mouza"] == "Krishnanagar"
        assert record.location["state"] == "West Bengal"
        assert record.land["khata_number"] == "45"
        assert record.land["plot_number"] == "112"
        assert record.land["area"] == 0.32
        assert record.land["area_unit"] == "ACRE"
        assert record.land["nature_of_land"] == "HOMESTEAD"
        assert record.owner["recorded_tenant"] == "Ramesh Chandra Saha"
        assert record.mutation["mutation_number"] == "1023"
        assert record.mutation["mutation_date"] == "2018-06-12"

        assert info["models"]["indicbart"] == "DISABLED"
        assert info["models"]["mistral"] == "UNAVAILABLE"

    def test_no_hallucination_for_absent_fields(self):
        # registration not applicable to RoR, and issue date absent entirely.
        with patch.dict(os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "1"}, clear=False):
            pipe = SemanticExtractionPipeline(self._ror_ocr(), document_type="RECORD_OF_RIGHTS")
            record, metadata, info = pipe.run()

        assert "registration" not in record.registration or record.registration == {}
        meta_date = metadata["registration.issue_date"]
        assert meta_date.status in (FieldStatus.NOT_APPLICABLE, FieldStatus.MISSING)

    def test_storage_ids_preserved(self):
        with patch.dict(os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "1"}, clear=False):
            pipe = SemanticExtractionPipeline(self._ror_ocr(), document_type="RECORD_OF_RIGHTS")
            record, metadata, info = pipe.run()
        assert record.record_id == "LR-2026-TEST"
        assert record.document_id == "DOC-2026-TEST"
        assert record.ingestion_id == "ING-2026-TEST"

    def test_mistral_unavailable_reported_honestly(self, monkeypatch):
        monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
        with patch.dict(os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "1"}, clear=False):
            pipe = SemanticExtractionPipeline(self._ror_ocr(), document_type="RECORD_OF_RIGHTS")
            record, metadata, info = pipe.run()
        assert info["models"]["mistral"] == "UNAVAILABLE"

    def test_empty_document_yields_no_fields(self):
        ocr = _build_ocr([_line("Blank page", 1)])
        with patch.dict(os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "1"}, clear=False):
            pipe = SemanticExtractionPipeline(ocr, document_type="RECORD_OF_RIGHTS")
            record, metadata, info = pipe.run()
        extracted = [fm for fm in metadata.values() if fm.status == FieldStatus.EXTRACTED]
        assert len(extracted) == 0


def _ollama_model_present(model: str = "qwen3:8b") -> bool:
    """True when the local Ollama server serves the expected model."""
    import requests

    try:
        resp = requests.get("http://localhost:11434/api/tags", timeout=5)
        if not resp.ok:
            return False
        return any(
            str(m.get("name", "")).startswith(model.split(":")[0] + ":")
            for m in resp.json().get("models", [])
        )
    except Exception:
        return False


class TestOllamaProvider:
    """Ollama/qwen3:8b provider: selection, honesty, grounding, live check."""

    def _ror_ocr(self):
        return _build_ocr([
            _line("Record of Rights (RoR)", 1, "TITLE"),
            _line("District : Nadia", 2),
            _line("Mouza : Krishnanagar", 3),
            _line("Khata No. : 45", 4),
            _line("Plot No. : 112", 5),
        ])

    def test_ollama_not_attempted_by_default(self, monkeypatch):
        monkeypatch.delenv("LLM_PROVIDER", raising=False)
        monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
        with patch.dict(os.environ, {"ZAMEENAI_PHASE07_DISABLE_INDICBART": "1"}, clear=False):
            with patch.object(
                OllamaExtractor, "extract",
                side_effect=AssertionError("Ollama must not be called by default"),
            ):
                pipe = SemanticExtractionPipeline(self._ror_ocr(), document_type="RECORD_OF_RIGHTS")
                record, metadata, info = pipe.run()
        assert info["models"]["mistral"] == "UNAVAILABLE"
        assert info["models"]["ollama"] == "UNAVAILABLE"

    def test_ollama_unreachable_is_honest(self):
        env = {
            "ZAMEENAI_PHASE07_DISABLE_INDICBART": "1",
            "LLM_PROVIDER": "ollama",
            "OLLAMA_BASE_URL": "http://127.0.0.1:1",
            "OLLAMA_MODEL": "qwen3:8b",
        }
        with patch.dict(os.environ, env, clear=False):
            pipe = SemanticExtractionPipeline(self._ror_ocr(), document_type="RECORD_OF_RIGHTS")
            record, metadata, info = pipe.run()
        assert info["models"]["ollama"] == "UNAVAILABLE"
        assert info["models"]["mistral"] == "UNAVAILABLE"
        # Pipeline still succeeds on deterministic evidence; absent stays null.
        assert metadata["land.khata_number"].status == FieldStatus.EXTRACTED
        assert metadata["registration.issue_date"].status in (
            FieldStatus.NOT_APPLICABLE, FieldStatus.MISSING)

    def test_mistral_never_called_when_ollama(self, monkeypatch):
        monkeypatch.setenv("MISTRAL_API_KEY", "dummy-key-must-not-be-used")
        env = {
            "ZAMEENAI_PHASE07_DISABLE_INDICBART": "1",
            "LLM_PROVIDER": "ollama",
            "OLLAMA_BASE_URL": "http://127.0.0.1:1",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch.object(
                MistralExtractor, "extract",
                side_effect=AssertionError("Mistral must not be called when LLM_PROVIDER=ollama"),
            ):
                pipe = SemanticExtractionPipeline(self._ror_ocr(), document_type="RECORD_OF_RIGHTS")
                record, metadata, info = pipe.run()
        assert info["models"]["mistral"] == "UNAVAILABLE"

    def test_provider_parsing(self, monkeypatch):
        monkeypatch.delenv("LLM_PROVIDER", raising=False)
        assert _llm_provider() == "mistral"
        monkeypatch.setenv("LLM_PROVIDER", "ollama")
        assert _llm_provider() == "ollama"
        monkeypatch.setenv("LLM_PROVIDER", "AUTO")
        assert _llm_provider() == "auto"
        monkeypatch.setenv("LLM_PROVIDER", "nonsense")
        assert _llm_provider() == "mistral"

    def test_think_block_stripping(self):
        raw = '<think>reasoning trace {"fields": []}</think>\n{"fields": []}'
        assert _strip_think_blocks(raw) == '{"fields": []}'
        assert _strip_think_blocks('{"fields": []}') == '{"fields": []}'

    def test_extract_json_object_from_prose(self):
        raw = 'Here is the result:\n{"fields": [{"field": "a", "value": "b"}]}\nDone.'
        assert json.loads(_extract_json_object(raw)) == {
            "fields": [{"field": "a", "value": "b"}]
        }

    def test_extract_json_object_ignores_braces_in_strings(self):
        raw = 'x {"k": "a}b {c", "n": 1} tail'
        assert json.loads(_extract_json_object(raw)) == {"k": "a}b {c", "n": 1}

    def test_extract_json_object_no_object_raises(self):
        with pytest.raises(ValueError):
            _extract_json_object("no braces here")
        with pytest.raises(ValueError):
            _extract_json_object('{"unbalanced": true')

    def test_grounding_drops_invented_values(self):
        ocr = _build_ocr([_line("District : Nadia", 1)])
        doc = OCRDocument.build(ocr)

        def _cand(field, value, raw):
            return EvidenceCandidate(
                field_name=field, value=value, raw_value=raw, label=field,
                label_score=0.9, confidence=0.9, method=ExtractionMethod.OLLAMA,
                page=1, source_text=raw, source_model="qwen3:8b")

        grounded = _cand("location.district", "Nadia", "District : Nadia")
        invented = _cand("owner.name", "Invented Person", "Invented Person")
        kept = _ground_llm_candidates(doc, [grounded, invented])
        assert [c.field_name for c in kept] == ["location.district"]

    def test_ollama_live_qwen3(self):
        if not _ollama_model_present():
            pytest.skip("Ollama qwen3 model not available locally")
        env = {
            "ZAMEENAI_PHASE07_DISABLE_INDICBART": "1",
            "LLM_PROVIDER": "ollama",
        }
        with patch.dict(os.environ, env, clear=False):
            pipe = SemanticExtractionPipeline(self._ror_ocr(), document_type="RECORD_OF_RIGHTS")
            record, metadata, info = pipe.run()
        assert info["models"]["ollama"] == "USED"
        assert info["models"]["mistral"] == "UNAVAILABLE"
        # Deterministic core intact; invented fields stay null.
        assert metadata["land.khata_number"].status == FieldStatus.EXTRACTED
        assert metadata["registration.issue_date"].status in (
            FieldStatus.NOT_APPLICABLE, FieldStatus.MISSING)