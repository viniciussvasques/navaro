"""Tests for Mercado Pago OAuth marketplace helpers."""

from types import SimpleNamespace

from app.services.mercadopago_oauth_service import MercadoPagoOAuthService


def test_marketplace_payment_fields_with_oauth():
    est = SimpleNamespace(
        mercadopago_user_id="123456789",
        mercadopago_access_token="APP_USR-seller-token",
    )
    fields = MercadoPagoOAuthService.marketplace_payment_fields(est, 5.50)
    assert fields["application_fee"] == "5.5"
    assert fields["collector_id"] == "123456789"
    assert fields["seller_access_token"] == "APP_USR-seller-token"


def test_marketplace_payment_fields_without_oauth():
    est = SimpleNamespace(mercadopago_user_id=None, mercadopago_access_token=None)
    fields = MercadoPagoOAuthService.marketplace_payment_fields(est, 10.0)
    assert fields == {"application_fee": "10.0"}
