"""Authentication routes (real JWT, server-side)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import ALL_ROLES, DEV_USERS, PERMISSIONS, authenticate_user, create_access_token
from app.schemas.auth import CurrentUserResponse, LoginRequest, RoleInfo, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid username or password")
    token = create_access_token(user_id=user["id"], username=user["username"], role=user["role"])
    return TokenResponse(access_token=token,
                         expires_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)


@router.get("/me", response_model=CurrentUserResponse)
def me(user: dict = Depends(get_current_user)):
    return CurrentUserResponse(id=user["id"], username=user["username"], role=user["role"],
                               project_ids=[str(p) for p in user.get("project_ids", [])],
                               scopes=list(user.get("scopes", [])))


@router.get("/roles", response_model=list[RoleInfo])
def roles():
    descriptions = {
        "system_admin": "Platform-wide configuration, users, audit",
        "pia": "Project/acquisition management and oversight",
        "field_officer": "Field upload and ground verification",
        "desk_validator": "Validation, document review, HITL",
        "approver": "Approval/rejection of workflow transitions",
        "executive": "Read/report/dashboard access",
        "citizen": "Own records only",
    }
    return [RoleInfo(role=r, permissions=sorted(PERMISSIONS.get(r, set())),
                     description=descriptions.get(r)) for r in ALL_ROLES]


@router.get("/dev-users")
def dev_users():
    """Explicitly development-only credential hint (never passwords)."""
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Not found")
    return {"users": sorted(DEV_USERS.keys()), "password_hint": "password123",
            "warning": "Development-only; production uses DB-backed users."}
