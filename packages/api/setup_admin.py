import asyncio
import sys
from uuid import uuid4
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import AuthService

async def setup_admin(email, password):
    async for db in get_db():
        auth_service = AuthService(db)
        
        # Check if user exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        hashed_password = auth_service.get_password_hash(password)
        
        if user:
            print(f"Updating existing user {email} to Admin with password...")
            user.hashed_password = hashed_password
            user.role = UserRole.admin
        else:
            print(f"Creating new Admin user {email}...")
            user = User(
                id=uuid4(),
                email=email,
                phone="+5500000000000", # Placeholder
                name="Admin DUNNAA",
                hashed_password=hashed_password,
                role=UserRole.admin
            )
            db.add(user)
        
        await db.commit()
        print("Admin setup complete!")
        break

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python setup_admin.py <email> <password>")
    else:
        asyncio.run(setup_admin(sys.argv[1], sys.argv[2]))
