"""Auth schemas."""

from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class SendCodeRequest(BaseModel):
    """Request to send verification code."""

    phone: str = Field(..., min_length=10, max_length=20, examples=["+5511999999999"])


class VerifyCodeRequest(BaseModel):
    """Request to verify code."""

    phone: str = Field(..., min_length=10, max_length=20)
    code: str = Field(..., min_length=6, max_length=6)
    referral_code: str | None = Field(None, min_length=8, max_length=20)


class TokenResponse(BaseModel):
    """Token response after authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
