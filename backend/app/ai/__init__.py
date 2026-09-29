"""AI provider-abstraction package.

The authoritative implementations live with the migrated pipeline
(``app.ocr.classification`` / ``extraction`` / ``confidence`` /
``language`` / ``core``); this package documents the replaceable-provider
boundary required by TECHSPEC §63 instead of duplicating those services.

- DocumentClassifier -> app.ocr.classification.service
- FieldExtractor    -> app.ocr.extraction.pipeline
- ConfidenceEngine  -> app.ocr.confidence.engine
- OCR providers     -> app.ocr.core (tesseract/surya) + app.ocr.ocr_config
"""
from app.ocr.classification.service import DocumentClassificationService  # noqa: F401
from app.ocr.confidence.service import ConfidenceCompletenessService  # noqa: F401
from app.ocr.extraction.pipeline import SemanticExtractionService  # noqa: F401
