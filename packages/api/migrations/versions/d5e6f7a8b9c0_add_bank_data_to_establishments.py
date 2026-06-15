"""Add bank/PIX data and auto_payout to establishments.

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-02-13
"""

from alembic import op
import sqlalchemy as sa

revision = "d5e6f7a8b9c0"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("establishments", sa.Column("pix_key", sa.String(255), nullable=True))
    op.add_column("establishments", sa.Column("pix_key_type", sa.String(20), nullable=True))
    op.add_column("establishments", sa.Column("bank_name", sa.String(100), nullable=True))
    op.add_column("establishments", sa.Column("bank_agency", sa.String(20), nullable=True))
    op.add_column("establishments", sa.Column("bank_account", sa.String(30), nullable=True))
    op.add_column("establishments", sa.Column("bank_account_type", sa.String(20), nullable=True))
    op.add_column("establishments", sa.Column("bank_holder_name", sa.String(200), nullable=True))
    op.add_column("establishments", sa.Column("bank_holder_document", sa.String(20), nullable=True))
    op.add_column(
        "establishments",
        sa.Column("auto_payout_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("establishments", "auto_payout_enabled")
    op.drop_column("establishments", "bank_holder_document")
    op.drop_column("establishments", "bank_holder_name")
    op.drop_column("establishments", "bank_account_type")
    op.drop_column("establishments", "bank_account")
    op.drop_column("establishments", "bank_agency")
    op.drop_column("establishments", "bank_name")
    op.drop_column("establishments", "pix_key_type")
    op.drop_column("establishments", "pix_key")
