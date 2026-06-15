"""add promotions table

Revision ID: f1a2b3c4d5e6
Revises: e6f7a8b9c0d1
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if "promotions" not in insp.get_table_names():
        op.create_table(
            "promotions",
            sa.Column("id", UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "establishment_id",
                UUID(as_uuid=True),
                sa.ForeignKey("establishments.id"),
                nullable=False,
            ),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("discount_percent", sa.Numeric(5, 2), nullable=True),
            sa.Column("discount_fixed", sa.Numeric(10, 2), nullable=True),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("notify_sent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_promotions_establishment_id", "promotions", ["establishment_id"])


def downgrade() -> None:
    op.drop_index("ix_promotions_establishment_id", table_name="promotions")
    op.drop_table("promotions")
