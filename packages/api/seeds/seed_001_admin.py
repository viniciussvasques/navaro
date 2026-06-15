"""Seed 001: Create admin user."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models import User, UserRole
from app.services.auth_service import AuthService

logger = get_logger(__name__)

# Senha padrão para login no painel admin (desenvolvimento)
ADMIN_DEFAULT_PASSWORD = "admin123"
ADMIN_EMAIL = "admin@dunnaa.com.br"


async def seed(db: AsyncSession) -> None:
    """Create admin user if not exists, or ensure admin has password for login."""

    result = await db.execute(select(User).where(User.role == UserRole.admin))
    existing_admin = result.scalar_one_or_none()

    if existing_admin:
        # Garante que o admin tenha senha e e-mail para login (painel admin e Pro)
        updated = False
        if not existing_admin.hashed_password:
            existing_admin.hashed_password = AuthService.get_password_hash(ADMIN_DEFAULT_PASSWORD)
            updated = True
        if existing_admin.email != ADMIN_EMAIL:
            existing_admin.email = ADMIN_EMAIL
            updated = True
        if updated:
            logger.info("Admin password/email set", email=existing_admin.email)
        return

    # Create admin user with password
    admin = User(
        phone="+5511999999999",
        name="Administrador",
        email=ADMIN_EMAIL,
        hashed_password=AuthService.get_password_hash(ADMIN_DEFAULT_PASSWORD),
        role=UserRole.admin,
        referral_code="ADMIN2024",
    )

    db.add(admin)
    logger.info("Admin user created", phone=admin.phone, email=admin.email)
