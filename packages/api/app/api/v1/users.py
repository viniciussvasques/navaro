"""User endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models import User

router = APIRouter(prefix="/users", tags=["Users"])


# ─── Schemas ───────────────────────────────────────────────────────────────────


class UserResponse(BaseModel):
    """User response."""

    id: str
    phone: str
    name: str | None
    email: str | None
    avatar_url: str | None
    role: str
    referral_code: str | None
    referred_by_id: str | None

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    """User update request."""

    name: str | None = Field(None, max_length=200)
    email: EmailStr | None = None
    avatar_url: str | None = Field(None, max_length=500)


class UserListResponse(BaseModel):
    """User list response."""

    items: list[UserResponse]
    total: int


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser) -> UserResponse:
    """Get current authenticated user info."""
    return UserResponse(
        id=str(current_user.id),
        phone=current_user.phone,
        name=current_user.name,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        role=current_user.role.value,
        referral_code=current_user.referral_code,
        referred_by_id=str(current_user.referred_by_id) if current_user.referred_by_id else None,
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    request: UserUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> UserResponse:
    """Update current authenticated user."""
    if request.name is not None:
        current_user.name = request.name
    if request.email is not None:
        current_user.email = request.email
    if request.avatar_url is not None:
        current_user.avatar_url = request.avatar_url

    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=str(current_user.id),
        phone=current_user.phone,
        name=current_user.name,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        role=current_user.role.value,
        referral_code=current_user.referral_code,
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    db: DBSession,
    admin: AdminUser,
    skip: int = 0,
    limit: int = 50,
) -> UserListResponse:
    """List all users (admin only)."""
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()

    total_result = await db.execute(select(User))
    total = len(total_result.scalars().all())

    return UserListResponse(
        items=[
            UserResponse(
                id=str(u.id),
                phone=u.phone,
                name=u.name,
                email=u.email,
                avatar_url=u.avatar_url,
                role=u.role.value,
                referral_code=u.referral_code,
                referred_by_id=str(u.referred_by_id) if u.referred_by_id else None,
            )
            for u in users
        ],
        total=total,
    )
