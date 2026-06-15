"""Admin CSV exports and CRM retention."""

import csv
import io
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, DBSession
from app.models.appointment import Appointment, AppointmentStatus
from app.models.establishment import Establishment
from app.models.payment import Payment
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin Exports & CRM"])


class RetentionUserItem(BaseModel):
    user_id: UUID
    user_name: str | None
    phone: str
    email: str | None
    last_appointment_at: datetime | None
    weeks_since_visit: int | None
    total_appointments: int


class RetentionListResponse(BaseModel):
    items: list[RetentionUserItem]
    total: int
    weeks_threshold: int


def _csv_response(filename: str, rows: list[list], headers: list[str]) -> StreamingResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/exports/payments.csv")
async def export_payments_csv(
    db: DBSession,
    admin: AdminUser,
    limit: int = Query(5000, ge=1, le=10000),
):
    """Export platform payments as CSV."""
    result = await db.execute(
        select(Payment).order_by(desc(Payment.created_at)).limit(limit)
    )
    payments = result.scalars().all()
    est_ids = {p.establishment_id for p in payments if p.establishment_id}
    est_names: dict = {}
    if est_ids:
        est_res = await db.execute(
            select(Establishment.id, Establishment.name).where(Establishment.id.in_(est_ids))
        )
        est_names = {row.id: row.name for row in est_res.all()}

    rows = []
    for p in payments:
        rows.append([
            str(p.id),
            est_names.get(p.establishment_id, ""),
            str(p.user_id),
            float(p.amount or 0),
            float(p.platform_fee or 0),
            p.status.value if hasattr(p.status, "value") else str(p.status),
            p.provider or "",
            p.created_at.isoformat() if p.created_at else "",
        ])
    return _csv_response(
        "dunnaa-pagamentos.csv",
        rows,
        ["id", "estabelecimento", "user_id", "valor", "taxa_plataforma", "status", "provedor", "criado_em"],
    )


@router.get("/exports/establishments.csv")
async def export_establishments_csv(db: DBSession, admin: AdminUser):
    """Export establishments as CSV."""
    result = await db.execute(select(Establishment).order_by(Establishment.name))
    establishments = result.scalars().all()
    rows = [
        [
            str(e.id),
            e.name,
            e.city,
            e.state,
            e.status.value if hasattr(e.status, "value") else str(e.status),
            e.subscription_tier.value if hasattr(e.subscription_tier, "value") else str(e.subscription_tier),
            e.created_at.isoformat() if e.created_at else "",
        ]
        for e in establishments
    ]
    return _csv_response(
        "dunnaa-estabelecimentos.csv",
        rows,
        ["id", "nome", "cidade", "uf", "status", "plano", "criado_em"],
    )


@router.get("/exports/appointments.csv")
async def export_appointments_csv(
    db: DBSession,
    admin: AdminUser,
    limit: int = Query(5000, ge=1, le=10000),
):
    """Export recent appointments as CSV."""
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.establishment), selectinload(Appointment.user))
        .order_by(desc(Appointment.scheduled_at))
        .limit(limit)
    )
    appointments = result.scalars().all()
    rows = []
    for a in appointments:
        rows.append([
            str(a.id),
            a.establishment.name if a.establishment else "",
            a.user.name if a.user else "",
            a.status.value if hasattr(a.status, "value") else str(a.status),
            a.scheduled_at.isoformat() if a.scheduled_at else "",
            float(a.total_price or 0),
        ])
    return _csv_response(
        "dunnaa-agendamentos.csv",
        rows,
        ["id", "estabelecimento", "cliente", "status", "agendado_para", "valor"],
    )


@router.get("/crm/retention", response_model=RetentionListResponse)
async def list_retention_candidates(
    db: DBSession,
    admin: AdminUser,
    weeks: int = Query(4, ge=2, le=52, description="Weeks since last completed visit"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> RetentionListResponse:
    """Customers who haven't completed an appointment in N weeks (re-engagement CRM)."""
    cutoff = datetime.now(UTC) - timedelta(weeks=weeks)

    subq = (
        select(
            Appointment.user_id,
            func.max(Appointment.scheduled_at).label("last_at"),
            func.count(Appointment.id).label("total"),
        )
        .where(Appointment.status == AppointmentStatus.completed)
        .group_by(Appointment.user_id)
        .subquery()
    )

    query = (
        select(User, subq.c.last_at, subq.c.total)
        .join(subq, User.id == subq.c.user_id)
        .where(subq.c.last_at < cutoff)
        .order_by(subq.c.last_at.asc())
    )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    items: list[RetentionUserItem] = []
    now = datetime.now(UTC)
    for user, last_at, total_appts in result.all():
        weeks_since = int((now - last_at).days / 7) if last_at else None
        items.append(
            RetentionUserItem(
                user_id=user.id,
                user_name=user.name,
                phone=user.phone,
                email=user.email,
                last_appointment_at=last_at,
                weeks_since_visit=weeks_since,
                total_appointments=int(total_appts or 0),
            )
        )

    return RetentionListResponse(items=items, total=total, weeks_threshold=weeks)
