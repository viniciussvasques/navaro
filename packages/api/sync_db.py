import asyncio

from app.db.session import engine

# Import all models to ensure they are registered with BaseModel.metadata
from app.models import *
from app.models.base import BaseModel


async def init_db():
    async with engine.begin() as conn:
        # This will create tables that don't exist
        await conn.run_sync(BaseModel.metadata.create_all)
    print("Database synced successfully")


if __name__ == "__main__":
    asyncio.run(init_db())
