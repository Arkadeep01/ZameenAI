"""Compatibility facade for phase09_uploader_remediation.py (decomposed; authoritative code lives in ./remediation/).

This file is a thin re-export shim preserving the ``phaseXX`` naming
convention and the ``src.phase09_uploader_remediation`` import path used by tests.
No logic lives here; see ./remediation/ for authoritative modules.
"""
from __future__ import annotations

from .remediation.models import *
from .remediation.issues import *
from .remediation.service import *
from .remediation.models import (_ISSUE_CORRECTIONS, _SEVERITY_BY_PRIORITY)
from .remediation.issues import (_default_severity_override, _P08_REASON_TO_ISSUE, _QUALITY_ISSUE_MAP, _humanize_field, _now_iso, _new_id, _field_priority_level, _resolve_severity, _reason_to_issue, _default_message, _default_required_action, _field_level_issue)
from .remediation.service import (_mime_for_ext, _sha256_of, _sha256_bytes)
