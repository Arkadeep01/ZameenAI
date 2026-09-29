"""Decomposed from phase01_ingestion.py: service. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
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
from .models import *
from .ids import *
from .validators import *

import logging
logger = logging.getLogger(__name__)

class DocumentIngestionService:
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or (APP_DIR / "uploads" / "originals")
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def ingest(self, file_content: bytes, original_filename: str) -> IngestionResult:
        received_at = datetime.now().isoformat()
        result = IngestionResult(
            timestamps={
                "received_at": received_at,
                "completed_at": None,
            }
        )

        result.status = IngestionStatus.RECEIVED
        
        result.status = IngestionStatus.VALIDATING
        
        is_valid, ext, err_code = FileValidator.validate_extension(original_filename)
        if not is_valid:
            return self._fail_result(
                result,
                ErrorCode.UNSUPPORTED_FILE_TYPE,
                f"Uploaded file type is not supported: {ext}",
                {
                    "filename": original_filename,
                    "detected_type": ext,
                    "supported_types": list(SUPPORTED_EXTENSIONS),
                },
                received_at,
            )

        temp_path = self.storage_dir / f"temp_{uuid.uuid4().hex}{ext}"
        try:
            with open(temp_path, "wb") as f:
                f.write(file_content)

            is_readable, read_err = FileValidator.validate_readable(temp_path)
            if not is_readable:
                return self._fail_result(
                    result,
                    read_err or ErrorCode.FILE_UNREADABLE,
                    "File could not be read",
                    {"filename": original_filename},
                    received_at,
                )

            is_size_valid, file_size, size_err = FileValidator.validate_size(temp_path)
            if not is_size_valid:
                return self._fail_result(
                    result,
                    size_err or ErrorCode.FILE_TOO_LARGE,
                    f"File size exceeds maximum allowed: {MAX_UPLOAD_SIZE_MB}MB",
                    {
                        "filename": original_filename,
                        "file_size_bytes": file_size,
                        "max_allowed_bytes": MAX_UPLOAD_SIZE_BYTES,
                        "within_limit": False,
                    },
                    received_at,
                )

            is_mime_valid, mime_err = FileValidator.validate_mime_type(temp_path, ext)
            if not is_mime_valid:
                return self._fail_result(
                    result,
                    mime_err or ErrorCode.INVALID_DOCUMENT,
                    f"File content does not match extension {ext}",
                    {"filename": original_filename, "detected_type": ext},
                    received_at,
                )

            record_id = IDGenerator.generate_record_id()
            document_id = IDGenerator.generate_document_id()
            ingestion_id = IDGenerator.generate_ingestion_id()

            result.record_id = record_id
            result.document_id = document_id
            result.ingestion_id = ingestion_id

            result.status = IngestionStatus.REGISTERED

            stored_filename = f"{ingestion_id}{ext}"
            stored_path = self.storage_dir / stored_filename

            temp_path.replace(stored_path)

            integrity = IntegrityCheck()

            checksum = ChecksumGenerator.compute_sha256(stored_path)
            integrity.checksum_generated = True

            page_count = None
            width = None
            height = None
            channels = None

            if ext == ".pdf":
                is_pdf_valid, page_count, is_encrypted, pdf_err = PDFValidator.validate_pdf(stored_path)
                if not is_pdf_valid:
                    stored_path.unlink()
                    return self._fail_result(
                        result,
                        pdf_err or ErrorCode.CORRUPTED_PDF,
                        "PDF is corrupted or unreadable",
                        {"filename": original_filename},
                        received_at,
                    )
                integrity.file_valid = True
            else:
                is_img_valid, width, height, channels, img_err = ImageValidator.validate_image(stored_path)
                if not is_img_valid:
                    stored_path.unlink()
                    return self._fail_result(
                        result,
                        img_err or ErrorCode.INVALID_IMAGE,
                        "Image is corrupted or unreadable",
                        {"filename": original_filename},
                        received_at,
                    )
                integrity.file_valid = True
                page_count = 1

            integrity.file_readable = True

            mime_type = SUPPORTED_MIME_TYPES.get(ext, "application/octet-stream")
            file_type = FILE_TYPE_MAP.get(ext, ext.upper().lstrip("."))

            result.source = IngestionSource(
                original_filename=original_filename,
                file_type=file_type,
                mime_type=mime_type,
                file_size_bytes=file_size,
                sha256=checksum,
                page_count=page_count,
                width=width,
                height=height,
            )

            result.integrity = integrity

            result.status = IngestionStatus.SUCCESS
            result.timestamps["completed_at"] = datetime.now().isoformat()

            logger.info(
                f"Successfully ingested document: {document_id}, "
                f"record: {record_id}, ingestion: {ingestion_id}, "
                f"file: {original_filename}, size: {file_size} bytes"
            )

            return result

        except Exception as e:
            logger.exception(f"Ingestion failed for {original_filename}: {e}")
            if temp_path.exists():
                temp_path.unlink()
            return self._fail_result(
                result,
                ErrorCode.UNKNOWN_ERROR,
                "An unexpected error occurred during ingestion",
                {"filename": original_filename, "error": str(e)},
                received_at,
            )

    def _fail_result(
        self,
        result: IngestionResult,
        error_code: ErrorCode,
        message: str,
        details: Dict[str, Any],
        received_at: str,
    ) -> IngestionResult:
        result.status = IngestionStatus.FAILED
        result.error = IngestionError(
            error_code=error_code,
            message=message,
            details=details,
        )
        result.timestamps["completed_at"] = datetime.now().isoformat()
        result.timestamps["received_at"] = received_at
        return result

_ingestion_service: Optional[DocumentIngestionService] = None

def get_ingestion_service() -> DocumentIngestionService:
    global _ingestion_service
    if _ingestion_service is None:
        _ingestion_service = DocumentIngestionService()
    return _ingestion_service

def reset_ingestion_service() -> None:
    global _ingestion_service
    _ingestion_service = None
    IDGenerator.reset_counters()
