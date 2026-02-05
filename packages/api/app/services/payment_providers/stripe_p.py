"""Stripe payment provider implementation."""

from typing import Any
from uuid import UUID

import stripe

from app.config import settings
from app.services.payment_providers.base import PaymentProvider


class StripeProvider(PaymentProvider):
    """Stripe payment provider."""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    async def create_intent(
        self, user_id: UUID, amount: float, metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """Create a Stripe payment intent."""
        amount_cents = int(amount * 100)

        intent = stripe.PaymentIntent.create(amount=amount_cents, currency="brl", metadata=metadata)

        return {
            "provider_payment_id": intent.id,
            "client_secret": intent.client_secret,
            "provider": "stripe",
            "raw_data": intent,
        }

    async def handle_webhook(self, data: dict[str, Any]) -> dict[str, Any] | None:
        """Handle Stripe webhook data."""
        # The data here is expected to be the 'event' object from a FastAPI request
        event_type = data.get("type")

        if event_type == "payment_intent.succeeded":
            intent = data["data"]["object"]
            return {
                "provider_payment_id": intent["id"],
                "status": "succeeded",
                "metadata": intent.get("metadata", {}),
                "amount": intent.get("amount", 0) / 100,
            }

        return None

    async def refund(self, payment_id: str, amount: float | None = None) -> bool:
        """Refund a Stripe payment."""
        try:
            if amount:
                stripe.Refund.create(payment_intent=payment_id, amount=int(amount * 100))
            else:
                stripe.Refund.create(payment_intent=payment_id)
            return True
        except Exception:
            return False
