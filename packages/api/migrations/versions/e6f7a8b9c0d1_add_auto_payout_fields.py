"""Add auto-payout fields to payouts table.

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-02-13
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "e6f7a8b9c0d1"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "payouts",
        sa.Column("provider", sa.String(50), nullable=False, server_default="manual"),
    )
    op.add_column("payouts", sa.Column("provider_payout_id", sa.String(255), nullable=True))
    op.add_column("payouts", sa.Column("pix_key_used", sa.String(255), nullable=True))
    op.add_column(
        "payouts",
        sa.Column("payment_id", UUID(as_uuid=True), sa.ForeignKey("payments.id"), nullable=True),
    )
    op.add_column("payouts", sa.Column("platform_fee", sa.Numeric(10, 2), nullable=True))
    op.add_column(
        "payouts",
        sa.Column("is_auto", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("payouts", "is_auto")
    op.drop_column("payouts", "platform_fee")
    op.drop_column("payouts", "payment_id")
    op.drop_column("payouts", "pix_key_used")
    op.drop_column("payouts", "provider_payout_id")
    op.drop_column("payouts", "provider")
