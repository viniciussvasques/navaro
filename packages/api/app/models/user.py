"""User model."""

import enum

from sqlalchemy import String, Enum, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID

from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    """User roles in the system."""

    CUSTOMER = "customer"
    OWNER = "owner"
    STAFF = "staff"
    ADMIN = "admin"


class User(BaseModel):
    """
    User model.
    
    Represents all users in the system (customers, owners, staff, admins).
    """

    __tablename__ = "users"

    # ─── Core Fields ───────────────────────────────────────────────────────────
    
    phone: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
        doc="Phone number (E.164 format)",
    )
    
    name: Mapped[str | None] = mapped_column(
        String(200),
        doc="Full name",
    )
    
    email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        index=True,
        doc="Email address",
    )
    
    avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        doc="Profile picture URL",
    )
    
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.CUSTOMER,
        nullable=False,
        index=True,
        doc="User role",
    )

    # ─── Referral ──────────────────────────────────────────────────────────────
    
    referral_code: Mapped[str | None] = mapped_column(
        String(20),
        unique=True,
        index=True,
        doc="Unique referral code",
    )
    
    referred_by_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        doc="ID of user who referred this user",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    # Establishments owned by this user
    establishments = relationship(
        "Establishment",
        back_populates="owner",
        foreign_keys="Establishment.owner_id",
    )
    
    # Subscriptions
    subscriptions = relationship(
        "Subscription",
        back_populates="user",
    )
    
    # Appointments booked
    appointments = relationship(
        "Appointment",
        back_populates="user",
    )
    
    # Favorites
    favorites = relationship(
        "Favorite",
        back_populates="user",
    )
    
    # Reviews written
    reviews = relationship(
        "Review",
        back_populates="user",
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────
    
    __table_args__ = (
        Index("idx_users_role", "role"),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, phone={self.phone}, role={self.role.value})>"
