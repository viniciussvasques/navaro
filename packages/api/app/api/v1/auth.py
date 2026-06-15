"""Auth endpoints."""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import CurrentUser, DBSession
from app.core.config import settings
from app.core.logging import get_logger

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = get_logger(__name__)


# ─── Schemas ───────────────────────────────────────────────────────────────────


class SendCodeRequest(BaseModel):
    """Request to send verification code."""

    phone: str = Field(..., min_length=10, max_length=20, description="Phone number (E.164)")


class LoginRequest(BaseModel):
    """Request to login with email and password."""

    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Password")


class SendCodeResponse(BaseModel):
    """Response after sending code."""

    message: str
    expires_in_seconds: int = 300
    sms_sent: bool | None = Field(
        None,
        description="True = SMS enviado; False = falha; None = SMS desativado",
    )
    sms_error: str | None = Field(
        None,
        description="Motivo da falha quando sms_sent for False",
    )
    whatsapp_sent: bool | None = Field(
        None,
        description="True = WhatsApp enviado; False = falha; None = WhatsApp desativado",
    )
    whatsapp_error: str | None = Field(
        None,
        description="Motivo da falha quando whatsapp_sent for False",
    )
    is_registered: bool = Field(False, description="True se o usuário já existe, False se for novo cadastro")


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


class CompleteRegistrationRequest(BaseModel):
    """Complete registration after OTP - add name, email, password."""

    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=6, description="Password")


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
async def send_verification_code(request: SendCodeRequest, db: DBSession) -> SendCodeResponse:
    """
    Send verification code.
    """
    from app.services.auth_service import AuthService

    try:
        auth_service = AuthService(db)
        sms_sent, sms_error, whatsapp_sent, whatsapp_error = await auth_service.send_verification_code(
            request.phone
        )
    except Exception as e:
        logger.exception("Send verification code failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"message": str(e) if settings.is_debug else "Não foi possível enviar o código. Tente novamente."},
        ) from e

    message = "Código enviado com sucesso"
    
    # Check if user exists
    from app.models.user import User
    from sqlalchemy import select
    
    result = await db.execute(select(User.id).where(User.phone == request.phone))
    is_registered = result.scalar_one_or_none() is not None

    return SendCodeResponse(
        message=message,
        expires_in_seconds=300,
        sms_sent=sms_sent,
        sms_error=sms_error,
        whatsapp_sent=whatsapp_sent,
        whatsapp_error=whatsapp_error,
        is_registered=is_registered,
    )


@router.post("/verify", response_model=AuthResponse)
async def verify_code(request: VerifyCodeRequest, db: DBSession) -> AuthResponse:
    """
    Verify code.
    """
    from app.services.auth_service import AuthService

    auth_service = AuthService(db)
    token_response = await auth_service.verify_code(
        phone=request.phone,
        code=request.code,
        referral_code=request.referral_code,
        email=request.email,
        name=request.name
    )

    if not token_response:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado")

    user_dump = token_response.user.model_dump(mode="json")
    # Only fields expected by this API's UserResponse (no created_at etc.)
    user_payload = {k: user_dump.get(k) for k in ("id", "phone", "name", "email", "avatar_url", "role", "referral_code", "referred_by_id") if k in user_dump}
    if "id" in user_payload and user_payload["id"] is not None:
        user_payload["id"] = str(user_payload["id"])
    if "referred_by_id" in user_payload and user_payload["referred_by_id"] is not None:
        user_payload["referred_by_id"] = str(user_payload["referred_by_id"])
    if "role" in user_payload and not isinstance(user_payload.get("role"), str):
        user_payload["role"] = getattr(user_payload["role"], "value", user_payload["role"])
    return AuthResponse.model_validate({
        "tokens": {
            "access_token": token_response.access_token,
            "refresh_token": token_response.refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
        "user": user_payload,
    })


@router.post("/login", response_model=AuthResponse)
async def login_with_password(
    request: LoginRequest, response: Response, db: DBSession
) -> AuthResponse:
    """
    Login with email and password.
    """
    from app.services.auth_service import AuthService

    try:
        auth_service = AuthService(db)
        token_response = await auth_service.login_with_password(
            email=request.email, password=request.password
        )
    except Exception as e:
        logger.exception("Login with password failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=({"message": str(e)} if settings.is_debug else {"message": "Erro interno ao fazer login. Tente novamente."}),
        ) from e

    if not token_response:
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")

    try:
        response.set_cookie(
            key="access_token",
            value=token_response.access_token,
            httponly=True,
            secure=settings.is_production,  # Secure only in prod (HTTPS)
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

        user_dump = token_response.user.model_dump(mode="json")
        user_payload = {k: user_dump.get(k) for k in ("id", "phone", "name", "email", "avatar_url", "role", "referral_code", "referred_by_id") if k in user_dump}
        if "id" in user_payload and user_payload["id"] is not None:
            user_payload["id"] = str(user_payload["id"])
        if "referred_by_id" in user_payload and user_payload["referred_by_id"] is not None:
            user_payload["referred_by_id"] = str(user_payload["referred_by_id"])
        if "role" in user_payload and user_payload["role"] is not None and not isinstance(user_payload.get("role"), str):
            user_payload["role"] = getattr(user_payload["role"], "value", user_payload["role"])
        elif "role" in user_payload and user_payload["role"] is None:
            user_payload["role"] = "customer"  # fallback para usuários sem role

        return AuthResponse.model_validate({
            "tokens": {
                "access_token": token_response.access_token,
                "refresh_token": token_response.refresh_token,
                "token_type": "bearer",
                "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            },
            "user": user_payload,
        })
    except Exception as e:
        logger.exception("Login response build failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=({"message": str(e)} if settings.is_debug else {"message": "Erro interno ao fazer login. Tente novamente."}),
        ) from e


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(request: RefreshTokenRequest, db: DBSession) -> TokenResponse:
    """Refresh access token using refresh token."""
    from app.services.auth_service import AuthService

    auth_service = AuthService(db)
    token_response = await auth_service.refresh_tokens(request.refresh_token)

    if not token_response:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return TokenResponse(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/complete-registration")
async def complete_registration(
    request: CompleteRegistrationRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """
    Complete registration after OTP login: add name, email and password.
    Allows login by email/password later.
    """
    from sqlalchemy import select

    from app.models import User
    from app.services.auth_service import AuthService

    # Check email unique (exclude current user)
    result = await db.execute(
        select(User.id).where(User.email == request.email, User.id != current_user.id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="E-mail já está em uso")

    auth_service = AuthService(db)
    current_user.name = request.name
    current_user.email = request.email
    current_user.hashed_password = auth_service.get_password_hash(request.password)

    await db.commit()
    return {"message": "Cadastro concluído com sucesso"}


@router.post("/logout")
async def logout(response: Response):
    """
    Logout user by clearing the access_token cookie.
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
    )
    return {"message": "Sessão encerrada com sucesso"}
