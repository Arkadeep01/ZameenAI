from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from app.database.base import Base


class LandParcel(Base):
    __tablename__ = "land_parcels"

    id = Column(Integer, primary_key=True, index=True)

    parcel_code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    khasra_no = Column(
        String(50),
        nullable=False,
        index=True
    )

    khata_no = Column(
        String(50),
        nullable=True
    )

    owner_name = Column(
        String(150),
        nullable=False
    )

    area = Column(
        Float,
        nullable=False
    )

    village = Column(
        String(100),
        nullable=False
    )

    tehsil = Column(
        String(100),
        nullable=False
    )

    district = Column(
        String(100),
        nullable=False
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=True
    )

    land_classification = Column(
        String(100),
        nullable=True
    )

    acquisition_status = Column(
        String(50),
        nullable=False,
        default="Not Notified"
    )

    verification_status = Column(
        String(50),
        nullable=False,
        default="Pending"
    )

    geometry = Column(
        Geometry(
            geometry_type="MULTIPOLYGON",
            srid=4326
        ),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
