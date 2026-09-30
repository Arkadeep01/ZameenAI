from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional

from app.core.deps import get_current_user
from app.core.permissions import GIS_READ

router = APIRouter()

# DEMO-ONLY mock parcels (SIH prototype static GeoJSON). The production path
# is /api/gis/db/* (PostGIS) + /api/gis/links/* (record linkage). These demo
# routes are retained for backward compatibility with the Vite GIS map but
# every response is explicitly flagged demo:true so no consumer mistakes
# them for real cadastral data.

# Status values per TECHSPEC.md Section 34 ("Parcel Status")
PARCEL_STATUS_COLORS = {
    "NOTIFIED": "#dc2626",             # red — pending
    "UNDER_VERIFICATION": "#f59e0b",   # amber
    "ACQUIRED": "#16a34a",             # green
    "COMPENSATION_PENDING": "#f59e0b",
    "COMPENSATION_PAID": "#16a34a",
    "R_AND_R_PENDING": "#f59e0b",
    "R_AND_R_COMPLETED": "#16a34a",
    "POSSESSION_PENDING": "#f59e0b",
    "POSSESSION_COMPLETED": "#15803d",
}

# --- Dummy/mock data for the SIH prototype (per TASKLIST.txt: "Static GIS
# Mapping using predefined GeoJSON dummy data" — no live PostGIS server yet).
# Coordinates are illustrative, near the NH-44 corridor example used in the
# landing page's "Inspect Sample Parcel LA-UP-2025-0842" reference.
DUMMY_PARCELS = [
    {
        "id": "LA-UP-2025-0842",
        "survey_number": "142/2",
        "owner_name": "Ramswaroop Singh",
        "village": "Jewar",
        "district": "Gautam Buddh Nagar",
        "state": "Uttar Pradesh",
        "status": "ACQUIRED",
        "area_hectares": 0.842,
        "notification_id": "LA-UP-2025-0842",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.5980, 28.1150],
                [77.5995, 28.1150],
                [77.5995, 28.1162],
                [77.5980, 28.1162],
                [77.5980, 28.1150],
            ]],
        },
    },
    {
        "id": "LA-UP-2025-0843",
        "survey_number": "142/3",
        "owner_name": "Sunita Devi",
        "village": "Jewar",
        "district": "Gautam Buddh Nagar",
        "state": "Uttar Pradesh",
        "status": "UNDER_VERIFICATION",
        "area_hectares": 0.510,
        "notification_id": "LA-UP-2025-0843",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.5996, 28.1150],
                [77.6008, 28.1150],
                [77.6008, 28.1160],
                [77.5996, 28.1160],
                [77.5996, 28.1150],
            ]],
        },
    },
    {
        "id": "LA-UP-2025-0844",
        "survey_number": "88/A/1",
        "owner_name": "Mohan Lal Yadav",
        "village": "Ravet",
        "district": "Pune",
        "state": "Maharashtra",
        "status": "NOTIFIED",
        "area_hectares": 1.204,
        "notification_id": "LA-MH-2025-0844",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [73.7480, 18.6480],
                [73.7500, 18.6480],
                [73.7500, 18.6495],
                [73.7480, 18.6495],
                [73.7480, 18.6480],
            ]],
        },
    },
    {
        "id": "LA-MH-2025-0845",
        "survey_number": "88/A/2",
        "owner_name": "Kavita Patil",
        "village": "Ravet",
        "district": "Pune",
        "state": "Maharashtra",
        "status": "COMPENSATION_PENDING",
        "area_hectares": 0.675,
        "notification_id": "LA-MH-2025-0845",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [73.7501, 18.6480],
                [73.7515, 18.6480],
                [73.7515, 18.6492],
                [73.7501, 18.6492],
                [73.7501, 18.6480],
            ]],
        },
    },
]


def _to_feature(parcel: dict) -> dict:
    props = {k: v for k, v in parcel.items() if k != "geometry"}
    props["color"] = PARCEL_STATUS_COLORS.get(parcel["status"], "#64748b")
    return {
        "type": "Feature",
        "id": parcel["id"],
        "properties": props,
        "geometry": parcel["geometry"],
    }


def _need_gis(user: dict, request: Request) -> None:
    from app.core.permissions import has_permission
    if not has_permission(user.get("role", ""), GIS_READ):
        raise HTTPException(status_code=403, detail={
            "code": "PERMISSION_DENIED", "message": f"Missing permission: {GIS_READ}",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})


def _scope_parcels(user: dict, parcels: list[dict]) -> list[dict]:
    """Citizens see only in-scope parcels; PII redacted when out of scope."""
    role = user.get("role", "")
    if role == "system_admin":
        return parcels
    if role == "citizen":
        allowed = set(user.get("scopes", []))
        # Demo parcels are keyed by LR-style ids only when linked; without a
        # link, citizens must not enumerate other owners' land.
        visible = [p for p in parcels if p.get("id") in allowed
                   or p.get("notification_id") in allowed]
        return visible
    return parcels


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
                ip_address=request.client.host if request.client else None,
                meta={})
        finally:
            db.close()
    except Exception as exc:
        from app.services.audit_notification_service import report_audit_failure

        report_audit_failure("GIS_ACCESSED", "parcel", entity_id, exc)


@router.get("/parcels")
async def list_parcels(request: Request,
                       status: Optional[str] = Query(None, description="Filter by parcel status"),
                       user: dict = Depends(get_current_user)):
    """Return all (or status-filtered) parcels as a GeoJSON FeatureCollection.

    Mirrors TECHSPEC.md Section 71 (GIS API): GET /api/v1/gis/parcels
    """
    parcels = DUMMY_PARCELS
    if status:
        parcels = [p for p in parcels if p["status"] == status.upper()]
    _need_gis(user, request)
    parcels = _scope_parcels(user, parcels)
    _audit_gis(request, user, f"list:{status or 'all'}")

    return {
        "type": "FeatureCollection",
        "demo": True,
        "warning": "Demo-only static parcels; production data lives at /api/gis/db/*.",
        "features": [_to_feature(p) for p in parcels],
    }


@router.get("/parcels/{parcel_id}")
async def get_parcel(parcel_id: str, request: Request,
                     user: dict = Depends(get_current_user)):
    """Mirrors TECHSPEC.md: GET /api/v1/gis/parcels/{id}"""
    _need_gis(user, request)
    parcel = next((p for p in DUMMY_PARCELS if p["id"] == parcel_id), None)
    if not parcel:
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "Parcel not found",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    # Enumeration-safe: out-of-scope parcel reads return 404, never 403+PII.
    if not _scope_parcels(user, [parcel]):
        raise HTTPException(status_code=404, detail={
            "code": "RESOURCE_NOT_FOUND", "message": "Parcel not found",
            "request_id": getattr(getattr(request, "state", None), "request_id", None)})
    _audit_gis(request, user, parcel_id)
    feature = _to_feature(parcel)
    feature["demo"] = True
    return feature


@router.get("/layers")
async def list_layers(request: Request, user: dict = Depends(get_current_user)):
    """Mirrors TECHSPEC.md: GET /api/v1/gis/layers

    In production this would enumerate available map layers (cadastral,
    satellite, project-corridor). For the prototype, a static list.
    """
    _need_gis(user, request)
    return {
        "layers": [
            {"id": "base-osm", "name": "OpenStreetMap Base Layer", "type": "tile"},
            {"id": "parcels", "name": "Land Parcels (Acquisition Status)", "type": "geojson"},
        ]
    }