"""Decomposed from phase01_ingestion.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
import hashlib
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image

import logging
logger = logging.getLogger(__name__)

class IngestionStatus(str, Enum):
    RECEIVED = "RECEIVED"
    VALIDATING = "VALIDATING"
    REGISTERED = "REGISTERED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class ErrorCode(str, Enum):
    UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
    INVALID_DOCUMENT = "INVALID_DOCUMENT"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    FILE_UNREADABLE = "FILE_UNREADABLE"
    CORRUPTED_PDF = "CORRUPTED_PDF"
    INVALID_IMAGE = "INVALID_IMAGE"
    CHECKSUM_FAILED = "CHECKSUM_FAILED"
    STORAGE_ERROR = "STORAGE_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"}

SUPPORTED_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
}

FILE_TYPE_MAP = {
    ".pdf": "PDF",
    ".jpg": "JPG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".tiff": "TIFF",
    ".tif": "TIFF",
}

MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))

MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

@dataclass
class IngestionError:
    error_code: ErrorCode
    message: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_code": self.error_code.value,
            "message": self.message,
            "details": self.details,
        }

@dataclass
class IngestionMetadata:
    record_id: str
    document_id: str
    ingestion_id: str
    original_filename: str
    stored_filename: str
    file_type: str
    mime_type: str
    file_size_bytes: int
    page_count: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    channels: Optional[int] = None
    checksum: Optional[str] = None
    ingested_at: str = field(default_factory=lambda: datetime.now().isoformat())
    status: str = IngestionStatus.SUCCESS.value

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "record_id": self.record_id,
            "document_id": self.document_id,
            "ingestion_id": self.ingestion_id,
            "original_filename": self.original_filename,
            "stored_filename": self.stored_filename,
            "file_type": self.file_type,
            "mime_type": self.mime_type,
            "file_size_bytes": self.file_size_bytes,
            "ingested_at": self.ingested_at,
            "status": self.status,
        }
        if self.page_count is not None:
            result["page_count"] = self.page_count
        if self.width is not None:
            result["width"] = self.width
        if self.height is not None:
            result["height"] = self.height
        if self.channels is not None:
            result["channels"] = self.channels
        if self.checksum is not None:
            result["checksum"] = self.checksum
        return result

@dataclass
class IntegrityCheck:
    file_readable: bool = False
    file_valid: bool = False
    checksum_generated: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_readable": self.file_readable,
            "file_valid": self.file_valid,
            "checksum_generated": self.checksum_generated,
        }

@dataclass
class IngestionSource:
    original_filename: str
    file_type: str
    mime_type: str
    file_size_bytes: int
    sha256: str
    page_count: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "original_filename": self.original_filename,
            "file_type": self.file_type,
            "mime_type": self.mime_type,
            "file_size_bytes": self.file_size_bytes,
            "sha256": self.sha256,
        }
        if self.page_count is not None:
            result["page_count"] = self.page_count
        if self.width is not None:
            result["width"] = self.width
        if self.height is not None:
            result["height"] = self.height
        return result

@dataclass
class IngestionResult:
    phase: str = "DOCUMENT_INGESTION"
    status: IngestionStatus = IngestionStatus.SUCCESS
    record_id: str = ""
    document_id: str = ""
    ingestion_id: str = ""
    source: Optional[IngestionSource] = None
    integrity: Optional[IntegrityCheck] = None
    timestamps: Dict[str, str] = field(default_factory=dict)
    next_phase: str = "DOCUMENT_QUALITY_COMPLETENESS_CHECK"
    error: Optional[IngestionError] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "phase": self.phase,
            "status": self.status.value,
        }
        if self.error:
            result.update(self.error.to_dict())
        else:
            result.update({
                "record_id": self.record_id,
                "document_id": self.document_id,
                "ingestion_id": self.ingestion_id,
            })
            if self.source:
                result["source"] = self.source.to_dict()
            if self.integrity:
                result["integrity"] = self.integrity.to_dict()
            result["timestamps"] = self.timestamps
            result["next_phase"] = self.next_phase
        return result
