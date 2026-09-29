"""
ZameenAI Structured OCR + NLP Intermediate JSON Layer.

Phase 5 Requirement:
Explicit, versioned, Pydantic-based schemas that formalize the data flow across:
Document Ingestion -> Quality -> Preprocessing -> Classification ->
Language/Script -> OCR -> Raw OCR Structure -> Normalized OCR JSON ->
NLP Semantic Extraction -> Structured Extraction JSON -> Confidence/Completeness ->
Automated Validation -> Anomaly/Duplicate -> HITL Verification -> Canonical Land Record.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Common Spatial & Geometry Types
# ---------------------------------------------------------------------------

class BoundingBox(BaseModel):
    """Normalized or pixel bounding box on a document page."""
    x: int = Field(..., description="Left coordinate (pixels)")
    y: int = Field(..., description="Top coordinate (pixels)")
    width: int = Field(..., description="Box width (pixels)")
    height: int = Field(..., description="Box height (pixels)")

    def to_rect(self) -> Dict[str, int]:
        return {"x": self.x, "y": self.y, "width": self.width, "height": self.height}


class ExtractionSource(BaseModel):
    """Provenance pointer back to the exact location in the source document."""
    page: int = Field(1, description="1-indexed source document page number")
    label: Optional[str] = Field(None, description="Matched label string in original text")
    text: Optional[str] = Field(None, description="Source snippet or line text")
    bbox: Optional[BoundingBox] = Field(None, description="Bounding box of the source region")


# ---------------------------------------------------------------------------
# OCR Layer: Words, Lines, Blocks, and Pages
# ---------------------------------------------------------------------------

class OCRWord(BaseModel):
    """Single recognized word token with confidence and coordinates."""
    text: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: Optional[BoundingBox] = None


class OCRLine(BaseModel):
    """Single line of recognized text."""
    line_number: int
    text: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: Optional[BoundingBox] = None
    words: List[OCRWord] = Field(default_factory=list)


class OCRBlock(BaseModel):
    """Text block / layout region."""
    block_number: int
    text: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: Optional[BoundingBox] = None
    lines: List[OCRLine] = Field(default_factory=list)


class OCRPageData(BaseModel):
    """Complete OCR extraction for a single document page."""
    page_number: int = Field(..., ge=1)
    width: int
    height: int
    dpi: Optional[int] = 300
    primary_language: str = "eng"
    script: str = "Latin"
    ocr_engine: str = "Tesseract"
    raw_text: str = ""
    normalized_text: str = ""
    average_confidence: float = Field(0.0, ge=0.0, le=1.0)
    blocks: List[OCRBlock] = Field(default_factory=list)
    lines: List[OCRLine] = Field(default_factory=list)


class RawOcrStructure(BaseModel):
    """Raw OCR output across all pages of a document."""
    schema_version: str = "1.0.0"
    record_id: str
    document_id: str
    ingestion_id: str
    total_pages: int
    overall_confidence: float = Field(0.0, ge=0.0, le=1.0)
    pages: List[OCRPageData] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Semantic Extraction Layer
# ---------------------------------------------------------------------------

class FieldStatusEnum(str, Enum):
    REQUIRED_AND_PRESENT = "REQUIRED_AND_PRESENT"
    OPTIONAL_AND_PRESENT = "OPTIONAL_AND_PRESENT"
    REQUIRED_BUT_MISSING = "REQUIRED_BUT_MISSING"
    REQUIRED_BUT_UNREADABLE = "REQUIRED_BUT_UNREADABLE"
    OPTIONAL_AND_MISSING = "OPTIONAL_AND_MISSING"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    CONFLICT = "CONFLICT"


class ExtractionMethodEnum(str, Enum):
    LABEL_VALUE_SAME_LINE = "LABEL_VALUE_SAME_LINE"
    LABEL_VALUE_NEXT_LINE = "LABEL_VALUE_NEXT_LINE"
    TABLE_CELL = "TABLE_CELL"
    REGEX_PATTERN = "REGEX_PATTERN"
    INDICBART = "INDICBART"
    LLM_EXTRACTION = "LLM_EXTRACTION"
    FALLBACK = "FALLBACK"
    MANUAL = "MANUAL"


class ExtractionField(BaseModel):
    """Canonical extracted field with full audit trail and provenance."""
    field_name: str = Field(..., description="Canonical dot-delimited field name, e.g. land.khasra_number")
    section: str = Field(..., description="Group: document, owner, land, location, mutation, registration, additional")
    status: FieldStatusEnum
    raw_value: Optional[str] = None
    normalized_value: Any = None
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    source: Optional[ExtractionSource] = None
    method: Optional[Union[ExtractionMethodEnum, str]] = None
    error_message: Optional[str] = None

    @property
    def is_present(self) -> bool:
        return self.status in (FieldStatusEnum.REQUIRED_AND_PRESENT, FieldStatusEnum.OPTIONAL_AND_PRESENT)


class StructuredExtractionJson(BaseModel):
    """Structured semantic extraction schema for a digitized record."""
    schema_version: str = "1.0.0"
    record_id: str
    document_id: str
    ingestion_id: str
    document_type: str = "RECORD_OF_RIGHTS"
    fields: Dict[str, ExtractionField] = Field(default_factory=dict)
    summary_stats: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Confidence & Completeness Layer
# ---------------------------------------------------------------------------

class ConfidenceFactors(BaseModel):
    semantic: float = 0.0
    ocr: float = 0.0
    evidence: float = 0.0
    structural: float = 0.0
    validation: float = 0.0
    agreement: float = 0.0


class FieldAssessment(BaseModel):
    field_name: str
    raw_value: Optional[str] = None
    normalized_value: Any = None
    confidence: float = 0.0
    confidence_band: str = "LOW"
    status: str = "MISSING"
    is_applicable: bool = True
    factors: ConfidenceFactors = Field(default_factory=ConfidenceFactors)
    source_page: Optional[int] = None
    source_label: Optional[str] = None
    method: Optional[str] = None


class ConfidenceCompletenessResult(BaseModel):
    schema_version: str = "1.0.0"
    record_id: str
    document_id: str
    status: str = "REVIEW_REQUIRED"
    overall_confidence: float = 0.0
    confidence_band: str = "MEDIUM"
    completeness_score: float = 0.0
    total_fields_count: int = 0
    present_fields_count: int = 0
    missing_required_fields: List[str] = Field(default_factory=list)
    unreadable_required_fields: List[str] = Field(default_factory=list)
    conflicting_fields: List[str] = Field(default_factory=list)
    needs_review: bool = True
    field_assessments: Dict[str, FieldAssessment] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Automated Validation Layer
# ---------------------------------------------------------------------------

class ValidationFinding(BaseModel):
    field: str
    status: str
    severity: str = "WARNING"
    rule_category: str
    reason: str
    original_value: Any = None
    comparison_value: Any = None


class ValidationResult(BaseModel):
    schema_version: str = "1.0.0"
    validation_run_id: str
    record_id: str
    document_id: str
    decision: str = "REVIEW_REQUIRED"
    summary: str = ""
    needs_review: bool = True
    findings: List[ValidationFinding] = Field(default_factory=list)
    rule_engine: str = "DETERMINISTIC"


# ---------------------------------------------------------------------------
# Anomaly & Duplicate Detection Layer
# ---------------------------------------------------------------------------

class AnomalyFinding(BaseModel):
    category: str
    severity: str = "WARNING"
    explanation: str
    field: Optional[str] = None
    evidence: Dict[str, Any] = Field(default_factory=dict)


class DuplicateMatchInfo(BaseModel):
    matched_record_id: str
    match_type: str
    confidence: float
    evidence: List[Dict[str, Any]] = Field(default_factory=list)


class AnomalyDuplicateResult(BaseModel):
    stage_id: str
    record_id: str
    anomaly_status: str = "CLEAR"
    anomalies: List[AnomalyFinding] = Field(default_factory=list)
    duplicate_status: str = "CLEAR"
    matched_records: List[DuplicateMatchInfo] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# HITL (Human-in-the-Loop) Layer
# ---------------------------------------------------------------------------

class HitlFieldReview(BaseModel):
    field_name: str
    action: str = "VERIFY"  # VERIFY, CORRECT, UNRESOLVED
    original_value: Any = None
    reviewed_value: Any = None
    reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: datetime = Field(default_factory=datetime.utcnow)


class HitlSessionState(BaseModel):
    session_id: str
    record_id: str
    document_id: str
    status: str = "READY_FOR_HITL"
    reviewer: Optional[str] = None
    reviews: Dict[str, HitlFieldReview] = Field(default_factory=dict)
    submitted_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Canonical Land Record (Final ZameenAI Output)
# ---------------------------------------------------------------------------

class DocumentSection(BaseModel):
    document_id: Optional[str] = None
    document_type: str = "RECORD_OF_RIGHTS"
    document_title: Optional[str] = None
    department: Optional[str] = None
    document_date: Optional[str] = None
    map_number: Optional[str] = None


class OwnerSection(BaseModel):
    name: Optional[str] = None
    father_husband_name: Optional[str] = None
    co_owner: Optional[str] = None
    recorded_tenant: Optional[str] = None


class LandSection(BaseModel):
    survey_number: Optional[str] = None
    khasra_number: Optional[str] = None
    plot_number: Optional[str] = None
    khata_number: Optional[str] = None
    area: Optional[float] = None
    area_unit: Optional[str] = None
    nature_of_land: Optional[str] = None
    land_type: Optional[str] = None


class LocationSection(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    block: Optional[str] = None
    tehsil: Optional[str] = None
    mouza: Optional[str] = None
    village: Optional[str] = None


class MutationSection(BaseModel):
    mutation_number: Optional[str] = None
    mutation_date: Optional[str] = None


class RegistrationSection(BaseModel):
    document_number: Optional[str] = None
    registration_date: Optional[str] = None
    issue_date: Optional[str] = None


class AdditionalSection(BaseModel):
    remarks: Optional[str] = None


class CanonicalLandRecord(BaseModel):
    """Authoritative ZameenAI Canonical Land Record Schema."""
    schema_version: str = "1.0.0"
    record_id: str
    document: DocumentSection = Field(default_factory=DocumentSection)
    owner: OwnerSection = Field(default_factory=OwnerSection)
    land: LandSection = Field(default_factory=LandSection)
    location: LocationSection = Field(default_factory=LocationSection)
    mutation: MutationSection = Field(default_factory=MutationSection)
    registration: RegistrationSection = Field(default_factory=RegistrationSection)
    additional: AdditionalSection = Field(default_factory=AdditionalSection)

    # Verification and Quality Metadata
    confidence_score: float = 0.0
    confidence_band: str = "LOW"
    completeness_score: float = 0.0
    validation_status: str = "PENDING"
    verification_status: str = "READY_FOR_HITL"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Complete Pipeline Execution Artifact Container
# ---------------------------------------------------------------------------

class DigitizationPipelineArtifact(BaseModel):
    """Top-level container uniting all stage artifacts with complete provenance."""
    record_id: str
    document_id: str
    ingestion_id: str
    raw_ocr: Optional[RawOcrStructure] = None
    structured_extraction: Optional[StructuredExtractionJson] = None
    confidence_completeness: Optional[ConfidenceCompletenessResult] = None
    validation: Optional[ValidationResult] = None
    anomaly_duplicate: Optional[AnomalyDuplicateResult] = None
    hitl: Optional[HitlSessionState] = None
    canonical_record: Optional[CanonicalLandRecord] = None
