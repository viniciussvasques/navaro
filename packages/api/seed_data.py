import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import async_session_maker, init_db

# Import Models
from app.models.appointment import Appointment, AppointmentStatus, PaymentMethod, PaymentType
from app.models.establishment import Establishment, EstablishmentCategory, EstablishmentStatus
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.product import Product
from app.models.review import Review
from app.models.service import Service
from app.models.staff import StaffContractType, StaffMember
from app.models.user import User, UserRole
from app.models.wallet import UserWallet as Wallet

# Add /app to python path (after imports to keep E402 happy)
sys.path.append("/app")

# Direct bcrypt hashing workaround
import bcrypt
if not hasattr(bcrypt, '__about__'):
    class About:
        __version__ = bcrypt.__version__
    bcrypt.__about__ = About()

# Mock Data Arrays
MALE_NAMES = ["Carlos", "João", "Pedro", "Lucas", "Mateus", "Gabriel", "Rafael", "Bruno", "Felipe", "Thiago", "Rodrigo", "André"]
FEMALE_NAMES = ["Ana", "Maria", "Julia", "Beatriz", "Larissa", "Camila", "Fernanda", "Amanda", "Bruna", "Jessica", "Mariana"]
LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa"]

ESTABLISHMENTS_DATA = [
    {
        "name": "Barbearia Viking",
        "slug": "barbearia-viking",
        "description": "Estilo clássico e cortes modernos para homens de atitude.",
        "category": "Barbearia",
        "address": "Rua Augusta, 1500",
        "city": "São Paulo",
        "state": "SP",
        "phone": "+5511999990001",
        "avatar_url": "https://img.freepik.com/fotos-gratis/homem-em-um-salao-de-barbearia-fazendo-o-corte-de-cabelo-e-barba_1303-20953.jpg",
        "owner_email": "viking@dunnaa.com",
        "tier": "free",
        "services": [
            {"name": "Corte Clássico", "price": 45.00, "duration": 45},
            {"name": "Barba Lenhador", "price": 35.00, "duration": 30},
            {"name": "Corte + Barba", "price": 70.00, "duration": 60},
            {"name": "Pigmentação", "price": 50.00, "duration": 40},
            {"name": "Pezinho", "price": 15.00, "duration": 15},
        ],
        "products": [
            {"name": "Pomada Modeladora", "price": 40.00, "stock": 50},
            {"name": "Óleo para Barba", "price": 30.00, "stock": 30},
            {"name": "Shampoo Cerveja", "price": 25.00, "stock": 20},
        ]
    },
    {
        "name": "Studio Bella",
        "slug": "studio-bella",
        "description": "Realçando sua beleza natural com cuidados especiais.",
        "category": "Salão de Beleza",
        "address": "Av. Paulista, 2000",
        "city": "São Paulo",
        "state": "SP",
        "phone": "+5511999990002",
        "avatar_url": "https://img.freepik.com/fotos-gratis/cabeleireiro-cortando-pontas-de-cabelo_23-2148352931.jpg",
        "owner_email": "bella@dunnaa.com",
        "tier": "silver",
        "services": [
            {"name": "Corte Feminino", "price": 80.00, "duration": 60},
            {"name": "Manicure", "price": 30.00, "duration": 45},
            {"name": "Pedicure", "price": 35.00, "duration": 45},
            {"name": "Hidratação Profunda", "price": 120.00, "duration": 90},
            {"name": "Mechas", "price": 250.00, "duration": 180},
        ],
        "products": [
            {"name": "Kit Manutenção Home Care", "price": 150.00, "stock": 10},
            {"name": "Máscara Capilar", "price": 80.00, "stock": 15},
            {"name": "Óleo Reparador", "price": 45.00, "stock": 25},
        ]
    },
    {
        "name": "Spa Zen",
        "slug": "spa-zen",
        "description": "Relaxe e renove suas energias.",
        "category": "Spa",
        "address": "Rua Oscar Freire, 500",
        "city": "São Paulo",
        "state": "SP",
        "phone": "+5511999990003",
        "avatar_url": "https://img.freepik.com/fotos-gratis/mulher-relaxando-no-spa_329181-12883.jpg",
        "owner_email": "zen@dunnaa.com",
        "tier": "gold",
        "services": [
            {"name": "Massagem Relaxante", "price": 100.00, "duration": 60},
            {"name": "Drenagem Linfática", "price": 110.00, "duration": 60},
            {"name": "Limpeza de Pele", "price": 90.00, "duration": 60},
            {"name": "Spa dos Pés", "price": 50.00, "duration": 30},
        ],
        "products": [
            {"name": "Difusor de Aromas", "price": 60.00, "stock": 20},
            {"name": "Velas Aromáticas", "price": 35.00, "stock": 40},
        ]
    }
]

