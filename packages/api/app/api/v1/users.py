"""User endpoints."""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, select

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models import User
from app.models.user import UserRole

router = APIRouter(prefix="/users", tags=["Users"])


# ─── Schemas ───────────────────────────────────────────────────────────────────


class UserResponse(BaseModel):
    """User response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    phone: str
    name: str | None
    email: str | None
    avatar_url: str | None
    role: str
    referral_code: str | None
    referred_by_id: str | None


class UserUpdateRequest(BaseModel):
    """User update request."""

    name: str | None = Field(None, max_length=200)
    email: EmailStr | None = None
    avatar_url: str | None = Field(None, max_length=500)
    device_token: str | None = Field(None, max_length=512)


class RoleUpdateRequest(BaseModel):
    """Role update request."""

    role: str


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
        phone=current_user.phone or "",
        name=current_user.name,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        role=getattr(current_user.role, "value", str(current_user.role)) if current_user.role else "customer",
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
    if request.device_token is not None:
        current_user.device_token = request.device_token.strip() or None

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
    q: str | None = Query(None, min_length=1, max_length=100),
) -> UserListResponse:
    """List all users (admin only)."""
    query = select(User)
    if q:
        term = f"%{q.strip()}%"
        query = query.where(
            (User.name.ilike(term))
            | (User.phone.ilike(term))
            | (User.email.ilike(term))
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(query.order_by(User.created_at.desc()).offset(skip).limit(limit))
    users = result.scalars().all()

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


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    request: RoleUpdateRequest,
    db: DBSession,
    admin: AdminUser,
) -> UserResponse:
    """Update user role (admin only)."""
    from uuid import UUID

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        user.role = UserRole(request.role)
    except ValueError:
        valid = [r.value for r in UserRole]
        raise HTTPException(
            status_code=400,
            detail=f"Role inválido. Valores permitidos: {', '.join(valid)}",
        )

    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=str(user.id),
        phone=user.phone,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url,
        role=user.role.value,
        referral_code=user.referral_code,
    )


# ─── Avatar Upload ─────────────────────────────────────────────────────────────


@router.post("/me/avatar", response_model=UserResponse)
async def upload_my_avatar(
    db: DBSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> UserResponse:
    """Upload user avatar."""
    from app.services.storage_service import StorageService

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    # Get storage service (might raise 503 if disabled)
    storage = await StorageService.from_db(db)
    
    # Upload
    url = await storage.upload_user_avatar(
        user_id=current_user.id,
        content=content,
        content_type=file.content_type or "image/jpeg",
    )

    # Update user
    current_user.avatar_url = url
    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=str(current_user.id),
        phone=current_user.phone,
        name=current_user.name,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        role=getattr(current_user.role, "value", str(current_user.role)) if current_user.role else "customer",
        referral_code=current_user.referral_code,
        referred_by_id=str(current_user.referred_by_id) if current_user.referred_by_id else None,
    )
