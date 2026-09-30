"""ScopeService — object/data-scope authorization (IDOR prevention).

Scopes (minimum):
- citizen: own-record scope (scopes list on user)
- PIA/field/validator: project/assignment scope (project_ids + assignment map)
- approver: authority scope (assigned projects/cases; default: same project rule)
- executive: jurisdiction scope (read-heavy; no writes — enforced by permissions)
- admin: controlled global scope (bypass, still audited)

Fail-closed + enumeration-safe: scope denials raise 404 (RESOURCE_NOT_FOUND)
so callers cannot distinguish "missing" from "forbidden". Permission denials
remain 403 PERMISSION_DENIED (capability, not existence).
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException, Request, status

from app.core.roles import APPROVER, CITIZEN, DESK_VALIDATOR, EXECUTIVE, FIELD_OFFICER, \
    PIA, SYSTEM_ADMIN

# Roles whose authority is bounded by a project assignment. Roles outside this
# set (executive) hold jurisdiction-wide read scope and are kept write-free by
# the permission registry instead.
PROJECT_SCOPED_ROLES = (PIA, FIELD_OFFICER, DESK_VALIDATOR, APPROVER)

# Legacy/seed records that were never bound to a project belong to this
# baseline project. Stated explicitly so scope checks stay fail-closed for
# out-of-project users instead of silently allowing unknown bindings.
DEFAULT_PROJECT_ID = "1"

# Assignment maps (DB-backed later; in-memory seed for file-truth records).
# record_id -> {"project_id": str, "assignees": [user_id], "authority": [user_id]}
_RECORD_ASSIGNMENTS: dict[str, dict[str, Any]] = {}
# project_id -> {user_id, ...} membership for project creation/assignment.
_PROJECT_MEMBERS: dict[str, set[str]] = {}


def seed_assignment(record_id: str, *, project_id: str = DEFAULT_PROJECT_ID,
                    assignees: Optional[list[str]] = None,
                    authority: Optional[list[str]] = None) -> None:
    _RECORD_ASSIGNMENTS[record_id] = {
        "project_id": str(project_id or DEFAULT_PROJECT_ID),
        "assignees": list(assignees or []),
        "authority": list(authority or []),
    }


def assign_record(record_id: str, user_id: str, *, role: str = "",
                  project_id: Optional[str] = None) -> dict[str, Any]:
    """Assign a record to a user, creating the assignment if needed.

    The assignee is added to the assignment list. Approver assignments also
    grant freeze/authority scope, because an approver may only act on records
    they are explicitly listed on.
    """
    info = _RECORD_ASSIGNMENTS.setdefault(str(record_id), {
        "project_id": str(project_id or DEFAULT_PROJECT_ID),
        "assignees": [],
        "authority": [],
    })
    if project_id:
        info["project_id"] = str(project_id)
    if user_id and user_id not in info["assignees"]:
        info["assignees"].append(user_id)
    if role == APPROVER and user_id and user_id not in info["authority"]:
        info["authority"].append(user_id)
    return dict(info)


def bind_project(project_id: str, user_id: str) -> None:
    """Record membership of a user in a project (project creator / assignee)."""
    if not project_id or not user_id:
        return
    _PROJECT_MEMBERS.setdefault(str(project_id), set()).add(str(user_id))


def project_members(project_id: str) -> set[str]:
    return set(_PROJECT_MEMBERS.get(str(project_id), set()))


def assignment_for(record_id: str) -> Optional[dict[str, Any]]:
    return _RECORD_ASSIGNMENTS.get(record_id)


def _project_in_scope(user: dict[str, Any], project_id: Optional[str],
                      request: Request | None = None) -> None:
    """Strict project membership check for PROJECT_SCOPED_ROLES (fail closed)."""
    if user.get("role") not in PROJECT_SCOPED_ROLES:
        return  # jurisdiction-scoped read roles (executive) handled by permissions
    assigned = {str(p) for p in user.get("project_ids", [])}
    members = project_members(str(project_id))
    target = str(project_id)
    if user.get("id") in members or target in assigned:
        return
    raise _not_found(request)


def _not_found(request: Request | None = None) -> HTTPException:
    rid = getattr(getattr(request, "state", None), "request_id", None)
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                         detail={"code": "RESOURCE_NOT_FOUND",
                                 "message": "Resource not found",
                                 "request_id": rid})


class ScopeService:
    @staticmethod
    def check(user: dict[str, Any], *, owner_id: Optional[str] = None,
              project_id: Optional[str] = None,
              record_id: Optional[str] = None,
              parcel_id: Optional[str] = None,
              document_id: Optional[str] = None,
              request: Request | None = None) -> None:
        role = user.get("role", "")
        if role == SYSTEM_ADMIN:
            return  # controlled global scope (audited by callers)
        if role == CITIZEN:
            allowed = set(user.get("scopes", []))
            targets = [t for t in (record_id, owner_id, document_id, parcel_id) if t]
            if not targets:
                return  # list endpoints filter separately; no specific object to leak
            if not any(t in allowed for t in targets):
                raise _not_found(request)
            return
        # Non-citizen scoped roles: strict project membership, then assignment.
        if project_id is not None:
            _project_in_scope(user, project_id, request)
            return
        if record_id is not None:
            info = assignment_for(record_id)
            effective_project = str((info or {}).get("project_id") or DEFAULT_PROJECT_ID)
            _project_in_scope(user, effective_project, request)
            if info is None:
                return
            # Field/validator assignment check: if assignees listed and
            # user not among them, deny safely.
            assignees = set(info.get("assignees", []))
            if assignees and role in (FIELD_OFFICER, DESK_VALIDATOR) \
                    and user.get("id") not in assignees:
                raise _not_found(request)
            # Approver authority scope: an approver must be explicitly listed.
            # This fails closed - an unlisted (or empty) authority list grants
            # nobody freeze/approval rights, because freezing is a legal hold.
            if role == APPROVER and user.get("id") not in set(info.get("authority", [])):
                raise _not_found(request)
        return

    @staticmethod
    def filter_records(user: dict[str, Any], record_ids: list[str]) -> list[str]:
        """Filter a candidate id list to in-scope ids (for list endpoints)."""
        role = user.get("role", "")
        if role == SYSTEM_ADMIN or role == EXECUTIVE:
            return list(record_ids)
        if role == CITIZEN:
            allowed = set(user.get("scopes", []))
            return [r for r in record_ids if r in allowed]
        if role not in PROJECT_SCOPED_ROLES:
            return []
        out = []
        for r in record_ids:
            info = assignment_for(r)
            effective_project = str((info or {}).get("project_id") or DEFAULT_PROJECT_ID)
            try:
                _project_in_scope(user, effective_project)
            except HTTPException:
                continue
            if info is not None:
                assignees = set(info.get("assignees", []))
                if assignees and role in (FIELD_OFFICER, DESK_VALIDATOR) \
                        and user.get("id") not in assignees:
                    continue
                if role == APPROVER and user.get("id") not in set(info.get("authority", [])):
                    continue
            out.append(r)
        return out
