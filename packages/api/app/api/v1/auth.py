"""Auth endpoints."""

import random
import string
from datetime import UTC, datetime, timedelta
import json

from fastapi import APIRouter, HTTPException
import httpx
from pydantic import BaseModel, Field
import redis.asyncio as aioredis
from sqlalchemy import select

from app.api.deps import DBSession
from app.core.config import settings
from app.core.exceptions import InvalidCodeError
from app.core.logging import get_logger
from app.core.security import create_access_token, create_refresh_token, decode_refresh_token
from app.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = get_logger(__name__)

# In-memory verification codes (use Redis in production)
_verification_codes: dict[str, tuple[str, datetime]] = {}
OTP_TTL_SECONDS = 300


def _otp_key(phone: str) -> str:
    return f"{settings.REDIS_PREFIX}otp:{phone}"


async def _store_verification_code(phone: str, code: str, expires_at: datetime) -> None:
    payload = json.dumps({"code": code, "expires_at": expires_at.isoformat()})
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        await redis_client.setex(_otp_key(phone), OTP_TTL_SECONDS, payload)
        await redis_client.close()
    except Exception:
        logger.warning("OTP Redis store failed; using in-memory fallback", phone=phone)
        _verification_codes[phone] = (code, expires_at)


async def _get_verification_code(phone: str) -> tuple[str, datetime] | None:
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        raw = await redis_client.get(_otp_key(phone))
        await redis_client.close()
        if raw:
            data = json.loads(raw)
            return data["code"], datetime.fromisoformat(data["expires_at"])
    except Exception:
        logger.warning("OTP Redis read failed; using in-memory fallback", phone=phone)
    return _verification_codes.get(phone)


async def _delete_verification_code(phone: str) -> None:
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL)
        await redis_client.delete(_otp_key(phone))
        await redis_client.close()
    except Exception:
        logger.warning("OTP Redis delete failed; cleaning in-memory fallback", phone=phone)
    _verification_codes.pop(phone, None)


async def _send_sms_code(phone: str, code: str) -> None:
    """Send verification code using configured provider when enabled."""
    if not settings.SMS_ENABLED:
        logger.info("SMS provider disabled; skipping outbound SMS", phone=phone)
        return

    if not settings.NVOIP_TOKEN:
        logger.warning("SMS enabled but NVOIP_TOKEN not configured", phone=phone)
        return

    payload = {
        "celular": phone,
        "mensagem": f"Seu código Navaro é: {code}",
    }
    headers = {
        "token_auth": settings.NVOIP_TOKEN,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(f"{settings.NVOIP_API_URL}/sms", json=payload, headers=headers)
        response.raise_for_status()


# ─── Schemas ───────────────────────────────────────────────────────────────────


class SendCodeRequest(BaseModel):
    """Request to send verification code."""

    phone: str = Field(..., min_length=10, max_length=20, description="Phone number (E.164)")


class SendCodeResponse(BaseModel):
    """Response after sending code."""

    message: str
    expires_in_seconds: int = 300


class VerifyCodeRequest(BaseModel):
    """Request to verify code."""

    phone: str = Field(..., min_length=10, max_length=20)
    code: str = Field(..., min_length=6, max_length=6)
    name: str | None = Field(
        None, max_length=100, description="Nome do usuário (opcional no primeiro acesso)"
    )
    email: str | None = Field(None, description="Email do usuário (opcional)")
    referral_code: str | None = Field(None, min_length=8, max_length=20)


class TokenResponse(BaseModel):
    """Token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    """Request to refresh token."""

    refresh_token: str


class UserResponse(BaseModel):
    """User info response."""

    id: str
    phone: str
    name: str | None
    email: str | None
    avatar_url: str | None
    role: str
    referral_code: str | None
    referred_by_id: str | None


class AuthResponse(BaseModel):
    """Auth response with tokens and user."""

    tokens: TokenResponse
    user: UserResponse


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/send-code", response_model=SendCodeResponse)
async def send_verification_code(request: SendCodeRequest) -> SendCodeResponse:
    """
    Send verification code to phone.

    In development, returns the code in the message.
    In production, sends via SMS.
    """
    # Generate 6-digit code
    code = "".join(random.choices(string.digits, k=6))
    expires_at = datetime.now(UTC) + timedelta(minutes=5)

    # Store code
    await _store_verification_code(request.phone, code, expires_at)

    logger.info("Verification code sent", phone=request.phone)

    # In development, return code in message
    if settings.ENVIRONMENT == "development":
        return SendCodeResponse(
            message=f"Código de verificação: {code}",
            expires_in_seconds=OTP_TTL_SECONDS,
        )

    await _send_sms_code(request.phone, code)
    return SendCodeResponse(
        message="Código de verificação enviado",
        expires_in_seconds=OTP_TTL_SECONDS,
    )


@router.post("/verify", response_model=AuthResponse)
async def verify_code(request: VerifyCodeRequest, db: DBSession) -> AuthResponse:
    """
    Verify code and return tokens.

    Creates new user if phone not registered.
    """
    # Check code
    stored = await _get_verification_code(request.phone)
    if not stored:
        raise InvalidCodeError()

    code, expires_at = stored

    if datetime.now(UTC) > expires_at:
        await _delete_verification_code(request.phone)
        raise InvalidCodeError()

    if code != request.code:
        raise InvalidCodeError()

    # Remove used code
    await _delete_verification_code(request.phone)

    # Find or create user
    result = await db.execute(select(User).where(User.phone == request.phone))
    user = result.scalar_one_or_none()

    if not user:
        # Generate referral code
        import random as rnd
        import string as str_lib

        new_ref_code = "".join(rnd.choices(str_lib.ascii_uppercase + str_lib.digits, k=8))

        # Check referral
        referred_by_id = None
        if request.referral_code:
            ref_result = await db.execute(
                select(User.id).where(User.referral_code == request.referral_code)
            )
            referred_by_id = ref_result.scalar_one_or_none()

        user = User(
            phone=request.phone,
            name=request.name,
            email=request.email,
            referral_code=new_ref_code,
            referred_by_id=referred_by_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info(
            "New user created with referral",
            user_id=str(user.id),
            phone=request.phone,
            referral=request.referral_code,
        )

    # Generate tokens
    access_token = create_access_token(user.id, {"role": user.role.value})
    refresh_token = create_refresh_token(user.id)

    logger.info("User authenticated", user_id=str(user.id))

    return AuthResponse(
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        user=UserResponse(
            id=str(user.id),
            phone=user.phone,
            name=user.name,
            email=user.email,
            avatar_url=user.avatar_url,
            role=user.role.value,
            referral_code=user.referral_code,
            referred_by_id=str(user.referred_by_id) if user.referred_by_id else None,
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(request: RefreshTokenRequest, db: DBSession) -> TokenResponse:
    """Refresh access token using refresh token."""
    try:
        user_id = decode_refresh_token(request.refresh_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from e

    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Generate new tokens
    access_token = create_access_token(user.id, {"role": user.role.value})
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
