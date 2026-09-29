"""Decomposed from phase01_ingestion.py: validators. (Authoritative implementation; verbatim move.)"""
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
from .models import *

import logging
logger = logging.getLogger(__name__)

class FileValidator:
    @staticmethod
    def validate_extension(filename: str) -> Tuple[bool, Optional[str], Optional[ErrorCode]]:
        if not filename:
            return False, None, ErrorCode.UNSUPPORTED_FILE_TYPE
        
        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            return False, ext, ErrorCode.UNSUPPORTED_FILE_TYPE
        return True, ext, None

    @staticmethod
    def validate_mime_type(file_path: Path, expected_ext: str) -> Tuple[bool, Optional[ErrorCode]]:
        try:
            with open(file_path, "rb") as f:
                header = f.read(8)

            if expected_ext == ".pdf":
                if not header.startswith(b"%PDF"):
                    return False, ErrorCode.INVALID_DOCUMENT
            elif expected_ext in {".jpg", ".jpeg"}:
                if not (header.startswith(b"\xff\xd8\xff") or header.startswith(b"\xff\xd8\xff\xe0")):
                    return False, ErrorCode.INVALID_IMAGE
            elif expected_ext == ".png":
                if not header.startswith(b"\x89PNG"):
                    return False, ErrorCode.INVALID_IMAGE
            elif expected_ext in {".tiff", ".tif"}:
                if not (header.startswith(b"II\x2a\x00") or header.startswith(b"MM\x00\x2a")):
                    return False, ErrorCode.INVALID_IMAGE
            
            return True, None
        except Exception:
            return False, ErrorCode.FILE_UNREADABLE

    @staticmethod
    def validate_size(file_path: Path) -> Tuple[bool, int, Optional[ErrorCode]]:
        try:
            size = file_path.stat().st_size
            if size > MAX_UPLOAD_SIZE_BYTES:
                return False, size, ErrorCode.FILE_TOO_LARGE
            if size == 0:
                return False, size, ErrorCode.FILE_UNREADABLE
            return True, size, None
        except Exception:
            return False, 0, ErrorCode.FILE_UNREADABLE

    @staticmethod
    def validate_readable(file_path: Path) -> Tuple[bool, Optional[ErrorCode]]:
        try:
            with open(file_path, "rb") as f:
                f.read(1)
            return True, None
        except Exception:
            return False, ErrorCode.FILE_UNREADABLE

class PDFValidator:
    @staticmethod
    def validate_pdf(file_path: Path) -> Tuple[bool, int, bool, Optional[ErrorCode]]:
        try:
            import pymupdf as fitz
            
            with fitz.open(str(file_path)) as doc:
                page_count = len(doc)
                if page_count == 0:
                    return False, 0, False, ErrorCode.CORRUPTED_PDF
                
                is_encrypted = doc.is_encrypted
                
                for page_num in range(page_count):
                    try:
                        page = doc[page_num]
                        page.get_text()
                    except Exception:
                        pass
                
                return True, page_count, is_encrypted, None
        except Exception as e:
            logger.error(f"PDF validation failed for {file_path}: {e}")
            return False, 0, False, ErrorCode.CORRUPTED_PDF

class ImageValidator:
    @staticmethod
    def validate_image(file_path: Path) -> Tuple[bool, Optional[int], Optional[int], Optional[int], Optional[ErrorCode]]:
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                channels = len(img.getbands())
                img.verify()
            
            with Image.open(file_path) as img:
                width, height = img.size
                channels = len(img.getbands())
            
            return True, width, height, channels, None
        except Exception as e:
            logger.error(f"Image validation failed for {file_path}: {e}")
            return False, None, None, None, ErrorCode.INVALID_IMAGE

class ChecksumGenerator:
    @staticmethod
    def compute_sha256(file_path: Path) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
