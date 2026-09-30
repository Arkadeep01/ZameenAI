"""Acquisition lifecycle authority (single source of truth).

The acquisition domain has its own lifecycle, separate from the digitization
record workflow in :mod:`app.workflow.state_machine`:

    DRAFT -> SUBMITTED -> UNDER_VERIFICATION -> VERIFIED -> PENDING_APPROVAL
          -> APPROVED -> NOTIFICATION -> COMPENSATION -> POSSESSION -> COMPLETED

Objections and compensation calculations carry their own short lifecycles.
This module owns every legal edge plus the minimum role allowed to perform it,
so route handlers never carry a second, competing transition map. Routes call
:func:`validate_transition` and let it raise.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.core.roles import (
    APPROVER,
    DESK_VALIDATOR,
    PIA,
    SYSTEM_ADMIN,
)

PROJECT_DRAFT = "DRAFT"
PROJECT_SUBMITTED = "SUBMITTED"
PROJECT_UNDER_VERIFICATION = "UNDER_VERIFICATION"
PROJECT_VERIFIED = "VERIFIED"
PROJECT_PENDING_APPROVAL = "PENDING_APPROVAL"
PROJECT_APPROVED = "APPROVED"
PROJECT_NOTIFICATION = "NOTIFICATION"
PROJECT_COMPENSATION = "COMPENSATION"
PROJECT_POSSESSION = "POSSESSION"
PROJECT_COMPLETED = "COMPLETED"
PROJECT_REJECTED = "REJECTED"

# Valid project edges: source -> {targets}.
PROJECT_TRANSITIONS: dict[str, set[str]] = {
    PROJECT_DRAFT: {PROJECT_SUBMITTED},
    PROJECT_SUBMITTED: {PROJECT_UNDER_VERIFICATION, PROJECT_REJECTED},
    PROJECT_UNDER_VERIFICATION: {PROJECT_VERIFIED, PROJECT_REJECTED},
    PROJECT_VERIFIED: {PROJECT_PENDING_APPROVAL},
    PROJECT_PENDING_APPROVAL: {PROJECT_APPROVED, PROJECT_REJECTED},
    PROJECT_APPROVED: {PROJECT_NOTIFICATION},
    PROJECT_NOTIFICATION: {PROJECT_COMPENSATION},
    PROJECT_COMPENSATION: {PROJECT_POSSESSION},
    PROJECT_POSSESSION: {PROJECT_COMPLETED},
    PROJECT_REJECTED: set(),
    PROJECT_COMPLETED: set(),
}

# Minimum role allowed to move *into* a target state. system_admin bypasses.
PROJECT_TARGET_MIN_ROLES: dict[str, set[str]] = {
    PROJECT_SUBMITTED: {PIA, SYSTEM_ADMIN},
    PROJECT_UNDER_VERIFICATION: {DESK_VALIDATOR, SYSTEM_ADMIN},
    PROJECT_VERIFIED: {DESK_VALIDATOR, SYSTEM_ADMIN},
    PROJECT_PENDING_APPROVAL: {DESK_VALIDATOR, SYSTEM_ADMIN},
    PROJECT_APPROVED: {APPROVER, SYSTEM_ADMIN},
    PROJECT_REJECTED: {APPROVER, DESK_VALIDATOR, SYSTEM_ADMIN},
    PROJECT_NOTIFICATION: {APPROVER, SYSTEM_ADMIN},
    PROJECT_COMPENSATION: {APPROVER, SYSTEM_ADMIN},
    PROJECT_POSSESSION: {APPROVER, SYSTEM_ADMIN},
    PROJECT_COMPLETED: {APPROVER, SYSTEM_ADMIN},
}

# Grievance / objection lifecycle.
OBJECTION_TRANSITIONS: dict[str, set[str]] = {
    "OPEN": {"RESOLVED", "REJECTED"},
    "RESOLVED": set(),
    "REJECTED": set(),
}

OBJECTION_TARGET_MIN_ROLES: dict[str, set[str]] = {
    "RESOLVED": {APPROVER, DESK_VALIDATOR, SYSTEM_ADMIN},
    "REJECTED": {APPROVER, DESK_VALIDATOR, SYSTEM_ADMIN},
}

# Compensation calculation lifecycle.
COMPENSATION_TRANSITIONS: dict[str, set[str]] = {
    "PENDING": {"CALCULATED", "REJECTED"},
    "CALCULATED": {"APPROVED", "REJECTED"},
    "APPROVED": set(),
    "REJECTED": set(),
}

COMPENSATION_TARGET_MIN_ROLES: dict[str, set[str]] = {
    "CALCULATED": {DESK_VALIDATOR, SYSTEM_ADMIN},
    "APPROVED": {APPROVER, SYSTEM_ADMIN},
    "REJECTED": {APPROVER, DESK_VALIDATOR, SYSTEM_ADMIN},
}

TRANSITION_MAPS: dict[str, dict[str, set[str]]] = {
    "project": PROJECT_TRANSITIONS,
    "objection": OBJECTION_TRANSITIONS,
    "compensation": COMPENSATION_TRANSITIONS,
}

TARGET_MIN_ROLES: dict[str, dict[str, set[str]]] = {
    "project": PROJECT_TARGET_MIN_ROLES,
    "objection": OBJECTION_TARGET_MIN_ROLES,
    "compensation": COMPENSATION_TARGET_MIN_ROLES,
}

TERMINAL = {PROJECT_REJECTED, PROJECT_COMPLETED}


@dataclass(frozen=True)
class TransitionCheck:
    ok: bool
    reason: str = ""


def can_transition(entity: str, source: str, target: str, *, role: str = "") -> TransitionCheck:
    """Check a lifecycle edge and the caller's authority over the target state."""
    edges = TRANSITION_MAPS.get(entity)
    if edges is None:
        return TransitionCheck(False, f"Unknown acquisition entity: {entity}")
    if target not in edges.get(source, set()):
        return TransitionCheck(False, f"Invalid transition {source} -> {target}")
    if role == SYSTEM_ADMIN:
        return TransitionCheck(True)
    required = TARGET_MIN_ROLES[entity].get(target)
    if required and role not in required:
        return TransitionCheck(False, f"Role '{role}' may not move {entity} to {target}")
    return TransitionCheck(True)


def validate_transition(entity: str, source: str, target: str, *, role: str = "") -> str:
    """Return ``target`` or raise ``ValueError`` describing the rejection.

    Routes translate the ``ValueError`` into the API error envelope; the
    authoritative decision stays in this module.
    """
    check = can_transition(entity, source, target, role=role)
    if not check.ok:
        raise ValueError(check.reason)
    return target


def allowed_targets(entity: str, source: str) -> list[str]:
    return sorted(TRANSITION_MAPS.get(entity, {}).get(source, set()))
