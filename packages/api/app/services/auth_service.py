"""Auth service."""

import random
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User, UserRole
from app.schemas.auth import TokenResponse
from app.schemas.user import UserResponse


class AuthService:
    """Authentication service."""

    def __init__(self, db: AsyncSession):
        self.db = db
        # In-memory code storage (use Redis in production)
        self._codes: dict[str, tuple[str, datetime]] = {}

    async def send_verification_code(self, phone: str) -> None:
        """Send verification code to phone number."""
        # Generate 6-digit code
        code = "".join(random.choices(string.digits, k=6))
        
        # Store code with expiration
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        self._codes[phone] = (code, expires_at)
        
        # TODO: Send SMS via Twilio/WhatsApp
        # For development, log the code
        print(f"[DEV] Verification code for {phone}: {code}")

    async def verify_code(self, phone: str, code: str) -> TokenResponse | None:
        """Verify code and return tokens."""
        # Check code (in dev, allow "123456" as bypass)
        stored = self._codes.get(phone)
        
        if settings.DEBUG and code == "123456":
            # Development bypass
            pass
        elif not stored:
            return None
        elif stored[0] != code:
            return None
        elif stored[1] < datetime.now(timezone.utc):
            # Code expired
            del self._codes[phone]
            return None
        else:
            # Valid code, remove it
            del self._codes[phone]
        
        # Get or create user
        result = await self.db.execute(select(User).where(User.phone == phone))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(phone=phone, role=UserRole.CUSTOMER)
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
            
            result = await self.db.execute(
                select(User).where(User.id == UUID(user_id))
            )
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
        expires = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        payload = {
            "sub": user_id,
            "exp": expires,
            "type": "access",
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def _create_refresh_token(self, user_id: str) -> str:
        """Create refresh token."""
        expires = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        payload = {
            "sub": user_id,
            "exp": expires,
            "type": "refresh",
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
