"""Seed 002: Create demo establishment with services and staff."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import (
    User,
    UserRole,
    Establishment,
    EstablishmentCategory,
    EstablishmentStatus,
    SubscriptionTier,
    Service,
    StaffMember,
    SubscriptionPlan,
    SubscriptionPlanItem,
)
from app.core.logging import get_logger


logger = get_logger(__name__)


async def seed(db: AsyncSession) -> None:
    """Create demo establishment if not exists."""
    
    # Check if demo exists
    result = await db.execute(
        select(Establishment).where(Establishment.slug == "barbearia-demo")
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        logger.info("Demo establishment already exists, skipping")
        return
    
    # Create or get owner
    result = await db.execute(
        select(User).where(User.phone == "+5511888888888")
    )
    owner = result.scalar_one_or_none()
    
    if not owner:
        owner = User(
            phone="+5511888888888",
            name="João Silva",
            email="joao@demo.com",
            role=UserRole.OWNER,
        )
        db.add(owner)
        await db.flush()
    
    # Create establishment
    establishment = Establishment(
        owner_id=owner.id,
        name="Barbearia Demo",
        slug="barbearia-demo",
        category=EstablishmentCategory.BARBERSHOP,
        description="Barbearia tradicional com atendimento de qualidade e profissionais experientes.",
        address="Rua das Flores, 123",
        city="São Paulo",
        state="SP",
        zip_code="01234-567",
        phone="+5511888888888",
        whatsapp="+5511888888888",
        status=EstablishmentStatus.ACTIVE,
        subscription_tier=SubscriptionTier.ACTIVE,
        business_hours={
            "monday": {"open": "09:00", "close": "19:00"},
            "tuesday": {"open": "09:00", "close": "19:00"},
            "wednesday": {"open": "09:00", "close": "19:00"},
            "thursday": {"open": "09:00", "close": "19:00"},
            "friday": {"open": "09:00", "close": "19:00"},
            "saturday": {"open": "09:00", "close": "17:00"},
            "sunday": None,
        },
    )
    db.add(establishment)
    await db.flush()
    
    # Create services
    services_data = [
        {"name": "Corte Masculino", "price": 45.00, "duration": 30},
        {"name": "Corte + Barba", "price": 65.00, "duration": 45},
        {"name": "Barba", "price": 30.00, "duration": 20},
        {"name": "Sobrancelha", "price": 15.00, "duration": 10},
        {"name": "Corte Infantil", "price": 35.00, "duration": 25},
        {"name": "Nevou", "price": 20.00, "duration": 15},
        {"name": "Hidratação", "price": 40.00, "duration": 30},
        {"name": "Pigmentação", "price": 50.00, "duration": 40},
    ]
    
    services = []
    for i, data in enumerate(services_data):
        service = Service(
            establishment_id=establishment.id,
            name=data["name"],
            price=data["price"],
            duration_minutes=data["duration"],
            sort_order=i,
        )
        db.add(service)
        services.append(service)
    await db.flush()
    
    # Create staff
    staff_data = [
        {"name": "Carlos", "role": "barbeiro"},
        {"name": "Pedro", "role": "barbeiro"},
        {"name": "Lucas", "role": "barbeiro"},
    ]
    
    default_schedule = {
        "monday": {"start": "09:00", "end": "19:00"},
        "tuesday": {"start": "09:00", "end": "19:00"},
        "wednesday": {"start": "09:00", "end": "19:00"},
        "thursday": {"start": "09:00", "end": "19:00"},
        "friday": {"start": "09:00", "end": "19:00"},
        "saturday": {"start": "09:00", "end": "17:00"},
        "sunday": None,
    }
    
    staff_members = []
    for data in staff_data:
        staff = StaffMember(
            establishment_id=establishment.id,
            name=data["name"],
            role=data["role"],
            work_schedule=default_schedule,
            commission_rate=50.0,
        )
        db.add(staff)
        staff_members.append(staff)
    await db.flush()
    
    # Create subscription plan
    plan = SubscriptionPlan(
        establishment_id=establishment.id,
        name="Plano Mensal",
        description="4 cortes por mês",
        price=120.00,
    )
    db.add(plan)
    await db.flush()
    
    # Add corte masculino to plan (4x/month)
    plan_item = SubscriptionPlanItem(
        plan_id=plan.id,
        service_id=services[0].id,  # Corte Masculino
        quantity_per_month=4,
    )
    db.add(plan_item)
    
    logger.info(
        "Demo establishment created",
        establishment_id=str(establishment.id),
        services_count=len(services),
        staff_count=len(staff_members),
    )
