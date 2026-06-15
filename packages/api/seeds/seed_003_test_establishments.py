"""Seed 003: Estabelecimentos de teste para Mercado Pago / PIX (agenda, horários, serviços, staff)."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models import (
    Appointment,
    AppointmentStatus,
    Establishment,
    EstablishmentCategory,
    EstablishmentStatus,
    PaymentMethod,
    PaymentType,
    Service,
    StaffMember,
    SubscriptionTier,
    User,
    UserRole,
)
from app.services.auth_service import AuthService

logger = get_logger(__name__)

# Horário padrão: seg–sáb 9h–19h, domingo fechado (formato usado pelo appointment_service)
BUSINESS_HOURS = {
    "mon": {"open": "09:00", "close": "19:00"},
    "tue": {"open": "09:00", "close": "19:00"},
    "wed": {"open": "09:00", "close": "19:00"},
    "thu": {"open": "09:00", "close": "19:00"},
    "fri": {"open": "09:00", "close": "19:00"},
    "sat": {"open": "09:00", "close": "17:00"},
    "sun": None,
}

WORK_SCHEDULE = {
    "mon": {"open": "09:00", "close": "19:00"},
    "tue": {"open": "09:00", "close": "19:00"},
    "wed": {"open": "09:00", "close": "19:00"},
    "thu": {"open": "09:00", "close": "19:00"},
    "fri": {"open": "09:00", "close": "19:00"},
    "sat": {"open": "09:00", "close": "17:00"},
    "sun": None,
}

# Senha padrão para todos os usuários de teste (Pro: login com e-mail)
TEST_PASSWORD = "teste123"

DEMO_ESTABLISHMENTS = [
    {
        "name": "Barbearia Teste PIX",
        "slug": "barbearia-teste-pix",
        "category": EstablishmentCategory.barbershop,
        "description": "Estabelecimento de teste para pagamento PIX e Mercado Pago.",
        "address": "Av. Paulista, 1000",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01310-100",
        "phone": "+5511999990001",
        "owner_email": "dono.pix@teste.dunnaa.com.br",
        "owner_phone": "+5511999990001",
        "owner_name": "Dono Teste PIX",
        "services": [
            {"name": "Corte Masculino", "price": 45.00, "duration": 30},
            {"name": "Corte + Barba", "price": 65.00, "duration": 45},
            {"name": "Barba", "price": 30.00, "duration": 20},
        ],
        "staff": [
            {"name": "Barbeiro João", "role": "barbeiro"},
            {"name": "Barbeiro Maria", "role": "barbeiro"},
        ],
    },
    {
        "name": "Salão Beleza Teste",
        "slug": "salao-beleza-teste",
        "category": EstablishmentCategory.salon,
        "description": "Salão de beleza para testes de agendamento e PIX.",
        "address": "Rua Augusta, 500",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01305-000",
        "phone": "+5511999990002",
        "owner_email": "dono.salao@teste.dunnaa.com.br",
        "owner_phone": "+5511999990002",
        "owner_name": "Dono Salão Teste",
        "services": [
            {"name": "Corte Feminino", "price": 80.00, "duration": 60},
            {"name": "Coloração", "price": 150.00, "duration": 120},
            {"name": "Manicure", "price": 35.00, "duration": 45},
        ],
        "staff": [
            {"name": "Cabeleireira Ana", "role": "cabeleireira"},
            {"name": "Manicure Paula", "role": "manicure"},
        ],
    },
]


async def seed(db: AsyncSession) -> None:
    """Cria estabelecimentos de teste com horários, serviços, staff e (opcional) agendamentos."""

    for demo in DEMO_ESTABLISHMENTS:
        result = await db.execute(select(Establishment).where(Establishment.slug == demo["slug"]))
        if result.scalar_one_or_none():
            logger.info("Establishment %s already exists, skipping", demo["slug"])
            continue

        # Owner
        result = await db.execute(select(User).where(User.email == demo["owner_email"]))
        owner = result.scalar_one_or_none()
        if not owner:
            owner = User(
                phone=demo["owner_phone"],
                name=demo["owner_name"],
                email=demo["owner_email"],
                role=UserRole.owner,
                hashed_password=AuthService.get_password_hash(TEST_PASSWORD),
            )
            db.add(owner)
            await db.flush()
            logger.info("Created owner %s (%s)", owner.name, owner.email)

        # Establishment
        establishment = Establishment(
            owner_id=owner.id,
            name=demo["name"],
            slug=demo["slug"],
            category=demo["category"],
            description=demo["description"],
            address=demo["address"],
            city=demo["city"],
            state=demo["state"],
            zip_code=demo["zip_code"],
            phone=demo["phone"],
            whatsapp=demo["phone"],
            status=EstablishmentStatus.active,
            subscription_tier=SubscriptionTier.active,
            business_hours=BUSINESS_HOURS,
            queue_mode_enabled=False,
            accept_online_payment=True,
            accept_cash_payment=True,
        )
        db.add(establishment)
        await db.flush()

        # Services
        services = []
        for i, svc in enumerate(demo["services"]):
            s = Service(
                establishment_id=establishment.id,
                name=svc["name"],
                price=svc["price"],
                duration_minutes=svc["duration"],
                sort_order=i,
                active=True,
            )
            db.add(s)
            services.append(s)
        await db.flush()

        # Staff
        staff_members = []
        for st in demo["staff"]:
            sm = StaffMember(
                establishment_id=establishment.id,
                name=st["name"],
                role=st["role"],
                work_schedule=WORK_SCHEDULE,
                commission_rate=50.0,
                active=True,
            )
            db.add(sm)
            staff_members.append(sm)
        await db.flush()

        # Link services to staff (cada serviço disponível para cada profissional)
        from app.models.service import service_staff

        for s in services:
            for sm in staff_members:
                await db.execute(service_staff.insert().values(service_id=s.id, staff_id=sm.id))
        await db.flush()

        logger.info(
            "Created establishment %s: %d services, %d staff",
            demo["slug"],
            len(services),
            len(staff_members),
        )

    # Cliente de teste (para agendar e testar PIX)
    result = await db.execute(select(User).where(User.email == "cliente@teste.dunnaa.com.br"))
    customer = result.scalar_one_or_none()
    if not customer:
        customer = User(
            phone="+5511988887777",
            name="Cliente Teste",
            email="cliente@teste.dunnaa.com.br",
            role=UserRole.customer,
            hashed_password=AuthService.get_password_hash(TEST_PASSWORD),
        )
        db.add(customer)
        await db.flush()
        logger.info("Created test customer cliente@teste.dunnaa.com.br")

    # Um agendamento futuro (confirmado) para testar create-intent PIX
    result = await db.execute(select(Establishment).where(Establishment.slug == "barbearia-teste-pix"))
    est = result.scalar_one_or_none()
    if est:
        result = await db.execute(
            select(Service).where(Service.establishment_id == est.id).limit(1)
        )
        svc = result.scalar_one_or_none()
        result = await db.execute(
            select(StaffMember).where(StaffMember.establishment_id == est.id).limit(1)
        )
        staff = result.scalar_one_or_none()
        if svc and staff:
            # Próxima segunda às 10h
            now = datetime.now(UTC)
            days_ahead = (7 - now.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            next_monday = now.date() + timedelta(days=days_ahead)
            scheduled_at = datetime(
                next_monday.year, next_monday.month, next_monday.day, 10, 0, 0, tzinfo=UTC
            )
            result = await db.execute(
                select(Appointment).where(
                    Appointment.establishment_id == est.id,
                    Appointment.user_id == customer.id,
                    Appointment.scheduled_at >= now,
                ).limit(1)
            )
            if result.scalar_one_or_none() is None:
                appt = Appointment(
                    user_id=customer.id,
                    establishment_id=est.id,
                    staff_id=staff.id,
                    service_id=svc.id,
                    scheduled_at=scheduled_at,
                    duration_minutes=svc.duration_minutes,
                    status=AppointmentStatus.confirmed,
                    payment_type=PaymentType.single,
                    payment_method=PaymentMethod.card,
                    total_price=float(svc.price),
                )
                db.add(appt)
                await db.flush()
                logger.info(
                    "Created test appointment for PIX: appt_id=%s, total=%.2f",
                    str(appt.id),
                    appt.total_price,
                )

    logger.info("Seed 003 (test establishments) completed. Use e-mail + senha 'teste123' no Pro.")
