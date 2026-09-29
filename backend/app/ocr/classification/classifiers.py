"""Decomposed from phase04_document_classification.py: classifiers. (Authoritative implementation; verbatim move.)"""
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

import logging
logger = logging.getLogger(__name__)

def _analyze_title_header(
    title_or_header: str,
) -> Tuple[Optional[DocumentType], float, List[str]]:
    """Analyze a document title/header string against keyword mappings.

    Returns (document_type, confidence, evidence) — if no match found,
    returns (None, 0.0, []).
    """
    if not title_or_header:
        return None, 0.0, []

    text = title_or_header.upper()
    best_type: Optional[DocumentType] = None
    best_score = 0.0
    best_evidence: List[str] = []

    for doc_type, mappings in KEYWORD_MAP.items():
        score = 0.0
        evidence: List[str] = []

        # Check title matches
        for title_pattern in mappings.get("titles", []):
            if title_pattern.upper() in text:
                score += 1.0
                evidence.append(title_pattern)

        # Check keyword matches
        for keyword in mappings.get("keywords", []):
            if keyword.upper() in text:
                score += 0.5
                if keyword not in evidence:
                    evidence.append(keyword)

        if score > best_score:
            best_score = score
            best_type = doc_type
            best_evidence = evidence

    if best_type is None or best_score < 0.5:
        return None, 0.0, []

    # Normalize confidence by number of evidence matches
    evidence_factor = min(1.0, len(best_evidence) / max(1, len(KEYWORD_MAP[best_type]["titles"]) + len(KEYWORD_MAP[best_type]["keywords"])))
    confidence = round(min(1.0, best_score * 0.7 + evidence_factor * 0.3), 4)

    return best_type, confidence, best_evidence

def _classify_from_text(
    ocr_text: Optional[str],
) -> Tuple[Optional[DocumentType], float, List[str]]:
    """Classify a document based on OCR-derived text.

    Uses keyword/title matching on the full OCR text body.
    Returns (document_type, confidence, evidence).
    """
    if not ocr_text:
        return None, 0.0, []

    text = ocr_text.upper()
    best_type: Optional[DocumentType] = None
    best_score = 0.0
    best_evidence: List[str] = []

    for doc_type, mappings in KEYWORD_MAP.items():
        score = 0.0
        evidence: List[str] = []

        for title_pattern in mappings.get("titles", []):
            if title_pattern.upper() in text:
                score += 1.5
                evidence.append(f"Title: {title_pattern}")

        for keyword in mappings.get("keywords", []):
            # Count occurrences for weighted scoring
            count = text.count(keyword.upper())
            if count > 0:
                score += 0.3 * count
                if keyword not in evidence:
                    evidence.append(keyword)

        if score > best_score:
            best_score = score
            best_type = doc_type
            best_evidence = evidence

    if best_type is None or best_score < 0.5:
        return None, 0.0, []

    # Diminish confidence for multiple weak matches vs strong single match
    confidence = round(min(1.0, best_score * 0.2), 4)

    return best_type, confidence, best_evidence

def _determine_classification_status(
    confidence: float,
) -> ClassificationStatus:
    """Determine the classification status based on confidence thresholds."""
    if confidence >= CONFIDENCE_HIGH_THRESHOLD:
        return ClassificationStatus.HIGH_CONFIDENCE
    elif confidence >= CONFIDENCE_REVIEW_THRESHOLD:
        return ClassificationStatus.REVIEW_REQUIRED
    elif confidence > 0.0:
        return ClassificationStatus.LOW_CONFIDENCE
    else:
        return ClassificationStatus.AMBIGUOUS

