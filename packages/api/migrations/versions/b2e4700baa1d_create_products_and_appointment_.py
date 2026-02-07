"""create products and appointment products tables

Revision ID: b2e4700baa1d
Revises: 1c73efb59542
Create Date: 2026-02-07 17:17:22.233442

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2e4700baa1d'
down_revision: Union[str, None] = '99c901766338'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- products ---
    op.create_table(
        "products",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("establishment_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), server_default='0', nullable=False),
        sa.Column("active", sa.Boolean(), server_default='true', nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['establishment_id'], ['establishments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_establishment_id'), 'products', ['establishment_id'], unique=False)

    # --- appointment_products ---
    op.create_table(
        "appointment_products",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("appointment_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Integer(), server_default='1', nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointment_products_appointment_id'), 'appointment_products', ['appointment_id'], unique=False)
    op.create_index(op.f('ix_appointment_products_product_id'), 'appointment_products', ['product_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_appointment_products_product_id'), table_name='appointment_products')
    op.drop_index(op.f('ix_appointment_products_appointment_id'), table_name='appointment_products')
    op.drop_table('appointment_products')
    op.drop_index(op.f('ix_products_establishment_id'), table_name='products')
    op.drop_table('products')
