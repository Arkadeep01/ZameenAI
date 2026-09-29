"""Decomposed from phase07_semantic_field_extraction.py: candidates. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import difflib
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .models import *
from .terminology import *
from .normalization import *
from .evidence import *
from .normalization import (_align_area_unit, _find_date_tokens, _ocr_pipe_to_i)

import logging
logger = logging.getLogger(__name__)

class CandidateGenerator:
    """Generate field candidates from OCR evidence using semantic label matching."""

    NUMERIC_FIELDS = {
        "land.survey_number",
        "land.khasra_number",
        "land.plot_number",
        "land.khata_number",
        "mutation.mutation_number",
        "registration.document_number",
    }
    DATE_FIELDS = {
        "document.document_date",
        "mutation.mutation_date",
        "registration.registration_date",
        "registration.issue_date",
    }
    PERSON_FIELDS = {
        "owner.name",
        "owner.father_husband_name",
        "owner.co_owner",
        "owner.recorded_tenant",
    }
    LOCATION_FIELDS = {
        "location.state",
        "location.district",
        "location.block",
        "location.tehsil",
        "location.mouza",
        "location.village",
    }

    def generate(self, doc: OCRDocument) -> List[EvidenceCandidate]:
        candidates: List[EvidenceCandidate] = []
        self._generate_from_lines(doc, candidates)
        self._generate_from_tables(doc, candidates)
        self._generate_static_evidence(doc, candidates)
        return candidates

    # -- line based label -> value -------------------------------------------

    def _generate_from_lines(self, doc: OCRDocument, out: List[EvidenceCandidate]) -> None:
        lines = sorted(doc.lines, key=lambda l: (l.page, l.reading_order))

        for idx, line in enumerate(lines):
            field, score, alias = self._match_line_label(line.text)
            if not field:
                # Standard RoR convention: "Late <deceased father/husband>".
                late_name = self._extract_late_kin(line.text)
                if late_name and is_reasonable_person_name(late_name):
                    out.append(
                        EvidenceCandidate(
                            field_name="owner.father_husband_name",
                            value=late_name,
                            raw_value=line.text,
                            label="Late",
                            label_score=0.9,
                            confidence=0.9,
                            method=ExtractionMethod.DETERMINISTIC,
                            page=line.page,
                            bbox=line.bbox,
                            source_text=line.text,
                        )
                    )
                continue

            value = self._extract_value(line.text, alias)
            if value:
                out.append(
                    EvidenceCandidate(
                        field_name=field,
                        value=value,
                        raw_value=value,
                        label=alias,
                        label_score=score,
                        confidence=min(0.95, 0.5 + score * 0.4),
                        method=ExtractionMethod.LABEL_VALUE_SAME_LINE,
                        page=line.page,
                        bbox=line.bbox,
                        source_text=line.text,
                    )
                )
            else:
                # label-only line: search the next 1-2 non-label lines for the value
                wrapped = self._find_wrapped_value(lines, idx, field)
                if wrapped:
                    out.append(
                        EvidenceCandidate(
                            field_name=field,
                            value=wrapped,
                            raw_value=wrapped,
                            label=alias,
                            label_score=score,
                            confidence=min(0.9, 0.4 + score * 0.4),
                            method=ExtractionMethod.LABEL_VALUE_NEXT_LINE,
                            page=line.page,
                            bbox=line.bbox,
                            source_text=line.text,
                        )
                    )
                else:
                    # two-column RoR: label and value share a visual row but were
                    # OCR'd as separate lines — bridge them spatially.
                    spatial = self._find_same_row_value(lines, idx, field)
                    if spatial:
                        out.append(
                            EvidenceCandidate(
                                field_name=field,
                                value=spatial,
                                raw_value=spatial,
                                label=alias,
                                label_score=score,
                                confidence=min(0.9, 0.4 + score * 0.4),
                                method=ExtractionMethod.LABEL_VALUE_SPATIAL,
                                page=line.page,
                                bbox=line.bbox,
                                source_text=line.text,
                            )
                        )

    def _match_line_label(self, text: str) -> Tuple[Optional[str], float, str]:
        # Try colon form first: "Label : value" -> match against the label part only.
        if ":" in text:
            label_part = text.split(":", 1)[0]
            if label_part.strip():
                field, score, alias = pick_best_label(label_part)
                if field and score >= 0.72:
                    return field, score, alias

        field, score, alias = pick_best_label(text)
        if field and score >= 0.72:
            # Same-line label->value requires the label to LEAD the line.
            # An alias embedded mid-line (e.g. "Rght (RoR) Nery") is an OCR
            # artifact, not a label; extracting the trailing token as a value
            # is a hallucination risk (e.g. "Nery" as document title).
            alias_norm = normalize_label(alias)
            if normalize_label(text).startswith(alias_norm):
                return field, score, alias

        return None, 0.0, ""

    def _extract_value(self, text: str, alias: str) -> Optional[str]:
        if ":" in text:
            after = text.split(":", 1)[1]
            after = clean_value(after)
            if after:
                return after

        # Try to strip the trailing alias from the line text (label + inline value w/o colon).
        alias_norm = normalize_label(alias)
        value = text
        idx = value.lower().find(alias_norm)
        if idx >= 0:
            candidate = value[idx + len(alias_norm):].strip(" :,;")
            candidate = clean_value(candidate)
            if candidate:
                return candidate
        return None

    @staticmethod
    def _extract_late_kin(text: str) -> Optional[str]:
        """Extract the person name following 'Late' (deceased father/husband).

        RoR documents conventionally write "Late Haripada Saha" on its own line
        next to the recorded tenant. This signal is more reliable than a weak
        label-wrapped grab of OCR garbage.
        """
        m = re.match(r"^(?:late|l\.)\s+([A-Za-z\u0900-\u09FF\u00C0-\u024F'.-]+(?:\s+[A-Za-z\u0900-\u09FF\u00C0-\u024F'.-]+){1,3})$", text.strip(), re.IGNORECASE)
        if m:
            return clean_value(m.group(1))
        return None

    def _find_wrapped_value(self, lines: List[SemanticLine], idx: int, field_name: str) -> Optional[str]:
        collected = []
        page = lines[idx].page
        for nxt in lines[idx + 1: idx + 4]:
            if nxt.page != page:
                break
            nxt_field, _, _ = self._match_line_label(nxt.text)
            if nxt_field and nxt_field != field_name:
                break
            cleaned = clean_value(nxt.text)
            if not cleaned:
                break
            if not collected and field_name in self.PERSON_FIELDS:
                # A person name almost never spans OCR lines; capturing more
                # lines glues the next field's family name onto this field.
                cleaned = self._first_person_name_token(cleaned)
            collected.append(cleaned)
            if len(collected) >= 3:
                break
            if field_name in self.PERSON_FIELDS:
                break

        if not collected:
            return None
        value = " ".join(collected)
        if len(value) < 2 or len(value) > 120:
            return None

        if field_name in self.NUMERIC_FIELDS and not is_reasonable_numeric_field(value):
            return None
        if field_name in self.DATE_FIELDS:
            date_tok = _find_date_tokens(value)
            if not date_tok:
                return None
            return date_tok
        if field_name in self.PERSON_FIELDS and not is_reasonable_person_name(value):
            return None
        if field_name in self.LOCATION_FIELDS and not is_reasonable_location(value):
            return None
        if field_name == "land.area" and not is_reasonable_area_value(value):
            return None

        return value

    def _find_same_row_value(self, lines: List[SemanticLine], idx: int, field_name: str) -> Optional[str]:
        """Bridge the two-column RoR layout where label and value share one visual row.

        The standard reading-order scan cannot see such values: the value line may
        precede the label in reading order, or a foreign label intervenes between
        them (as when "Block :" and its value are printed side by side but the page
        is read top-to-bottom, column-wise).  Scoped to location, date, and
        nature-of-land fields only — person-name rows are deliberately excluded so
        a "Late <kin>" line or a neighbouring tenant on the same row can never be
        captured as a spatial value.  Returns the same-row candidate that starts
        right of the label with the smallest horizontal gap, or None.
        """
        if not self._spatial_supported(field_name):
            return None
        label_line = lines[idx]
        if not label_line.bbox:
            return None
        lb = label_line.bbox
        page = label_line.page
        label_end = lb.x + lb.width

        best: Optional[Tuple[int, str]] = None
        for cand in lines:
            if cand is label_line or cand.page != page or not cand.bbox:
                continue
            cb = cand.bbox
            row_overlap = min(lb.y + lb.height, cb.y + cb.height) - max(lb.y, cb.y)
            if row_overlap < 0.5 * min(lb.height, cb.height):
                continue
            # The value must start at (or slightly before) the label's right edge;
            # a 15px tolerance absorbs OCR bbox padding on righthand columns.
            if cb.x < label_end - 15:
                continue
            cand_field, _, _ = self._match_line_label(cand.text)
            if cand_field and cand_field != field_name:
                continue
            raw = cand.text
            if field_name in self.LOCATION_FIELDS:
                raw = _ocr_pipe_to_i(raw)
            cleaned = clean_value(raw)
            if not cleaned or len(cleaned) < 2 or len(cleaned) > 120:
                continue
            if field_name in self.DATE_FIELDS:
                date_tok = _find_date_tokens(cleaned)
                if not date_tok:
                    continue
                cleaned = date_tok
            elif field_name == "land.nature_of_land":
                if not normalize_nature_of_land(cleaned):
                    continue
            elif field_name in self.LOCATION_FIELDS and not is_reasonable_location(cleaned):
                continue

            gap = abs(cb.x - label_end)
            if best is None or gap < best[0]:
                best = (gap, cleaned)

        return best[1] if best else None

    @staticmethod
    def _spatial_supported(field_name: str) -> bool:
        return (
            field_name in CandidateGenerator.LOCATION_FIELDS
            or field_name in CandidateGenerator.DATE_FIELDS
            or field_name == "land.nature_of_land"
        )

    @staticmethod
    def _first_person_name_token(value: str) -> str:
        """Take only the leading token(s) that look like a person name."""
        words = value.split()
        taken: List[str] = []
        for w in words:
            ww = w.strip(" ,;:.()\"'")
            if not ww:
                continue
            if not re.fullmatch(r"[A-Za-z\u0900-\u09FF\u00C0-\u024F'.-]+", ww):
                break
            taken.append(ww)
        return clean_value(" ".join(taken))

    # -- table based ---------------------------------------------------------

    def _generate_from_tables(self, doc: OCRDocument, out: List[EvidenceCandidate]) -> None:
        for table in doc.tables:
            if not table.data_rows:
                continue

            headers = table.header_cells
            header_fields: List[Tuple[Optional[str], float, str]] = []
            for cell in headers:
                field, score, alias = self._match_line_label(cell.text)
                header_fields.append((field, score, alias))

            for row in table.data_rows:
                for col_idx, cell in enumerate(row):
                    if col_idx >= len(header_fields):
                        continue
                    field, score, alias = header_fields[col_idx]
                    if not field:
                        continue
                    value = clean_value(cell.text)
                    if not value:
                        continue
                    out.append(
                        EvidenceCandidate(
                            field_name=field,
                            value=value,
                            raw_value=cell.text,
                            label=alias,
                            label_score=score,
                            confidence=min(0.97, 0.55 + score * 0.4),
                            method=ExtractionMethod.TABLE_CELL,
                            page=cell.page,
                            bbox=cell.bbox,
                            source_text=f"table[{table.table_index}] r{cell.row_index} c{cell.column_index}",
                        )
                    )

                    # If the header contains an area unit, emit area_unit for the row.
                    if field == "land.area":
                        unit = self._unit_from_header(header_fields)
                        if unit:
                            out.append(
                                EvidenceCandidate(
                                    field_name="land.area_unit",
                                    value=unit,
                                    raw_value=alias,
                                    label=alias,
                                    label_score=score,
                                    confidence=min(0.97, 0.5 + score * 0.4),
                                    method=ExtractionMethod.TABLE_COLUMN_HEADER,
                                    page=cell.page,
                                    bbox=cell.bbox,
                                    source_text=f"table[{table.table_index}] header",
                                )
                            )

    def _unit_from_header(self, header_fields: List[Tuple[Optional[str], float, str]]) -> Optional[str]:
        for field, _score, alias in header_fields:
            if field == "land.area":
                for key, unit in AREA_UNIT_MAP.items():
                    if key in (alias or "").lower() or key in normalize_label(alias):
                        return unit
        return None

    # -- static / structural evidence ----------------------------------------

    def _generate_static_evidence(self, doc: OCRDocument, out: List[EvidenceCandidate]) -> None:
        # Government header: state + department + title from header/footer signals.
        gov = doc.government_evidence or {}
        if gov.get("header_detected") or gov.get("department_detected"):
            low_text = doc.full_text.lower()
            if "west bengal" in low_text:
                out.append(
                    EvidenceCandidate(
                        field_name="location.state",
                        value="West Bengal",
                        raw_value="WEST BENGAL",
                        label="State",
                        label_score=0.9,
                        confidence=0.9,
                        method=ExtractionMethod.DETERMINISTIC,
                        page=1,
                        source_text="government header",
                    )
                )

        # Document title from the immediate text (OCR may garble it).
        title = self._detect_document_title(doc.full_text)
        if title:
            out.append(
                EvidenceCandidate(
                    field_name="document.document_title",
                    value=title,
                    raw_value=title,
                    label="Record of Rights",
                    label_score=0.95,
                    confidence=0.9,
                    method=ExtractionMethod.DETERMINISTIC,
                    page=1,
                    source_text="document header text",
                )
            )

        # Department commonly appears as a fixed line + in gov evidence.
        dept = self._detect_department(doc.full_text)
        if dept:
            out.append(
                EvidenceCandidate(
                    field_name="document.department",
                    value=dept,
                    raw_value=dept,
                    label="Land and Land Reforms Department",
                    label_score=0.95,
                    confidence=0.92,
                    method=ExtractionMethod.DETERMINISTIC,
                    page=1,
                    source_text="document header text",
                )
            )

    @staticmethod
    def _detect_document_title(text: str) -> Optional[str]:
        low = text.lower()
        for key, mapped in sorted(DOCUMENT_TITLE_MAP.items(), key=lambda kv: -len(kv[0])):
            if key in low:
                return mapped
        # Fuzzy fallback on lines containing "record of rights" / "khatian".
        for line in (text or "").splitlines():
            ln = line.lower()
            if "record of rights" in ln or "ror" in ln:
                return "Record of Rights (RoR)"
            if "khatian" in ln:
                return "Khatian"
        return None

    @staticmethod
    def _detect_department(text: str) -> Optional[str]:
        low = text.lower()
        for keyword in [
            "land and land reforms department",
            "land & land reforms department",
            "land reforms department",
            "department of land and land reforms",
            "department of land",
        ]:
            if keyword in low:
                return "Land and Land Reforms Department"
        if "land" in low and "reforms" in low:
            return "Land and Land Reforms Department"
        return None

class FieldValidator:
    """Validator for field-specific constraints."""

    VALIDATORS = {
        "document.document_title": (is_reasonable_document_title, None),
        "document.department": (is_reasonable_document_title, None),
        "document.document_date": (is_valid_date_candidate, normalize_date),
        "mutation.mutation_date": (is_valid_date_candidate, normalize_date),
        "registration.registration_date": (is_valid_date_candidate, normalize_date),
        "registration.issue_date": (is_valid_date_candidate, normalize_date),
        "land.plot_number": (is_reasonable_numeric_field, extract_number),
        "land.khata_number": (is_reasonable_numeric_field, extract_number),
        "land.survey_number": (is_reasonable_numeric_field, extract_number),
        "land.khasra_number": (is_reasonable_numeric_field, extract_number),
        "mutation.mutation_number": (is_reasonable_numeric_field, extract_number),
        "owner.name": (is_reasonable_person_name, normalize_name),
        "owner.recorded_tenant": (is_reasonable_person_name, normalize_name),
        "owner.father_husband_name": (is_reasonable_person_name, normalize_name),
        "owner.co_owner": (is_reasonable_person_name, normalize_name),
        "location.district": (is_reasonable_location, None),
        "location.block": (is_reasonable_location, None),
        "location.tehsil": (is_reasonable_location, None),
        "location.mouza": (is_reasonable_location, None),
        "location.village": (is_reasonable_location, None),
        "land.area": (is_reasonable_area_value, None),
        "land.nature_of_land": (None, normalize_nature_of_land),
    }

    @classmethod
    def validate(cls, field_name: str, value: str) -> Tuple[bool, Optional[Any]]:
        """Validate a field value and return (is_valid, normalized_value)."""
        if field_name not in cls.VALIDATORS:
            return True, value

        validator, normalizer = cls.VALIDATORS[field_name]

        if validator and not validator(value):
            return False, None

        if normalizer:
            normalized = normalizer(value)
            if normalized is None and validator:
                return False, None
            return True, normalized

        return True, value

class CandidateReconciler:
    """Reconcile multiple evidence candidates into one decision per field."""

    SOURCE_WEIGHTS = {
        ExtractionMethod.TABLE_CELL: 1.0,
        ExtractionMethod.TABLE_COLUMN_HEADER: 1.0,
        ExtractionMethod.LABEL_VALUE_SAME_LINE: 0.95,
        ExtractionMethod.LABEL_VALUE_NEXT_LINE: 0.85,
        ExtractionMethod.DETERMINISTIC: 0.9,
        ExtractionMethod.MISTRAL: 0.9,
        ExtractionMethod.OLLAMA: 0.9,
        ExtractionMethod.INDICBART_NORMALIZED: 0.8,
        ExtractionMethod.AI_SEMANTIC: 0.85,
        ExtractionMethod.RECONCILED: 1.0,
        ExtractionMethod.REGEX_PATTERN: 0.7,
        ExtractionMethod.LABEL_VALUE_SPATIAL: 0.8,
    }

    # Fields where an explicitly-printed canonical label (e.g. "Nature of Land")
    # must outrank a higher-weighted group that only carries an alias label
    # (e.g. a "Classification" table cell). In the two-column RoR layout the
    # explicitly-labeled value often lands at LABEL_VALUE_SPATIAL weight (0.8)
    # even though it is the direct answer to the printed label, while a table
    # cell under an alias header can carry a semantically different value
    # ("Bastu" under the Classification column), so raw weight must not decide.
    LABEL_PRECEDENCE_FIELDS = {
        "land.nature_of_land",
        *CandidateGenerator.LOCATION_FIELDS,
        *CandidateGenerator.DATE_FIELDS,
    }

    def reconcile(
        self,
        candidates: List[EvidenceCandidate],
    ) -> Tuple[Dict[str, EvidenceCandidate], List[Dict[str, Any]]]:
        """Pick the best candidate per field; detect conflicts.

        Returns (selected, conflicts).
        """
        # Align unit-less area candidates with the document-level area unit so
        # "0.32" (table cell) and "0.32 Acre" (label line) reconcile as one value.
        doc_area_unit = self._document_area_unit(candidates)

        by_field: Dict[str, List[EvidenceCandidate]] = {}
        for cand in candidates:
            if cand.field_name == "land.area":
                _align_area_unit(cand, doc_area_unit)
            by_field.setdefault(cand.field_name, []).append(cand)

        selected: Dict[str, EvidenceCandidate] = {}
        conflicts: List[Dict[str, Any]] = []

        for field_name, cands in by_field.items():
            # Validate and normalize each candidate.
            normalized: List[EvidenceCandidate] = []
            for c in cands:
                ok, norm_val = self._validate_field(field_name, c.value)
                if not ok:
                    continue
                c.value = norm_val if isinstance(norm_val, str) else c.value
                normalized.append(c)

            if not normalized:
                continue

            # Group by normalized value
            groups: Dict[str, List[EvidenceCandidate]] = {}
            for c in normalized:
                groups.setdefault(self._group_key(field_name, c.value), []).append(c)

            ranked = sorted(groups.items(), key=lambda kv: -self._group_score(kv[1]))

            best_value, best_group = ranked[0]
            best_score = self._group_score(best_group)

            # An explicit canonical-primary label outranks a table-only aliased
            # group in the two-column RoR layout (see LABEL_PRECEDENCE_FIELDS).
            explicit = self._explicit_label_group(field_name, ranked)
            if explicit is not None:
                explicit_value, explicit_group = explicit
                if explicit_value != best_value and self._group_score(explicit_group) >= best_score * 0.5:
                    best_value, best_group = explicit_value, explicit_group
                    best_score = self._group_score(explicit_group)

            conflicts_for_field = []
            for other_value, other_group in ranked:
                if other_value == best_value:
                    continue
                other_score = self._group_score(other_group)
                if other_score >= best_score * 0.8:
                    conflicts_for_field.append(
                        {"field": field_name, "value": other_value, "confidence": round(other_score, 4)}
                    )

            if conflicts_for_field:
                conflicts.append(
                    {
                        "field": field_name,
                        "selected": best_value,
                        "alternatives": conflicts_for_field,
                    }
                )

            best = self._pick_from_group(best_group)
            best.confidence = min(0.99, best_score)
            selected[field_name] = best

        return selected, conflicts

    def _validate_field(self, field_name: str, value: str) -> Tuple[bool, Optional[Any]]:
        return FieldValidator.validate(field_name, value)

    def _document_area_unit(self, candidates: List[EvidenceCandidate]) -> Optional[str]:
        for cand in candidates:
            if cand.field_name == "land.area_unit":
                unit = cand.value.strip().upper()
                if unit:
                    return unit
            if cand.field_name == "land.area":
                _value, detected_unit = normalize_area(cand.value)
                if detected_unit:
                    return detected_unit
        return None

    def _group_key(self, field_name: str, value: str) -> str:
        """Canonical key so semantically-equal raw values merge into one group.

        e.g. ``0.32`` and ``0.32 Acre`` both key as ``0.32-ACRE`` so a table cell
        and a label line referring to the same area do not become a false conflict.
        """
        if field_name == "land.area":
            area_val, unit = normalize_area(value)
            if area_val is not None:
                return f"{area_val}-{unit or 'NA'}"
            return value
        if field_name in ("document.document_date", "mutation.mutation_date",
                          "registration.registration_date", "registration.issue_date"):
            key = normalize_date(value)
            return key or value
        if field_name in ("land.plot_number", "land.khata_number", "land.survey_number",
                          "land.khasra_number", "mutation.mutation_number",
                          "registration.document_number"):
            key = extract_number(value)
            return key or value
        return value

    def _group_score(self, group: List[EvidenceCandidate]) -> float:
        if not group:
            return 0.0
        base = sum(
            c.confidence * self.SOURCE_WEIGHTS.get(c.method, 0.8) for c in group
        ) / len(group)
        # Agreement across multiple independent sources boosts confidence.
        distinct_methods = {c.method for c in group}
        bonus = min(0.15, 0.05 * (len(distinct_methods) - 1))
        return min(1.0, base + bonus)

    def _pick_from_group(self, group: List[EvidenceCandidate]) -> EvidenceCandidate:
        return max(group, key=lambda c: c.confidence * self.SOURCE_WEIGHTS.get(c.method, 0.8))

    def _explicit_label_group(
        self,
        field_name: str,
        ranked: List[Tuple[str, List[EvidenceCandidate]]],
    ) -> Optional[Tuple[str, List[EvidenceCandidate]]]:
        """Return the highest-ranked group carrying the field's canonical primary label.

        A group qualifies when any of its candidates was extracted from a line
        through a label-value method whose matched label equals the field's
        primary alias (e.g. "Nature of Land" for ``land.nature_of_land``).
        Unless this group is already the best score, it only overrides when its
        evidence is still substantial (>= 50% of the top score) so a stray,
        low-confidence label hit cannot hijack a confidently-table-backed value.
        """
        if field_name not in self.LABEL_PRECEDENCE_FIELDS:
            return None
        primary = (LABEL_ALIASES.get(field_name) or [""])[0]
        if not primary:
            return None
        primary_norm = normalize_label(primary)
        label_methods = {
            ExtractionMethod.LABEL_VALUE_SAME_LINE,
            ExtractionMethod.LABEL_VALUE_NEXT_LINE,
            ExtractionMethod.LABEL_VALUE_SPATIAL,
        }
        for value, group in ranked:
            for c in group:
                if c.method in label_methods and normalize_label(c.label or "") == primary_norm:
                    return value, group
        return None
