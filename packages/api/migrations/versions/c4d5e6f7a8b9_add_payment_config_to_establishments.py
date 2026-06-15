"""Add payment config to establishments.

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-02-13
"""

from alembic import op
import sqlalchemy as sa

revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "establishments",
        sa.Column("accept_online_payment", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "establishments",
        sa.Column("accept_cash_payment", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_column("establishments", "accept_cash_payment")
    op.drop_column("establishments", "accept_online_payment")
