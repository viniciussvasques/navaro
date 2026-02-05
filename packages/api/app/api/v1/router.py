"""API v1 router."""

from fastapi import APIRouter

from app.api.v1 import auth, users, establishments, services, staff

router = APIRouter(prefix="/api/v1", tags=["API v1"])

# Include all routers
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(establishments.router)
router.include_router(services.router)
router.include_router(staff.router)
