"""API dependencies for route injection."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.models import User, UserRole

security = HTTPBearer()


# ─── Database Session ──────────────────────────────────────────────────────────

DBSession = Annotated[AsyncSession, Depends(get_db)]


# ─── Authentication ────────────────────────────────────────────────────────────


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: DBSession,
) -> User:
    """Get current authenticated user from token."""
    try:
        user_id = decode_access_token(credentials.credentials)
    except Exception as e:
        raise UnauthorizedError("Token inválido ou expirado") from e

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("Usuário não encontrado")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


# ─── Authorization ─────────────────────────────────────────────────────────────


def require_role(*roles: UserRole):
    """Dependency to require user role."""

    async def role_checker(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise ForbiddenError("Sem permissão para esta ação")
        return current_user

    return role_checker


def require_admin():
    """Require admin role."""
    return require_role(UserRole.admin)


def require_owner():
    """Require owner or admin role."""
    return require_role(UserRole.owner, UserRole.admin)


def require_staff():
    """Require staff, owner, or admin role."""
    return require_role(UserRole.staff, UserRole.owner, UserRole.admin)


# ─── Type Aliases ──────────────────────────────────────────────────────────────

AdminUser = Annotated[User, Depends(require_admin())]
OwnerUser = Annotated[User, Depends(require_owner())]
StaffUser = Annotated[User, Depends(require_staff())]


# ─── Optional Auth ─────────────────────────────────────────────────────────────


async def get_optional_user(
    db: DBSession,
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
) -> User | None:
    """Get current user if authenticated, otherwise None."""
    if not credentials:
        return None

    try:
        user_id = decode_access_token(credentials.credentials)
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except Exception:
        return None


OptionalUser = Annotated[User | None, Depends(get_optional_user)]
