import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.user import User, UserRole
from app.services.auth_service import AuthService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def setup_support() -> None:
    """Setup initial support user."""
    engine = create_async_engine(str(settings.DATABASE_URL))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if support exists
        result = await session.execute(select(User).where(User.email == "support@dunnaa.com"))
        user = result.scalar_one_or_none()

        if user:
            logger.info("Support user already exists.")
            return

        logger.info("Creating support user...")

        hashed_password = AuthService.get_password_hash("support123")

        user = User(
            email="support@dunnaa.com",
            name="Support Agent",
            phone="+5511988887777",
            hashed_password=hashed_password,
            role=UserRole.support,
        )

        session.add(user)
        await session.commit()
        logger.info("Support user created successfully: support@dunnaa.com / support123")


if __name__ == "__main__":
    asyncio.run(setup_support())
