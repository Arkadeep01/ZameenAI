"""Auth request/response contracts (derived from app.core.security)."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = ""
    token_type: str = "bearer"
    expires_in_minutes: int


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str = ""


class OtpRequest(BaseModel):
    username: str = Field(..., min_length=1)


class OtpVerifyRequest(BaseModel):
    username: str = Field(..., min_length=1)
    otp: str = Field(..., min_length=4, max_length=8)


class CurrentUserResponse(BaseModel):
    id: str
    username: str
    role: str
    project_ids: list[str] = Field(default_factory=list)
    scopes: list[str] = Field(default_factory=list)


class RoleInfo(BaseModel):
    role: str
    permissions: list[str]
    description: Optional[str] = None
