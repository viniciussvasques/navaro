"""API v1 router."""

from fastapi import APIRouter

from app.api.v1 import (
    admin_analytics,
    admin_establishments,
    admin_payments,
    admin_payouts,
    admin_qr_analytics,
    admin_settings,
    admin_whatsapp_bridge,
    analytics,
    appointments,
    auth,
    bundles,
    checkins,
    establishments,
    favorites,
    notifications,
    payments,
    payouts,
    portfolio,
    products,
    profile,
    qr_codes,
    queue,
    reviews,
    services,
    staff,
    staff_goals,
    subscriptions,
    tips,
    users,
    search,
    support,
    admin_logs,
    admin_moderation,
    admin_exports,
    admin_marketing,
    user_subscriptions,
    promotions,
    ad_campaigns,
    platform_subscription,
    mercadopago_oauth,
)

router = APIRouter(prefix="/api/v1", tags=["API v1"])

# Include all routers
router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(establishments.router)
router.include_router(services.router)
router.include_router(staff.router)
router.include_router(staff_goals.router)
router.include_router(appointments.router)
router.include_router(queue.router)
router.include_router(reviews.router)
router.include_router(favorites.router)
router.include_router(search.router)
router.include_router(portfolio.router)
router.include_router(notifications.router)
router.include_router(checkins.router, prefix="/checkins", tags=["Check-ins"])
router.include_router(bundles.router)
router.include_router(subscriptions.router)
router.include_router(subscriptions.establishment_subscriptions_router)
router.include_router(user_subscriptions.router)
router.include_router(products.router)
router.include_router(profile.router)
router.include_router(tips.router)
router.include_router(payments.router, prefix="/payments", tags=["Payments"])
router.include_router(payouts.router, prefix="/payouts", tags=["Payouts"])
router.include_router(admin_settings.router)
router.include_router(admin_analytics.router)
router.include_router(admin_establishments.router)
router.include_router(admin_payments.router)
router.include_router(admin_payouts.router)
router.include_router(admin_logs.router, prefix="/admin/logs", tags=["Admin Logs"])
router.include_router(admin_whatsapp_bridge.router)
router.include_router(admin_qr_analytics.router)
router.include_router(admin_moderation.router)
router.include_router(admin_exports.router)
router.include_router(admin_marketing.router)
router.include_router(qr_codes.router)
router.include_router(support.router)
router.include_router(promotions.router)
router.include_router(ad_campaigns.router)
router.include_router(platform_subscription.router)
router.include_router(mercadopago_oauth.router)
