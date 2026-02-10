"""fix_user_enum

Revision ID: 2f5ebca0bd87
Revises: 040f8b5c0340
Create Date: 2026-02-07 17:31:26.512871

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f5ebca0bd87'
down_revision: Union[str, None] = '040f8b5c0340'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE 'support'")


def downgrade() -> None:
    pass
