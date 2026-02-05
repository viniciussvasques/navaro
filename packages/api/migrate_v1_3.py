import asyncio

from sqlalchemy import text

from app.core.database import engine, init_db


async def migrate():
    print("Running migrations for MVP 1.3...")
    async with engine.begin() as conn:
        # Add columns to establishments
        await conn.execute(
            text(
                "ALTER TABLE establishments ADD COLUMN IF NOT EXISTS no_show_fee_percent NUMERIC(5, 2) DEFAULT 0.0 NOT NULL;"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE establishments ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5, 2) DEFAULT 0.0 NOT NULL;"
            )
        )
        print("Establishment columns added/verified.")

        # Add column to services
        await conn.execute(
            text(
                "ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE NOT NULL;"
            )
        )
        print("Service columns added/verified.")

        # Update AppointmentStatus Enum
        # Note: ALTER TYPE ... ADD VALUE cannot be executed in a transaction block
        # We'll use a separate connection for these

    async with engine.connect() as conn:
        for status in ["no_show", "awaiting_deposit"]:
            try:
                await conn.execute(text(f"ALTER TYPE appointmentstatus ADD VALUE '{status}';"))
                await conn.commit()
                print(f"Added '{status}' to appointmentstatus enum.")
            except Exception as e:
                # If it already exists, it will throw an error, we can ignore it
                await conn.rollback()
                print(f"Status '{status}' already exists or error: {e}")

        # Create paymentmethod type if it doesn't exist
        try:
            await conn.execute(
                text("CREATE TYPE paymentmethod AS ENUM ('card', 'cash', 'wallet');")
            )
            await conn.commit()
            print("Created paymentmethod enum.")
        except Exception as e:
            await conn.rollback()
            print(f"paymentmethod enum already exists or error: {e}")

        # Add payment_method column to appointments
        try:
            await conn.execute(
                text(
                    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method paymentmethod DEFAULT 'card' NOT NULL;"
                )
            )
            await conn.commit()
            print("Added payment_method column to appointments.")
        except Exception as e:
            await conn.rollback()
            print(f"Error adding payment_method column: {e}")

        # Add pending_platform_fees column to establishments
        try:
            await conn.execute(
                text(
                    "ALTER TABLE establishments ADD COLUMN IF NOT EXISTS pending_platform_fees NUMERIC(10, 2) DEFAULT 0.0 NOT NULL;"
                )
            )
            await conn.commit()
            print("Added pending_platform_fees column to establishments.")
        except Exception as e:
            await conn.rollback()
            print(f"Error adding pending_platform_fees column: {e}")

    # Run init_db to create wallet tables
    await init_db()
    print("Database initialization complete (Wallet tables created).")


if __name__ == "__main__":
    asyncio.run(migrate())
