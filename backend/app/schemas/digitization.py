"""Document / digitization / pipeline Pydantic contracts.

Every field here is produced by the real implementation: Phase 01 ids,
service ``to_dict()`` payloads, or DB rows. Nothing claims data the
backend cannot provide.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    record_id: str
    document_id: str
    ingestion_id: str
    filename: str
    job_id: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    record_id: str
    ingestion_id: str
    filename: str
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    sha256: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None


class DocumentStatusResponse(BaseModel):
    document_id: str
    record_id: str
    job_id: Optional[str] = None
    job_status: Optional[str] = None
    current_phase: Optional[str] = None


class DigitizationStartRequest(BaseModel):
    filename: Optional[str] = "document"
    run_pipeline: bool = True
    created_by: Optional[str] = None


class PipelinePhaseResponse(BaseModel):
    phase: str
    status: str
    attempt: int = 1
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    artifact_ref: Optional[str] = None


class DigitizationJobResponse(BaseModel):
    job_id: str
    record_id: str
    document_id: str
    ingestion_id: str
    status: str
    current_phase: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    phases: list[PipelinePhaseResponse] = Field(default_factory=list)


class PipelineStatusResponse(DigitizationJobResponse):
    results: dict[str, Any] = Field(default_factory=dict)


class OCRProviderStatus(BaseModel):
    provider: str
    available: bool
    installed_languages: list[str] = Field(default_factory=list)
    missing_languages: list[str] = Field(default_factory=list)
    detail: Optional[str] = None


class ExtractedFieldSchema(BaseModel):
    field_name: str
    raw_value: Optional[str] = None
    normalized_value: Optional[Any] = None
    confidence: float = 0.0
    method: Optional[str] = None
    source_page: Optional[int] = None
    source_label: Optional[str] = None


class ConfidenceResultSchema(BaseModel):
    record_id: str
    overall_confidence: float = 0.0
    confidence_band: str = "LOW"
    completeness_score: float = 0.0
    needs_review: bool = True


class ValidationIssueSchema(BaseModel):
    field: str
    severity: str = "WARNING"
    rule_category: str = ""
    reason: str = ""


class ValidationResultSchema(BaseModel):
    validation_run_id: str
    record_id: str
    decision: str = "REVIEW_REQUIRED"
    needs_review: bool = True
    findings: list[ValidationIssueSchema] = Field(default_factory=list)


class AnomalyFlagSchema(BaseModel):
    category: str
    severity: str = "WARNING"
    explanation: str = ""


class DuplicateMatchSchema(BaseModel):
    matched_record_id: str
    match_type: str = ""
    confidence: float = 0.0


class HITLReviewSchema(BaseModel):
    hitl_id: str
    record_id: str
    status: str
    reviewer: Optional[str] = None
    decision: Optional[str] = None


class FieldDispositionSchema(BaseModel):
    field: str
    action: str
    value: Optional[Any] = None
    note: Optional[str] = None


class CorrectionRequestSchema(BaseModel):
    field: str
    value: Any
    note: Optional[str] = None


class VerificationRequestSchema(BaseModel):
    decision: str
    notes: Optional[str] = None
