import asyncio

from sqlalchemy import text

from app.core.database import engine


async def migrate():
    print("Running multi-provider migrations...")
    async with engine.connect() as conn:
        # Add columns to payments
        try:
            await conn.execute(
                text(
                    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'stripe' NOT NULL;"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255);"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments (provider_payment_id);"
                )
            )
            await conn.commit()
            print("Added provider columns to payments.")
        except Exception as e:
            await conn.rollback()
            print(f"Error updating payments: {e}")

        # Add columns to tips
        try:
            await conn.execute(
                text(
                    "ALTER TABLE tips ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'stripe' NOT NULL;"
                )
            )
            await conn.execute(
                text("ALTER TABLE tips ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255);")
            )
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_tips_provider_payment_id ON tips (provider_payment_id);"
                )
            )
            await conn.commit()
            print("Added provider columns to tips.")
        except Exception as e:
            await conn.rollback()
            print(f"Error updating tips: {e}")


if __name__ == "__main__":
    asyncio.run(migrate())