def generate_phone():
    return f"+55119{random.randint(10000000, 99999999)}"

def generate_name(gender=None):
    if gender == 'M':
        first = random.choice(MALE_NAMES)
    elif gender == 'F':
        first = random.choice(FEMALE_NAMES)
    else:
        first = random.choice(MALE_NAMES + FEMALE_NAMES)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}"

# Use direct bcrypt hashing to avoid passlib version/compat issues in standalone script
def hash_password_direct(password: str) -> str:
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    return hashed.decode('utf-8')

async def seed_data():
    print("🌱 Starting Seed Process...")
    await init_db()
    
    async with async_session_maker() as session:
        # 1. Create Owners & Establishments
        created_establishments = []
        
        for est_data in ESTABLISHMENTS_DATA:
            print(f"  > Processing {est_data['name']}...")
            
            # Check Owner
            stmt = select(User).where(User.email == est_data['owner_email'])
            result = await session.execute(stmt)
            owner = result.scalar_one_or_none()
            
            if not owner:
                owner = User(
                    email=est_data['owner_email'],
                    hashed_password=hash_password_direct("123456"),
                    name=generate_name(),
                    role=UserRole.owner, # Owner is usually professional too
                    phone=generate_phone()
                )
                session.add(owner)
                await session.flush()
                # Create Wallet for Owner
                wallet = Wallet(user_id=owner.id, balance=0)
                session.add(wallet)

            # Check Establishment
            stmt = select(Establishment).where(Establishment.slug == est_data['slug'])
            result = await session.execute(stmt)
            establishment = result.scalar_one_or_none()
            
            if not establishment:
                establishment = Establishment(
                    name=est_data['name'],
                    slug=est_data['slug'],
                    description=est_data['description'],
                    category=EstablishmentCategory.barbershop if "Barbearia" in est_data['category'] else EstablishmentCategory.salon,
                    owner_id=owner.id,
                    address=est_data['address'],
                    city=est_data['city'],
                    state=est_data['state'],
                    phone=est_data['phone'],
                    logo_url=est_data['avatar_url'],
                    status=EstablishmentStatus.active,
                    subscription_tier=est_data['tier']
                )
                session.add(establishment)
                await session.flush()
            
            created_establishments.append(establishment)
            
            # 2. Services
            services = []
            for svc_data in est_data['services']:
                svc = Service(
                    establishment_id=establishment.id,
                    name=svc_data['name'],
                    description=f"Serviço de {svc_data['name']}",
                    price=svc_data['price'],
                    duration_minutes=svc_data['duration'],
                    active=True
                )
                session.add(svc)
                services.append(svc)
            
            # 3. Products
            for prod_data in est_data['products']:
                prod = Product(
                    establishment_id=establishment.id,
                    name=prod_data['name'],
                    description=f"Produto {prod_data['name']} de alta qualidade.",
                    price=prod_data['price'],
                    stock_quantity=prod_data['stock'],
                    active=True
                )
                session.add(prod)

            # 4. Staff (3-5 per establishment)
            staff_members = []
            for i in range(random.randint(3, 5)):
                staff_email = f"staff.{establishment.slug.replace('-', '')}.{i}@dunnaa.com"
                
                stmt = select(User).where(User.email == staff_email)
                result = await session.execute(stmt)
                staff_user = result.scalar_one_or_none()
                
                if not staff_user:
                    staff_user = User(
                        email=staff_email,
                        hashed_password=hash_password_direct("123456"),
                        name=generate_name(),
                        role=UserRole.staff,
                        phone=generate_phone(),
                        avatar_url=f"https://i.pravatar.cc/150?u={staff_email}"
                    )
                    session.add(staff_user)
                    await session.flush()

                staff = StaffMember(
                    user_id=staff_user.id,
                    establishment_id=establishment.id,
                    name=staff_user.name,
                    bio="Especialista com anos de experiência.",
                    role="Profissional",
                    active=True,
                    commission_rate=0.4 if i == 0 else 0.3,
                    contract_type=StaffContractType.commission_only
                )
                session.add(staff)
                staff_members.append(staff)

        # 5. Clients & Appointments
        print("  > Creating Clients and Appointments...")
        clients = []
        for i in range(20):
            client_email = f"cliente{i}@teste.com"
            stmt = select(User).where(User.email == client_email)
            result = await session.execute(stmt)
            client = result.scalar_one_or_none()
            
            if not client:
                client = User(
                    email=client_email,
                    hashed_password=hash_password_direct("123456"),
                    name=generate_name(),
                    role=UserRole.customer,
                    phone=generate_phone()
                )
                session.add(client)
                await session.flush()
            clients.append(client)
        
        # Make Appointments (Past 30 days & Future 15 days)
        now = datetime.now(timezone.utc)
        
        for i in range(80): # 80 Random Appointments
            est = random.choice(created_establishments)
            # Fetch services and staff for this establishment from DB (flush required previously)
            est_services_stmt = select(Service).where(Service.establishment_id == est.id)
            est_services = (await session.execute(est_services_stmt)).scalars().all()
            
            est_staff_stmt = select(StaffMember).where(StaffMember.establishment_id == est.id)
            est_staff = (await session.execute(est_staff_stmt)).scalars().all()
            
            if not est_services or not est_staff:
                continue

            service = random.choice(est_services)
            professional = random.choice(est_staff)
            client = random.choice(clients)
            
            # Date distribution: 70% past, 30% future
            if random.random() < 0.7:
                # Past
                days_ago = random.randint(1, 45)
                appt_date = now - timedelta(days=days_ago)
                status = AppointmentStatus.completed
            else:
                # Future
                days_future = random.randint(1, 15)
                appt_date = now + timedelta(days=days_future)
                status = random.choice([AppointmentStatus.confirmed, AppointmentStatus.pending])

            # Randomize hour
            appt_date = appt_date.replace(
                hour=random.randint(9, 19),
                minute=random.choice([0, 30]),
                second=0,
                microsecond=0,
            )

            appt = Appointment(
                establishment_id=est.id,
                user_id=client.id,
                staff_id=professional.id,
                service_id=service.id,
                scheduled_at=appt_date,
                duration_minutes=service.duration_minutes,
                status=status,
                total_price=service.price,
                payment_type=PaymentType.single,
                payment_method=PaymentMethod.card,
                notes="Agendado automaticamente pelo Seed." if i % 5 == 0 else None
            )
            session.add(appt)
            
            # If Completed, create Payment and Review
            if status == AppointmentStatus.completed:
                payment = Payment(
                    user_id=client.id,
                    establishment_id=est.id,
                    purpose=PaymentPurpose.single,
                    appointment_id=appt.id,
                    amount=service.price,
                    provider="cash" if random.choice([True, False]) else "card",
                    status=PaymentStatus.succeeded,
                    platform_fee=float(service.price) * (0.06 if est.subscription_tier == "free" else 0.04 if est.subscription_tier == "silver" else 0.03),
                    gateway_fee=float(service.price) * 0.03,
                    net_amount=float(service.price) * 0.92
                )
                session.add(payment)
                
                # Review (60% chance)
                if random.random() < 0.6:
                    rating = random.choices([5, 4, 3], weights=[0.7, 0.2, 0.1])[0]
                    comments = ["Excelente!", "Muito bom", "Gostei", "Recomendo", "Profissional top"]
                    review = Review(
                        appointment_id=appt.id,
                        establishment_id=est.id,
                        user_id=client.id,
                        staff_id=professional.id,
                        rating=rating,
                        comment=random.choice(comments)
                    )
                    session.add(review)

        await session.commit()
        print("✅ Seed Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
