"""WorkflowAuthorizationService — state-transition authorization.

No route may mutate workflow state without: authentication, permission,
scope, valid current state, valid target state, role authorization,
business rules, audit. Uses app.workflow.state_machine as source of truth.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException, Request, status

from app.workflow import state_machine as sm


def _denied(message: str, code: str, http: int,
            request: Request | None = None) -> HTTPException:
    rid = getattr(getattr(request, "state", None), "request_id", None)
    return HTTPException(status_code=http,
                         detail={"code": code, "message": message, "request_id": rid})


class WorkflowAuthorizationService:
    @staticmethod
    def authorize(*, source: str, target: str, role: str,
                  request: Request | None = None) -> None:
        check = sm.can_transition(source, target.upper(), role=role)
        if not check.ok:
            reason = check.reason or ""
            if reason.startswith("Invalid transition"):
                raise _denied(reason, "INVALID_TRANSITION", 422, request)
            raise _denied(reason or f"Role '{role}' may not move to {target}",
                          "TRANSITION_DENIED", 403, request)

    @staticmethod
    def authorize_hitl_decision(*, decision: str, role: str,
                                request: Request | None = None) -> str:
        """Validate a HITL decision from UNDER_REVIEW (or READY_FOR_HITL
        shorthand). Returns normalized decision or raises."""
        target = (decision or "").upper()
        for source in (sm.UNDER_REVIEW, sm.READY_FOR_HITL):
            check = sm.can_transition(source, target, role=role)
            if check.ok:
                return target
        # Surface the UNDER_REVIEW reason (most specific for reviewers).
        check = sm.can_transition(sm.UNDER_REVIEW, target, role=role)
        reason = check.reason or f"Invalid HITL decision {decision!r}"
        if reason.startswith("Invalid transition"):
            raise _denied(reason, "INVALID_TRANSITION", 422, request)
        raise _denied(reason, "TRANSITION_DENIED", 403, request)
