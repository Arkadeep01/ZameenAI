from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
import json

from app.database.connection import get_db
from app.core.deps import get_current_user
from app.core.permissions import GIS_READ
from typing import Optional


# Mounted under /gis/db so it coexists with the demo /gis mock routes.
router = APIRouter(
    prefix="/gis/db",
    tags=["GIS"]
)


def _need_gis(user: dict, request: Request) -> None:
    from app.core.permissions import has_permission
    if not has_permission(user.get("role", ""), GIS_READ):
        raise HTTPException(status_code=403, detail={
            "code": "PERMISSION_DENIED", "message": f"Missing permission: {GIS_READ}",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})


def _audit_gis(request: Request, user: dict, entity_id: str) -> None:
    try:
        from app.database.session import _SessionFactory
        from app.services.audit_notification_service import AuditService

        db = _SessionFactory()
        try:
            AuditService(db).log(
                actor_id=user.get("id"), actor_role=user.get("role"),
                action="GIS_ACCESSED", entity_type="parcel", entity_id=entity_id,
                request_id=getattr(getattr(request, "state", None), "request_id", None),
                ip_address=request.client.host if request.client else None, meta={})
        finally:
            db.close()
    except Exception as exc:
        from app.services.audit_notification_service import report_audit_failure

        report_audit_failure("GIS_ACCESSED", "parcel", parcel_id, exc)


def _redact_for_citizen(user: dict, parcels: list[dict]) -> list[dict]:
    """Citizens may only see parcels linked to their owned records.

    DB parcels carry no direct owner binding in this schema; linkage is via
    land_record_parcel_links. Unlinked parcels are invisible (dropped, not
    redacted) to avoid enumeration.
    """
    role = user.get("role", "")
    if role == "system_admin":
        return parcels
    if role != "citizen":
        return parcels
    try:
        from app.database.session import _SessionFactory
        from app.database.models.parcel_link import LandRecordParcelLink

        allowed = set(user.get("scopes", []))
        db = _SessionFactory()
        try:
            links = db.query(LandRecordParcelLink).all()
            allowed_parcels = {str(l.parcel_id) for l in links if l.record_id in allowed} | \
                {str(l.parcel_code) for l in links if l.record_id in allowed and l.parcel_code}
            return [p for p in parcels
                    if str(p.get("id")) in allowed_parcels
                    or str(p.get("parcel_code")) in allowed_parcels]
        finally:
            db.close()
    except Exception:
        return []


@router.get("/health")
def gis_health():
    return {
        "status": "success",
        "module": "GIS",
        "message": "GIS module is working"
    }


@router.get("/parcels")
def get_parcels(request: Request, user: dict = Depends(get_current_user),
                db: Session = Depends(get_db)):
    _need_gis(user, request)
    query = text("""
        SELECT
            id,
            parcel_code,
            khasra_no,
            khata_no,
            owner_name,
            area,
            village,
            tehsil,
            district,
            project_id,
            land_classification,
            acquisition_status,
            verification_status,
            ST_AsGeoJSON(geometry) AS geometry
        FROM public.land_parcels
        ORDER BY id
    """)

    result = db.execute(query)

    parcels = []

    for row in result:
        parcel = dict(row._mapping)

        if parcel["geometry"]:
            parcel["geometry"] = json.loads(parcel["geometry"])

        parcels.append(parcel)

    parcels = _redact_for_citizen(user, parcels)
    _audit_gis(request, user, "list")

    return {
        "status": "success",
        "count": len(parcels),
        "data": parcels
    }


@router.get("/parcels/search")
def search_parcels(
    request: Request,
    parcel_code: Optional[str] = None,
    khasra_no: Optional[str] = None,
    district: Optional[str] = None,
    acquisition_status: Optional[str] = None,
    verification_status: Optional[str] = None,
    land_classification: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _need_gis(user, request)
    query = """
        SELECT
            id,
            parcel_code,
            khasra_no,
            khata_no,
            owner_name,
            area,
            village,
            tehsil,
            district,
            project_id,
            land_classification,
            acquisition_status,
            verification_status,
            ST_AsGeoJSON(geometry) AS geometry
        FROM public.land_parcels
        WHERE 1=1
    """

    params = {}

    if parcel_code:
        query += " AND parcel_code ILIKE :parcel_code"
        params["parcel_code"] = f"%{parcel_code}%"

    if khasra_no:
        query += " AND khasra_no ILIKE :khasra_no"
        params["khasra_no"] = f"%{khasra_no}%"

    if district:
        query += " AND district ILIKE :district"
        params["district"] = f"%{district}%"

    if acquisition_status:
        query += " AND acquisition_status = :acquisition_status"
        params["acquisition_status"] = acquisition_status

    if verification_status:
        query += " AND verification_status = :verification_status"
        params["verification_status"] = verification_status

    if land_classification:
        query += " AND land_classification = :land_classification"
        params["land_classification"] = land_classification

    query += " ORDER BY id"

    result = db.execute(text(query), params)

    parcels = []

    for row in result:
        parcel = dict(row._mapping)

        if parcel["geometry"]:
            parcel["geometry"] = json.loads(parcel["geometry"])

        parcels.append(parcel)

    parcels = _redact_for_citizen(user, parcels)
    _audit_gis(request, user, "search")

    return {
        "status": "success",
        "count": len(parcels),
        "data": parcels
    }


@router.get("/parcels/{parcel_id}")
def get_parcel(parcel_id: int, request: Request, user: dict = Depends(get_current_user),
               db: Session = Depends(get_db)):
    _need_gis(user, request)
    query = text("""
        SELECT
            id,
            parcel_code,
            khasra_no,
            khata_no,
            owner_name,
            area,
            village,
            tehsil,
            district,
            project_id,
            land_classification,
            acquisition_status,
            verification_status,
            ST_AsGeoJSON(geometry) AS geometry
        FROM public.land_parcels
        WHERE id = :parcel_id
    """)

    result = db.execute(
        query,
        {"parcel_id": parcel_id}
    ).fetchone()

    if not result:
        return {
            "status": "error",
            "message": "Parcel not found"
        }

    parcel = dict(result._mapping)

    if parcel["geometry"]:
        parcel["geometry"] = json.loads(parcel["geometry"])

    # Enumeration-safe citizen scoping: unlinked parcels read as not found.
    scoped = _redact_for_citizen(user, [parcel])
    if user.get("role") == "citizen" and not scoped:
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "Parcel not found",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    _audit_gis(request, user, str(parcel_id))

    return {
        "status": "success",
        "data": parcel
    }
