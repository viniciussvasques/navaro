"""platform auto renew flag

Revision ID: h3i4j5k6l7m8
Revises: g2h3i4j5k6l7
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h3i4j5k6l7m8"
down_revision: Union[str, None] = "g2h3i4j5k6l7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("establishments")}
    if "platform_auto_renew" not in cols:
        op.add_column(
            "establishments",
            sa.Column(
                "platform_auto_renew",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("establishments")}
    if "platform_auto_renew" in cols:
        op.drop_column("establishments", "platform_auto_renew")
