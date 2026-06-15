"""platform subscription expiry and appointment promotion fields

Revision ID: g2h3i4j5k6l7
Revises: f1a2b3c4d5e6
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "g2h3i4j5k6l7"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    est_cols = {c["name"] for c in insp.get_columns("establishments")}
    if "platform_subscription_expires_at" not in est_cols:
        op.add_column(
            "establishments",
            sa.Column("platform_subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
        )

    appt_cols = {c["name"] for c in insp.get_columns("appointments")}
    if "promotion_id" not in appt_cols:
        op.add_column(
            "appointments",
            sa.Column("promotion_id", UUID(as_uuid=True), sa.ForeignKey("promotions.id"), nullable=True),
        )
    if "discount_amount" not in appt_cols:
        op.add_column(
            "appointments",
            sa.Column(
                "discount_amount",
                sa.Numeric(10, 2),
                nullable=False,
                server_default="0.0",
            ),
        )

    op.execute("ALTER TYPE paymentpurpose ADD VALUE IF NOT EXISTS 'platform_saas'")


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    appt_cols = {c["name"] for c in insp.get_columns("appointments")}
    if "discount_amount" in appt_cols:
        op.drop_column("appointments", "discount_amount")
    if "promotion_id" in appt_cols:
        op.drop_column("appointments", "promotion_id")

    est_cols = {c["name"] for c in insp.get_columns("establishments")}
    if "platform_subscription_expires_at" in est_cols:
        op.drop_column("establishments", "platform_subscription_expires_at")
