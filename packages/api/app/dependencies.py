"""Application dependencies."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
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

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None,
) -> User:
    token = None
    
    # 1. Try Header
    if credentials:
        token = credentials.credentials
    # 2. Try Cookie
    elif "access_token" in request.cookies:
        token = request.cookies["access_token"]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Não autenticado"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expirado ou inválido")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    bind_context(user_id=str(user.id))
    return user


async def verify_establishment_owner(
    db: AsyncSession,
    establishment_id: UUID,
    user: User,
) -> Establishment:
    """Verify that user is the owner of the establishment or admin."""
    bind_context(establishment_id=str(establishment_id))
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()

    if not establishment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Estabelecimento não encontrado"},
        )

    if user.role == UserRole.admin:
        return establishment

    if establishment.owner_id != user.id:
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
    bind_context(establishment_id=str(establishment_id))
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
            StaffMember.active == True,
        )
    )
    staff = staff_result.scalar_one_or_none()
    if staff:
        return establishment

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"code": "FORBIDDEN", "message": "Sem permissão"},
    )
