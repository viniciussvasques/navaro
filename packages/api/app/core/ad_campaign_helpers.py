"""Ad campaign targeting helpers."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from app.core.geo import haversine_meters
from app.models.plugin import AdCampaignStatus

if TYPE_CHECKING:
    from app.models.establishment import Establishment
    from app.models.plugin import AdCampaign


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    return haversine_meters(lat1, lng1, lat2, lng2) / 1000.0


def campaign_in_schedule(campaign: AdCampaign, today: date | None = None) -> bool:
    from datetime import UTC, datetime

    today = today or datetime.now(UTC).date()
    if campaign.start_date > today:
        return False
    if campaign.end_date and campaign.end_date < today:
        return False
    return True


def campaign_has_budget(campaign: AdCampaign) -> bool:
    if float(campaign.spent_today or 0) >= float(campaign.budget_daily):
        return False
    if campaign.budget_total is not None and float(campaign.total_spent or 0) >= float(
        campaign.budget_total
    ):
        return False
    return True


def campaign_is_running(campaign: AdCampaign, today: date | None = None) -> bool:
    if not campaign.active:
        return False
    if campaign.status in (AdCampaignStatus.paused, AdCampaignStatus.exhausted, AdCampaignStatus.ended):
        return False
    if not campaign_in_schedule(campaign, today):
        return False
    return campaign_has_budget(campaign)


def campaign_center(campaign: AdCampaign, establishment: Establishment) -> tuple[float | None, float | None]:
    lat = campaign.target_center_lat if campaign.target_center_lat is not None else establishment.latitude
    lng = campaign.target_center_lng if campaign.target_center_lng is not None else establishment.longitude
    if lat is None or lng is None:
        return None, None
    return float(lat), float(lng)


def campaign_matches_geo(
    campaign: AdCampaign,
    establishment: Establishment,
    *,
    user_lat: float | None = None,
    user_lng: float | None = None,
    user_city: str | None = None,
) -> bool:
    cities = campaign.target_cities or []
    if cities and user_city:
        normalized = user_city.strip().lower()
        if not any(c.strip().lower() in normalized or normalized in c.strip().lower() for c in cities):
            return False

    center_lat, center_lng = campaign_center(campaign, establishment)
    if user_lat is None or user_lng is None:
        return True if not cities else bool(user_city)
    if center_lat is None or center_lng is None:
        return True

    radius_km = float(campaign.target_radius_km or 15)
    distance_km = haversine_km(user_lat, user_lng, center_lat, center_lng)
    return distance_km <= radius_km


def campaign_matches_audience(
    campaign: AdCampaign,
    *,
    establishment_category: str | None = None,
) -> bool:
    cfg = campaign.audience_config or {}
    categories = cfg.get("categories") or []
    if categories and establishment_category:
        if establishment_category not in categories:
            return False
    return True


def campaign_matches_context(
    campaign: AdCampaign,
    establishment: Establishment,
    *,
    user_lat: float | None = None,
    user_lng: float | None = None,
    user_city: str | None = None,
) -> bool:
    if not campaign_is_running(campaign):
        return False
    if not campaign_matches_geo(
        campaign, establishment, user_lat=user_lat, user_lng=user_lng, user_city=user_city
    ):
        return False
    return campaign_matches_audience(campaign, establishment_category=establishment.category)
