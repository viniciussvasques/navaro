"""Analytics service."""

from datetime import date, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus
from app.models.payment import Payment, PaymentStatus
from app.models.staff import StaffMember
from app.models.subscription import Subscription, SubscriptionStatus


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
                Payment.created_at < end_date + timedelta(days=1),
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
                    Appointment.scheduled_at < end_date + timedelta(days=1),
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
                    Appointment.scheduled_at < end_date + timedelta(days=1),
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

    async def get_global_dashboard(self, start_date: date, end_date: date) -> dict[str, Any]:
        """Get summary metrics for a global (admin) dashboard."""

        # 1. GMV and Platform Fees (Commissions)
        # We query platform_fee directly from successful single payments
        finance_query = select(
            func.sum(Payment.amount).label("gmv"),
            func.sum(Payment.platform_fee).label("commissions"),
        ).where(
            and_(
                Payment.status == PaymentStatus.succeeded,
                Payment.purpose == "single",
                Payment.created_at >= start_date,
                Payment.created_at < end_date + timedelta(days=1),
            )
        )
        finance_res = await self.db.execute(finance_query)
        finance_data = finance_res.first()
        gmv = float(finance_data.gmv or 0) if finance_data else 0.0
        commissions = float(finance_data.commissions or 0) if finance_data else 0.0

        # 2. Subscription Revenue (MRR context)
        sub_revenue_query = select(func.sum(Payment.amount)).where(
            and_(
                Payment.status == PaymentStatus.succeeded,
                Payment.purpose.in_(["subscription", "subscription_renewal"]),
                Payment.created_at >= start_date,
                Payment.created_at < end_date + timedelta(days=1),
            )
        )
        sub_res = await self.db.execute(sub_revenue_query)
        subscription_revenue = float(sub_res.scalar() or 0)

        # 3. Total Platform Revenue
        total_platform_revenue = commissions + subscription_revenue

        # 4. Appointment Stats (Global)
        appt_stats_query = (
            select(Appointment.status, func.count(Appointment.id))
            .where(
                and_(
                    Appointment.scheduled_at >= start_date,
                    Appointment.scheduled_at < end_date + timedelta(days=1),
                )
            )
            .group_by(Appointment.status)
        )
        appt_stats_res = await self.db.execute(appt_stats_query)
        stats_dict = {
            status.value if hasattr(status, "value") else status: count
            for status, count in appt_stats_res.all()
        }

        total_appts = sum(stats_dict.values())
        completed_appts = stats_dict.get(AppointmentStatus.completed.value, 0)
        cancelled_appts = stats_dict.get(AppointmentStatus.cancelled.value, 0)

        # 5. Products Sold
        from app.models.appointment import AppointmentProduct

        products_query = (
            select(func.sum(AppointmentProduct.quantity))
            .join(Appointment, Appointment.id == AppointmentProduct.appointment_id)
            .where(
                and_(
                    Appointment.status == AppointmentStatus.completed,
                    Appointment.scheduled_at >= start_date,
                    Appointment.scheduled_at < end_date + timedelta(days=1),
                )
            )
        )
        products_res = await self.db.execute(products_query)
        products_sold = int(products_res.scalar() or 0)

        # 6. Active Subscriptions (Global count)
        subs_count_query = select(func.count(Subscription.id)).where(
            Subscription.status == SubscriptionStatus.active
        )
        subs_res = await self.db.execute(subs_count_query)
        active_subscriptions = subs_res.scalar() or 0

        # 7. Top Establishments Leaderboard
        from app.models.establishment import Establishment

        top_est_query = (
            select(Establishment.name, func.sum(Payment.amount).label("revenue"))
            .join(Payment, Establishment.id == Payment.establishment_id)
            .where(
                and_(
                    Payment.status == PaymentStatus.succeeded,
                    Payment.created_at >= start_date,
                    Payment.created_at < end_date + timedelta(days=1),
                )
            )
            .group_by(Establishment.name)
            .order_by(func.sum(Payment.amount).desc())
            .limit(5)
        )
        top_est_res = await self.db.execute(top_est_query)
        leaderboard = [
            {"name": name, "revenue": float(revenue or 0)} for name, revenue in top_est_res.all()
        ]

        # 6. New Establishments count
        est_count_query = select(func.count(Establishment.id)).where(
            and_(
                Establishment.created_at >= start_date,
                Establishment.created_at < end_date + timedelta(days=1),
            )
        )
        est_count_res = await self.db.execute(est_count_query)
        new_establishments = est_count_res.scalar() or 0

        # 7. Total Active Users
        from app.models.user import User

        user_count_query = select(func.count(User.id))
        user_count_res = await self.db.execute(user_count_query)
        total_active_users = user_count_res.scalar() or 0

        period_days = (end_date - start_date).days + 1
        prev_end = start_date - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_days - 1)

        prev_finance_res = await self.db.execute(
            select(
                func.sum(Payment.amount).label("gmv"),
                func.sum(Payment.platform_fee).label("commissions"),
            ).where(
                and_(
                    Payment.status == PaymentStatus.succeeded,
                    Payment.purpose == "single",
                    Payment.created_at >= prev_start,
                    Payment.created_at < prev_end + timedelta(days=1),
                )
            )
        )
        prev_finance = prev_finance_res.first()
        prev_gmv = float(prev_finance.gmv or 0) if prev_finance else 0.0
        prev_commissions = float(prev_finance.commissions or 0) if prev_finance else 0.0

        def pct_change(current: float, previous: float) -> float | None:
            if previous <= 0:
                return None
            return round(((current - previous) / previous) * 100, 1)

        return {
            "gmv": gmv,
            "commissions": commissions,
            "subscription_revenue": subscription_revenue,
            "platform_revenue": total_platform_revenue,
            "new_establishments": new_establishments,
            "total_active_users": total_active_users,
            "total_appointments": total_appts,
            "completed_appointments": completed_appts,
            "cancelled_appointments": cancelled_appts,
            "products_sold": products_sold,
            "active_subscriptions": active_subscriptions,
            "average_ticket": (gmv / completed_appts) if completed_appts > 0 else 0,
            "leaderboard": leaderboard,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "trends": {
                "gmv_pct": pct_change(gmv, prev_gmv),
                "commissions_pct": pct_change(commissions, prev_commissions),
            },
        }
