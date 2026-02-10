
import asyncio
import logging
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.user import User
from app.services.auth_service import AuthService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def reset_password() -> None:
    """Reset support user password."""
    engine = create_async_engine(str(settings.DATABASE_URL))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if support exists
        result = await session.execute(
            select(User).where(User.email == "support@dunnaa.com")
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.error("Support user NOT found!")
            return

        logger.info(f"Full User Object: {user}")
        logger.info(f"Current Hash: {user.hashed_password}")

        new_hash = AuthService.get_password_hash("support123")
        
        # Direct update
        await session.execute(
            update(User)
            .where(User.email == "support@dunnaa.com")
            .values(hashed_password=new_hash)
        )
        await session.commit()
        logger.info("Password reset to 'support123' (hash updated).")

if __name__ == "__main__":
    asyncio.run(reset_password())
