"""Authoritative digitization workflow state machine.

Unifies the previously disconnected file-backed lifecycles:
HITL-1 session status, uploader-remediation sessions, resubmissions, and
reprocessing runs into one record-level workflow with validated
transitions. Stale phase-number strings are retired; every edge below
maps to a real service call covered by tests.
"""
from __future__ import annotations

from dataclasses import dataclass

# Record-level workflow states (single authority).
INGESTED = "INGESTED"
QUALITY_CHECKED = "QUALITY_CHECKED"
PREPROCESSED = "PREPROCESSED"
CLASSIFIED = "CLASSIFIED"
OCR_DONE = "OCR_DONE"
EXTRACTED = "EXTRACTED"
CONFIDENCE_SCORED = "CONFIDENCE_SCORED"
VALIDATED = "VALIDATED"
ANOMALY_CHECKED = "ANOMALY_CHECKED"
READY_FOR_HITL = "READY_FOR_HITL"
UNDER_REVIEW = "UNDER_REVIEW"
CORRECTION_REQUIRED = "CORRECTION_REQUIRED"
RESUBMITTED = "RESUBMITTED"
REPROCESSING = "REPROCESSING"
REPROCESSED = "REPROCESSED"
VERIFIED = "VERIFIED"
REJECTED = "REJECTED"

TERMINAL = {VERIFIED, REJECTED}

# Valid edges: source -> {targets}. Every transition requires the listed
# minimum role/permission (checked by routes + services, not the UI).
TRANSITIONS: dict[str, set[str]] = {
    INGESTED: {QUALITY_CHECKED},
    QUALITY_CHECKED: {PREPROCESSED},
    PREPROCESSED: {CLASSIFIED},
    CLASSIFIED: {OCR_DONE},
    OCR_DONE: {EXTRACTED},
    EXTRACTED: {CONFIDENCE_SCORED},
    CONFIDENCE_SCORED: {VALIDATED},
    VALIDATED: {ANOMALY_CHECKED},
    ANOMALY_CHECKED: {READY_FOR_HITL, VALIDATED},
    READY_FOR_HITL: {UNDER_REVIEW, REJECTED},
    UNDER_REVIEW: {VERIFIED, CORRECTION_REQUIRED, REJECTED},
    CORRECTION_REQUIRED: {RESUBMITTED},          # correction -> resubmission
    RESUBMITTED: {REPROCESSING},                 # resubmission -> reprocessing
    REPROCESSING: {REPROCESSED},
    REPROCESSED: {VALIDATED, READY_FOR_HITL},    # reprocessing -> validation
    VERIFIED: set(),
    REJECTED: set(),
}

# Minimum role allowed to perform a transition *into* the target state.
# System admin bypasses all checks.
TARGET_MIN_ROLES: dict[str, set[str]] = {
    VERIFIED: {"approver", "system_admin", "desk_validator"},
    REJECTED: {"approver", "system_admin", "desk_validator"},
    CORRECTION_REQUIRED: {"desk_validator", "system_admin", "approver"},
    RESUBMITTED: {"field_officer", "pia", "system_admin", "citizen"},
    REPROCESSING: {"system_admin", "pia", "desk_validator"},
    UNDER_REVIEW: {"desk_validator", "system_admin", "approver"},
}


@dataclass(frozen=True)
class TransitionCheck:
    ok: bool
    reason: str = ""


def can_transition(source: str, target: str, *, role: str = "") -> TransitionCheck:
    allowed = TRANSITIONS.get(source, set())
    if target not in allowed:
        return TransitionCheck(False, f"Invalid transition {source} -> {target}")
    if role == "system_admin":
        return TransitionCheck(True)
    required = TARGET_MIN_ROLES.get(target)
    if required and role not in required:
        # Pipeline-internal forward steps are system-allowed.
        if target in {QUALITY_CHECKED, PREPROCESSED, CLASSIFIED, OCR_DONE, EXTRACTED,
                      CONFIDENCE_SCORED, VALIDATED, ANOMALY_CHECKED, READY_FOR_HITL,
                      REPROCESSED}:
            return TransitionCheck(True)
        return TransitionCheck(False, f"Role '{role}' may not move to {target}")
    return TransitionCheck(True)


def allowed_targets(source: str) -> list[str]:
    return sorted(TRANSITIONS.get(source, set()))
