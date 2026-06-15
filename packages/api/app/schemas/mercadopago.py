"""Mercado Pago OAuth schemas."""

from datetime import datetime

from pydantic import BaseModel


class MercadoPagoOAuthUrlResponse(BaseModel):
    authorize_url: str


class MercadoPagoConnectResponse(BaseModel):
    connected: bool
    mercadopago_user_id: str | None = None
    connected_at: datetime | None = None
    split_enabled: bool = False
