"""
ZameenAI Land Record Digitization & OCR Subsystem.

Responsibility-based packages under ``app.ocr`` are the single authority
(ingestion, quality, preprocessing, classification, language, ocr_config,
recognition, extraction, confidence, validation, anomaly, remediation,
resubmission, hitl, reprocessing, core). This package re-exports the
primary service entry points for convenience; domain code should prefer
the canonical ``app.ocr.<package>.<module>`` paths.
"""

from app.ocr.preprocessing.quality import ImageQualityAssessment
from app.ocr.preprocessing.pipeline import ImagePreprocessor
from app.ocr.language.registry import SCHEDULED_LANGUAGES
from app.ocr.language.capability import (
    build_capability_matrix,
    probe_tesseract_installed,
)
from app.ocr.core.tesseract_engine import (
    configure_tesseract,
    run_real_ocr,
    run_ocr_with_data,
    ocr_region,
    ocr_images,
    ocr_layout_regions,
)
from app.ocr.ingestion.service import get_ingestion_service
from app.ocr.ingestion.models import IngestionStatus
from app.ocr.quality.service import get_quality_service
from app.ocr.preprocessing.ai_service import get_preprocessing_service
from app.ocr.classification.service import DocumentClassificationService
from app.ocr.classification.models import (
    DocumentType,
    ClassificationStatus,
)
from app.ocr.language.lang_service import LanguageAndScriptDetectionService
from app.ocr.language.lang_models import APIStatus as LanguageDetectionAPIStatus
from app.ocr.ocr_config.service import OCRConfigurationService
from app.ocr.ocr_config.models import ConfigurationStatus
from app.ocr.recognition.service import OCRService
from app.ocr.recognition.models import OCRStatus
from app.ocr.core.surya_adapter import run_surya_local
from app.ocr.core.surya_config import is_surya_local_enabled
from app.ocr.extraction.pipeline import SemanticExtractionService
from app.ocr.extraction.models import ExtractionStatus
from app.ocr.extraction.terminology import ALL_CANONICAL_FIELDS
from app.ocr.confidence.service import ConfidenceCompletenessService
from app.ocr.confidence.models import RecordStatus
from app.ocr.validation.models import (
    ValidationErrorCode,
    ValidationDecision,
)
from app.ocr.validation.service import get_automated_validation_service
from app.ocr.remediation.models import RemediationErrorCode
from app.ocr.remediation.service import get_uploader_remediation_service
from app.ocr.anomaly.stage import AnomalyDuplicateStageService
from app.ocr.anomaly.models import (
    AnomalyCategory,
    DuplicateMatchType,
)
from app.ocr.resubmission.models import ResubmissionErrorCode
from app.ocr.resubmission.service import get_resubmission_service
from app.ocr.hitl.service import Hitl1Service
from app.ocr.hitl.models import (
    Hitl1Status,
    FieldReviewAction,
)
from app.ocr.reprocessing.models import ReprocessingErrorCode
from app.ocr.reprocessing.service import get_reprocessing_service

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
