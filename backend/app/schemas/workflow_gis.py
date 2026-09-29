"""Workflow / GIS / notification / audit contracts."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class WorkflowStateResponse(BaseModel):
    record_id: str
    state: str
    allowed_transitions: list[str] = Field(default_factory=list)
    updated_at: Optional[datetime] = None


class TransitionRequest(BaseModel):
    to_state: Optional[str] = None
    decision: Optional[str] = None
    reviewer: Optional[str] = None
    notes: Optional[str] = None
    by: Optional[str] = None


class ParcelResponse(BaseModel):
    id: Any
    parcel_code: Optional[str] = None
    khasra_no: Optional[str] = None
    owner_name: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    area: Optional[float] = None
    geometry: Optional[Any] = None


class ParcelSearchRequest(BaseModel):
    parcel_code: Optional[str] = None
    khasra_no: Optional[str] = None
    district: Optional[str] = None
    acquisition_status: Optional[str] = None
    verification_status: Optional[str] = None


class LandRecordParcelLinkRequest(BaseModel):
    record_id: str
    parcel_id: Optional[int] = None
    parcel_code: Optional[str] = None
    project_id: Optional[int] = None
    match_method: str = "MANUAL"


class LandRecordParcelLinkResponse(BaseModel):
    id: int
    record_id: str
    parcel_id: Optional[int] = None
    parcel_code: Optional[str] = None
    match_method: str
    created_by: Optional[str] = None


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    severity: str = "INFO"
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    read: bool = False
    created_at: Optional[datetime] = None


class NotificationCountResponse(BaseModel):
    unread: int
    total: int


class AuditEventResponse(BaseModel):
    id: int
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    prev_state: Optional[str] = None
    new_state: Optional[str] = None
    created_at: Optional[datetime] = None
