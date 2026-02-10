import asyncio
from sqlalchemy import select, func
from app.core.database import init_db, async_session_maker
from app.models.establishment import Establishment
from app.models.product import Product
from app.models.service import Service
from app.models.staff import StaffMember

async def check_counts():
    await init_db()
    async with async_session_maker() as session:
        # Establishments
        est_count = await session.execute(select(func.count(Establishment.id)))
        print(f"Establishments: {est_count.scalar()}")
        
        # Products
        prod_count = await session.execute(select(func.count(Product.id)))
        print(f"Products: {prod_count.scalar()}")
        
        # Services
        svc_count = await session.execute(select(func.count(Service.id)))
        print(f"Services: {svc_count.scalar()}")
        
        # Staff
        staff_count = await session.execute(select(func.count(StaffMember.id)))
        print(f"Staff: {staff_count.scalar()}")

        # Print products per establishment
        stmt = select(Establishment.name, func.count(Product.id)).outerjoin(Product).group_by(Establishment.name)
        res = await session.execute(stmt)
        print("\nProducts per Establishment:")
        for name, count in res.all():
            print(f" - {name}: {count}")

if __name__ == "__main__":
    asyncio.run(check_counts())
