from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
import json

from app.database.connection import get_db
from typing import Optional


# Mounted under /gis/db so it coexists with the demo /gis mock routes.
router = APIRouter(
    prefix="/gis/db",
    tags=["GIS"]
)


@router.get("/health")
def gis_health():
    return {
        "status": "success",
        "module": "GIS",
        "message": "GIS module is working"
    }


@router.get("/parcels")
def get_parcels(db: Session = Depends(get_db)):
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

    return {
        "status": "success",
        "count": len(parcels),
        "data": parcels
    }


@router.get("/parcels/search")
def search_parcels(
    parcel_code: Optional[str] = None,
    khasra_no: Optional[str] = None,
    district: Optional[str] = None,
    acquisition_status: Optional[str] = None,
    verification_status: Optional[str] = None,
    land_classification: Optional[str] = None,
    db: Session = Depends(get_db)
):
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

    return {
        "status": "success",
        "count": len(parcels),
        "data": parcels
    }


@router.get("/parcels/{parcel_id}")
def get_parcel(parcel_id: int, db: Session = Depends(get_db)):
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

    return {
        "status": "success",
        "data": parcel
    }
