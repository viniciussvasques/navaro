"""Models package - export all models."""

# Base
from app.models.base import BaseModel

# User
from app.models.user import User, UserRole

# Establishment
from app.models.establishment import (
    Establishment,
    EstablishmentCategory,
    EstablishmentStatus,
    SubscriptionTier,
)

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
    SubscriptionPlan,
    SubscriptionPlanItem,
    Subscription,
    SubscriptionUsage,
    SubscriptionStatus,
)

# Appointment
from app.models.appointment import (
    Appointment,
    Checkin,
    AppointmentProduct,
    AppointmentStatus,
    PaymentType,
)

# Queue
from app.models.queue import QueueEntry, QueueStatus

# Review & Favorites
from app.models.review import Review, Favorite, FavoriteStaff

# Payment
from app.models.payment import (
    Payment,
    Tip,
    Payout,
    PaymentStatus,
    PaymentPurpose,
)

# Portfolio
from app.models.portfolio import PortfolioImage, SearchHistory

# Product
from app.models.product import Product

# Plugin
from app.models.plugin import EstablishmentPlugin, AdCampaign

# Notification
from app.models.notification import Notification, NotificationType

# User Debt
from app.models.user_debt import UserDebt, DebtStatus

# Wallet
from app.models.wallet import UserWallet, WalletTransaction, TransactionType, TransactionStatus

# System Settings
from app.models.system_settings import SystemSettings, SettingsKeys


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
