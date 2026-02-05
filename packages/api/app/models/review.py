"""Review and Favorite models."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.establishment import Establishment
    from app.models.staff import StaffMember
    from app.models.user import User


class Review(BaseModel):
    """
    Review model.

    Represents a customer review of an appointment.
    """

    __tablename__ = "reviews"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="Reviewer user ID",
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    staff_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        doc="Staff member reviewed (optional)",
    )

    appointment_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("appointments.id"),
        unique=True,
        doc="Related appointment (optional)",
    )

    # ─── Review Content ────────────────────────────────────────────────────────

    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Rating (1-5 stars)",
    )

    comment: Mapped[str | None] = mapped_column(
        String(1000),
        doc="Review comment",
    )

    # ─── Owner Response ────────────────────────────────────────────────────────

    owner_response: Mapped[str | None] = mapped_column(
        String(1000),
        doc="Owner response to review",
    )

    owner_responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        doc="When owner responded",
    )

    # ─── Google Integration ────────────────────────────────────────────────────

    approved_for_google: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Approved by owner for Google",
    )

    sent_to_google: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Has been sent to Google",
    )

    google_review_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Google review ID",
    )

    sent_to_google_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        doc="When sent to Google",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user: Mapped["User"] = relationship(
        "User",
        back_populates="reviews",
    )

    establishment: Mapped["Establishment"] = relationship(
        "Establishment",
        back_populates="reviews",
    )

    staff: Mapped["StaffMember | None"] = relationship(
        "StaffMember",
    )

    appointment: Mapped["Appointment | None"] = relationship(
        "Appointment",
        back_populates="review",
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────

    __table_args__ = (Index("idx_reviews_establishment_rating", "establishment_id", "rating"),)

    def __repr__(self) -> str:
        return f"<Review(id={self.id}, rating={self.rating})>"


class Favorite(BaseModel):
    """
    Favorite establishment model.

    Represents a user's favorite establishment.
    """

    __tablename__ = "favorites"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="User ID",
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user: Mapped["User"] = relationship(
        "User",
        back_populates="favorites",
    )

    establishment = relationship(
        "Establishment",
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────

    __table_args__ = (Index("idx_favorites_unique", "user_id", "establishment_id", unique=True),)


class FavoriteStaff(BaseModel):
    """
    Favorite staff member model.

    Represents a user's favorite professional.
    """

    __tablename__ = "favorite_staff"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="User ID",
    )

    staff_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        nullable=False,
        index=True,
        doc="Staff member ID",
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user = relationship(
        "User",
    )

    staff: Mapped["StaffMember"] = relationship(
        "StaffMember",
        back_populates="favorite_by",
    )

    establishment = relationship(
        "Establishment",
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────

    __table_args__ = (Index("idx_favorite_staff_unique", "user_id", "staff_id", unique=True),)
