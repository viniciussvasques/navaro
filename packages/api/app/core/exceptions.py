"""Custom exceptions with standardized error handling."""

from typing import Any


class AppException(Exception):
    """Base application exception with structured error response."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        field: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.field = field
        self.details = details or {}
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dict for API response."""
        error = {
            "code": self.code,
            "message": self.message,
        }
        if self.field:
            error["field"] = self.field
        if self.details:
            error["details"] = self.details
        return {"error": error}


# ─── Authentication Errors ─────────────────────────────────────────────────────


class UnauthorizedError(AppException):
    """User is not authenticated."""

    def __init__(self, message: str = "Não autorizado") -> None:
        super().__init__(
            code="UNAUTHORIZED",
            message=message,
            status_code=401,
        )


class ForbiddenError(AppException):
    """User doesn't have permission."""

    def __init__(self, message: str = "Sem permissão para esta ação") -> None:
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=403,
        )


class InvalidTokenError(AppException):
    """Token is invalid or expired."""

    def __init__(self, message: str = "Token inválido ou expirado") -> None:
        super().__init__(
            code="INVALID_TOKEN",
            message=message,
            status_code=401,
        )


class InvalidCodeError(AppException):
    """Verification code is invalid."""

    def __init__(self) -> None:
        super().__init__(
            code="INVALID_CODE",
            message="Código de verificação inválido ou expirado",
            status_code=400,
        )


# ─── Resource Errors ───────────────────────────────────────────────────────────


class NotFoundError(AppException):
    """Resource not found."""

    def __init__(self, resource: str, identifier: str | None = None) -> None:
        message = f"{resource} não encontrado"
        if identifier:
            message = f"{resource} '{identifier}' não encontrado"
        super().__init__(
            code="NOT_FOUND",
            message=message,
            status_code=404,
        )


class AlreadyExistsError(AppException):
    """Resource already exists."""

    def __init__(self, resource: str, field: str | None = None) -> None:
        super().__init__(
            code="ALREADY_EXISTS",
            message=f"{resource} já existe",
            status_code=409,
            field=field,
        )


class ConflictError(AppException):
    """Resource conflict."""

    def __init__(self, message: str) -> None:
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=409,
        )


# ─── Validation Errors ─────────────────────────────────────────────────────────


class ValidationError(AppException):
    """Validation error."""

    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=422,
            field=field,
        )


class InvalidInputError(AppException):
    """Invalid input data."""

    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(
            code="INVALID_INPUT",
            message=message,
            status_code=400,
            field=field,
        )


# ─── Business Logic Errors ─────────────────────────────────────────────────────


class BusinessError(AppException):
    """Business rule violation."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(
            code=code,
            message=message,
            status_code=400,
        )


class InsufficientCreditsError(AppException):
    """User doesn't have enough subscription credits."""

    def __init__(self) -> None:
        super().__init__(
            code="INSUFFICIENT_CREDITS",
            message="Créditos de assinatura insuficientes",
            status_code=402,
        )


class SlotNotAvailableError(AppException):
    """Requested time slot is not available."""

    def __init__(self) -> None:
        super().__init__(
            code="SLOT_NOT_AVAILABLE",
            message="Horário não disponível",
            status_code=409,
        )


class EstablishmentClosedError(AppException):
    """Establishment is closed at requested time."""

    def __init__(self) -> None:
        super().__init__(
            code="ESTABLISHMENT_CLOSED",
            message="Estabelecimento fechado neste horário",
            status_code=400,
        )


# ─── External Service Errors ───────────────────────────────────────────────────


class ExternalServiceError(AppException):
    """External service error."""

    def __init__(self, service: str, message: str | None = None) -> None:
        super().__init__(
            code="EXTERNAL_SERVICE_ERROR",
            message=message or f"Erro ao comunicar com {service}",
            status_code=502,
            details={"service": service},
        )


class PaymentError(AppException):
    """Payment processing error."""

    def __init__(self, message: str, stripe_error: str | None = None) -> None:
        super().__init__(
            code="PAYMENT_ERROR",
            message=message,
            status_code=402,
            details={"stripe_error": stripe_error} if stripe_error else {},
        )


# ─── Rate Limiting ─────────────────────────────────────────────────────────────


class RateLimitError(AppException):
    """Rate limit exceeded."""

    def __init__(self, retry_after: int = 60) -> None:
        super().__init__(
            code="RATE_LIMIT_EXCEEDED",
            message="Muitas requisições. Tente novamente em breve.",
            status_code=429,
            details={"retry_after": retry_after},
        )


# ─── Maintenance Mode ──────────────────────────────────────────────────────────


class MaintenanceModeError(AppException):
    """System is in maintenance mode."""

    def __init__(self) -> None:
        super().__init__(
            code="MAINTENANCE_MODE",
            message="Sistema em manutenção. Tente novamente em breve.",
            status_code=503,
        )
