"""GIS linkage + capability APIs (authorized; no fabricated matches)."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user, require_permission
from app.core.permissions import GIS_READ, GIS_UPDATE
from app.database.session import get_domain_db
from app.schemas.workflow_gis import LandRecordParcelLinkRequest
from app.services.gis_service import GisService, capability

router = APIRouter(prefix="/gis/links", tags=["gis-links"])


@router.get("/capability")
def gis_capability():
    return JSONResponse(capability())


@router.post("", dependencies=[Depends(require_permission(GIS_UPDATE))])
def create_link(payload: LandRecordParcelLinkRequest, request: Request,
                user: dict = Depends(get_current_user),
                db=Depends(get_domain_db)):
    from app.core.scopes import ScopeService

    ScopeService.check(user, record_id=payload.record_id or None,
                       parcel_id=str(payload.parcel_id) if payload.parcel_id else None,
                       request=request)
    result = GisService(db).create_link(
        record_id=payload.record_id, parcel_id=payload.parcel_id,
        parcel_code=payload.parcel_code, project_id=payload.project_id,
        match_method=payload.match_method, created_by=user["username"])
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        _db = _SessionFactory()
        try:
            AuditService(_db).log(
                actor_id=user.get("id"), actor_role=user.get("role"),
                action="GIS_LINK_CREATED", entity_type="parcel_link",
                entity_id=payload.record_id,
                request_id=getattr(getattr(request, "state", None), "request_id", None),
                ip_address=request.client.host if request.client else None,
                meta={"parcel_id": payload.parcel_id})
        finally:
            _db.close()
    except Exception as exc:
        from app.services.audit_notification_service import report_audit_failure

        report_audit_failure("GIS_LINK_CREATED", "parcel_link", payload.record_id, exc)
    return JSONResponse(result, status_code=200 if result.get("status") == "SUCCESS" else 400)


@router.get("/records/{record_id}", dependencies=[Depends(require_permission(GIS_READ))])
def links_for_record(record_id: str, request: Request, db=Depends(get_domain_db),
                     user: dict = Depends(get_current_user)):
    from app.core.scopes import ScopeService

    ScopeService.check(user, record_id=record_id, request=request)
    return {"record_id": record_id, "links": GisService(db).links_for_record(record_id),
            "capability": capability()}
