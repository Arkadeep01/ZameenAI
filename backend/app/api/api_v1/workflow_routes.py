"""Workflow + HITL-decision + canonical-record + audit/notification APIs."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user, require_permission
from app.database.session import get_domain_db
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/workflow", tags=["workflow"])


def _svc(db=Depends(get_domain_db)) -> WorkflowService:
    return WorkflowService(db)


@router.get("/records/{record_id}/state", dependencies=[Depends(require_permission("WORKFLOW.READ"))])
def record_state(record_id: str, svc: WorkflowService = Depends(_svc)):
    return JSONResponse(svc.record_state(record_id))


@router.post("/hitl/{hitl_id}/decision", dependencies=[Depends(require_permission("HITL.REVIEW"))])
def hitl_decision(hitl_id: str, decision: str = "", reviewer: str = "", notes: str = "",
                  user: dict = Depends(get_current_user),
                  svc: WorkflowService = Depends(_svc)):
    result = svc.hitl_decision(hitl_id=hitl_id, decision=decision,
                               reviewer=reviewer or user["username"],
                               notes=notes, actor_role=user["role"])
    code = 200 if result.get("status") == "SUCCESS" else 400
    if result.get("error_code") == "INVALID_TRANSITION":
        code = 422
    return JSONResponse(result, status_code=code)


@router.post("/records/{record_id}/canonical", dependencies=[Depends(require_permission("WORKFLOW.APPROVE"))])
def canonical(record_id: str, user: dict = Depends(get_current_user),
              svc: WorkflowService = Depends(_svc)):
    result = svc.materialize_canonical(record_id, verified_by=user["username"])
    return JSONResponse(result, status_code=200 if result.get("status") == "SUCCESS" else 400)


@router.get("/audit", dependencies=[Depends(require_permission("WORKFLOW.READ"))])
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
