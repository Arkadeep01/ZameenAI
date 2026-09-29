"""Decomposed from phase11_reprocessing.py: models. (Authoritative implementation; verbatim move.)"""
from __future__ import annotations
from ..paths import (APP_DIR)
import hashlib
import io
import json
import os
import shutil
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import logging
logger = logging.getLogger(__name__)

PHASE_11_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_11"

PHASE_10_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_10"

PHASE_09_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_09"

PHASE_08_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_08"

PHASE_07_STORAGE_DIR = APP_DIR / "uploads" / "processing" / "phase_07"

ORIGINALS_STORAGE_DIR = APP_DIR / "uploads" / "originals"

MAX_ATTEMPTS = int(os.getenv("ZAMEENAI_PHASE11_MAX_ATTEMPTS", "3"))

RETRYABLE_CATEGORIES = ("TRANSIENT",)

REMEDIATION_CATEGORIES = ("DOCUMENT_DEFECT",)

_PRESENT_STATUSES = frozenset(
    {"REQUIRED_AND_PRESENT", "OPTIONAL_AND_PRESENT"}
)

_PHASE_STEPS = [
    "PHASE_02", "PHASE_03", "PHASE_04", "PHASE_05",
    "PHASE_06", "PHASE_07", "PHASE_08",
]

_PHASE_PROGRESS = {
    "PHASE_02": 10, "PHASE_03": 20, "PHASE_04": 30, "PHASE_05": 40,
    "PHASE_06": 60, "PHASE_07": 80, "PHASE_08": 100,
}

_PHASE_LABELS = {
    "PHASE_02": "Quality Check",
    "PHASE_03": "AI Document Preprocessing",
    "PHASE_04": "Document Classification",
    "PHASE_05": "Language & Script Detection",
    "PHASE_06": "OCR Visual Text Recognition",
    "PHASE_07": "Semantic Field Extraction",
    "PHASE_08": "Confidence & Completeness Check",
}

class ReprocessingStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PHASE_02 = "PHASE_02"
    PHASE_03 = "PHASE_03"
    PHASE_04 = "PHASE_04"
    PHASE_05 = "PHASE_05"
    PHASE_06 = "PHASE_06"
    PHASE_07 = "PHASE_07"
    PHASE_08 = "PHASE_08"
    COMPLETED = "COMPLETED"
    COMPLETED_WITH_REMEDIATION_REQUIRED = "COMPLETED_WITH_REMEDIATION_REQUIRED"
    FAILED = "FAILED"
    MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED"

class ReprocessingDecision(str, Enum):
    CASE_A_READY_FOR_VALIDATION = "CASE_A_READY_FOR_VALIDATION"
    CASE_B_REVIEW_REQUIRED = "CASE_B_REVIEW_REQUIRED"
    CASE_C_REMEDIATION_REQUIRED = "CASE_C_REMEDIATION_REQUIRED"
    CASE_D_EXTRACTION_ERROR = "CASE_D_EXTRACTION_ERROR"

class ErrorCategory(str, Enum):
    TRANSIENT = "TRANSIENT"
    DOCUMENT_DEFECT = "DOCUMENT_DEFECT"
    PERMANENT = "PERMANENT"
    UNKNOWN = "UNKNOWN"

class ReprocessingErrorCode(str, Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    MISSING_PARAMETERS = "MISSING_PARAMETERS"
    SUBMISSION_NOT_FOUND = "SUBMISSION_NOT_FOUND"
    SUBMISSION_NOT_ELIGIBLE = "SUBMISSION_NOT_ELIGIBLE"
    RECORD_MISMATCH = "RECORD_MISMATCH"
    REMEDIATION_NOT_FOUND = "REMEDIATION_NOT_FOUND"
    EVIDENCE_NOT_FOUND = "EVIDENCE_NOT_FOUND"
    PAGE_ASSEMBLY_ERROR = "PAGE_ASSEMBLY_ERROR"
    QUALITY_REJECTED = "QUALITY_REJECTED"
    PREPROCESSING_REJECTED = "PREPROCESSING_REJECTED"
    CLASSIFICATION_FAILED = "CLASSIFICATION_FAILED"
    LANGUAGE_DETECTION_FAILED = "LANGUAGE_DETECTION_FAILED"
    OCR_CONFIG_FAILED = "OCR_CONFIG_FAILED"
    OCR_FAILED = "OCR_FAILED"
    EXTRACTION_FAILED = "EXTRACTION_FAILED"
    REGRESSION_DETECTED = "REGRESSION_DETECTED"
    MAXIMUM_ATTEMPTS_REACHED = "MAXIMUM_ATTEMPTS_REACHED"
    RETRY_NOT_ALLOWED = "RETRY_NOT_ALLOWED"
    RUN_NOT_FOUND = "RUN_NOT_FOUND"
    SUBMISSION_ALREADY_PROCESSED = "SUBMISSION_ALREADY_PROCESSED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
