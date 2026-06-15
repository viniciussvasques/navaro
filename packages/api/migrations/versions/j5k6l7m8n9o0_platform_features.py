"""Platform feature columns — reviews moderation, push, geofence, multi-service.

Revision ID: j5k6l7m8n9o0
Revises: i4j5k6l7m8n9
"""

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "j5k6l7m8n9o0"
down_revision: Union[str, None] = "i4j5k6l7m8n9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reviews",
        sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("device_token", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "establishments",
        sa.Column("queue_geofence_meters", sa.Integer(), nullable=False, server_default="200"),
    )
    op.add_column(
        "appointments",
        sa.Column("service_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("appointments", "service_ids")
    op.drop_column("establishments", "queue_geofence_meters")
    op.drop_column("users", "device_token")
    op.drop_column("reviews", "is_hidden")
