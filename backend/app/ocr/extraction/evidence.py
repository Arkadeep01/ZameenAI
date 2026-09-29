"""Decomposed from phase07_semantic_field_extraction.py: evidence. (Authoritative implementation; verbatim move.)"""
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
from .terminology import (_compute_similarity, _ocr_text_similarity)

import logging
logger = logging.getLogger(__name__)

@dataclass
class OCRWord:
    text: str
    confidence: float
    bbox: BoundingBox
    page_number: int = 1
    line_num: int = 0
    word_num: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "confidence": self.confidence,
            "bbox": self.bbox.to_dict(),
            "page_number": self.page_number,
            "line_num": self.line_num,
            "word_num": self.word_num,
        }

@dataclass
class OCRRow:
    line_num: int
    page_number: int
    words: List[OCRWord]

    @property
    def text(self) -> str:
        return " ".join(w.text for w in self.words)

    @property
    def bbox(self) -> BoundingBox:
        if not self.words:
            return BoundingBox(x=0, y=0, width=0, height=0)
        min_x = min(w.bbox.x for w in self.words)
        min_y = min(w.bbox.y for w in self.words)
        max_x = max(w.bbox.x + w.bbox.width for w in self.words)
        max_y = max(w.bbox.y + w.bbox.height for w in self.words)
        return BoundingBox(x=min_x, y=min_y, width=max_x - min_x, height=max_y - min_y)

@dataclass
class Candidate:
    field_name: str
    value: str
    raw_value: str
    ocr_word: OCRWord
    label: str
    label_match_score: float
    spatial_score: float
    validation_score: float
    total_score: float
    method: ExtractionMethod

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field_name": self.field_name,
            "value": self.value,
            "raw_value": self.raw_value,
            "label": self.label,
            "label_match_score": round(self.label_match_score, 4),
            "spatial_score": round(self.spatial_score, 4),
            "validation_score": round(self.validation_score, 4),
            "total_score": round(self.total_score, 4),
            "method": self.method.value,
            "bbox": self.ocr_word.bbox.to_dict(),
            "ocr_confidence": round(self.ocr_word.confidence, 4),
        }

