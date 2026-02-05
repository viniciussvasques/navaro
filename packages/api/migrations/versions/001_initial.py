"""Initial migration: All base tables.

Revision ID: 001_initial
Create Date: 2024-02-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(200)),
        sa.Column("email", sa.String(255), unique=True, index=True),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column(
            "role",
            sa.Enum("customer", "owner", "staff", "admin", name="userrole"),
            nullable=False,
            default="customer",
        ),
        sa.Column("referral_code", sa.String(20), unique=True, index=True),
        sa.Column("referred_by_id", postgresql.UUID(as_uuid=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_users_role", "users", ["role"])

    # ─── Establishments ────────────────────────────────────────────────────────
    op.create_table(
        "establishments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column(
            "category",
            sa.Enum("barbershop", "salon", "barber_salon", name="establishmentcategory"),
            nullable=False,
        ),
        sa.Column("description", sa.String(1000)),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("city", sa.String(100), nullable=False, index=True),
        sa.Column("state", sa.String(2), nullable=False),
        sa.Column("zip_code", sa.String(10)),
        sa.Column("latitude", sa.Numeric(10, 8)),
        sa.Column("longitude", sa.Numeric(11, 8)),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("whatsapp", sa.String(20)),
        sa.Column("logo_url", sa.String(500)),
        sa.Column("cover_url", sa.String(500)),
        sa.Column("google_place_id", sa.String(255)),
        sa.Column("google_maps_url", sa.String(500)),
        sa.Column("business_hours", postgresql.JSON, nullable=False, server_default="{}"),
        sa.Column("queue_mode_enabled", sa.Boolean, nullable=False, default=False),
        sa.Column(
            "status",
            sa.Enum("pending", "active", "suspended", "closed", name="establishmentstatus"),
            nullable=False,
            default="pending",
        ),
        sa.Column(
            "subscription_tier",
            sa.Enum("trial", "active", "cancelled", name="subscriptiontier"),
            nullable=False,
            default="trial",
        ),
        sa.Column("stripe_account_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_establishments_city_status", "establishments", ["city", "status"])
    op.create_index("idx_establishments_category", "establishments", ["category"])

    # ─── Staff Members ─────────────────────────────────────────────────────────
    op.create_table(
        "staff_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(20)),
        sa.Column("role", sa.String(100), nullable=False, default="barbeiro"),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("work_schedule", postgresql.JSON, nullable=False, server_default="{}"),
        sa.Column("commission_rate", sa.Numeric(5, 2)),
        sa.Column("active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Services ──────────────────────────────────────────────────────────────
    op.create_table(
        "services",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=False, default=30),
        sa.Column("active", sa.Boolean, nullable=False, default=True),
        sa.Column("sort_order", sa.Integer, nullable=False, default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Service-Staff M2M ─────────────────────────────────────────────────────
    op.create_table(
        "service_staff",
        sa.Column("service_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id"), primary_key=True),
        sa.Column("staff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id"), primary_key=True),
    )

    # ─── Service Bundles ───────────────────────────────────────────────────────
    op.create_table(
        "service_bundles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("original_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("bundle_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("discount_percent", sa.Numeric(5, 2)),
        sa.Column("active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "service_bundle_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bundle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("service_bundles.id"), nullable=False, index=True),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Subscription Plans ────────────────────────────────────────────────────
    op.create_table(
        "subscription_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("active", sa.Boolean, nullable=False, default=True),
        sa.Column("stripe_price_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "subscription_plan_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscription_plans.id"), nullable=False, index=True),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id")),
        sa.Column("bundle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("service_bundles.id")),
        sa.Column("quantity_per_month", sa.Integer, nullable=False, default=4),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Subscriptions ─────────────────────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscription_plans.id"), nullable=False, index=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column(
            "status",
            sa.Enum("active", "cancelled", "expired", "paused", name="subscriptionstatus"),
            nullable=False,
            default="active",
        ),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        sa.Column("stripe_subscription_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "subscription_usage",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id"), nullable=False, index=True),
        sa.Column("plan_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscription_plan_items.id"), nullable=False, index=True),
        sa.Column("month_start", sa.Date, nullable=False),
        sa.Column("uses_this_month", sa.Integer, nullable=False, default=0),
        sa.Column("last_use_date", sa.Date),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Appointments ──────────────────────────────────────────────────────────
    op.create_table(
        "appointments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("staff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id"), nullable=False, index=True),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id")),
        sa.Column("bundle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("service_bundles.id")),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id")),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("duration_minutes", sa.Integer, nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "confirmed", "completed", "cancelled", "no_show", name="appointmentstatus"),
            nullable=False,
            default="pending",
        ),
        sa.Column(
            "payment_type",
            sa.Enum("single", "subscription", name="paymenttype"),
            nullable=False,
        ),
        sa.Column("notes", sa.String(500)),
        sa.Column("cancel_reason", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_appointments_staff_scheduled", "appointments", ["staff_id", "scheduled_at"])
    op.create_index("idx_appointments_establishment_date", "appointments", ["establishment_id", "scheduled_at"])
    op.create_index("idx_appointments_user_date", "appointments", ["user_id", "scheduled_at"])

    # ─── Checkins ──────────────────────────────────────────────────────────────
    op.create_table(
        "checkins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id"), unique=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Queue ─────────────────────────────────────────────────────────────────
    op.create_table(
        "queue_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("service_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("services.id")),
        sa.Column("preferred_staff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id")),
        sa.Column("assigned_staff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id")),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column(
            "status",
            sa.Enum("waiting", "called", "serving", "completed", "left", name="queuestatus"),
            nullable=False,
            default="waiting",
        ),
        sa.Column("entered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("called_at", sa.DateTime(timezone=True)),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_queue_establishment_status", "queue_entries", ["establishment_id", "status"])
    op.create_index("idx_queue_establishment_position", "queue_entries", ["establishment_id", "position"])

    # ─── Reviews ───────────────────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("staff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id")),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id"), unique=True),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.String(1000)),
        sa.Column("owner_response", sa.String(1000)),
        sa.Column("owner_responded_at", sa.DateTime(timezone=True)),
        sa.Column("approved_for_google", sa.Boolean, nullable=False, default=False),
        sa.Column("sent_to_google", sa.Boolean, nullable=False, default=False),
        sa.Column("google_review_id", sa.String(255)),
        sa.Column("sent_to_google_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_reviews_establishment_rating", "reviews", ["establishment_id", "rating"])

    # ─── Favorites ─────────────────────────────────────────────────────────────
    op.create_table(
        "favorites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_favorites_unique", "favorites", ["user_id", "establishment_id"], unique=True)

    op.create_table(
        "favorite_staff",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("staff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id"), nullable=False, index=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_favorite_staff_unique", "favorite_staff", ["user_id", "staff_id"], unique=True)

    # ─── Payments ──────────────────────────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id")),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subscriptions.id")),
        sa.Column(
            "purpose",
            sa.Enum("single", "subscription", "subscription_renewal", name="paymentpurpose"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("platform_fee", sa.Numeric(10, 2), nullable=False),
        sa.Column("gateway_fee", sa.Numeric(10, 2), nullable=False),
        sa.Column("net_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "processing", "succeeded", "failed", "refunded", name="paymentstatus"),
            nullable=False,
            default="pending",
        ),
        sa.Column("stripe_payment_id", sa.String(255)),
        sa.Column("stripe_payment_method", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_payments_establishment_date", "payments", ["establishment_id", "created_at"])
    op.create_index("idx_payments_status", "payments", ["status"])

    # ─── Tips ──────────────────────────────────────────────────────────────────
    op.create_table(
        "tips",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("staff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id"), nullable=False, index=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("appointments.id")),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "processing", "succeeded", "failed", "refunded", name="paymentstatus", create_type=False),
            nullable=False,
            default="pending",
        ),
        sa.Column("stripe_payment_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Payouts ───────────────────────────────────────────────────────────────
    op.create_table(
        "payouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, default="pending"),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("stripe_payout_id", sa.String(255)),
        sa.Column("stripe_transfer_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Portfolio ─────────────────────────────────────────────────────────────
    op.create_table(
        "portfolio_images",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("staff_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("staff_members.id"), index=True),
        sa.Column("image_url", sa.String(500), nullable=False),
        sa.Column("thumbnail_url", sa.String(500)),
        sa.Column("description", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Search History ────────────────────────────────────────────────────────
    op.create_table(
        "search_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("establishment_clicked_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id")),
        sa.Column("query", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_search_history_user_date", "search_history", ["user_id", "created_at"])

    # ─── Plugins ───────────────────────────────────────────────────────────────
    op.create_table(
        "establishment_plugins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("plugin_type", sa.String(50), nullable=False),
        sa.Column("active", sa.Boolean, nullable=False, default=True),
        sa.Column("config", postgresql.JSON, nullable=False, server_default="{}"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Ad Campaigns ──────────────────────────────────────────────────────────
    op.create_table(
        "ad_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("establishments.id"), nullable=False, index=True),
        sa.Column("name", sa.String(200)),
        sa.Column("budget_daily", sa.Numeric(10, 2), nullable=False),
        sa.Column("spent_today", sa.Numeric(10, 2), nullable=False, default=0),
        sa.Column("total_spent", sa.Numeric(10, 2), nullable=False, default=0),
        sa.Column("impressions", sa.Integer, nullable=False, default=0),
        sa.Column("clicks", sa.Integer, nullable=False, default=0),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date),
        sa.Column("active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("ad_campaigns")
    op.drop_table("establishment_plugins")
    op.drop_table("search_history")
    op.drop_table("portfolio_images")
    op.drop_table("payouts")
    op.drop_table("tips")
    op.drop_table("payments")
    op.drop_table("favorite_staff")
    op.drop_table("favorites")
    op.drop_table("reviews")
    op.drop_table("queue_entries")
    op.drop_table("checkins")
    op.drop_table("appointments")
    op.drop_table("subscription_usage")
    op.drop_table("subscriptions")
    op.drop_table("subscription_plan_items")
    op.drop_table("subscription_plans")
    op.drop_table("service_bundle_items")
    op.drop_table("service_bundles")
    op.drop_table("service_staff")
    op.drop_table("services")
    op.drop_table("staff_members")
    op.drop_table("establishments")
    op.drop_table("users")
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS establishmentcategory")
    op.execute("DROP TYPE IF EXISTS establishmentstatus")
    op.execute("DROP TYPE IF EXISTS subscriptiontier")
    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
    op.execute("DROP TYPE IF EXISTS appointmentstatus")
    op.execute("DROP TYPE IF EXISTS paymenttype")
    op.execute("DROP TYPE IF EXISTS queuestatus")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
    op.execute("DROP TYPE IF EXISTS paymentpurpose")
