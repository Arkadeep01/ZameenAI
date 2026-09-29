"""
ZameenAI Land Record Digitization & OCR Subsystem.

Authoritative pipeline migrated from Land Digitization.
Provides comprehensive Phase 01 to Phase 11 processing capabilities.
"""

import sys

# Provide backward-compatibility so internal references to 'src.phase...' resolve directly
if "src" not in sys.modules:
    sys.modules["src"] = sys.modules[__name__]

from app.ocr.image_preprocessing import ImagePreprocessor, ImageQualityAssessment
from app.ocr.multilingual_registry import (
    SCHEDULED_LANGUAGES,
    build_capability_matrix,
    probe_tesseract_installed,
)
from app.ocr.ocr import (
    configure_tesseract,
    run_real_ocr,
    run_ocr_with_data,
    ocr_region,
    ocr_images,
    ocr_layout_regions,
)
from app.ocr.phase01_ingestion import get_ingestion_service, IngestionStatus
from app.ocr.phase02_quality_check import get_quality_service
from app.ocr.phase03_ai_document_preprocessing import get_preprocessing_service
from app.ocr.phase04_document_classification import (
    DocumentClassificationService,
    DocumentType,
    ClassificationStatus,
)
from app.ocr.phase05_language_and_script_detection import (
    LanguageAndScriptDetectionService,
    APIStatus as LanguageDetectionAPIStatus,
)
from app.ocr.phase05_ocr_configuration import (
    OCRConfigurationService,
    ConfigurationStatus,
)
from app.ocr.phase06_ocr_visual_text_recognition import (
    OCRService,
    OCRStatus,
)
from app.ocr.phase06_surya_local import run_surya_local, is_surya_local_enabled
from app.ocr.phase07_semantic_field_extraction import (
    SemanticExtractionService,
    ExtractionStatus,
    ALL_CANONICAL_FIELDS,
)
from app.ocr.phase08_confidence_completeness import (
    ConfidenceCompletenessService,
    RecordStatus,
)
from app.ocr.phase09_automated_validation import (
    ValidationErrorCode,
    ValidationDecision,
    get_automated_validation_service,
)
from app.ocr.phase09_uploader_remediation import (
    RemediationErrorCode,
    get_uploader_remediation_service,
)
from app.ocr.phase10_anomaly_duplicate_detection import (
    AnomalyDuplicateStageService,
    AnomalyCategory,
    DuplicateMatchType,
)
from app.ocr.phase10_resubmission import (
    ResubmissionErrorCode,
    get_resubmission_service,
)
from app.ocr.phase11_hitl_verification import (
    Hitl1Service,
    Hitl1Status,
    FieldReviewAction,
)
from app.ocr.phase11_reprocessing import (
    ReprocessingErrorCode,
    get_reprocessing_service,
)

__all__ = [
    "ImagePreprocessor",
    "ImageQualityAssessment",
    "SCHEDULED_LANGUAGES",
    "build_capability_matrix",
    "probe_tesseract_installed",
    "configure_tesseract",
    "run_real_ocr",
    "run_ocr_with_data",
    "ocr_region",
    "ocr_images",
    "ocr_layout_regions",
    "get_ingestion_service",
    "IngestionStatus",
    "get_quality_service",
    "get_preprocessing_service",
    "DocumentClassificationService",
    "DocumentType",
    "ClassificationStatus",
    "LanguageAndScriptDetectionService",
    "LanguageDetectionAPIStatus",
    "OCRConfigurationService",
    "ConfigurationStatus",
    "OCRService",
    "OCRStatus",
    "run_surya_local",
    "is_surya_local_enabled",
    "SemanticExtractionService",
    "ExtractionStatus",
    "ALL_CANONICAL_FIELDS",
    "ConfidenceCompletenessService",
    "RecordStatus",
    "ValidationErrorCode",
    "ValidationDecision",
    "get_automated_validation_service",
    "RemediationErrorCode",
    "get_uploader_remediation_service",
    "AnomalyDuplicateStageService",
    "AnomalyCategory",
    "DuplicateMatchType",
    "ResubmissionErrorCode",
    "get_resubmission_service",
    "Hitl1Service",
    "Hitl1Status",
    "FieldReviewAction",
    "ReprocessingErrorCode",
    "get_reprocessing_service",
]
