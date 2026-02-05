"""Analytics service."""

from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus
from app.models.payment import Payment, PaymentStatus
from app.models.staff import StaffMember


class AnalyticsService:
    """Analytics service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_establishment_dashboard(
        self, establishment_id: UUID, start_date: date, end_date: date
    ) -> dict[str, Any]:
        """Get summary metrics for an establishment's dashboard."""

        # 1. Total Revenue (Successful payments)
        revenue_query = select(func.sum(Payment.amount)).where(
            and_(
                Payment.establishment_id == establishment_id,
                Payment.status == PaymentStatus.succeeded,
                Payment.created_at >= start_date,
                Payment.created_at <= end_date,
            )
        )
        revenue_res = await self.db.execute(revenue_query)
        total_revenue = float(revenue_res.scalar() or 0)

        # 2. Appointment Stats
        appt_stats_query = (
            select(Appointment.status, func.count(Appointment.id))
            .where(
                and_(
                    Appointment.establishment_id == establishment_id,
                    Appointment.scheduled_at >= start_date,
                    Appointment.scheduled_at <= end_date,
                )
            )
            .group_by(Appointment.status)
        )

        appt_stats_res = await self.db.execute(appt_stats_query)
        stats_dict = {status.value: count for status, count in appt_stats_res.all()}

        total_appts = sum(stats_dict.values())
        completed_appts = stats_dict.get(AppointmentStatus.completed.value, 0)
        no_show_appts = stats_dict.get(AppointmentStatus.no_show.value, 0)

        # 3. Revenue by Staff
        staff_revenue_query = (
            select(StaffMember.name, func.sum(Appointment.total_price))
            .join(Appointment, StaffMember.id == Appointment.staff_id)
            .where(
                and_(
                    Appointment.establishment_id == establishment_id,
                    Appointment.status == AppointmentStatus.completed,
                    Appointment.scheduled_at >= start_date,
                    Appointment.scheduled_at <= end_date,
                )
            )
            .group_by(StaffMember.name)
        )

        staff_revenue_res = await self.db.execute(staff_revenue_query)
        staff_revenue = [
            {"name": name, "value": float(val or 0)} for name, val in staff_revenue_res.all()
        ]

        return {
            "total_revenue": total_revenue,
            "total_appointments": total_appts,
            "completed_appointments": completed_appts,
            "no_show_rate": (no_show_appts / total_appts * 100) if total_appts > 0 else 0,
            "ticket_average": (total_revenue / completed_appts) if completed_appts > 0 else 0,
            "staff_performance": staff_revenue,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        }
