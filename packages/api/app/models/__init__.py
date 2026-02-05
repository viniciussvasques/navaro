"""Models package - export all models."""

# Base
# Appointment
from app.models.appointment import (
    Appointment,
    AppointmentProduct,
    AppointmentStatus,
    Checkin,
    PaymentType,
)
from app.models.base import BaseModel

# Establishment
from app.models.establishment import (
    Establishment,
    EstablishmentCategory,
    EstablishmentStatus,
    SubscriptionTier,
)

# Notification
from app.models.notification import Notification, NotificationType

# Payment
from app.models.payment import (
    Payment,
    PaymentPurpose,
    PaymentStatus,
    Payout,
    Tip,
)

# Plugin
from app.models.plugin import AdCampaign, EstablishmentPlugin

# Portfolio
from app.models.portfolio import PortfolioImage, SearchHistory

# Product
from app.models.product import Product

# Queue
from app.models.queue import QueueEntry, QueueStatus

# Review & Favorites
from app.models.review import Favorite, FavoriteStaff, Review

# Service
from app.models.service import (
    Service,
    ServiceBundle,
    ServiceBundleItem,
    service_staff,
)

# Staff
from app.models.staff import StaffMember
from app.models.staff_block import StaffBlock

# Subscription
from app.models.subscription import (
    Subscription,
    SubscriptionPlan,
    SubscriptionPlanItem,
    SubscriptionStatus,
    SubscriptionUsage,
)

# System Settings
from app.models.system_settings import SettingsKeys, SystemSettings

# User
from app.models.user import User, UserRole

# User Debt
from app.models.user_debt import DebtStatus, UserDebt

# Wallet
from app.models.wallet import TransactionStatus, TransactionType, UserWallet, WalletTransaction

__all__ = [
    # Base
    "BaseModel",
    # User
    "User",
    "UserRole",
    # Establishment
    "Establishment",
    "EstablishmentCategory",
    "EstablishmentStatus",
    "SubscriptionTier",
    # Service
    "Service",
    "ServiceBundle",
    "ServiceBundleItem",
    "service_staff",
    # Staff
    "StaffMember",
    "StaffBlock",
    # Subscription
    "SubscriptionPlan",
    "SubscriptionPlanItem",
    "Subscription",
    "SubscriptionUsage",
    "SubscriptionStatus",
    # Appointment
    "Appointment",
    "Checkin",
    "AppointmentStatus",
    "PaymentType",
    # Queue
    "QueueEntry",
    "QueueStatus",
    # Review
    "Review",
    "Favorite",
    "FavoriteStaff",
    # Payment
    "Payment",
    "Tip",
    "Payout",
    "PaymentStatus",
    "PaymentPurpose",
    # Portfolio
    "PortfolioImage",
    "SearchHistory",
    # Plugin
    "EstablishmentPlugin",
    "AdCampaign",
    # Notification
    "Notification",
    "NotificationType",
    # Wallet
    "UserWallet",
    "WalletTransaction",
    "TransactionType",
    "TransactionStatus",
]
