"""add image_url to services

Revision ID: f8e4bfad3a21
Revises: 99c901766338
Create Date: 2026-02-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f8e4bfad3a21"
down_revision: Union[str, None] = "99c901766338"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column("image_url", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("services", "image_url")

