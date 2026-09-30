"""Workflow + HITL-decision + canonical-record + audit/notification APIs."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user, require_permission
from app.core.permissions import (
    AUDIT_READ,
    HITL_REVIEW,
    WORKFLOW_APPROVE,
    WORKFLOW_ASSIGN,
    WORKFLOW_READ,
)
from app.core.roles import ALL_ROLES, normalize_role
from app.database.session import get_domain_db
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/workflow", tags=["workflow"])


def _audit_failure(action: str, entity_id: str, exc: Exception) -> None:
    """Never silently drop an audit failure — emit an error log for alerting."""
    from app.services.audit_notification_service import report_audit_failure

    report_audit_failure(action, "land_record", entity_id, exc)


def _svc(db=Depends(get_domain_db)) -> WorkflowService:
    return WorkflowService(db)


def _resolve_principal_role(principal_id: str, request: Request) -> str:
    """Look up the canonical role of a real, active principal.

    Accepts either a user id or a username so callers can assign work without
    knowing the internal id. Returns "" when the principal does not exist or
    is disabled, so an assignment can never be granted to a phantom user.
    """
    from app.core.roles import normalize_role
    from app.database.session import _SessionFactory
    from app.database.models.user import User

    db = _SessionFactory()
    try:
        row = (db.query(User).filter(User.id == principal_id).first()
               or db.query(User).filter(User.username == principal_id).first())
    finally:
        db.close()
    if row is not None:
        return normalize_role(row.role) if row.is_active else ""
    # Development seed identities are not persisted in the users table.
    from app.core.security import DEV_USERS, dev_users_enabled

    if dev_users_enabled():
        seeded = DEV_USERS.get(principal_id)
        if seeded is None:
            seeded = next((u for u in DEV_USERS.values()
                           if u.get("id") == principal_id), None)
        if seeded is not None:
            return normalize_role(seeded["role"])
    return ""


@router.get("/records/{record_id}/state",
            dependencies=[Depends(require_permission(WORKFLOW_READ))])
def record_state(record_id: str, request: Request,
                 user: dict = Depends(get_current_user),
                 svc: WorkflowService = Depends(_svc)):
    from app.core.scopes import ScopeService

    ScopeService.check(user, record_id=record_id, request=request)
    return JSONResponse(svc.record_state(record_id))


@router.post("/hitl/{hitl_id}/decision",
             dependencies=[Depends(require_permission(HITL_REVIEW))])
def hitl_decision(hitl_id: str, decision: str = "", reviewer: str = "", notes: str = "",
                  request: Request = None,
                  user: dict = Depends(get_current_user),
                  svc: WorkflowService = Depends(_svc)):
    from app.core.scopes import ScopeService
    from app.ocr.hitl.service import get_hitl1_service
    from app.workflow.authorization import WorkflowAuthorizationService

    # Resolve the owning record first: a reviewer may only decide HITL
    # sessions that belong to a record inside their scope.
    session = get_hitl1_service().get_session(hitl_id)
    if not session:
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "HITL session not found",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    ScopeService.check(user, record_id=str(session.get("record_id", "")), request=request)

    target = WorkflowAuthorizationService.authorize_hitl_decision(
        decision=decision, role=user["role"], request=request)
    _ = target
    result = svc.hitl_decision(hitl_id=hitl_id, decision=decision,
                               reviewer=reviewer or user["username"],
                               notes=notes, actor_role=user["role"],
                               request_id=getattr(getattr(request, "state", None),
                                                  "request_id", None),
                               ip_address=request.client.host if request and request.client else None)
    code = 200 if result.get("status") == "SUCCESS" else 400
    if result.get("error_code") == "INVALID_TRANSITION":
        code = 422
    return JSONResponse(result, status_code=code)


@router.post("/records/{record_id}/canonical",
             dependencies=[Depends(require_permission(WORKFLOW_APPROVE))])
def canonical(record_id: str, request: Request,
              user: dict = Depends(get_current_user),
              svc: WorkflowService = Depends(_svc)):
    from app.core.scopes import ScopeService

    ScopeService.check(user, record_id=record_id, request=request)
    result = svc.materialize_canonical(record_id, verified_by=user["username"])
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        db = _SessionFactory()
        try:
            AuditService(db).log(
                actor_id=user.get("id"), actor_role=user.get("role"),
                action="LAND_RECORD_APPROVED", entity_type="land_record",
                entity_id=record_id, new_state="VERIFIED",
                request_id=getattr(getattr(request, "state", None), "request_id", None),
                ip_address=request.client.host if request.client else None,
                meta={"via": "canonical"})
        finally:
            db.close()
    except Exception as exc:
        _audit_failure("LAND_RECORD_APPROVED", record_id, exc)
    return JSONResponse(result, status_code=200 if result.get("status") == "SUCCESS" else 400)


@router.post("/records/{record_id}/assign",
             dependencies=[Depends(require_permission(WORKFLOW_ASSIGN))])
def assign_record(record_id: str, request: Request, assignee_id: str = "",
                  assignee_role: str = "", notes: str = "",
                  user: dict = Depends(get_current_user),
                  svc: WorkflowService = Depends(_svc)):
    """Assign a record to an officer.

    The assignee must be a real, active principal and the assignment is
    persisted so ScopeService actually grants them access. Assigning to self
    requires the record to already be inside the assigner's own scope (prevents
    out-of-scope self-assignment).
    """
    from app.core.scopes import ScopeService, assign_record as persist_assignment, assignment_for

    ScopeService.check(user, record_id=record_id, request=request)
    role = normalize_role(assignee_role) if assignee_role else ""
    if not assignee_id:
        raise HTTPException(status_code=400, detail={
            "code": "ASSIGNEE_REQUIRED", "message": "assignee_id is required",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    if role and role not in ALL_ROLES:
        raise HTTPException(status_code=400, detail={
            "code": "INVALID_ROLE", "message": f"Unknown role: {assignee_role}",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})

    resolved_role = role or _resolve_principal_role(assignee_id, request)
    if not resolved_role:
        raise HTTPException(status_code=404, detail={
            "code": "ASSIGNEE_NOT_FOUND", "message": "Unknown assignee",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    if not role:
        role = resolved_role

    # Persist the assignment; an approver is also added to the freeze authority.
    existing = assignment_for(record_id) or {}
    assignment = persist_assignment(record_id, assignee_id, role=role,
                                     project_id=existing.get("project_id"))
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        db = _SessionFactory()
        try:
            AuditService(db).log(
                actor_id=user.get("id"), actor_role=user.get("role"),
                action="WORKFLOW_ASSIGNED", entity_type="land_record",
                entity_id=record_id, new_state="ASSIGNED",
                request_id=getattr(getattr(request, "state", None), "request_id", None),
                ip_address=request.client.host if request.client else None,
                meta={"assignee_id": assignee_id, "assignee_role": role,
                      "notes": notes or "", "assignees": assignment["assignees"]})
        finally:
            db.close()
    except Exception as exc:
        _audit_failure("WORKFLOW_ASSIGNED", record_id, exc)
    return {"status": "SUCCESS", "record_id": record_id, "assignee_id": assignee_id,
            "assignee_role": role or None,
            "assignees": assignment["assignees"],
            "state": svc.record_state(record_id).get("state")}


@router.get("/audit", dependencies=[Depends(require_permission(AUDIT_READ))])
def audit_list(entity_type: str = "", entity_id: str = "", limit: int = 100,
               db=Depends(get_domain_db)):
    from app.repositories.domain_repositories import AuditRepository
    try:
        events = AuditRepository(db).list(entity_type=entity_type or None,
                                          entity_id=entity_id or None, limit=min(limit, 500))
        return {"count": len(events),
                "events": [{"id": e.id, "actor_id": e.actor_id, "actor_role": e.actor_role,
                            "action": e.action, "entity_type": e.entity_type,
                            "entity_id": e.entity_id, "prev_state": e.prev_state,
                            "new_state": e.new_state,
                            "created_at": e.created_at.isoformat() if e.created_at else None}
                           for e in events]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Audit query failed: {exc}")


@router.get("/notifications/me")
def my_notifications(user: dict = Depends(get_current_user), db=Depends(get_domain_db)):
    from app.repositories.domain_repositories import NotificationRepository
    repo = NotificationRepository(db)
    try:
        items = repo.for_user(user["id"])
    except Exception:
        return {"count": 0, "unread": 0, "notifications": [],
                "note": "Notification store unavailable"}
    return {"count": len(items), "unread": sum(1 for n in items if not n.read),
            "notifications": [{"id": n.id, "type": n.type, "title": n.title,
                               "message": n.message, "read": n.read} for n in items]}


@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: int, user: dict = Depends(get_current_user), db=Depends(get_domain_db)):
    from app.repositories.domain_repositories import NotificationRepository
    n = NotificationRepository(db).mark_read(notif_id, user["id"])
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "SUCCESS", "id": n.id, "read": True}
