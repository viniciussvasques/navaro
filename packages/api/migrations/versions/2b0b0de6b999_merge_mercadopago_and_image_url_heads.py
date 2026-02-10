"""Merge Mercadopago and services image_url heads.

This migration merges the two divergent heads so that Alembic
has a single linear head again.

Revision ID: 2b0b0de6b999
Revises: 7cab3237c58b, f8e4bfad3a21
Create Date: 2026-02-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op  # noqa: F401  (kept for Alembic's expectations)
import sqlalchemy as sa  # noqa: F401  (kept for Alembic's expectations)


# revision identifiers, used by Alembic.
revision: str = "2b0b0de6b999"
down_revision: Union[str, tuple[str, ...], Sequence[str] | None] = (
    "7cab3237c58b",
    "f8e4bfad3a21",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge heads; no schema changes needed."""
    # This is an empty merge migration.
    pass


def downgrade() -> None:
    """Downgrade merge; no schema changes."""
    # In practice you rarely downgrade past a merge; kept empty.
    pass

