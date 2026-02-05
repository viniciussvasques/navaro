"""Payment provider factory."""

from app.services.payment_providers.base import PaymentProvider
from app.services.payment_providers.mercadopago_p import MercadoPagoProvider
from app.services.payment_providers.stripe_p import StripeProvider


class PaymentProviderFactory:
    """Factory for payment providers."""

    _providers: dict[str, type[PaymentProvider]] = {
        "stripe": StripeProvider,
        "mercadopago": MercadoPagoProvider,
    }

    @classmethod
    def get_provider(cls, name: str) -> PaymentProvider:
        """Get provider instance by name."""
        provider_cls = cls._providers.get(name.lower())
        if not provider_cls:
            raise ValueError(f"Provedor de pagamento '{name}' não suportado.")
        return provider_cls()
