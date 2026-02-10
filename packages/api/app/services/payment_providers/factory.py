"""Payment provider factory."""

from app.services.payment_providers.base import PaymentProvider
from app.services.payment_providers.mercadopago_p import MercadoPagoProvider
from app.services.payment_providers.stripe_p import StripeProvider


class PaymentProviderFactory:
    """Factory for payment providers. Credentials from admin (SettingsService) can be passed for dynamic config."""

    _providers: dict[str, type[PaymentProvider]] = {
        "stripe": StripeProvider,
        "mercadopago": MercadoPagoProvider,
    }

    @classmethod
    def get_provider(
        cls,
        name: str,
        *,
        stripe_secret_key: str | None = None,
        mercadopago_access_token: str | None = None,
    ) -> PaymentProvider:
        """Get provider instance by name. Pass credentials from SettingsService for dynamic config."""
        provider_cls = cls._providers.get(name.lower())
        if not provider_cls:
            raise ValueError(f"Provedor de pagamento '{name}' não suportado.")
        if name.lower() == "stripe":
            return provider_cls(secret_key=stripe_secret_key)
        if name.lower() == "mercadopago":
            return provider_cls(access_token=mercadopago_access_token)
        return provider_cls()
