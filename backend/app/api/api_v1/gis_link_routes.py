"""GIS linkage + capability APIs (authorized; no fabricated matches)."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user, require_permission
from app.database.session import get_domain_db
from app.schemas.workflow_gis import LandRecordParcelLinkRequest
from app.services.gis_service import GisService, capability

router = APIRouter(prefix="/gis/links", tags=["gis-links"])


@router.get("/capability")
def gis_capability():
    return JSONResponse(capability())


@router.post("", dependencies=[Depends(require_permission("GIS.READ"))])
def create_link(payload: LandRecordParcelLinkRequest,
                user: dict = Depends(get_current_user),
                db=Depends(get_domain_db)):
    result = GisService(db).create_link(
        record_id=payload.record_id, parcel_id=payload.parcel_id,
        parcel_code=payload.parcel_code, project_id=payload.project_id,
        match_method=payload.match_method, created_by=user["username"])
    return JSONResponse(result, status_code=200 if result.get("status") == "SUCCESS" else 400)


@router.get("/records/{record_id}", dependencies=[Depends(require_permission("GIS.READ"))])
def links_for_record(record_id: str, db=Depends(get_domain_db)):
    return {"record_id": record_id, "links": GisService(db).links_for_record(record_id),
            "capability": capability()}
