"""GIS application service: authorized parcel access + record linkage.

Preserves the existing PostGIS implementation (raw SQL in
``app.api.api_v1.gis.routes``) as the spatial authority; this service adds
the missing land-record <-> parcel relationship and explicit capability
reporting (no fabricated spatial matches).
"""
from __future__ import annotations

from typing import Any, Optional


SPATIAL_AUTO_MATCH_IMPLEMENTED = False


def capability() -> dict[str, Any]:
    return {
        "parcel_lookup": True,
        "attribute_search": True,
        "geometry_retrieval": True,
        "manual_linking": True,
        "automatic_spatial_matching": SPATIAL_AUTO_MATCH_IMPLEMENTED,
        "note": ("Automatic spatial matching is not implemented; links are "
                 "created manually or by identifier until a matcher lands."),
    }


class GisService:
    def __init__(self, db=None):
        self.db = db

    def create_link(self, *, record_id: str, parcel_id: Optional[int],
                    parcel_code: Optional[str], project_id: Optional[int],
                    match_method: str, created_by: Optional[str]) -> dict[str, Any]:
        if match_method.upper() == "SPATIAL" and not SPATIAL_AUTO_MATCH_IMPLEMENTED:
            return {"status": "FAILED", "error_code": "SPATIAL_MATCH_UNSUPPORTED",
                    "message": "Automatic spatial matching is not implemented; use MANUAL or IDENTIFIER."}
        if self.db is None:
            return {"status": "FAILED", "error_code": "DB_UNAVAILABLE",
                    "message": "Domain database is not configured."}
        try:
            from app.database.models.parcel_link import LandRecordParcelLink
            from app.repositories.domain_repositories import ParcelLinkRepository
            link = ParcelLinkRepository(self.db).create(LandRecordParcelLink(
                record_id=record_id, parcel_id=parcel_id, parcel_code=parcel_code,
                project_id=project_id, match_method=match_method.upper(),
                created_by=created_by))
            return {"status": "SUCCESS", "id": link.id, "record_id": record_id,
                    "parcel_id": parcel_id, "parcel_code": parcel_code,
                    "match_method": link.match_method, "created_by": created_by}
        except Exception as exc:
            try:
                self.db.rollback()
            except Exception:
                pass
            return {"status": "FAILED", "error_code": "DB_ERROR", "message": str(exc)}

    def links_for_record(self, record_id: str) -> list[dict[str, Any]]:
        if self.db is None:
            return []
        try:
            from app.repositories.domain_repositories import ParcelLinkRepository
            return [{"id": l.id, "record_id": l.record_id, "parcel_id": l.parcel_id,
                     "parcel_code": l.parcel_code, "match_method": l.match_method,
                     "created_by": l.created_by}
                    for l in ParcelLinkRepository(self.db).for_record(record_id)]
        except Exception:
            return []
