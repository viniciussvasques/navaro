"""Application dependencies."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import bind_context
from app.database import get_db
from app.models.establishment import Establishment
from app.models.staff import StaffMember
from app.models.user import User, UserRole

security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED", "message": "Token inválido"},
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    bind_context(user_id=str(user.id), user_role=user.role.value)

    return user


async def verify_establishment_owner(
    db: AsyncSession,
    establishment_id: UUID,
    user_id: UUID,
) -> Establishment:
    """Verify that user is the owner (or admin) of the establishment."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()

    if not establishment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Estabelecimento não encontrado"},
        )

    user_result = await db.execute(select(User.role).where(User.id == user_id))
    user_role = user_result.scalar_one_or_none()

    if establishment.owner_id != user_id and user_role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Sem permissão"},
        )

    return establishment


async def verify_establishment_access(
    db: AsyncSession,
    establishment_id: UUID,
    user: User,
) -> Establishment:
    """Verify owner/admin/staff access to an establishment."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()

    if not establishment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Estabelecimento não encontrado"},
        )

    if user.role == UserRole.admin:
        return establishment

    if establishment.owner_id == user.id:
        return establishment

    staff_result = await db.execute(
        select(StaffMember.id).where(
            StaffMember.establishment_id == establishment_id,
            StaffMember.user_id == user.id,
            StaffMember.active.is_(True),
        )
    )
    staff = staff_result.scalar_one_or_none()
    if staff:
        return establishment

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"code": "FORBIDDEN", "message": "Sem permissão"},
    )
