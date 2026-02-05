import asyncio
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings


async def main():
    print(f"Testing connection to: {settings.DATABASE_URL}")

    engine = create_async_engine(settings.DATABASE_URL)

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"Connection Successful! Result: {result.scalar()}")
    except Exception as e:
        print("Connection Failed!")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
