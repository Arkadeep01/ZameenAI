"""Canonical land-record + extracted-field persistence.

The migrated Phase 07 extractor returns real fields with provenance; when a
record is HITL-VERIFIED the orchestrator materialises the canonical snapshot
here. No fabricated values are ever written: every row traces to a
(job_id, phase artifact) pair.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class LandRecord(Base):
    __tablename__ = "land_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # record_id
    document_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    job_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    document_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING", index=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    completeness: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # canonical JSON snapshot
    verified_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(),
                                                 onupdate=func.now())

    fields: Mapped[list["ExtractedField"]] = relationship(back_populates="record",
                                                           cascade="all, delete-orphan")


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    record_id: Mapped[str] = mapped_column(ForeignKey("land_records.id"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    raw_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    normalized_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    method: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    source_page: Mapped[Optional[int]] = mapped_column(nullable=True)
    source_label: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    record: Mapped[LandRecord] = relationship(back_populates="fields")
