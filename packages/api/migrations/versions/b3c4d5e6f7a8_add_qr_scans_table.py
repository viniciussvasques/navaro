"""add qr_scans table

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-02-13 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "qr_scans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "establishment_id",
            UUID(as_uuid=True),
            sa.ForeignKey("establishments.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("platform", sa.String(20), nullable=True),
        sa.Column("source", sa.String(50), nullable=True, server_default="poster"),
        sa.Column("converted_to_user", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("converted_to_favorite", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("converted_to_appointment", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "scanned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    # Index for analytics queries
    op.create_index(
        "ix_qr_scans_establishment_scanned_at",
        "qr_scans",
        ["establishment_id", "scanned_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_qr_scans_establishment_scanned_at", table_name="qr_scans")
    op.drop_table("qr_scans")
