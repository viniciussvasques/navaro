"""
Auto-payout service.

When a payment is confirmed (PIX paid), this service automatically:
1. Calculates the platform fee (based on establishment tier)
2. Transfers the net amount to the establishment's PIX key via Mercado Pago
3. Records a Payout entry with all details

Flow:
  Customer pays R$100 via PIX
  → Platform fee = 6% = R$6.00  (based on tier)
  → Gateway fee ≈ 0.99% = R$0.99  (MP's own fee for PIX transfer)
  → Establishment receives: R$100 - R$6.00 - R$0.99 = R$93.01
  → The R$6.00 stays in the platform's MP account

Transfer is done via Mercado Pago's PIX Transfer API.
"""

from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.models.establishment import Establishment
from app.models.payment import Payment, PaymentStatus, Payout, PayoutStatus

logger = get_logger(__name__)

MP_API = "https://api.mercadopago.com"


class AutoPayoutService:
    """Handles automatic payouts to establishments after payment confirmation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_auto_payout(self, payment_id: UUID) -> dict | None:
        """
        Process automatic payout for a confirmed payment.
        Returns payout details or None if not applicable.
        """
        # 1. Load payment with establishment
        query = (
            select(Payment)
            .where(Payment.id == payment_id, Payment.status == PaymentStatus.succeeded)
            .options(selectinload(Payment.establishment))
        )
        result = await self.db.execute(query)
        payment = result.scalar_one_or_none()

        if not payment:
            logger.warning("AutoPayout: Payment not found or not succeeded", payment_id=str(payment_id))
            return None

        establishment = payment.establishment
        if not establishment:
            logger.warning("AutoPayout: No establishment for payment", payment_id=str(payment_id))
            return None

        # 2. Check if auto-payout is enabled for this establishment
        if not establishment.auto_payout_enabled:
            logger.info(
                "AutoPayout: Disabled for establishment",
                establishment_id=str(establishment.id),
            )
            return None

        # 3. Check if establishment has PIX key configured
        if not establishment.pix_key:
            logger.warning(
                "AutoPayout: No PIX key configured",
                establishment_id=str(establishment.id),
            )
            return None

        # 4. Check if payout already exists for this payment
        existing = await self.db.execute(
            select(Payout).where(Payout.payment_id == payment_id)
        )
        if existing.scalar_one_or_none():
            logger.info("AutoPayout: Payout already exists", payment_id=str(payment_id))
            return None

        # 5. Calculate amounts
        total_amount = float(payment.amount or 0)
        platform_fee = float(payment.platform_fee or 0)
        gateway_fee = float(payment.gateway_fee or 0)
        net_to_establishment = total_amount - platform_fee - gateway_fee

        if net_to_establishment <= 0:
            logger.warning(
                "AutoPayout: Net amount <= 0",
                total=total_amount,
                platform_fee=platform_fee,
                gateway_fee=gateway_fee,
            )
            return None

        # 6. Get platform MP token
        from app.models.system_settings import SettingsKeys
        from app.services.settings_service import SettingsService

        settings_svc = SettingsService(self.db)
        mp_token = await settings_svc.get(SettingsKeys.MERCADOPAGO_ACCESS_TOKEN) or ""

        if not mp_token:
            logger.error("AutoPayout: MP access token not configured")
            # Create payout as pending for manual processing
            payout = Payout(
                establishment_id=establishment.id,
                amount=net_to_establishment,
                status=PayoutStatus.pending,
                provider="manual",
                payment_id=payment_id,
                platform_fee=platform_fee,
                pix_key_used=establishment.pix_key,
                is_auto=True,
            )
            self.db.add(payout)
            await self.db.commit()
            return {
                "payout_id": str(payout.id),
                "amount": net_to_establishment,
                "status": "pending",
                "reason": "MP token not configured — manual transfer needed",
            }

        # 7. Execute PIX transfer via Mercado Pago
        payout = Payout(
            establishment_id=establishment.id,
            amount=net_to_establishment,
            status=PayoutStatus.processing,
            provider="mercadopago",
            payment_id=payment_id,
            platform_fee=platform_fee,
            pix_key_used=establishment.pix_key,
            is_auto=True,
        )
        self.db.add(payout)
        await self.db.flush()  # Get payout ID

        try:
            transfer_result = await self._transfer_via_pix(
                mp_token=mp_token,
                amount=net_to_establishment,
                pix_key=establishment.pix_key,
                pix_key_type=establishment.pix_key_type or "email",
                holder_name=establishment.bank_holder_name or establishment.name,
                description=f"Repasse Dunnaa - Pagamento #{str(payment_id)[:8]}",
            )

            payout.provider_payout_id = transfer_result.get("id", "")
            payout.status = PayoutStatus.succeeded
            payout.paid_at = __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            )

            await self.db.commit()

            logger.info(
                "AutoPayout: SUCCESS",
                payout_id=str(payout.id),
                amount=net_to_establishment,
                pix_key=establishment.pix_key,
                mp_transfer_id=transfer_result.get("id"),
            )

            return {
                "payout_id": str(payout.id),
                "amount": net_to_establishment,
                "status": "succeeded",
                "provider_id": transfer_result.get("id"),
            }

        except Exception as e:
            logger.error(
                "AutoPayout: Transfer FAILED",
                payout_id=str(payout.id),
                error=str(e),
            )
            payout.status = PayoutStatus.failed
            await self.db.commit()

            return {
                "payout_id": str(payout.id),
                "amount": net_to_establishment,
                "status": "failed",
                "error": str(e),
            }

    async def _transfer_via_pix(
        self,
        mp_token: str,
        amount: float,
        pix_key: str,
        pix_key_type: str,
        holder_name: str,
        description: str,
    ) -> dict:
        """
        Execute a PIX transfer via Mercado Pago disbursement API.

        MP has two ways to do this:
        1. Bank Transfer API (POST /v1/disbursements) - for marketplace accounts
        2. PIX Payment (POST /v1/payments) with payment_method_id=pix + payer/payee

        For simplicity and reliability, we use the disbursement/bank-transfer endpoint.
        If that's not available, we fall back to creating a PIX payment to the key.
        """
        import secrets

        idempotency_key = f"payout_{secrets.token_hex(16)}"

        headers = {
            "Authorization": f"Bearer {mp_token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotency_key,
        }

        # Map PIX key type to MP format
        pix_type_map = {
            "cpf": "CPF",
            "cnpj": "CNPJ",
            "email": "EMAIL",
            "phone": "PHONE",
            "random": "EVP",
        }
        mp_pix_type = pix_type_map.get(pix_key_type, "EMAIL")

        # Use Mercado Pago's Bank Transfer / Disbursement endpoint
        transfer_data = {
            "amount": round(amount, 2),
            "payment_method_id": "pix",
            "description": description,
            "point_of_interaction": {
                "type": "PIX_TRANSFER",
                "transaction_data": {
                    "bank_info": {
                        "pix": {
                            "type": mp_pix_type,
                            "id": pix_key,
                        }
                    }
                },
            },
            "metadata": {
                "source": "dunnaa_auto_payout",
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try disbursement endpoint first
            response = await client.post(
                f"{MP_API}/v1/transaction_intentions",
                json=transfer_data,
                headers=headers,
            )

            if response.status_code in (200, 201):
                data = response.json()
                return {"id": str(data.get("id", "")), "status": data.get("status", "pending")}

            # Fallback: try the withdrawal/bank_report endpoint
            # This is a secondary approach if the main one isn't available
            withdraw_data = {
                "amount": round(amount, 2),
                "bank_account_id": None,
                "pix_key": pix_key,
                "pix_key_type": mp_pix_type,
                "description": description,
            }

            response2 = await client.post(
                f"{MP_API}/v1/money-out/bank-transfer",
                json=withdraw_data,
                headers=headers,
            )

            if response2.status_code in (200, 201):
                data2 = response2.json()
                return {"id": str(data2.get("id", "")), "status": "processing"}

            # If both fail, raise with detailed error
            error_detail = response.text[:300]
            logger.error(
                "PIX Transfer failed",
                status_primary=response.status_code,
                status_fallback=response2.status_code,
                detail=error_detail,
            )
            raise ValueError(
                f"Falha na transferencia PIX: {response.status_code} - {error_detail}"
            )