def _classify_from_layout(
    region_types: List[str],
    region_count: int,
) -> Tuple[Optional[DocumentType], float, List[str]]:
    """Classify a document based on layout/structural evidence from Phase 03.

    Uses region types detected by Phase 03 (HEADER, TABLE, TEXT_BLOCK, etc.)
    to determine the document type without requiring OCR text.

    Returns (document_type, confidence, evidence).
    """
    if not region_types:
        return None, 0.0, []

    region_type_counts: Dict[str, int] = {}
    for rtype in region_types:
        region_type_counts[rtype] = region_type_counts.get(rtype, 0) + 1

    best_type: Optional[DocumentType] = None
    best_score = 0.0
    best_evidence: List[str] = []

    for doc_type, signature in LAYOUT_SIGNATURES.items():
        score = 0.0
        evidence: List[str] = []

        required = signature.get("required_regions", [])
        forbidden = signature.get("forbidden_regions", [])
        region_scores = signature.get("region_scores", {})
        layout_features = signature.get("layout_features", {})

        has_all_required = all(req in region_type_counts for req in required)
        has_any_forbidden = any(forb in region_type_counts for forb in forbidden)

        if not has_all_required or has_any_forbidden:
            continue

        for rtype, count in region_type_counts.items():
            if rtype in region_scores:
                score += region_scores[rtype] * min(count, 3)

        if layout_features.get("min_table_count", 0) > 0:
            table_count = region_type_counts.get("TABLE", 0)
            if table_count >= layout_features["min_table_count"]:
                score += 0.15

        for rtype, count in region_type_counts.items():
            if rtype in ["HEADER", "TABLE", "TEXT_BLOCK"]:
                evidence.append(f"Layout: {rtype} ({count})")

        if score > best_score:
            best_score = score
            best_type = doc_type
            best_evidence = evidence

    if best_type is None or best_score < 0.3:
        return None, 0.0, []

    confidence = round(min(0.85, best_score), 4)

    return best_type, confidence, best_evidence

def _aggregate_multi_page(
    page_results: List[PageClassification],
) -> Tuple[DocumentType, float, List[str], List[Dict[str, Any]]]:
    """Aggregate page-level classifications into a document-level result.

    Returns (predicted_type, confidence, evidence, alternatives).
    """
    if not page_results:
        return DocumentType.UNKNOWN, 0.0, [], []

    # Count page votes
    type_votes: Dict[DocumentType, float] = {}
    type_evidence: Dict[DocumentType, List[str]] = {}
    type_min_conf: Dict[DocumentType, float] = {}

    for pr in page_results:
        pt = type_votes.get(pr.predicted_type, 0.0)
        type_votes[pr.predicted_type] = pt + pr.confidence

        if pr.predicted_type not in type_evidence:
            type_evidence[pr.predicted_type] = pr.evidence
        else:
            # Merge evidence, avoiding duplicates
            for e in pr.evidence:
                if e not in type_evidence[pr.predicted_type]:
                    type_evidence[pr.predicted_type].append(e)

        # Track minimum confidence for the type
        tc = type_min_conf.get(pr.predicted_type, 1.0)
        type_min_conf[pr.predicted_type] = min(tc, pr.confidence)

    # Select top type
    top_type = max(type_votes, key=type_votes.get) if type_votes else DocumentType.UNKNOWN
    top_confidence = type_votes[top_type] / len(page_results)
    top_evidence = type_evidence.get(top_type, [])

    # Check for ambiguity: if top and second are close within 0.15
    sorted_types = sorted(type_votes.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_types) >= 2:
        top_vote = type_votes[top_type]
        second_vote = sorted_types[1][1]
        if (top_vote - second_vote) / max(1.0, top_vote) < 0.15:
            # Ambiguous - return top with alternatives
            alternatives: List[Dict[str, Any]] = []
            for dt, vote in sorted_types[1:3]:
                alt_conf = vote / len(page_results) if page_results else 0.0
                alt_evidence = type_evidence.get(dt, [])
                alternatives.append(
                    {
                        "document_type": dt.value,
                        "confidence": round(alt_conf, 4),
                        "evidence": list(alt_evidence),
                    }
                )

            # Return UNKNOWN with alternatives when ambiguous
            return DocumentType.UNKNOWN, round(top_confidence, 4), top_evidence, alternatives

    # No meaningful alternatives
    alternatives: List[Dict[str, Any]] = []
    return top_type, round(top_confidence, 4), top_evidence, alternatives
