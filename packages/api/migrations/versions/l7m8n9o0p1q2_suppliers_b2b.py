"""Suppliers B2B marketplace — tables and userrole supplier value.

Revision ID: l7m8n9o0p1q2
Revises: k6l7m8n9o0p1
"""

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l7m8n9o0p1q2"
down_revision: Union[str, None] = "k6l7m8n9o0p1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Add 'supplier' value to the userrole enum ──────────────────────────────
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'supplier'")

    # ── suppliers ──────────────────────────────────────────────────────────────
    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("cnpj", sa.String(18), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("segment", sa.String(30), nullable=False, server_default="other"),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("whatsapp", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(2), nullable=True),
        sa.Column("ships_nationwide", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("rating", sa.Numeric(3, 2), nullable=True),
        sa.Column("total_reviews", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_orders", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cnpj"),
    )
    op.create_index("idx_suppliers_segment_active", "suppliers", ["segment", "active"])
    op.create_index(op.f("ix_suppliers_cnpj"), "suppliers", ["cnpj"])
    op.create_index(op.f("ix_suppliers_owner_user_id"), "suppliers", ["owner_user_id"])

    # ── supplier_products ──────────────────────────────────────────────────────
    op.create_table(
        "supplier_products",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sku", sa.String(100), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("unit", sa.String(20), nullable=False, server_default="unit"),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("moq", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_supplier_products_supplier_active",
        "supplier_products",
        ["supplier_id", "active"],
    )
    op.create_index(op.f("ix_supplier_products_supplier_id"), "supplier_products", ["supplier_id"])

    # ── supplier_stock ─────────────────────────────────────────────────────────
    op.create_table(
        "supplier_stock",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("min_threshold", sa.Integer(), nullable=False, server_default="5"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["product_id"], ["supplier_products.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id"),
    )
    op.create_index(op.f("ix_supplier_stock_product_id"), "supplier_stock", ["product_id"])

    # ── supplier_orders ────────────────────────────────────────────────────────
    op.create_table(
        "supplier_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("tracking_code", sa.String(200), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["establishment_id"], ["establishments.id"]),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_supplier_orders_supplier_status",
        "supplier_orders",
        ["supplier_id", "status"],
    )
    op.create_index(
        "idx_supplier_orders_establishment",
        "supplier_orders",
        ["establishment_id", "status"],
    )
    op.create_index(op.f("ix_supplier_orders_supplier_id"), "supplier_orders", ["supplier_id"])
    op.create_index(op.f("ix_supplier_orders_establishment_id"), "supplier_orders", ["establishment_id"])
    op.create_index(op.f("ix_supplier_orders_status"), "supplier_orders", ["status"])

    # ── supplier_order_items ───────────────────────────────────────────────────
    op.create_table(
        "supplier_order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["order_id"], ["supplier_orders.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["supplier_products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_supplier_order_items_order_id"), "supplier_order_items", ["order_id"])

    # ── supplier_promotions ────────────────────────────────────────────────────
    op.create_table(
        "supplier_promotions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("discount_percent", sa.Numeric(5, 2), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_supplier_promotions_supplier_id"), "supplier_promotions", ["supplier_id"])

    # ── supplier_reviews ───────────────────────────────────────────────────────
    op.create_table(
        "supplier_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("establishment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("owner_response", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["establishment_id"], ["establishments.id"]),
        sa.ForeignKeyConstraint(["order_id"], ["supplier_orders.id"]),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_supplier_reviews_supplier", "supplier_reviews", ["supplier_id"])
    op.create_index(op.f("ix_supplier_reviews_establishment_id"), "supplier_reviews", ["establishment_id"])


def downgrade() -> None:
    op.drop_table("supplier_reviews")
    op.drop_table("supplier_promotions")
    op.drop_table("supplier_order_items")
    op.drop_table("supplier_orders")
    op.drop_table("supplier_stock")
    op.drop_table("supplier_products")
    op.drop_table("suppliers")
    # Note: PostgreSQL does not support DROP VALUE from an enum type;
    # the 'supplier' value from userrole is kept after downgrade.
