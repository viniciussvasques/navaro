"""Seed 001: Create admin user."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, UserRole
from app.core.logging import get_logger


logger = get_logger(__name__)


async def seed(db: AsyncSession) -> None:
    """Create admin user if not exists."""
    
    # Check if admin exists
    result = await db.execute(
        select(User).where(User.role == UserRole.ADMIN)
    )
    existing_admin = result.scalar_one_or_none()
    
    if existing_admin:
        logger.info("Admin user already exists, skipping")
        return
    
    # Create admin user
    admin = User(
        phone="+5511999999999",
        name="Administrador",
        email="admin@navaro.app",
        role=UserRole.ADMIN,
        referral_code="ADMIN2024",
    )
    
    db.add(admin)
    logger.info("Admin user created", phone=admin.phone, email=admin.email)
