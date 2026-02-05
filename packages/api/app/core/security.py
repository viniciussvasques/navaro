"""Security utilities: JWT, password hashing, etc."""

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.exceptions import InvalidTokenError


# ─── Password Hashing ──────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT Token Creation ────────────────────────────────────────────────────────


def create_access_token(user_id: UUID, extra_claims: dict[str, Any] | None = None) -> str:
    """Create a new access token."""
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    
    payload = {
        "sub": str(user_id),
        "exp": expires,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    
    if extra_claims:
        payload.update(extra_claims)
    
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: UUID) -> str:
    """Create a new refresh token."""
    expires = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    
    payload = {
        "sub": str(user_id),
        "exp": expires,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_qr_token(
    establishment_id: UUID,
    staff_id: UUID | None = None,
    expires_minutes: int = 5,
) -> str:
    """Create a QR code token for check-in."""
    expires = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    
    payload = {
        "establishment_id": str(establishment_id),
        "exp": expires,
        "iat": datetime.now(timezone.utc),
        "type": "qr_checkin",
    }
    
    if staff_id:
        payload["staff_id"] = str(staff_id)
    
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ─── JWT Token Validation ──────────────────────────────────────────────────────


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError as e:
        raise InvalidTokenError() from e


def decode_access_token(token: str) -> UUID:
    """Decode access token and return user ID."""
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise InvalidTokenError("Token type inválido")
    
    user_id = payload.get("sub")
    if not user_id:
        raise InvalidTokenError("Token sem user ID")
    
    return UUID(user_id)


def decode_refresh_token(token: str) -> UUID:
    """Decode refresh token and return user ID."""
    payload = decode_token(token)
    
    if payload.get("type") != "refresh":
        raise InvalidTokenError("Token type inválido")
    
    user_id = payload.get("sub")
    if not user_id:
        raise InvalidTokenError("Token sem user ID")
    
    return UUID(user_id)


def decode_qr_token(token: str) -> dict[str, Any]:
    """Decode QR check-in token."""
    payload = decode_token(token)
    
    if payload.get("type") != "qr_checkin":
        raise InvalidTokenError("Token type inválido")
    
    establishment_id = payload.get("establishment_id")
    if not establishment_id:
        raise InvalidTokenError("Token sem establishment ID")
    
    return {
        "establishment_id": UUID(establishment_id),
        "staff_id": UUID(payload["staff_id"]) if payload.get("staff_id") else None,
    }


# ─── Admin Token Validation ────────────────────────────────────────────────────


def verify_admin_token(token: str) -> bool:
    """Verify admin token for debug endpoints."""
    return token == settings.ADMIN_TOKEN
