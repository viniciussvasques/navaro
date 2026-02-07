"""Auth service."""

import random
import string
from datetime import UTC, datetime, timedelta
from uuid import UUID

from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.auth import TokenResponse
from app.schemas.user import UserResponse


class AuthService:
    """Authentication service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_verification_code(self, phone: str) -> None:
        """Send verification code to phone number."""
        import app.core.redis as redis_module

        # Generate 6-digit code
        code = "".join(random.choices(string.digits, k=6))

        # Store code with expiration in Redis
        redis = await redis_module.get_redis()
        key = f"{settings.REDIS_PREFIX}otp:{phone}"
        await redis.setex(key, 300, code)

        if settings.is_debug:
            print(f"[DEV] Verification code for {phone}: {code}")

        # TODO: Send SMS via Twilio/WhatsApp

    async def verify_code(
        self, phone: str, code: str, referral_code: str | None = None
    ) -> TokenResponse | None:
        """Verify code and return tokens."""
        import app.core.redis as redis_module

        redis = await redis_module.get_redis()
        key = f"{settings.REDIS_PREFIX}otp:{phone}"
        stored_code = await redis.get(key)

        if settings.is_debug and code == "123456":
            # Development bypass
            pass
        elif not stored_code or stored_code != code:
            return None
        else:
            # Valid code, remove it
            await redis.delete(key)

        # Get or create user
        result = await self.db.execute(select(User).where(User.phone == phone))
        user = result.scalar_one_or_none()

        if not user:
            # Generate unique referral code
            new_ref_code = self._generate_referral_code()

            # Check who referred (if provided)
            referred_by_id = None
            if referral_code:
                result = await self.db.execute(
                    select(User.id).where(User.referral_code == referral_code)
                )
                referred_by_id = result.scalar_one_or_none()

            user = User(
                phone=phone,
                role=UserRole.customer,
                referral_code=new_ref_code,
                referred_by_id=referred_by_id,
            )
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)

        # Generate tokens
        access_token = self._create_access_token(str(user.id))
        refresh_token = self._create_refresh_token(str(user.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        )

    def _generate_referral_code(self) -> str:
        """Generate a random unique-ish referral code."""
        return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse | None:
        """Refresh access token using refresh token."""
        try:
            payload = jwt.decode(
                refresh_token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            user_id = payload.get("sub")
            token_type = payload.get("type")

            if not user_id or token_type != "refresh":
                return None

            result = await self.db.execute(select(User).where(User.id == UUID(user_id)))
            user = result.scalar_one_or_none()

            if not user:
                return None

            access_token = self._create_access_token(str(user.id))
            new_refresh_token = self._create_refresh_token(str(user.id))

            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                user=UserResponse.model_validate(user),
            )
        except Exception:
            return None

    def _create_access_token(self, user_id: str) -> str:
        """Create access token."""
        expires = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user_id,
            "exp": expires,
            "type": "access",
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def _create_refresh_token(self, user_id: str) -> str:
        """Create refresh token."""
        expires = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "sub": user_id,
            "exp": expires,
            "type": "refresh",
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
