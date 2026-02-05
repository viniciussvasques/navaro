"""Mercado Pago payment provider implementation (Mocked/PIX)."""

import secrets
from typing import Any
from uuid import UUID

from app.services.payment_providers.base import PaymentProvider


class MercadoPagoProvider(PaymentProvider):
    """Mercado Pago payment provider (PIX focus)."""

    def __init__(self, access_token: str | None = None):
        self.access_token = access_token or "MOCK_MP_TOKEN"

    async def create_intent(
        self, user_id: UUID, amount: float, metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """Create a PIX payment intent in Mercado Pago."""
        # In a real implementation, we would use mercadopago SDK:
        # sdk = mercadopago.SDK(self.access_token)
        # payment_data = {
        #     "transaction_amount": amount,
        #     "payment_method_id": "pix",
        #     "payer": {"email": "user@example.com"},
        #     "metadata": metadata
        # }
        # result = sdk.payment().create(payment_data)

        # Mocking the response
        payment_id = f"mp_{secrets.token_hex(8)}"

        return {
            "provider_payment_id": payment_id,
            "qr_code": "00020101021226850014br.gov.bcb.pix...",  # Mock PIX copy/paste
            "qr_code_base64": "iVBORw0KGgoAAAANSUhEUg...",  # Mock QR Base64
            "provider": "mercadopago",
            "status": "pending",
            "client_secret": payment_id,  # For MP we use ID to check status or webhook
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
