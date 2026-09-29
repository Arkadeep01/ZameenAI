"""Explicit land-record <-> GIS parcel linkage (previously missing).

Digitized records and parcels were independent systems; this table is the
authoritative backend representation of their relationship. Automatic
spatial matching is NOT claimed: ``match_method`` records MANUAL vs
IDENTIFIER vs SPATIAL so unsupported capabilities are never fabricated.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class LandRecordParcelLink(Base):
    __tablename__ = "land_record_parcel_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    record_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    parcel_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    parcel_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    project_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    match_method: Mapped[str] = mapped_column(String(32), nullable=False, default="MANUAL")
    confidence: Mapped[Optional[float]] = mapped_column(nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
