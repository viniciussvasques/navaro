"""Mercado Pago payment provider implementation (Mocked/PIX)."""

import secrets
from typing import Any
from uuid import UUID

from app.services.payment_providers.base import PaymentProvider


class MercadoPagoProvider(PaymentProvider):
    """Mercado Pago payment provider (PIX focus)."""

    def __init__(self, access_token: str | None = None):
        # Dynamic config (admin) or mock token for development
        self.access_token = (access_token or "").strip() or "MOCK_MP_TOKEN"

    async def create_intent(
        self, user_id: UUID, amount: float, metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """Create a PIX payment intent in Mercado Pago (Split Marketplace)."""
        # In a real Marketplace implementation:
        # application_fee = metadata.get("application_fee")
        # seller_id = metadata.get("seller_id")

        # sdk = mercadopago.SDK(self.access_token)
        # payment_data = {
        #     "transaction_amount": amount,
        #     "application_fee": application_fee, # platform commission
        #     "payment_method_id": "pix",
        #     "payer": {"email": "..."},
        #     "metadata": metadata
        # }
        # result = sdk.payment().create(payment_data, {"X-Idempotency-Key": ...})

        # Mocking the response with split context
        payment_id = f"mp_{secrets.token_hex(8)}"

        # Log the split for operational transparency (visible in our new Live Logs!)
        from app.core.logging import get_logger

        logger = get_logger(__name__)
        logger.info(
            "MercadoPago: Intent created with split",
            total=amount,
            commission=metadata.get("application_fee"),
            seller=metadata.get("seller_id"),
        )

        return {
            "provider_payment_id": payment_id,
            "qr_code": "00020101021226850014br.gov.bcb.pix...",  # Mock PIX
            "qr_code_base64": "iVBORw0KGgoAAAANSUhEUg...",
            "provider": "mercadopago",
            "status": "pending",
            "client_secret": payment_id,
        }

    async def handle_webhook(self, data: dict[str, Any]) -> dict[str, Any] | None:
        """Handle Mercado Pago webhook."""
        # MP webhooks usually have 'action' and 'data.id'
        action = data.get("action")
        if action == "payment.updated":
            # Real impl would fetch payment status from API
            # For mock, we check if some property says it's approved
            status = data.get("data", {}).get("status")
            if status == "approved":
                return {
                    "provider_payment_id": data["data"]["id"],
                    "status": "succeeded",
                    "metadata": data.get("metadata", {}),  # In MP you fetch this
                    "amount": data.get("transaction_amount", 0),
                }

        return None

    async def refund(self, payment_id: str, amount: float | None = None) -> bool:
        """Refund a Mercado Pago payment."""
        return True  # Mock success
