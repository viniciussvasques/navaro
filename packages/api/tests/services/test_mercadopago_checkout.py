"""Tests for Mercado Pago checkout and webhook security."""

import hashlib
import hmac

import pytest

from app.services.payment_providers.mercadopago_p import verify_mercadopago_webhook_signature


def test_verify_mercadopago_webhook_signature_valid():
    secret = "test-webhook-secret"
    data_id = "12345"
    x_request_id = "req-abc"
    ts = "1704908010"
    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    v1 = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    x_signature = f"ts={ts},v1={v1}"

    assert verify_mercadopago_webhook_signature(
        x_signature, x_request_id, data_id, secret
    )


def test_verify_mercadopago_webhook_signature_invalid():
    assert not verify_mercadopago_webhook_signature(
        "ts=1,v1=bad", "req-abc", "12345", "secret"
    )


def test_verify_mercadopago_webhook_signature_skips_when_no_secret():
    assert not verify_mercadopago_webhook_signature("ts=1,v1=x", "req", "1", "")
