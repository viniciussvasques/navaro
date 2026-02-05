"""Staff member model."""

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import JSON, Boolean, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.establishment import Establishment


class StaffMember(BaseModel):
    """
    Staff member model.

    Represents an employee of an establishment.
    """

    __tablename__ = "staff_members"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        doc="Linked user account (optional)",
    )

    # ─── Staff Info ────────────────────────────────────────────────────────────

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Staff member name",
    )

    phone: Mapped[str | None] = mapped_column(
        String(20),
        doc="Phone number",
    )

    role: Mapped[str] = mapped_column(
        String(100),
        default="barbeiro",
        nullable=False,
        doc="Role (barbeiro, cabeleireiro, etc.)",
    )

    avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        doc="Profile picture URL",
    )

    # ─── Schedule & Commission ─────────────────────────────────────────────────

    work_schedule: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        doc="Work schedule by day of week",
    )

    commission_rate: Mapped[float | None] = mapped_column(
        Numeric(5, 2),
        doc="Internal commission percentage",
    )

    # ─── Status ────────────────────────────────────────────────────────────────

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Is staff member active",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    establishment: Mapped["Establishment"] = relationship(
        "Establishment",
        back_populates="staff_members",
    )

    user = relationship(
        "User",
        foreign_keys=[user_id],
    )

    services = relationship(
        "Service",
        secondary="service_staff",
        back_populates="staff_members",
    )

    appointments = relationship(
        "Appointment",
        back_populates="staff",
    )

    portfolio_images = relationship(
        "PortfolioImage",
        back_populates="staff",
    )

    tips_received = relationship(
        "Tip",
        back_populates="staff",
    )

    favorite_by = relationship(
        "FavoriteStaff",
        back_populates="staff",
    )

    def __repr__(self) -> str:
        return f"<StaffMember(id={self.id}, name={self.name}, role={self.role})>"
