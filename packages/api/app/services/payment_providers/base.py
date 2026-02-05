"""Base payment provider interface."""

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class PaymentProvider(ABC):
    """Abstract base class for payment providers."""

    @abstractmethod
    async def create_intent(
        self, user_id: UUID, amount: float, metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """Create a payment intent/order."""

    @abstractmethod
    async def handle_webhook(self, data: dict[str, Any]) -> dict[str, Any] | None:
        """
        Handle provider webhook.
        Returns a dict with normalized status and metadata if successful.
        """

    @abstractmethod
    async def refund(self, payment_id: str, amount: float | None = None) -> bool:
        """Refund a payment."""
