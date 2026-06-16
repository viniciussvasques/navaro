"""Centralized authorization helpers (RBAC + ownership).

Este módulo unifica a lógica de autorização do DUNNAA, eliminando a duplicação
entre rotas (`_check_ownership` espalhados) e o legado `app/dependencies.py`.

Modelo de autorização (híbrido):
- **Role global** (`User.role`): customer, owner, staff, admin, support, supplier
- **Ownership por recurso**: `Establishment.owner_id`, `Supplier.owner_user_id`
- **Membership**: `StaffMember` (staff vinculado a um establishment)

Regras por role (resumo):
- customer  → agenda, favoritos, reviews, tickets próprios
- owner     → customer + CRUD do(s) establishment(s) + compras B2B
- staff     → operações do establishment vinculado (agenda, fila, check-in)
- supplier  → CRUD do próprio perfil de fornecedor + pedidos recebidos
- support   → tickets + contexto de usuário (read-only sensível)
- admin     → tudo (bypass de ownership)
"""

from enum import Enum
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.establishment import Establishment
from app.models.staff import StaffMember
from app.models.supplier import Supplier
from app.models.user import User, UserRole


class AccessLevel(str, Enum):
    """Nível de acesso a um recurso."""

    read = "read"      # leitura (owner, staff, admin)
    write = "write"    # escrita operacional (owner, staff, admin)
    owner = "owner"    # gestão sensível (owner, admin) — exclui staff


def is_admin(user: User) -> bool:
    return user.role == UserRole.admin


# ─── Establishment ──────────────────────────────────────────────────────────────


async def get_establishment_or_404(db: AsyncSession, establishment_id: UUID) -> Establishment:
    result = await db.execute(
        select(Establishment).where(Establishment.id == establishment_id)
    )
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise NotFoundError("Estabelecimento")
    return establishment


async def _is_active_staff(db: AsyncSession, establishment_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(
        select(StaffMember.id).where(
            StaffMember.establishment_id == establishment_id,
            StaffMember.user_id == user_id,
            StaffMember.active == True,  # noqa: E712
        )
    )
    return result.scalar_one_or_none() is not None


async def require_establishment_access(
    db: AsyncSession,
    establishment_id: UUID,
    user: User,
    *,
    level: AccessLevel = AccessLevel.write,
) -> Establishment:
    """Autoriza acesso a um establishment conforme o nível pedido.

    - `read`/`write`: admin, owner, ou staff ativo vinculado
    - `owner`: apenas admin ou owner (staff bloqueado)
    """
    establishment = await get_establishment_or_404(db, establishment_id)

    if is_admin(user):
        return establishment
    if establishment.owner_id == user.id:
        return establishment
    if level != AccessLevel.owner and await _is_active_staff(db, establishment_id, user.id):
        return establishment

    raise ForbiddenError()


async def require_establishment_owner(
    db: AsyncSession,
    establishment_id: UUID,
    user: User,
) -> Establishment:
    """Atalho: exige owner ou admin (gestão sensível)."""
    return await require_establishment_access(
        db, establishment_id, user, level=AccessLevel.owner
    )


# ─── Supplier ───────────────────────────────────────────────────────────────────


async def get_supplier_or_404(db: AsyncSession, supplier_id: UUID) -> Supplier:
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise NotFoundError("Fornecedor")
    return supplier


def check_supplier_owner(supplier: Supplier, user: User) -> None:
    """Garante que o usuário é dono do fornecedor ou admin."""
    if supplier.owner_user_id != user.id and not is_admin(user):
        raise ForbiddenError()


async def require_supplier_owner(
    db: AsyncSession,
    supplier_id: UUID,
    user: User,
) -> Supplier:
    supplier = await get_supplier_or_404(db, supplier_id)
    check_supplier_owner(supplier, user)
    return supplier


async def get_my_supplier(db: AsyncSession, user: User) -> Supplier | None:
    """Retorna o perfil de fornecedor do usuário (ou None)."""
    result = await db.execute(
        select(Supplier).where(Supplier.owner_user_id == user.id)
    )
    return result.scalar_one_or_none()


async def get_my_establishment(db: AsyncSession, user: User) -> Establishment | None:
    """Retorna o primeiro establishment do usuário (ou None)."""
    result = await db.execute(
        select(Establishment)
        .where(Establishment.owner_id == user.id)
        .order_by(Establishment.created_at)
        .limit(1)
    )
    return result.scalar_one_or_none()


# ─── Role promotion ─────────────────────────────────────────────────────────────


def promote_to_role(user: User, target: UserRole) -> bool:
    """Promove o role do usuário sem rebaixar privilégios existentes.

    Hierarquia de privilégio para não rebaixar admin/owner ao virar supplier:
    admin > owner > supplier > staff > support > customer

    Retorna True se houve mudança.
    """
    rank = {
        UserRole.customer: 0,
        UserRole.support: 1,
        UserRole.staff: 2,
        UserRole.supplier: 3,
        UserRole.owner: 4,
        UserRole.admin: 5,
    }
    if rank.get(target, 0) > rank.get(user.role, 0):
        user.role = target
        return True
    return False
