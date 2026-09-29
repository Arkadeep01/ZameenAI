"""Decomposed from phase04_document_classification.py: service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
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
from .classifiers import *
from .bridge import *
from .bridge import (_load_phase03_regions, _read_title_band_text)
from .classifiers import (_aggregate_multi_page, _analyze_title_header, _classify_from_layout, _classify_from_text, _determine_classification_status)

import logging
logger = logging.getLogger(__name__)

class DocumentClassificationService:
    """Main service for Phase 04 Document Classification."""

    def __init__(
        self,
        classification_result: Optional[ClassificationResult] = None,
    ):
        self.classification_result = classification_result or ClassificationResult(
            record_id="", document_id="", ingestion_id=""
        )

    def classify(
        self,
        *,
        record_id: str,
        document_id: str,
        ingestion_id: str,
        ocr_text: Optional[str] = None,
        title_or_header: Optional[str] = None,
        page_images: Optional[List[Image.Image]] = None,
        quality_metrics: Optional[Dict[str, Any]] = None,
        layout_regions: Optional[List[Dict[str, Any]]] = None,
    ) -> ClassificationResult:
        """Classify a document land-record type.

        Classification evidence sources (in priority order):
        1. Document title/header string (visual title detection)
        2. OCR-derived text evidence when available
        3. Structural/layout patterns from Phase 03

        The result is aggregated for multi-page documents and confidence
        thresholds are applied to determine classification status.

        Raises:
            ValueError: If required identifiers are missing or empty.
        """
        started_at = datetime.now().isoformat()

        # Validate identifiers
        if not record_id:
            raise ValueError("record_id is required for document classification")
        if not document_id:
            raise ValueError("document_id is required for document classification")
        if not ingestion_id:
            raise ValueError("ingestion_id is required for document classification")

        self.classification_result.record_id = record_id
        self.classification_result.document_id = document_id
        self.classification_result.ingestion_id = ingestion_id
        self.classification_result.timestamps["started_at"] = started_at

        try:
            # Evidence auto-loading: when the caller supplies no text/layout
            # evidence, derive it from earlier phases (real evidence, never
            # forced). Caller-supplied evidence always wins.
            auto_title = ""
            if not title_or_header and not ocr_text:
                auto_title = _read_title_band_text(record_id, document_id, ingestion_id)
                if auto_title:
                    title_or_header = auto_title
                    logger.info(
                        "Phase 04 title-band evidence (%d chars) for %s",
                        len(auto_title),
                        document_id,
                    )
            if not layout_regions and not page_images:
                auto_regions = _load_phase03_regions(record_id, document_id, ingestion_id)
                if auto_regions:
                    layout_regions = auto_regions
                    logger.info(
                        "Phase 04 layout evidence (%d regions) for %s",
                        len(auto_regions),
                        document_id,
                    )

            # Step 1: Try title/header analysis (fast, deterministic)
            title_type = None
            title_confidence = 0.0
            title_evidence: List[str] = []

            if title_or_header:
                title_type, title_confidence, title_evidence = (
                    _analyze_title_header(title_or_header)
                )

            # Step 2: Try OCR text analysis
            ocr_type = None
            ocr_confidence = 0.0
            ocr_evidence: List[str] = []

            if ocr_text:
                ocr_type, ocr_confidence, ocr_evidence = (
                    _classify_from_text(ocr_text)
                )

            # Step 2.5: Try layout/structural analysis (Phase 03 regions)
            layout_type = None
            layout_confidence = 0.0
            layout_evidence: List[str] = []

            if layout_regions:
                region_types = [r.get("type", "") for r in layout_regions if r.get("type")]
                region_count = len(region_types)
                if region_types:
                    layout_type, layout_confidence, layout_evidence = (
                        _classify_from_layout(region_types, region_count)
                    )

            # Step 3: Combine evidence - prefer strongest source
            if title_confidence >= ocr_confidence and title_confidence >= layout_confidence and title_confidence > 0:
                predicted_type = title_type if title_type else DocumentType.UNKNOWN
                confidence = title_confidence
                evidence = title_evidence
            elif ocr_confidence >= layout_confidence and ocr_confidence > 0:
                predicted_type = ocr_type if ocr_type else DocumentType.UNKNOWN
                confidence = ocr_confidence
                evidence = ocr_evidence
            elif layout_confidence > 0:
                predicted_type = layout_type if layout_type else DocumentType.UNKNOWN
                confidence = layout_confidence
                evidence = layout_evidence
            else:
                # No evidence available
                predicted_type = DocumentType.UNKNOWN
                confidence = 0.0
                evidence = []

            # Step 4: Determine classification status
            classification_status = _determine_classification_status(confidence)

            # Step 5: Build alternative predictions
            alternatives: List[Dict[str, Any]] = []

            # If we have a primary type with less than high confidence,
            # or if evidence is ambiguous, compute alternatives
            if classification_status != ClassificationStatus.HIGH_CONFIDENCE:
                # Generate alternatives from the keyword map
                for doc_type, mappings in KEYWORD_MAP.items():
                    if doc_type == predicted_type:
                        continue
                    alt_evidence: List[str] = []
                    evidence_lower = " ".join(evidence).lower()
                    title_from_evidence = self._extract_title_from_evidence(
                        evidence
                    ).lower()
                    for title_pattern in mappings.get("titles", []):
                        if title_from_evidence and title_pattern.lower().find(title_from_evidence) != -1:
                            alt_evidence.append(title_pattern)
                    for keyword in mappings.get("keywords", []):
                        if keyword.lower() in evidence_lower:
                            alt_evidence.append(keyword)
                    if alt_evidence:
                        alternatives.append(
                            {
                                "document_type": doc_type.value,
                                "confidence": round(
                                    max(0.0, confidence * 0.5), 4
                                ),
                                "evidence": alt_evidence,
                            }
                        )

            # Step 6: Build page-level results if page images provided
            pages: List[PageClassification] = []
            if page_images and len(page_images) > 0:
                for i, page_img in enumerate(page_images, start=1):
                    page_evidence = evidence[:2] if evidence else []
                    page_type = (
                        predicted_type if classification_status == ClassificationStatus.HIGH_CONFIDENCE else DocumentType.UNKNOWN
                    )
                    page_conf = confidence if classification_status == ClassificationStatus.HIGH_CONFIDENCE else 0.0

                    pages.append(
                        PageClassification(
                            page_number=i,
                            predicted_type=page_type,
                            confidence=page_conf,
                            evidence=page_evidence,
                        )
                    )

            # Step 7: Aggregate for multi-page if multiple page images
            if len(pages) > 1 and len(page_images) > 1:
                aggregated_type, aggregated_conf, aggregated_evidence, aggregated_alternatives = (
                    _aggregate_multi_page(pages)
                )
                predicted_type = aggregated_type
                confidence = aggregated_conf
                evidence = aggregated_evidence
                alternatives = aggregated_alternatives or alternatives
                classification_status = _determine_classification_status(confidence)

            # Step 8: Finalize result
            self.classification_result.predicted_document_type = predicted_type
            self.classification_result.confidence = confidence
            self.classification_result.classification_status = classification_status
            self.classification_result.evidence = evidence
            self.classification_result.alternative_predictions = alternatives
            self.classification_result.pages = pages
            self.classification_result.next_phase = "OCR_CONFIGURATION"

            # Store timestamps
            completed_at = datetime.now().isoformat()
            self.classification_result.timestamps["completed_at"] = completed_at
            self.classification_result.processing_time_seconds = (
                0.0  # would be calculated in real deployment
            )

            logger.info(
                f"Classification completed for {document_id}: "
                f"type={predicted_type.value}, confidence={confidence:.3f}, "
                f"status={classification_status.value}"
            )

            # Save classification result to persistent storage
            self._save_classification_result(record_id, document_id)

            return self.classification_result

        except Exception as e:
            logger.exception(f"Classification failed for {document_id}: {e}")
            self.classification_result.error_code = "CLASSIFICATION_FAILURE"
            self.classification_result.error_message = str(e)
            self.classification_result.classification_status = ClassificationStatus.LOW_CONFIDENCE
            self.classification_result.predicted_document_type = DocumentType.UNKNOWN
            self.classification_result.confidence = 0.0
            self.classification_result.timestamps["completed_at"] = datetime.now().isoformat()
            self.classification_result.warnings.append(
                f"Classification failed: {str(e)}"
            )
            return self.classification_result

    def _extract_title_from_evidence(self, evidence: List[str]) -> str:
        """Extract a title-like string from evidence list."""
        for e in evidence:
            if e.startswith("Title:"):
                return e.replace("Title:", "").strip()
        return ""

    def _ocr_text_lower(self, evidence: List[str]) -> str:
        """Lowercase evidence for text matching."""
        return " ".join(evidence).lower()

    def _save_classification_result(
        self,
        record_id: str,
        document_id: str,
    ) -> None:
        """Save classification result to persistent storage.

        The classification result is saved to:
        {CLASSIFICATION_STORAGE_DIR}/{record_id}/{document_id}_classification.json
        """
        try:
            output_dir = CLASSIFICATION_STORAGE_DIR / record_id
            output_dir.mkdir(parents=True, exist_ok=True)

            output_file = output_dir / f"{document_id}_classification.json"

            result_dict = self.classification_result.to_dict()

            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result_dict, f, indent=2, ensure_ascii=False)

            logger.info(f"Classification saved to {output_file}")

        except Exception as e:
            logger.warning(
                f"Failed to save classification result for {document_id}: {e}"
            )