class SemanticExtractor:
    """Legacy-compatible OCR representation builder and label locator.

    Retained for backward compatibility and as a low-level evidence source.
    The authoritative extraction pipeline is owned by SemanticExtractionService.
    """

    def __init__(self, ocr_result: Dict):
        self.ocr_result = ocr_result
        self.words: List[OCRWord] = []
        self.rows: List[OCRRow] = []
        self._build_internal_representation()

    def _build_internal_representation(self) -> None:
        """Build internal OCR representation from Phase 06 output."""
        for page in self.ocr_result.get("pages", []):
            page_num = page.get("page_number", 1)
            for word_data in page.get("words", []):
                bbox_data = word_data.get("bbox", {})
                word = OCRWord(
                    text=word_data.get("text", ""),
                    confidence=word_data.get("confidence", 0.0) or 0.0,
                    bbox=BoundingBox(
                        x=bbox_data.get("x", 0),
                        y=bbox_data.get("y", 0),
                        width=bbox_data.get("width", 0),
                        height=bbox_data.get("height", 0),
                    ),
                    page_number=page_num,
                    line_num=word_data.get("line_num", 0),
                    word_num=word_data.get("word_num", 0),
                )
                self.words.append(word)

        self._build_rows()

    def _build_rows(self) -> None:
        """Group words into logical rows using line_num."""
        by_line: Dict[Tuple[int, int], List[OCRWord]] = {}
        for word in self.words:
            key = (word.page_number, word.line_num)
            by_line.setdefault(key, []).append(word)

        for (page_num, line_num), line_words in sorted(by_line.items()):
            line_words.sort(key=lambda w: w.word_num)
            row = OCRRow(line_num=line_num, page_number=page_num, words=line_words)
            self.rows.append(row)

    def find_label_positions(self, field_name: str, aliases: List[str]) -> List[Tuple[OCRWord, str]]:
        """Find all OCR word positions matching any of the field's aliases."""
        positions = []

        for alias in aliases:
            norm_alias = normalize_label(alias)
            alias_tokens = norm_alias.split()

            for row in self.rows:
                for word in row.words:
                    word_text = word.text.strip()
                    if not word_text:
                        continue
                    word_norm = normalize_label(word_text)
                    if not word_norm or len(word_norm) < 2:
                        continue
                    if self._is_stop_word(word_norm):
                        continue
                    if not alias_tokens:
                        continue
                    if self._label_word_matches_alias_word(word_norm, alias_tokens[0]):
                        if len(alias_tokens) == 1:
                            if word.confidence >= 0.5 and len(word_norm) >= 2:
                                positions.append((word, alias))
                        else:
                            multi_word_match = self._validate_multi_word_label(row, word, alias_tokens)
                            if multi_word_match:
                                positions.append((word, alias))

        return positions

    def _is_stop_word(self, word: str) -> bool:
        stop_words = {
            'of', 'the', 'a', 'an', 'and', 'or', 'in', 'to', 'is', 'it',
            'at', 'by', 'on', 'for', 'with', 'as', 'from', 'be', 'are',
            'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
            'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
            'can', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he',
            'she', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
            'his', 'her', 'its', 'our', 'their', 'no', 'so', 'if', 'then',
        }
        return word in stop_words

    def _label_word_matches_alias_word(self, word_norm: str, alias_token: str) -> bool:
        if word_norm == alias_token:
            return True
        if len(word_norm) >= 3 and len(alias_token) >= 3:
            if word_norm.startswith(alias_token) or alias_token.startswith(word_norm):
                return True
            if _compute_similarity(word_norm, alias_token) > 0.75:
                return True
            if _ocr_text_similarity(word_norm, alias_token) > 0.7:
                return True
        return False

    def _validate_multi_word_label(self, row: OCRRow, start_word: OCRWord, alias_tokens: List[str]) -> bool:
        if len(alias_tokens) < 2:
            return False

        start_idx = None
        for i, w in enumerate(row.words):
            if w.word_num == start_word.word_num:
                start_idx = i
                break

        if start_idx is None:
            return False

        essential_matches = 0
        stop_words_in_alias = {'of', 'the', 'a', 'an', 'and', 'or'}

        for i in range(start_idx, min(start_idx + len(alias_tokens) + 3, len(row.words))):
            w = row.words[i]
            w_norm = normalize_label(w.text)

            if not w_norm or len(w_norm) < 2:
                continue

            current_alias_token = alias_tokens[min(essential_matches, len(alias_tokens) - 1)]

            if self._label_word_matches_alias_word(w_norm, current_alias_token):
                if current_alias_token not in stop_words_in_alias:
                    essential_matches += 1
                if essential_matches >= 2:
                    return True
            elif not self._is_stop_word(w_norm):
                if i - start_idx >= 2 and essential_matches >= 1:
                    return True
                break

        return essential_matches >= 2

    def get_candidates_for_label(
        self,
        field_name: str,
        label_word: OCRWord,
        label: str,
        row: OCRRow,
        max_tokens: int = 5,
    ) -> List[Candidate]:
        """Generate value candidates for a label based on spatial relationship."""
        candidates = []

        if label_word.confidence < 0.4:
            return candidates

        label_end_x = label_word.bbox.x + label_word.bbox.width

        same_row_words = [w for w in row.words if w.word_num > label_word.word_num]

        collected_tokens = []
        for w in same_row_words:
            if len(collected_tokens) >= max_tokens:
                break
            if w.confidence < 0.25:
                continue
            if len(w.text.strip()) < 1:
                continue

            distance = w.bbox.x - label_end_x
            if distance < -10:
                continue
            if distance > 300:
                break

            spatial_score = max(0.0, 1.0 - (distance / 300.0))
            validation_score = 1.0
            total_score = (spatial_score * 0.4 + w.confidence * 0.3 + validation_score * 0.3)

            candidate = Candidate(
                field_name=field_name,
                value=w.text,
                raw_value=w.text,
                ocr_word=w,
                label=label,
                label_match_score=1.0,
                spatial_score=spatial_score,
                validation_score=validation_score,
                total_score=total_score,
                method=ExtractionMethod.LABEL_VALUE_SAME_LINE,
            )
            candidates.append(candidate)
            collected_tokens.append(w)

        if len(collected_tokens) >= 2:
            multi_token_value = " ".join(w.text for w in collected_tokens)
            avg_conf = sum(w.confidence for w in collected_tokens) / len(collected_tokens)
            avg_spatial = sum(c.spatial_score for c in candidates) / len(candidates)

            multi_candidate = Candidate(
                field_name=field_name,
                value=multi_token_value,
                raw_value=multi_token_value,
                ocr_word=collected_tokens[0],
                label=label,
                label_match_score=1.0,
                spatial_score=avg_spatial,
                validation_score=1.0,
                total_score=avg_spatial * 0.4 + avg_conf * 0.3 + 1.0 * 0.3,
                method=ExtractionMethod.LABEL_VALUE_SAME_LINE,
            )
            candidates.insert(0, multi_candidate)

        return candidates

    def find_wrapped_value(self, field_name: str, after_row: OCRRow, row_index: int, max_rows: int = 3) -> Optional[str]:
        """Find wrapped value in subsequent rows."""
        wrapped_tokens = []
        for i in range(row_index + 1, min(row_index + 1 + max_rows, len(self.rows))):
            next_row = self.rows[i]
            if next_row.page_number != after_row.page_number:
                break
            if self._is_section_boundary(next_row):
                break

            for word in next_row.words[:5]:
                if self._looks_like_label(word):
                    return None
                wrapped_tokens.append(word.text)
                if len(wrapped_tokens) >= 5:
                    return " ".join(wrapped_tokens)

        return " ".join(wrapped_tokens) if wrapped_tokens else None

    def _is_section_boundary(self, row: OCRRow) -> bool:
        text_lower = row.text.lower()
        section_keywords = ["mutation", "registration", "owner", "land", "location", "remarks", "signature"]
        return any(kw in text_lower for kw in section_keywords)

    def _looks_like_label(self, word: OCRWord) -> bool:
        text_lower = word.text.lower()
        label_indicators = [":", "of", "no.", "no", "date", "number", "name"]
        return any(ind in text_lower for ind in label_indicators)

