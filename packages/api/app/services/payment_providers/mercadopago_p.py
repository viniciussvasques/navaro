"""Mercado Pago payment provider — real implementation (PIX + Card)."""

import hashlib
import hmac
from typing import Any
from uuid import UUID

import httpx

from app.core.logging import get_logger
from app.services.payment_providers.base import PaymentProvider

logger = get_logger(__name__)

MP_API = "https://api.mercadopago.com"


def verify_mercadopago_webhook_signature(
    x_signature: str | None,
    x_request_id: str | None,
    data_id: str,
    secret: str,
) -> bool:
    """
    Validate Mercado Pago webhook x-signature header (HMAC-SHA256).
    See: https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
    """
    if not secret or not x_signature or not x_request_id or not data_id:
        return False

    parts: dict[str, str] = {}
    for segment in x_signature.split(","):
        if "=" in segment:
            key, value = segment.split("=", 1)
            parts[key.strip()] = value.strip()

    ts = parts.get("ts")
    v1 = parts.get("v1")
    if not ts or not v1:
        return False

    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(v1, expected)


class MercadoPagoProvider(PaymentProvider):
    """Mercado Pago payment provider (PIX + Card)."""

    def __init__(self, access_token: str | None = None):
        self.access_token = (access_token or "").strip()
        if not self.access_token:
            raise ValueError(
                "Mercado Pago access_token nao configurado. "
                "Configure em Admin > Configuracoes > Pagamentos."
            )

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": "",
        }

    async def create_intent(
        self, user_id: UUID, amount: float, metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """Create a PIX payment in Mercado Pago."""
        import secrets

        idempotency_key = f"dunnaa_{secrets.token_hex(16)}"

        payment_data: dict[str, Any] = {
            "transaction_amount": round(amount, 2),
            "payment_method_id": "pix",
            "payer": {
                "email": metadata.get("payer_email", "cliente@dunnaa.com.br"),
            },
            "description": f"Agendamento Dunnaa - {metadata.get('establishment_name', 'Servico')}",
            "metadata": {
                "purpose": metadata.get("purpose", "appointment"),
                "appointment_id": metadata.get("appointment_id", ""),
                "user_id": str(user_id),
                "establishment_id": metadata.get("establishment_id", ""),
                "debt_ids": metadata.get("debt_ids", ""),
                "is_deposit": metadata.get("is_deposit", "false"),
                "recovered_fees": metadata.get("recovered_fees", "0"),
            },
            "notification_url": metadata.get("webhook_url", ""),
        }

        # Marketplace PIX: platform token + collector_id + application_fee
        application_fee = metadata.get("application_fee")
        collector_id = metadata.get("collector_id")

        if application_fee and collector_id:
            payment_data["collector_id"] = int(collector_id)
            payment_data["application_fee"] = round(float(application_fee), 2)

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotency_key,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{MP_API}/v1/payments",
                    json=payment_data,
                    headers=headers,
                )

                if response.status_code in (200, 201):
                    data = response.json()
                    payment_id = str(data["id"])

                    # Extract PIX data
                    pix_data = (
                        data.get("point_of_interaction", {})
                        .get("transaction_data", {})
                    )
                    qr_code = pix_data.get("qr_code", "")
                    qr_code_base64 = pix_data.get("qr_code_base64", "")
                    ticket_url = pix_data.get("ticket_url", "")

                    logger.info(
                        "MercadoPago: Payment created",
                        payment_id=payment_id,
                        amount=amount,
                        status=data.get("status"),
                    )

                    return {
                        "provider_payment_id": payment_id,
                        "qr_code": qr_code,
                        "qr_code_base64": qr_code_base64,
                        "ticket_url": ticket_url,
                        "provider": "mercadopago",
                        "status": data.get("status", "pending"),
                        "client_secret": payment_id,
                    }
                else:
                    error_body = response.text[:500]
                    logger.error(
                        "MercadoPago: Payment creation failed",
                        status_code=response.status_code,
                        response=error_body,
                    )
                    raise ValueError(
                        f"Erro ao criar pagamento no Mercado Pago: {response.status_code}"
                    )

        except httpx.HTTPError as e:
            logger.error("MercadoPago: HTTP error", error=str(e))
            raise ValueError(f"Erro de conexao com Mercado Pago: {e}")

    async def create_checkout_preference(
        self, user_id: UUID, amount: float, metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Create a Checkout Pro preference (supports card, PIX, boleto).
        Returns a checkout URL that opens in the user's browser.
        """
        import secrets

        idempotency_key = f"dunnaa_pref_{secrets.token_hex(16)}"

        preference_data = {
            "items": [
                {
                    "title": f"Agendamento - {metadata.get('establishment_name', 'Servico')}",
                    "quantity": 1,
                    "unit_price": round(amount, 2),
                    "currency_id": "BRL",
                }
            ],
            "payer": {
                "email": metadata.get("payer_email", "cliente@dunnaa.com.br"),
            },
            "back_urls": {
                "success": metadata.get("success_url", "https://dunnaa.com.br/pagamento/sucesso"),
                "failure": metadata.get("failure_url", "https://dunnaa.com.br/pagamento/falha"),
                "pending": metadata.get("pending_url", "https://dunnaa.com.br/pagamento/pendente"),
            },
            "auto_return": "approved",
            "notification_url": metadata.get("webhook_url", ""),
            "external_reference": metadata.get("appointment_id", ""),
            "metadata": {
                "purpose": metadata.get("purpose", "appointment"),
                "appointment_id": metadata.get("appointment_id", ""),
                "user_id": str(user_id),
                "establishment_id": metadata.get("establishment_id", ""),
                "debt_ids": metadata.get("debt_ids", ""),
                "is_deposit": metadata.get("is_deposit", "false"),
                "recovered_fees": metadata.get("recovered_fees", "0"),
            },
            "payment_methods": {
                "excluded_payment_types": [],
                "installments": 3,  # Up to 3 installments
            },
        }

        # Marketplace split
        application_fee = metadata.get("application_fee")
        seller_token = metadata.get("seller_access_token")
        collector_id = metadata.get("collector_id")

        auth_token = seller_token if seller_token else self.access_token

        if application_fee:
            fee = round(float(application_fee), 2)
            preference_data["marketplace_fee"] = fee

        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotency_key,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{MP_API}/checkout/preferences",
                    json=preference_data,
                    headers=headers,
                )

                if response.status_code in (200, 201):
                    data = response.json()
                    preference_id = str(data["id"])
                    checkout_url = data.get("init_point", "")
                    sandbox_url = data.get("sandbox_init_point", "")

                    logger.info(
                        "MercadoPago: Checkout preference created",
                        preference_id=preference_id,
                        amount=amount,
                    )

                    return {
                        "provider_payment_id": preference_id,
                        "checkout_url": checkout_url,
                        "sandbox_url": sandbox_url,
                        "provider": "mercadopago",
                        "status": "pending",
                        "client_secret": preference_id,
                    }
                else:
                    error_body = response.text[:500]
                    logger.error(
                        "MercadoPago: Preference creation failed",
                        status_code=response.status_code,
                        response=error_body,
                    )
                    raise ValueError(
                        f"Erro ao criar checkout Mercado Pago: {response.status_code}"
                    )

        except httpx.HTTPError as e:
            logger.error("MercadoPago: HTTP error in preference", error=str(e))
            raise ValueError(f"Erro de conexao com Mercado Pago: {e}")

    async def get_payment_status(self, payment_id: str) -> dict[str, Any]:
        """Check payment status in Mercado Pago."""
        headers = {
            "Authorization": f"Bearer {self.access_token}",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{MP_API}/v1/payments/{payment_id}",
                headers=headers,
            )

            if response.status_code == 200:
                data = response.json()
                meta = data.get("metadata", {}) or {}
                if data.get("external_reference") and not meta.get("appointment_id"):
                    meta = {**meta, "appointment_id": data["external_reference"]}
                return {
                    "id": str(data["id"]),
                    "status": data["status"],
                    "status_detail": data.get("status_detail", ""),
                    "amount": data.get("transaction_amount", 0),
                    "metadata": meta,
                }

            raise ValueError(f"Erro ao consultar pagamento: {response.status_code}")

    async def search_approved_by_external_reference(self, external_reference: str) -> dict[str, Any] | None:
        """Find an approved payment linked to a Checkout Pro preference (external_reference)."""
        headers = {"Authorization": f"Bearer {self.access_token}"}
        params = {
            "external_reference": external_reference,
            "sort": "date_created",
            "criteria": "desc",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{MP_API}/v1/payments/search",
                headers=headers,
                params=params,
            )

        if response.status_code != 200:
            return None

        results = response.json().get("results", [])
        for item in results:
            if item.get("status") == "approved":
                return {
                    "id": str(item["id"]),
                    "status": item["status"],
                    "status_detail": item.get("status_detail", ""),
                    "amount": item.get("transaction_amount", 0),
                    "metadata": item.get("metadata", {}),
                }
        return None

    async def handle_webhook(self, data: dict[str, Any]) -> dict[str, Any] | None:
        """Handle Mercado Pago webhook (IPN)."""
        action = data.get("action") or data.get("type")
        mp_data = data.get("data", {})
        payment_id = str(mp_data.get("id", ""))

        if not payment_id:
            logger.warning("MercadoPago webhook: no payment id", data=data)
            return None

        # For payment notifications, fetch the real status from API
        if action in ("payment.created", "payment.updated", "payment"):
            try:
                status_data = await self.get_payment_status(payment_id)

                logger.info(
                    "MercadoPago webhook: payment status",
                    payment_id=payment_id,
                    status=status_data["status"],
                )

                if status_data["status"] == "approved":
                    return {
                        "provider_payment_id": payment_id,
                        "status": "succeeded",
                        "metadata": status_data.get("metadata", {}),
                        "amount": status_data.get("amount", 0),
                    }
                elif status_data["status"] in ("rejected", "cancelled"):
                    return {
                        "provider_payment_id": payment_id,
                        "status": "failed",
                        "metadata": status_data.get("metadata", {}),
                        "amount": 0,
                    }
            except Exception as e:
                logger.error(
                    "MercadoPago webhook: error fetching status",
                    payment_id=payment_id,
                    error=str(e),
                )

        return None

    async def refund(self, payment_id: str, amount: float | None = None) -> bool:
        """Refund a Mercado Pago payment (full or partial)."""
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        body: dict[str, Any] = {}
        if amount is not None:
            body["amount"] = round(amount, 2)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{MP_API}/v1/payments/{payment_id}/refunds",
                    json=body if body else None,
                    headers=headers,
                )

                if response.status_code in (200, 201):
                    logger.info(
                        "MercadoPago: Refund successful",
                        payment_id=payment_id,
                        amount=amount,
                    )
                    return True
                else:
                    logger.error(
                        "MercadoPago: Refund failed",
                        payment_id=payment_id,
                        status=response.status_code,
                        response=response.text[:300],
                    )
                    return False

        except Exception as e:
            logger.error("MercadoPago: Refund error", error=str(e))
            return False
