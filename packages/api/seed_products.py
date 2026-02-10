import asyncio
import sys
import os

# Add /app to python path if running in docker
sys.path.append("/app")
# Also add current directory to path if needed for local runs
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.core.database import init_db, async_session_maker
from app.models.establishment import Establishment, EstablishmentCategory
from app.models.product import Product

DEFAULT_PRODUCTS = {
    "barbershop": [
        {"name": "Pomada Efeito Matte", "price": 45.00, "stock": 50, "description": "Pomada de alta fixação com acabamento fosco."},
        {"name": "Óleo para Barba Premium", "price": 35.00, "stock": 30, "description": "Óleo hidratante com fragrância amadeirada."},
        {"name": "Shampoo Fresh Mentol", "price": 25.00, "stock": 40, "description": "Shampoo refrescante para uso diário."},
        {"name": "Cera de Bigode", "price": 20.00, "stock": 25, "description": "Cera modeladora para bigodes rebeldes."},
        {"name": "Kit Barbear Clássico", "price": 120.00, "stock": 10, "description": "Kit com pincel, tigela e sabão de barbear."}
    ],
    "salon": [
        {"name": "Máscara de Hidratação 1kg", "price": 85.00, "stock": 20, "description": "Hidratação profunda para todos os tipos de cabelo."},
        {"name": "Sérum Reparador de Pontas", "price": 40.00, "stock": 35, "description": "Finalizador que elimina o frizz e as pontas duplas."},
        {"name": "Shampoo Pós-Química", "price": 30.00, "stock": 50, "description": "Manutenção ideal para cabelos coloridos ou com progressiva."},
        {"name": "Leave-in Termoativado", "price": 45.00, "stock": 30, "description": "Proteção térmica para uso com secador e chapinha."},
        {"name": "Kit Manicure Completo", "price": 60.00, "stock": 15, "description": "Conjunto de esmaltes e alicates profissionais."}
    ],
    "spa": [
        {"name": "Óleo de Massagem Relaxante", "price": 55.00, "stock": 25, "description": "Óleo essencial para massagens corporais."},
        {"name": "Sais de Banho Aromáticos", "price": 35.00, "stock": 40, "description": "Sais para imersão e relaxamento."},
        {"name": "Creme Facial Anti-Idade", "price": 95.00, "stock": 15, "description": "Creme nutritivo com ácido hialurônico."},
        {"name": "Esfoliante Corporal Café", "price": 45.00, "stock": 30, "description": "Esfoliante natural para renovação da pele."},
        {"name": "Vela Aromática Lavanda", "price": 28.00, "stock": 50, "description": "Vela relaxante com aroma suave de lavanda."}
    ]
}

async def seed_products():
    print("🌱 Starting Product Seeding...")
    await init_db()
    
    async with async_session_maker() as session:
        # Fetch all establishments
        stmt = select(Establishment)
        res = await session.execute(stmt)
        establishments = res.scalars().all()
        
        if not establishments:
            print("❌ No establishments found to seed products for.")
            return

        total_seeded = 0
        for est in establishments:
            print(f"  > Seeding products for: {est.name} ({est.category})")
            
            # Check existing products for this establishment
            prod_stmt = select(Product).where(Product.establishment_id == est.id)
            prod_res = await session.execute(prod_stmt)
            existing_prod_names = {p.name for p in prod_res.scalars().all()}
            
            # Map category to default product list
            cat_value = est.category.value if hasattr(est.category, "value") else str(est.category)
            
            if cat_value == EstablishmentCategory.barbershop:
                products_to_add = DEFAULT_PRODUCTS["barbershop"]
            elif cat_value == EstablishmentCategory.spa:
                products_to_add = DEFAULT_PRODUCTS["spa"]
            else:
                products_to_add = DEFAULT_PRODUCTS["salon"]
            
            est_seeded = 0
            for p_data in products_to_add:
                if p_data["name"] not in existing_prod_names:
                    new_prod = Product(
                        establishment_id=est.id,
                        name=p_data["name"],
                        price=p_data["price"],
                        stock_quantity=p_data["stock"],
                        description=p_data["description"],
                        active=True
                    )
                    session.add(new_prod)
                    total_seeded += 1
                    est_seeded += 1
            
            if est_seeded > 0:
                print(f"    - Added {est_seeded} new products.")
            else:
                print(f"    - All default products already present.")
        
        await session.commit()
        print(f"\n✅ Seeding Completed! Added {total_seeded} new products across {len(establishments)} establishments.")

if __name__ == "__main__":
    asyncio.run(seed_products())
