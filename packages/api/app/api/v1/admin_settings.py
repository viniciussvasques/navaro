"""Admin settings endpoints."""

from typing import List, Optional
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import DBSession, AdminUser
from app.models.system_settings import SystemSettings, SettingsKeys
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])


# ─── Schemas ────────────────────────────────────────────────────────────────────


class SettingResponse(BaseModel):
    """Setting response."""
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    is_secret: bool = False
    category: str = "general"

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    """Setting update request."""
    value: str
    description: Optional[str] = None


class SettingCreate(BaseModel):
    """Create new setting."""
    key: str = Field(..., min_length=1, max_length=100)
    value: str
    description: Optional[str] = None
    is_secret: bool = False
    category: str = "general"


class SettingsListResponse(BaseModel):
    """List of settings."""
    items: List[SettingResponse]
    total: int


# ─── Endpoints ──────────────────────────────────────────────────────────────────


@router.get("", response_model=SettingsListResponse)
async def list_settings(
    db: DBSession,
    admin: AdminUser,
    category: Optional[str] = None
) -> SettingsListResponse:
    """List all system settings (admin only)."""
    service = SettingsService(db)
    settings = await service.list_all(category)
    
    # Mask secret values
    items = []
    for s in settings:
        item = SettingResponse(
            key=s.key,
            value="••••••••" if s.is_secret and s.value else s.value,
            description=s.description,
            is_secret=s.is_secret,
            category=s.category
        )
        items.append(item)
    
    return SettingsListResponse(items=items, total=len(items))


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(
    key: str,
    db: DBSession,
    admin: AdminUser
) -> SettingResponse:
    """Get a specific setting (admin only)."""
    result = await db.execute(
        select(SystemSettings).where(SystemSettings.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return SettingResponse(
        key=setting.key,
        value="••••••••" if setting.is_secret and setting.value else setting.value,
        description=setting.description,
        is_secret=setting.is_secret,
        category=setting.category
    )


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    request: SettingUpdate,
    db: DBSession,
    admin: AdminUser
) -> SettingResponse:
    """Update a setting value (admin only)."""
    service = SettingsService(db)
    setting = await service.set(
        key=key,
        value=request.value,
        description=request.description
    )
    
    return SettingResponse(
        key=setting.key,
        value="••••••••" if setting.is_secret else setting.value,
        description=setting.description,
        is_secret=setting.is_secret,
        category=setting.category
    )


@router.post("", response_model=SettingResponse, status_code=status.HTTP_201_CREATED)
async def create_setting(
    request: SettingCreate,
    db: DBSession,
    admin: AdminUser
) -> SettingResponse:
    """Create a new setting (admin only)."""
    service = SettingsService(db)
    
    # Check if exists
    existing = await service.get(request.key)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Setting already exists")
    
    setting = await service.set(
        key=request.key,
        value=request.value,
        description=request.description,
        is_secret=request.is_secret,
        category=request.category
    )
    
    return SettingResponse(
        key=setting.key,
        value="••••••••" if setting.is_secret else setting.value,
        description=setting.description,
        is_secret=setting.is_secret,
        category=setting.category
    )


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_setting(
    key: str,
    db: DBSession,
    admin: AdminUser
) -> None:
    """Delete a setting (admin only)."""
    service = SettingsService(db)
    deleted = await service.delete(key)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Setting not found")


@router.post("/seed-defaults", status_code=status.HTTP_200_OK)
async def seed_default_settings(
    db: DBSession,
    admin: AdminUser
) -> dict:
    """Seed default settings (admin only)."""
    service = SettingsService(db)
    count = await service.seed_defaults()
    return {"message": f"Seeded {count} default settings"}
