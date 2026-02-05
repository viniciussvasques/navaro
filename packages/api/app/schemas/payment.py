"""Payment schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.payment import PaymentPurpose, PaymentStatus


class CreatePaymentIntentRequest(BaseModel):
    """Request to create payment intent."""

    appointment_id: UUID
    provider: str = "stripe"


class CreatePaymentIntentResponse(BaseModel):
    """Payment intent response."""

    amount: float
    provider: str
    provider_payment_id: str
    client_secret: str | None = None
    qr_code: str | None = None
    qr_code_base64: str | None = None


class PaymentResponse(BaseModel):
    """Payment response schema."""

    id: UUID
    user_id: UUID
    establishment_id: UUID
    appointment_id: UUID | None
    subscription_id: UUID | None
    purpose: PaymentPurpose
    amount: float
    platform_fee: float
    gateway_fee: float
    net_amount: float
    status: PaymentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class TipCreate(BaseModel):
    """Request to give a tip."""

    amount: float
    staff_id: UUID
    appointment_id: UUID | None = None


class TipResponse(BaseModel):
    """Tip response schema."""

    id: UUID
    user_id: UUID
    staff_id: UUID
    establishment_id: UUID
    appointment_id: UUID | None
    amount: float
    status: PaymentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class WalletTransactionResponse(BaseModel):
    """Wallet transaction response."""

    id: UUID
    type: str
    amount: float
    status: str
    description: str | None
    reference_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WalletResponse(BaseModel):
    """Wallet response."""

    id: UUID
    balance: float
    transactions: list[WalletTransactionResponse] = []

    model_config = {"from_attributes": True}
