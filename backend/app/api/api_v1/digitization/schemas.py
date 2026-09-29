"""Request schemas for the digitization bridge API.

Transport shapes only (mirror the Flask handlers' ``data.get(...)``
leniency): all fields optional here, required-ness enforced in handlers
so error_code envelopes match the Flask contract exactly. No business
logic lives in these models.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PhaseIds(BaseModel):
    record_id: Optional[str] = None
    document_id: Optional[str] = None
    ingestion_id: Optional[str] = None


class IngestDemoRequest(BaseModel):
    sample: Optional[str] = None


class QualityRequest(PhaseIds):
    pass


class PreprocessRequest(PhaseIds):
    pass


class ClassifyRequest(PhaseIds):
    ocr_text: Optional[str] = None
    title_or_header: Optional[str] = None
    layout_regions: Optional[Any] = None


class LanguageDetectionRequest(BaseModel):
    record_id: Optional[str] = None
    document_id: Optional[str] = None
    classification_id: Optional[str] = None
    ingestion_id: Optional[str] = None
    document_type: Optional[str] = None
    classification_confidence: Optional[float] = None
    ocr_text: Optional[str] = None
    provisional_text: Optional[str] = None
    use_gemini: Optional[bool] = False
    force: Optional[bool] = False


class OcrConfigRequest(PhaseIds):
    document_type: Optional[str] = None
    classification_confidence: Optional[float] = None
    classification_status: Optional[str] = None
    preprocessed_paths: Optional[List[str]] = None
    original_path: Optional[str] = None
    is_native_pdf: Optional[bool] = False
    has_tables: Optional[bool] = True


class OcrRequest(PhaseIds):
    ocr_config: Optional[Dict[str, Any]] = None
    language_detection: Optional[Dict[str, Any]] = None
    document_type: Optional[str] = None


class ExtractRequest(PhaseIds):
    pass


class ConfidenceRequest(PhaseIds):
    pass


class AutomatedValidationRequest(PhaseIds):
    reprocessing_id: Optional[str] = None
    classification: Optional[Dict[str, Any]] = None


class AnomalyDuplicateRequest(BaseModel):
    validation_run_id: Optional[str] = None
    record_id: Optional[str] = None
    document_id: Optional[str] = None
    ingestion_id: Optional[str] = None


class OpenHitlRequest(BaseModel):
    validation_run_id: Optional[str] = None
    reviewer: Optional[str] = None


class HitlReviewRequest(BaseModel):
    field: Optional[str] = None
    action: Optional[str] = None
    value: Optional[Any] = None
    note: Optional[str] = None
    reviewer: Optional[str] = None


class HitlSubmitRequest(BaseModel):
    decision: Optional[str] = None
    reviewer: Optional[str] = None
    notes: Optional[str] = None


class RemediationRequest(BaseModel):
    record_id: Optional[str] = None
    document_id: Optional[str] = None
    ingestion_id: Optional[str] = None
    created_by: Optional[str] = None
    force: Optional[bool] = False
    trigger_statuses: Optional[List[str]] = None
    severity_override: Optional[Dict[str, str]] = None


class ResubmissionRequest(BaseModel):
    record_id: Optional[str] = None
    document_id: Optional[str] = None
    remediation_id: Optional[str] = None
    submission_type: Optional[str] = None
    created_by: Optional[str] = None
    page_assignments: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class ReprocessRequest(BaseModel):
    record_id: Optional[str] = None
    submission_id: Optional[str] = None
    by: Optional[str] = None


class RetryRequest(BaseModel):
    by: Optional[str] = None
