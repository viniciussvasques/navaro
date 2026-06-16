"""API dependencies for route injection."""

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.models import Establishment, Supplier, User, UserRole

security = HTTPBearer(auto_error=False)


# ─── Database Session ──────────────────────────────────────────────────────────

DBSession = Annotated[AsyncSession, Depends(get_db)]


# ─── Authentication ────────────────────────────────────────────────────────────


async def get_current_user(
    request: Request,
    db: DBSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None,
) -> User:
    """Get current authenticated user from token (Header or Cookie)."""
    token = None

    # 1. Try Header
    if credentials:
        token = credentials.credentials
    # 2. Try Cookie
    elif "access_token" in request.cookies:
        token = request.cookies["access_token"]

    if not token:
        raise UnauthorizedError("Não autenticado")

    try:
        user_id = decode_access_token(token)
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


def require_supplier():
    """Require supplier or admin role."""
    return require_role(UserRole.supplier, UserRole.admin)


# ─── Type Aliases ──────────────────────────────────────────────────────────────

AdminUser = Annotated[User, Depends(require_admin())]
OwnerUser = Annotated[User, Depends(require_owner())]
StaffUser = Annotated[User, Depends(require_staff())]
SupplierUser = Annotated[User, Depends(require_supplier())]


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


# ─── Supplier / Establishment Resource Access ──────────────────────────────────
#
# Acesso ao módulo B2B é baseado em PROPRIEDADE do recurso (Supplier.owner_user_id
# / Establishment.owner_id), e não apenas no campo User.role. Isso permite que um
# mesmo usuário seja, ao mesmo tempo, dono de estabelecimento (comprador) e
# fornecedor (vendedor). Admin sempre tem bypass.


async def get_current_supplier(current_user: CurrentUser, db: DBSession) -> Supplier:
    """Return the Supplier profile owned by the current user (403 se não existir)."""
    result = await db.execute(
        select(Supplier).where(Supplier.owner_user_id == current_user.id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise ForbiddenError("Perfil de fornecedor não encontrado")
    return supplier


async def get_current_establishment(current_user: CurrentUser, db: DBSession) -> Establishment:
    """Return the first establishment owned by the current user (403 se não existir)."""
    result = await db.execute(
        select(Establishment).where(Establishment.owner_id == current_user.id).limit(1)
    )
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise ForbiddenError("Apenas donos de estabelecimento podem realizar esta ação")
    return establishment


CurrentSupplier = Annotated[Supplier, Depends(get_current_supplier)]
CurrentEstablishment = Annotated[Establishment, Depends(get_current_establishment)]
