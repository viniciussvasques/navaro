"""Mercado Pago OAuth refresh token and connected_at on establishments.

Revision ID: i4j5k6l7m8n9
Revises: h3i4j5k6l7m8
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "i4j5k6l7m8n9"
down_revision: Union[str, None] = "h3i4j5k6l7m8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "establishments",
        sa.Column("mercadopago_refresh_token", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "establishments",
        sa.Column("mercadopago_connected_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("establishments", "mercadopago_connected_at")
    op.drop_column("establishments", "mercadopago_refresh_token")
