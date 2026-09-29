"""GIS package (TECHSPEC target path).

Spatial truth remains the PostGIS-backed routes in
``app.api.api_v1.gis.routes`` + ``LandParcel`` model; record linkage lives
in ``app.services.gis_service``. Re-exported here so ``app.gis`` is the
single import surface without duplicating spatial SQL.
"""
from app.services.gis_service import GisService, capability  # noqa: F401
