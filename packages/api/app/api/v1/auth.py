"""Auth endpoints."""

import random
import string
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
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
    _verification_codes[request.phone] = (code, expires_at)

    logger.info("Verification code sent", phone=request.phone)

    # In development, return code in message
    if settings.ENVIRONMENT == "development":
        return SendCodeResponse(
            message=f"Código de verificação: {code}",
            expires_in_seconds=300,
        )

    # TODO: Send SMS via Twilio in production
    return SendCodeResponse(
        message="Código de verificação enviado",
        expires_in_seconds=300,
    )


@router.post("/verify", response_model=AuthResponse)
async def verify_code(request: VerifyCodeRequest, db: DBSession) -> AuthResponse:
    """
    Verify code and return tokens.

    Creates new user if phone not registered.
    """
    # Check code
    stored = _verification_codes.get(request.phone)
    if not stored:
        raise InvalidCodeError()

    code, expires_at = stored

    if datetime.now(UTC) > expires_at:
        del _verification_codes[request.phone]
        raise InvalidCodeError()

    if code != request.code:
        raise InvalidCodeError()

    # Remove used code
    del _verification_codes[request.phone]

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
