"""Rate limiting middleware for API protection."""

import time
from typing import Dict, Tuple
from collections import defaultdict

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger
from app.core.config import get_settings

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.
    
    Limits requests per IP/user for sensitive endpoints.
    """
    
    def __init__(self, app, default_limit: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.default_limit = default_limit
        self.window_seconds = window_seconds
        # In production, use Redis instead of in-memory
        self._requests: Dict[str, list] = defaultdict(list)
        
        # Endpoint-specific limits (path prefix -> (limit, window))
        self.endpoint_limits: Dict[str, Tuple[int, int]] = {
            "/api/v1/auth/send-code": (5, 300),   # 5 per 5 min
            "/api/v1/auth/verify": (10, 300),     # 10 per 5 min
            "/api/v1/auth/refresh": (20, 60),     # 20 per min
            "/api/v1/payments": (30, 60),         # 30 per min
        }
    
    async def dispatch(self, request: Request, call_next):
        # Skip health endpoints
        if request.url.path in ["/health", "/ready", "/metrics"]:
            return await call_next(request)
        
        # Get client identifier (IP or user_id from JWT)
        client_id = self._get_client_id(request)
        path = request.url.path
        
        # Get limit for this endpoint
        limit, window = self._get_limit_for_path(path)
        
        # Check rate limit
        if not self._is_allowed(client_id, path, limit, window):
            logger.warning(
                "Rate limit exceeded",
                client_id=client_id,
                path=path,
                limit=limit,
                window=window,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limit_exceeded",
                    "message": "Muitas requisições. Tente novamente mais tarde.",
                    "retry_after": window,
                }
            )
        
        return await call_next(request)
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request."""
        # Try to get from forwarded header (behind proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Fall back to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _get_limit_for_path(self, path: str) -> Tuple[int, int]:
        """Get rate limit for a specific path."""
        for prefix, (limit, window) in self.endpoint_limits.items():
            if path.startswith(prefix):
                return limit, window
        return self.default_limit, self.window_seconds
    
    def _is_allowed(self, client_id: str, path: str, limit: int, window: int) -> bool:
        """Check if request is allowed under rate limit."""
        key = f"{client_id}:{path}"
        now = time.time()
        
        # Clean old requests
        self._requests[key] = [
            ts for ts in self._requests[key] 
            if now - ts < window
        ]
        
        # Check limit
        if len(self._requests[key]) >= limit:
            return False
        
        # Record this request
        self._requests[key].append(now)
        return True


# Redis-based rate limiter for production
class RedisRateLimiter:
    """
    Redis-based rate limiter for distributed systems.
    
    Uses sliding window log algorithm with Redis sorted sets.
    """
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis = None
    
    async def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(self.redis_url)
        return self._redis
    
    async def is_allowed(
        self, 
        key: str, 
        limit: int, 
        window: int
    ) -> Tuple[bool, int]:
        """
        Check if request is allowed.
        
        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        redis = await self._get_redis()
        now = time.time()
        window_start = now - window
        
        pipe = redis.pipeline()
        
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        # Count current entries
        pipe.zcard(key)
        # Add current request
        pipe.zadd(key, {str(now): now})
        # Set expiry
        pipe.expire(key, window)
        
        _, count, _, _ = await pipe.execute()
        
        remaining = max(0, limit - count - 1)
        return count < limit, remaining
    
    async def close(self):
        if self._redis:
            await self._redis.close()
