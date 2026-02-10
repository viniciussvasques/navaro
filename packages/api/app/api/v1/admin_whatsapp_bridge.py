"""Admin: proxy para o WhatsApp Bridge (QR e status)."""

import httpx
from fastapi import APIRouter, HTTPException

from app.api.deps import AdminUser
from app.core.config import settings

router = APIRouter(prefix="/admin/whatsapp-bridge", tags=["Admin WhatsApp Bridge"])

BRIDGE_TIMEOUT = 8.0


def _bridge_url(path: str) -> str:
    base = (settings.WHATSAPP_BRIDGE_URL or "").rstrip("/")
    return f"{base}{path}"


async def _get_bridge(path: str) -> dict:
    url = _bridge_url(path)
    if not url.startswith("http"):
        raise HTTPException(
            status_code=503,
            detail="WhatsApp Bridge não configurado (WHATSAPP_BRIDGE_URL).",
        )
    try:
        async with httpx.AsyncClient(timeout=BRIDGE_TIMEOUT) as client:
            r = await client.get(url)
            r.raise_for_status()
            return r.json()
    except httpx.ConnectError as e:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp Bridge indisponível. Verifique se o serviço está rodando (ex: npm start em packages/whatsapp-bridge).",
        ) from e
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text[:200]) from e
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@router.get("/status")
async def get_bridge_status(admin: AdminUser) -> dict:
    """Retorna status da conexão do bridge: { connected, qr? }."""
    return await _get_bridge("/status")


@router.get("/qr")
async def get_bridge_qr(admin: AdminUser) -> dict:
    """Retorna QR code em base64 quando não conectado: { connected, qr?, message? }."""
    return await _get_bridge("/qr")


async def _post_bridge(path: str, payload: dict | None = None) -> dict:
    url = _bridge_url(path)
    if not url.startswith("http"):
        raise HTTPException(
            status_code=503,
            detail="WhatsApp Bridge não configurado (WHATSAPP_BRIDGE_URL).",
        )
    try:
        async with httpx.AsyncClient(timeout=BRIDGE_TIMEOUT) as client:
            r = await client.post(url, json=payload or {})
            r.raise_for_status()
            return r.json()
    except httpx.ConnectError as e:
        raise HTTPException(
            status_code=503,
            detail="WhatsApp Bridge indisponível. Verifique se o serviço está rodando (ex: npm start em packages/whatsapp-bridge).",
        ) from e
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text[:200]) from e
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@router.post("/disconnect")
async def disconnect_bridge(admin: AdminUser) -> dict:
    """
    Desconecta o número atual do bridge e inicia um novo fluxo de QR.
    Útil para trocar de aparelho/número ou resetar a sessão.
    """
    return await _post_bridge("/disconnect")
