"""Seed runner - executes all seeds in order."""

import asyncio
import importlib
import sys
from pathlib import Path

from app.core.database import async_session_maker, init_db, close_db
from app.core.logging import setup_logging, get_logger


logger = get_logger(__name__)


async def run_seeds() -> None:
    """Run all seeds in order."""
    setup_logging()
    
    logger.info("Initializing database...")
    await init_db()
    
    # Get all seed files
    seeds_dir = Path(__file__).parent
    seed_files = sorted([
        f.stem for f in seeds_dir.glob("*.py")
        if f.stem.startswith("seed_") and f.stem != "__init__"
    ])
    
    logger.info(f"Found {len(seed_files)} seeds to run")
    
    async with async_session_maker() as db:
        for seed_name in seed_files:
            logger.info(f"Running seed: {seed_name}")
            try:
                module = importlib.import_module(f"seeds.{seed_name}")
                await module.seed(db)
                await db.commit()
                logger.info(f"Seed {seed_name} completed")
            except Exception as e:
                logger.error(f"Seed {seed_name} failed: {e}")
                await db.rollback()
                raise
    
    await close_db()
    logger.info("All seeds completed")


def main() -> None:
    """Entry point."""
    asyncio.run(run_seeds())


if __name__ == "__main__":
    main()
