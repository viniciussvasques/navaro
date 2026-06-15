"""Ad campaign targeting — geo, audience, placement, budget caps.

Revision ID: k6l7m8n9o0p1
Revises: j5k6l7m8n9o0
"""

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "k6l7m8n9o0p1"
down_revision: Union[str, None] = "j5k6l7m8n9o0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ad_campaigns",
        sa.Column("placement", sa.String(length=32), nullable=False, server_default="search_top"),
    )
    op.add_column(
        "ad_campaigns",
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "ad_campaigns",
        sa.Column("target_radius_km", sa.Numeric(6, 2), nullable=False, server_default="15"),
    )
    op.add_column("ad_campaigns", sa.Column("target_center_lat", sa.Float(), nullable=True))
    op.add_column("ad_campaigns", sa.Column("target_center_lng", sa.Float(), nullable=True))
    op.add_column(
        "ad_campaigns",
        sa.Column(
            "target_cities",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "ad_campaigns",
        sa.Column(
            "audience_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column("ad_campaigns", sa.Column("budget_total", sa.Numeric(10, 2), nullable=True))
    op.add_column(
        "ad_campaigns",
        sa.Column("cost_per_impression", sa.Numeric(8, 4), nullable=False, server_default="0.05"),
    )
    op.add_column(
        "ad_campaigns",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
    )


def downgrade() -> None:
    op.drop_column("ad_campaigns", "status")
    op.drop_column("ad_campaigns", "cost_per_impression")
    op.drop_column("ad_campaigns", "budget_total")
    op.drop_column("ad_campaigns", "audience_config")
    op.drop_column("ad_campaigns", "target_cities")
    op.drop_column("ad_campaigns", "target_center_lng")
    op.drop_column("ad_campaigns", "target_center_lat")
    op.drop_column("ad_campaigns", "target_radius_km")
    op.drop_column("ad_campaigns", "priority")
    op.drop_column("ad_campaigns", "placement")
