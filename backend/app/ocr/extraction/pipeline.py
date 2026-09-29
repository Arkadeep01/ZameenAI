"""Decomposed from phase07_semantic_field_extraction.py: pipeline. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
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
from .candidates import *
from .llm import *
from .llm import (_INDICBART_MODEL_NAME, _ground_llm_candidates, _llm_provider)
from .terminology import (_contains_alias_text)

import logging
logger = logging.getLogger(__name__)

class SemanticExtractionPipeline:
    """Runs the full Phase 07 semantic extraction pipeline for a document."""

    def __init__(
        self,
        ocr_result: Dict,
        document_type: str = "RECORD_OF_RIGHTS",
    ):
        self.ocr_result = ocr_result
        self.document_type = document_type or "RECORD_OF_RIGHTS"
        self.doc = OCRDocument.build(ocr_result)
        self.indicbart = IndicBARTNormalizer()
        self.mistral = MistralExtractor()
        self.ollama = OllamaExtractor()

    def run(self) -> Tuple[ExtractedRecord, Dict[str, FieldMetadata], Dict[str, Any]]:
        """Execute the pipeline. Returns (record, field_metadata, extraction_meta)."""
        evidence: List[EvidenceCandidate] = []

        # 1. Evidence preparation + terminology candidate generation.
        generator = CandidateGenerator()
        evidence.extend(generator.generate(self.doc))

        # 2. IndicBART semantic normalization for unresolved alias phrases.
        indicbart_status, indicbart_candidates = self._run_indicbart(evidence)

        # 3. LLM contextual extraction (Ollama local or Mistral cloud,
        # only if actually available; candidates only, never invented values).
        mistral_status, ollama_status, llm_candidates = self._run_llm(evidence)
        evidence.extend(llm_candidates)

        # 4. Reconcile candidates.
        reconciler = CandidateReconciler()
        selected, conflicts = reconciler.reconcile(evidence)

        # 5. Deterministic assembly + validation.
        record, field_metadata = self._assemble(selected)

        unresolved = [f for f in ALL_CANONICAL_FIELDS if f not in selected]
        applicable = FIELD_APPLICABILITY.get(self.document_type, {})
        needs_review = bool(conflicts)

        extraction_meta = {
            "document_type": self.document_type,
            "evidence_count": len(evidence),
            "models": {
                "indicbart": indicbart_status,
                "mistral": mistral_status,
                "ollama": ollama_status,
            },
            "conflicts": conflicts,
            "needs_review": needs_review,
            "unresolved_fields": unresolved,
            "indicbart_candidates": [c.to_dict() for c in indicbart_candidates],
        }
        return record, field_metadata, extraction_meta

    def _run_indicbart(
        self, existing: List[EvidenceCandidate]
    ) -> Tuple[str, List[EvidenceCandidate]]:
        if os.getenv("ZAMEENAI_PHASE07_DISABLE_INDICBART", "0") == "1":
            return ModelStatus.DISABLED.value, []

        # Only normalize phrases that are NOT already confidently resolved by
        # the deterministic terminology index. This keeps the component
        # meaningful rather than decorative.
        resolved_fields = {c.field_name for c in existing}
        needed_fields = [
            f
            for f in ALL_CANONICAL_FIELDS
            if f not in resolved_fields
            and FIELD_APPLICABILITY.get(self.document_type, {}).get(f, "OPTIONAL") != "NOT_APPLICABLE"
        ]
        if not needed_fields:
            return ModelStatus.AVAILABLE_NOT_INVOKED.value, []

        phrases = [alias for f in needed_fields for alias in resolve_aliases(f)[:4] if alias]

        if not self.indicbart.available():
            return ModelStatus.UNAVAILABLE.value, []

        normalized = self.indicbart.normalize_phrases(phrases)
        if not normalized:
            return ModelStatus.ERROR.value, []

        # Use the normalized output as additional alias candidates only.
        out: List[EvidenceCandidate] = []
        full_text_norm = normalize_label(self.doc.full_text)
        for phrase, output in normalized.items():
            if not output or output in ("", phrase):
                continue
            field, score, alias = pick_best_label(output)
            if not field or field in resolved_fields:
                continue
            if _contains_alias_text(full_text_norm, output) or score > 0.75:
                out.append(
                    EvidenceCandidate(
                        field_name=field,
                        value=alias,
                        raw_value=phrase,
                        label=alias,
                        label_score=score,
                        confidence=0.7,
                        method=ExtractionMethod.INDICBART_NORMALIZED,
                        page=1,
                        source_text=phrase,
                        source_model=_INDICBART_MODEL_NAME,
                    )
                )
        return ModelStatus.USED.value, out

    def _run_llm(
        self, existing: List[EvidenceCandidate]
    ) -> Tuple[str, str, List[EvidenceCandidate]]:
        """Dispatch contextual extraction to the configured LLM provider.

        Returns (mistral_status, ollama_status, candidates). Exactly one
        provider is ever invoked: ``LLM_PROVIDER=ollama`` never touches
        Mistral, and legacy/``mistral`` mode never touches Ollama.
        """
        provider = _llm_provider()
        unused = ModelStatus.UNAVAILABLE.value
        if provider == "ollama":
            return unused, *self._run_ollama(existing)
        if provider == "auto":
            ollama_status, candidates = self._run_ollama(existing)
            if ollama_status == ModelStatus.USED.value:
                return unused, ollama_status, candidates
            mistral_status, mistral_candidates = self._run_mistral(existing)
            return mistral_status, ollama_status, mistral_candidates
        mistral_status, mistral_candidates = self._run_mistral(existing)
        return mistral_status, unused, mistral_candidates

    def _run_mistral(self, existing: List[EvidenceCandidate]) -> Tuple[str, List[EvidenceCandidate]]:
        if _llm_provider() == "ollama":
            # Provider pinned to local Ollama: Mistral must not be called.
            return ModelStatus.UNAVAILABLE.value, []
        if not self.mistral.available:
            return ModelStatus.UNAVAILABLE.value, []

        candidates = self.mistral.extract(self.doc, self.document_type)
        if candidates is None:
            return ModelStatus.UNAVAILABLE.value, []
        return ModelStatus.USED.value, _ground_llm_candidates(self.doc, candidates)

    def _run_ollama(self, existing: List[EvidenceCandidate]) -> Tuple[str, List[EvidenceCandidate]]:
        if not self.ollama.available:
            return ModelStatus.UNAVAILABLE.value, []

        candidates = self.ollama.extract(self.doc, self.document_type)
        if candidates is None:
            return ModelStatus.UNAVAILABLE.value, []
        if self.ollama.last_error:
            # Transport/parse failure after a successful probe: honest ERROR,
            # never a faked USED.
            return ModelStatus.ERROR.value, []
        return ModelStatus.USED.value, _ground_llm_candidates(self.doc, candidates)

    def _assemble(
        self, selected: Dict[str, EvidenceCandidate]
    ) -> Tuple[ExtractedRecord, Dict[str, FieldMetadata]]:
        record = ExtractedRecord(
            record_id=self.doc.record_id,
            document_id=self.doc.document_id,
            ingestion_id=self.doc.ingestion_id,
        )
        fields = FIELD_APPLICABILITY.get(self.document_type, {})

        metadata: Dict[str, FieldMetadata] = {}

        for field_name in ALL_CANONICAL_FIELDS:
            apply_state = fields.get(field_name, "OPTIONAL")

            if field_name == "document.map_number":
                # Map number alias set not present in LABEL_ALIASES; keep as optional.
                cand = selected.get(field_name)
                if cand:
                    record.document["map_number"] = cand.value
                    metadata[field_name] = self._to_field_metadata(field_name, cand, FieldStatus.EXTRACTED)
                else:
                    metadata[field_name] = self._missing_meta(field_name)
                continue

            if apply_state == "NOT_APPLICABLE":
                metadata[field_name] = FieldMetadata(
                    field_name=field_name,
                    status=FieldStatus.NOT_APPLICABLE,
                    confidence=1.0,
                    method=ExtractionMethod.DETERMINISTIC,
                )
                continue

            cand = selected.get(field_name)
            if not cand:
                metadata[field_name] = self._missing_meta(field_name)
                continue

            # area extraction -> {area value, unit}
            if field_name == "land.area":
                area_val, unit = normalize_area(cand.value)
                if area_val is None:
                    metadata[field_name] = self._missing_meta(field_name)
                    continue
                record.land["area"] = area_val
                metadata[field_name] = self._to_field_metadata(field_name, cand, FieldStatus.EXTRACTED)
                metadata[field_name].normalized_value = area_val

                unit_cand = selected.get("land.area_unit")
                if unit_cand:
                    record.land["area_unit"] = unit_cand.value
                elif unit:
                    record.land["area_unit"] = unit
                continue

            if field_name == "land.area_unit":
                if "land.area" in metadata and metadata["land.area"].status != FieldStatus.MISSING:
                    # unit already handled via area block
                    continue
                record.land["area_unit"] = cand.value
                metadata[field_name] = self._to_field_metadata(field_name, cand, FieldStatus.EXTRACTED)
                continue

            target_dict = getattr(record, canonical_section(field_name))
            target_dict[canonical_key(field_name)] = cand.value
            metadata[field_name] = self._to_field_metadata(field_name, cand, FieldStatus.EXTRACTED)

        return record, metadata

    @staticmethod
    def _to_field_metadata(
        field_name: str, cand: EvidenceCandidate, status: FieldStatus
    ) -> FieldMetadata:
        return FieldMetadata(
            field_name=field_name,
            status=status,
            confidence=cand.confidence,
            source=ExtractionSource(
                page=cand.page,
                label=cand.label,
                text=cand.source_text or cand.raw_value,
                bbox=cand.bbox or BoundingBox(0, 0, 0, 0),
            ),
            method=cand.method,
            raw_value=cand.raw_value,
            normalized_value=cand.value,
        )

    @staticmethod
    def _missing_meta(field_name: str) -> FieldMetadata:
        return FieldMetadata(
            field_name=field_name,
            status=FieldStatus.MISSING,
            confidence=0.0,
        )

class LandRecordExtractor:
    """Compatibility facade. Uses the authoritative Phase 07 pipeline."""

    EXPECTED_FIELDS = ALL_CANONICAL_FIELDS

    def __init__(self, ocr_result: Dict):
        self.extractor = SemanticExtractor(ocr_result)
        self.metadata: Dict[str, FieldMetadata] = {}
        self.debug_info: Dict[str, Any] = {"detected_labels": [], "candidates": [], "selections": []}
        self._debug_mode = False

    def set_debug_mode(self, enabled: bool) -> None:
        self._debug_mode = enabled

    def extract(self, ocr_result: Dict) -> Tuple[ExtractedRecord, Dict[str, FieldMetadata]]:
        pipeline = SemanticExtractionPipeline(ocr_result, document_type="RECORD_OF_RIGHTS")
        record, metadata, _meta = pipeline.run()
        self.metadata = metadata
        return record, metadata

class SemanticExtractionService:
    """Main service for Phase 07 extraction (authoritative pipeline)."""

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or PHASE_07_STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def get_classification_result(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
    ) -> Optional[Dict]:
        """Load Phase 04 classification result.

        The stored result must belong to this ingestion; otherwise it is
        treated as absent so a stale file from a previous run can never be
        mistaken for current-run evidence.
        """
        classification_path = (
            APP_DIR
            / "uploads"
            / "processing"
            / "phase_04"
            / record_id
            / f"{document_id}_classification.json"
        )
        if classification_path.exists():
            try:
                with open(classification_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict) and (
                    not data.get("ingestion_id")
                    or data.get("ingestion_id") == ingestion_id
                ):
                    return data
            except Exception:
                pass
        return None

    def get_ocr_result(
        self,
        record_id: str,
        document_id: str,
        ingestion_id: str,
    ) -> Optional[Dict]:
        """Load Phase 06 OCR result.

        The stored result must belong to this ingestion and must not be a
        recorded failure; otherwise it is treated as absent so a stale or
        failed file from a previous run can never be mistaken for
        current-run evidence.
        """
        ocr_path = (
            APP_DIR
            / "uploads"
            / "processing"
            / "phase_06"
            / record_id
            / f"{document_id}_ocr.json"
        )
        if ocr_path.exists():
            try:
                with open(ocr_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict) and (
                    not data.get("ingestion_id")
                    or data.get("ingestion_id") == ingestion_id
                ) and data.get("status") != "FAILED":
                    return data
            except Exception:
                pass
        return None

    def extract_fields(
        self,
        *,
        record_id: str,
        document_id: str,
        ingestion_id: str,
    ) -> ExtractionResult:
        """Extract semantic fields from OCR result using the Phase 07 pipeline."""
        started_at = datetime.now().isoformat()

        result = ExtractionResult(
            record_id=record_id,
            document_id=document_id,
            ingestion_id=ingestion_id,
            timestamps={"started_at": started_at},
        )

        try:
            classification = self.get_classification_result(record_id, document_id, ingestion_id)
            if not classification:
                result.status = ExtractionStatus.FAILED
                result.error_code = "CLASSIFICATION_NOT_FOUND"
                result.error_message = "Phase 04 classification result could not be located"
                result.next_phase = None
                return result

            ocr_result = self.get_ocr_result(record_id, document_id, ingestion_id)
            if not ocr_result:
                result.status = ExtractionStatus.FAILED
                result.error_code = "OCR_RESULT_NOT_FOUND"
                result.error_message = "Phase 06 OCR result could not be located"
                result.next_phase = None
                return result

            document_type = self._resolve_document_type(classification, ocr_result)
            classification_confidence = classification.get("confidence", 0.0)

            result.document_type = document_type
            result.classification_confidence = classification_confidence

            pipeline = SemanticExtractionPipeline(ocr_result, document_type=document_type)
            extracted_record, field_metadata, extraction_meta = pipeline.run()

            result.extracted_record = extracted_record
            result.field_metadata = field_metadata
            result.models = extraction_meta["models"]
            result.unresolved_fields = extraction_meta["unresolved_fields"]
            result.conflicts = extraction_meta["conflicts"]
            result.needs_review = extraction_meta["needs_review"]

            fields_extracted = sum(
                1 for fm in field_metadata.values()
                if fm.status == FieldStatus.EXTRACTED
            )
            fields_missing = sum(
                1 for fm in field_metadata.values()
                if fm.status == FieldStatus.MISSING
            )
            fields_not_applicable = sum(
                1 for fm in field_metadata.values()
                if fm.status == FieldStatus.NOT_APPLICABLE
            )

            result.fields_extracted = fields_extracted
            result.fields_missing = fields_missing
            result.fields_not_applicable = fields_not_applicable
            result.fields_expected = len(field_metadata)

            if fields_extracted == 0:
                result.status = ExtractionStatus.NO_FIELDS_EXTRACTED
            elif fields_missing > 0:
                result.status = ExtractionStatus.PARTIAL_SUCCESS
            else:
                result.status = ExtractionStatus.SUCCESS

            self._save_extraction_result(result)

            completed_at = datetime.now().isoformat()
            result.timestamps["completed_at"] = completed_at
            result.processing_time_seconds = 0.0

            logger.info(
                f"Extraction completed for {document_id}: "
                f"status={result.status.value}, "
                f"fields_extracted={fields_extracted}, "
                f"models={result.models}"
            )

        except Exception as e:
            logger.exception(f"Extraction failed for {document_id}: {e}")
            result.status = ExtractionStatus.FAILED
            result.error_code = "EXTRACTION_ENGINE_ERROR"
            result.error_message = str(e)
            result.next_phase = None

        return result

    def _resolve_document_type(self, classification: Dict, ocr_result: Dict) -> str:
        """Resolve document type from Phase 04, honoring evidence when Phase 04 is ambiguous."""
        predicted = str(classification.get("predicted_document_type", "UNKNOWN")).upper()

        if predicted not in ("UNKNOWN", ""):
            return predicted

        # Phase 04 said ambiguous; keep its list of alternatives but do not
        # silently claim a successful classification.
        title = CandidateGenerator._detect_document_title(ocr_result.get("full_text", "") or "")
        if title:
            for key, mapped in DOCUMENT_TITLE_MAP.items():
                if mapped == title:
                    return key.upper().replace(" ", "_")
        return "RECORD_OF_RIGHTS" if title else "UNKNOWN"

    def _save_extraction_result(self, result: ExtractionResult) -> None:
        """Save extraction results to storage."""
        output_dir = self.storage_dir / result.record_id
        output_dir.mkdir(parents=True, exist_ok=True)

        record_file = output_dir / f"{result.document_id}_extracted_record.json"
        with open(record_file, "w", encoding="utf-8") as f:
            json.dump(result.extracted_record.to_dict() if result.extracted_record else {}, f, indent=2)

        metadata_file = output_dir / f"{result.document_id}_extraction_metadata.json"
        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, indent=2)

def get_extraction_service() -> SemanticExtractionService:
    """Factory: return the authoritative Phase 07 extraction service."""
    return SemanticExtractionService()
