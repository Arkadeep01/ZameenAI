"""Auth persistence: revoked JWTs + citizen OTP audit trail.

RevokedToken is append-only (insert on logout/refresh-rotation; pruned by
expiry). OTP challenges stay in-memory (token_store) — this table exists
only so OTP request/verify attempts are auditable via audit_events.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    token_type: Mapped[str] = mapped_column(String(16), nullable=False, default="access")
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now())
