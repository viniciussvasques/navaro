import asyncio
from app.db.session import async_session_maker
from app.models.user import User, UserRole
from app.core.security import get_password_hash

async def create_br_admin():
    async with async_session_maker() as session:
        email = "admin@dunnaa.com.br"
        # Check if exists
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User {email} already exists.")
            return

        # Create
        new_user = User(
            email=email,
            hashed_password=get_password_hash("admin123"),
            name="Admin BR",
            role=UserRole.admin,
            phone="5511999999999",
            is_active=True
        )
        session.add(new_user)
        await session.commit()
        print(f"User {email} created successfully.")

if __name__ == "__main__":
    asyncio.run(create_br_admin())
