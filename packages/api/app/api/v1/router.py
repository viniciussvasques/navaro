"""API v1 router."""

from fastapi import APIRouter

from app.api.v1 import (
    admin_settings,
    analytics,
    auth,
    users,
    establishments,
    services,
    staff,
    appointments,
    queue,
    reviews,
    favorites,
    portfolio,
    notifications,
    checkins,
    bundles,
    subscriptions,
    products,
    tips,
    payments,
    payouts,
)

router = APIRouter(prefix="/api/v1", tags=["API v1"])

# Include all routers
router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(establishments.router)
router.include_router(services.router)
router.include_router(staff.router)
router.include_router(appointments.router)
router.include_router(queue.router)
router.include_router(reviews.router)
router.include_router(favorites.router)
router.include_router(portfolio.router)
router.include_router(notifications.router)
router.include_router(checkins.router, prefix="/checkins", tags=["Check-ins"])
router.include_router(bundles.router)
router.include_router(subscriptions.router)
router.include_router(products.router)
router.include_router(tips.router)
router.include_router(payments.router, prefix="/payments", tags=["Payments"])
router.include_router(payouts.router, prefix="/payouts", tags=["Payouts"])
router.include_router(admin_settings.router)