@dataclass
class EvidenceWord:
    text: str
    confidence: float
    bbox: BoundingBox
    page: int = 1
    region: str = ""
    script: str = ""

@dataclass
class SemanticLine:
    text: str
    page: int
    bbox: Optional[BoundingBox]
    region: str
    confidence: float
    reading_order: int
    words: List[EvidenceWord]

    @property
    def normalized_text(self) -> str:
        return normalize_label(self.text)

@dataclass
class TableCell:
    row_index: int
    column_index: int
    text: str
    confidence: float
    bbox: Optional[BoundingBox]
    page: int = 1

@dataclass
class EvidenceTable:
    table_index: int
    rows: List[List[TableCell]]
    page: int = 1
    structure_status: str = "UNKNOWN"
    source: str = ""

    @property
    def header_cells(self) -> List[TableCell]:
        return self.rows[0] if self.rows else []

    @property
    def data_rows(self) -> List[List[TableCell]]:
        return self.rows[1:] if len(self.rows) > 1 else []

@dataclass
class LanguageEvidence:
    language: str = ""
    script: str = ""
    confidence: float = 0.0
    multilingual: bool = False
    tesseract_codes: List[str] = field(default_factory=list)

@dataclass
class OCRDocument:
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    full_text: str = ""
    lines: List[SemanticLine] = field(default_factory=list)
    tables: List[EvidenceTable] = field(default_factory=list)
    language: Optional[LanguageEvidence] = None
    government_evidence: Dict[str, Any] = field(default_factory=dict)
    scripts_present: List[str] = field(default_factory=list)
    numeric_tokens: List[Dict[str, Any]] = field(default_factory=list)
    raw: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def build(cls, ocr_result: Dict) -> "OCRDocument":
        doc = cls()
        doc.record_id = ocr_result.get("record_id", "")
        doc.document_id = ocr_result.get("document_id", "")
        doc.ingestion_id = ocr_result.get("ingestion_id", "")
        doc.full_text = ocr_result.get("full_text", "") or ""
        doc.raw = ocr_result

        lang_data = ocr_result.get("language") or {}
        doc.language = LanguageEvidence(
            language=lang_data.get("language", ""),
            script=lang_data.get("script", ""),
            confidence=lang_data.get("confidence", 0.0),
            multilingual=lang_data.get("multilingual", False),
            tesseract_codes=lang_data.get("tesseract_codes", []),
        )

        for page in ocr_result.get("pages", []):
            cls._build_page(doc, page)

        if not doc.full_text:
            doc.full_text = "\n".join(line.text for line in doc.lines)

        return doc

    @staticmethod
    def _bbox(data: Any) -> Optional[BoundingBox]:
        if not data:
            return None
        if isinstance(data, dict):
            x = data.get("x", 0)
            y = data.get("y", 0)
            w = data.get("width", 0)
            h = data.get("height", 0)
        elif isinstance(data, (list, tuple)) and len(data) >= 4:
            x = data[0]
            y = data[1]
            w = data[2] - data[0]
            h = data[3] - data[1]
        else:
            return None
        return BoundingBox(x=int(x), y=int(y), width=int(w), height=int(h))

    @classmethod
    def _build_page(cls, doc: OCRDocument, page: Dict[str, Any]) -> None:
        page_num = page.get("page_number", page.get("page", 1))

        gov = page.get("government_document_evidence")
        if gov and not doc.government_evidence:
            doc.government_evidence = gov

        scripts = page.get("scripts_present")
        if scripts:
            for s in scripts:
                if isinstance(s, dict):
                    s_name = s.get("script") or s.get("name") or ""
                else:
                    s_name = str(s)
                if s_name and s_name not in doc.scripts_present:
                    doc.scripts_present.append(s_name)

        for tok in page.get("numeric_tokens", []):
            doc.numeric_tokens.append(tok)

        # Tables
        for table_data in page.get("tables", []):
            rows: List[List[TableCell]] = []
            for row_data in table_data.get("rows", []):
                cells: List[TableCell] = []
                for cell in row_data.get("cells", []):
                    cells.append(
                        TableCell(
                            row_index=cell.get("row_index", 0),
                            column_index=cell.get("column_index", 0),
                            text=cell.get("text", ""),
                            confidence=cell.get("confidence", 0.0) or 0.0,
                            bbox=cls._bbox(cell.get("bbox")),
                            page=cell.get("page", page_num),
                        )
                    )
                cells.sort(key=lambda c: c.column_index)
                rows.append(cells)
            if rows:
                rows.sort(key=lambda r: r[0].row_index if r else 0)
                doc.tables.append(
                    EvidenceTable(
                        table_index=table_data.get("table_index", len(doc.tables) + 1),
                        rows=rows,
                        page=page_num,
                        structure_status=table_data.get("structure_status", "UNKNOWN"),
                        source=table_data.get("source", ""),
                    )
                )

        # Lines - prefer structured lines, fall back to word grouping.
        structured_lines = page.get("lines")
        if structured_lines:
            for i, line_data in enumerate(structured_lines):
                words = []
                for w in line_data.get("words", []):
                    words.append(
                        EvidenceWord(
                            text=w.get("text", ""),
                            confidence=w.get("confidence", 0.0) or 0.0,
                            bbox=cls._bbox(w.get("bbox")),
                            page=page_num,
                            region=w.get("region", ""),
                            script=w.get("script", ""),
                        )
                    )
                doc.lines.append(
                    SemanticLine(
                        text=line_data.get("text", ""),
                        page=page_num,
                        bbox=cls._bbox(line_data.get("bbox")),
                        region=line_data.get("region", ""),
                        confidence=line_data.get("confidence", 0.0) or 0.0,
                        reading_order=line_data.get("reading_order", i),
                        words=words,
                    )
                )
        else:
            # Fall back to flat words grouped by (page, line_num).
            by_line: Dict[Tuple[int, int], List[EvidenceWord]] = {}
            for w in page.get("words", []):
                ew = EvidenceWord(
                    text=w.get("text", ""),
                    confidence=w.get("confidence", 0.0) or 0.0,
                    bbox=cls._bbox(w.get("bbox")),
                    page=page_num,
                    region=w.get("region", ""),
                    script=w.get("script", ""),
                )
                key = (page_num, w.get("line_num", 0))
                by_line.setdefault(key, []).append(ew)

            for (pg, _ln), line_words in sorted(by_line.items()):
                line_words.sort(key=lambda w: w.bbox.x if w.bbox else 0)
                text = " ".join(w.text for w in line_words)
                bbox = None
                if line_words:
                    xs = [w.bbox.x for w in line_words if w.bbox]
                    ys = [w.bbox.y for w in line_words if w.bbox]
                    if xs and ys:
                        bbox = BoundingBox(
                            x=min(xs),
                            y=min(ys),
                            width=max(w.bbox.x + w.bbox.width for w in line_words if w.bbox) - min(xs),
                            height=max(w.bbox.y + w.bbox.height for w in line_words if w.bbox) - min(ys),
                        )
                doc.lines.append(
                    SemanticLine(
                        text=text,
                        page=pg,
                        bbox=bbox,
                        region=line_words[0].region if line_words else "",
                        confidence=sum(w.confidence for w in line_words) / len(line_words) if line_words else 0.0,
                        reading_order=len(doc.lines),
                        words=line_words,
                    )
                )

        doc.lines.sort(key=lambda l: (l.page, l.reading_order))
