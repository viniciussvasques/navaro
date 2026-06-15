"""Promotion and ad campaign services."""

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.establishment import Establishment
from app.models.notification import NotificationType
from app.models.plugin import AdCampaign
from app.models.promotion import Promotion
from app.models.review import Favorite
from app.schemas.promotion import AdCampaignCreate, AdCampaignUpdate, PromotionCreate, PromotionUpdate
from app.services.notification_service import NotificationService


class PromotionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_for_establishment(self, establishment_id: UUID, active_only: bool = False) -> Sequence[Promotion]:
        query = select(Promotion).where(Promotion.establishment_id == establishment_id)
        if active_only:
            now = datetime.now(UTC)
            query = query.where(
                Promotion.active == True,
                Promotion.starts_at <= now,
                Promotion.ends_at >= now,
            )
        query = query.order_by(Promotion.starts_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, establishment_id: UUID, data: PromotionCreate) -> Promotion:
        promo = Promotion(
            establishment_id=establishment_id,
            title=data.title,
            description=data.description,
            discount_percent=data.discount_percent,
            discount_fixed=data.discount_fixed,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            active=True,
        )
        self.db.add(promo)
        await self.db.commit()
        await self.db.refresh(promo)
        return promo

    async def update(self, promotion_id: UUID, data: PromotionUpdate) -> Promotion | None:
        result = await self.db.execute(select(Promotion).where(Promotion.id == promotion_id))
        promo = result.scalar_one_or_none()
        if not promo:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(promo, field, value)
        await self.db.commit()
        await self.db.refresh(promo)
        return promo

    async def notify_favorites(self, promotion_id: UUID) -> int:
        """Send in-app notification to users who favorited the establishment (C112)."""
        result = await self.db.execute(
            select(Promotion)
            .where(Promotion.id == promotion_id)
            .options(selectinload(Promotion.establishment))
        )
        promo = result.scalar_one_or_none()
        if not promo:
            raise NotFoundError("Promoção")

        fav_result = await self.db.execute(
            select(Favorite.user_id).where(Favorite.establishment_id == promo.establishment_id)
        )
        user_ids = [row[0] for row in fav_result.all()]
        if not user_ids:
            promo.notify_sent = True
            await self.db.commit()
            return 0

        notif = NotificationService(self.db)
        est_name = promo.establishment.name if promo.establishment else "estabelecimento"
        count = 0
        for uid in user_ids:
            await notif.create_in_app(
                user_id=str(uid),
                title=f"Promoção em {est_name}",
                message=promo.title,
                type=NotificationType.system,
                data={"promotion_id": str(promo.id), "establishment_id": str(promo.establishment_id)},
            )
            count += 1

        promo.notify_sent = True
        await self.db.commit()
        return count


class AdCampaignService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _enrich_response(campaign: AdCampaign) -> AdCampaign:
        remaining_today = max(0.0, float(campaign.budget_daily) - float(campaign.spent_today or 0))
        campaign.budget_remaining_today = remaining_today  # type: ignore[attr-defined]
        if campaign.budget_total is not None:
            campaign.budget_remaining_total = max(  # type: ignore[attr-defined]
                0.0, float(campaign.budget_total) - float(campaign.total_spent or 0)
            )
        else:
            campaign.budget_remaining_total = None  # type: ignore[attr-defined]
        return campaign

    def _apply_create_fields(self, campaign: AdCampaign, data: AdCampaignCreate) -> None:
        audience = data.audience.model_dump() if data.audience else {}
        campaign.placement = data.placement.value
        campaign.priority = data.priority
        campaign.target_radius_km = data.target_radius_km
        campaign.target_center_lat = data.target_center_lat
        campaign.target_center_lng = data.target_center_lng
        campaign.target_cities = data.target_cities
        campaign.audience_config = audience
        campaign.budget_total = data.budget_total
        campaign.cost_per_impression = data.cost_per_impression
        campaign.status = "active"

    async def list_for_establishment(self, establishment_id: UUID) -> Sequence[AdCampaign]:
        result = await self.db.execute(
            select(AdCampaign)
            .where(AdCampaign.establishment_id == establishment_id)
            .order_by(AdCampaign.start_date.desc())
        )
        campaigns = result.scalars().all()
        return [self._enrich_response(c) for c in campaigns]

    async def get_summary(self, establishment_id: UUID) -> dict:
        campaigns = await self.list_for_establishment(establishment_id)
        est = await self.db.get(Establishment, establishment_id)
        active = sum(1 for c in campaigns if c.active and c.status == "active")
        return {
            "active_campaigns": active,
            "total_impressions": sum(c.impressions for c in campaigns),
            "total_clicks": sum(c.clicks for c in campaigns),
            "total_spent": sum(float(c.total_spent or 0) for c in campaigns),
            "is_sponsored": bool(est and est.is_sponsored),
            "campaigns": campaigns,
        }

    async def create(self, establishment_id: UUID, data: AdCampaignCreate) -> AdCampaign:
        campaign = AdCampaign(
            establishment_id=establishment_id,
            name=data.name,
            budget_daily=data.budget_daily,
            start_date=data.start_date,
            end_date=data.end_date,
            active=data.active,
        )
        self._apply_create_fields(campaign, data)
        self.db.add(campaign)
        await self.db.flush()
        await self._sync_sponsored_flag(establishment_id)
        await self.db.commit()
        await self.db.refresh(campaign)
        return self._enrich_response(campaign)

    async def update(self, campaign_id: UUID, data: AdCampaignUpdate) -> AdCampaign | None:
        result = await self.db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        if not campaign:
            return None
        payload = data.model_dump(exclude_unset=True)
        audience = payload.pop("audience", None)
        if audience is not None:
            campaign.audience_config = audience
        placement = payload.pop("placement", None)
        if placement is not None:
            campaign.placement = placement.value if hasattr(placement, "value") else placement
        for field, value in payload.items():
            setattr(campaign, field, value)
        if campaign.active and campaign.status == "paused":
            campaign.status = "active"
        await self._sync_sponsored_flag(campaign.establishment_id)
        await self.db.commit()
        await self.db.refresh(campaign)
        return self._enrich_response(campaign)

    async def get_active_campaign(
        self,
        establishment_id: UUID,
        *,
        user_lat: float | None = None,
        user_lng: float | None = None,
        user_city: str | None = None,
    ) -> AdCampaign | None:
        from app.core.ad_campaign_helpers import campaign_matches_context

        today = datetime.now(UTC).date()
        result = await self.db.execute(
            select(AdCampaign)
            .where(
                AdCampaign.establishment_id == establishment_id,
                AdCampaign.active == True,
                AdCampaign.start_date <= today,
                (AdCampaign.end_date.is_(None)) | (AdCampaign.end_date >= today),
            )
            .order_by(AdCampaign.priority.desc(), AdCampaign.created_at.desc())
        )
        est = await self.db.get(Establishment, establishment_id)
        if not est:
            return None
        for campaign in result.scalars().all():
            if campaign_matches_context(
                campaign, est, user_lat=user_lat, user_lng=user_lng, user_city=user_city
            ):
                return campaign
        return None

    async def record_impression(
        self,
        establishment_id: UUID,
        *,
        user_lat: float | None = None,
        user_lng: float | None = None,
        user_city: str | None = None,
        commit: bool = True,
    ) -> bool:
        """Track impression; returns True if billed."""
        campaign = await self.get_active_campaign(
            establishment_id, user_lat=user_lat, user_lng=user_lng, user_city=user_city
        )
        if not campaign:
            return False

        cost = float(campaign.cost_per_impression or 0.05)
        if float(campaign.spent_today or 0) + cost > float(campaign.budget_daily):
            campaign.status = "exhausted"
            await self._sync_sponsored_flag(establishment_id)
            if commit:
                await self.db.commit()
            else:
                await self.db.flush()
            return False

        if campaign.budget_total is not None and float(campaign.total_spent or 0) + cost > float(
            campaign.budget_total
        ):
            campaign.status = "exhausted"
            await self._sync_sponsored_flag(establishment_id)
            if commit:
                await self.db.commit()
            else:
                await self.db.flush()
            return False

        campaign.impressions += 1
        campaign.spent_today = float(campaign.spent_today or 0) + cost
        campaign.total_spent = float(campaign.total_spent or 0) + cost
        if commit:
            await self.db.commit()
        else:
            await self.db.flush()
        return True

    async def record_click(
        self,
        establishment_id: UUID,
        campaign_id: UUID | None = None,
        *,
        user_lat: float | None = None,
        user_lng: float | None = None,
        user_city: str | None = None,
    ) -> bool:
        if campaign_id:
            result = await self.db.execute(
                select(AdCampaign).where(
                    AdCampaign.id == campaign_id,
                    AdCampaign.establishment_id == establishment_id,
                )
            )
            campaign = result.scalar_one_or_none()
        else:
            campaign = await self.get_active_campaign(
                establishment_id, user_lat=user_lat, user_lng=user_lng, user_city=user_city
            )
        if not campaign:
            return False
        campaign.clicks += 1
        await self.db.commit()
        return True

    async def reset_daily_ad_spend(self) -> int:
        """Reset spent_today and re-activate exhausted campaigns (runs at midnight)."""
        from app.models.plugin import AdCampaignStatus

        result = await self.db.execute(select(AdCampaign))
        campaigns = result.scalars().all()
        count = 0
        est_ids: set[UUID] = set()
        for campaign in campaigns:
            if float(campaign.spent_today or 0) > 0:
                campaign.spent_today = 0
                count += 1
            if campaign.status == AdCampaignStatus.exhausted.value and campaign.active:
                if campaign.budget_total is None or float(campaign.total_spent or 0) < float(
                    campaign.budget_total
                ):
                    campaign.status = AdCampaignStatus.active.value
            est_ids.add(campaign.establishment_id)
        if campaigns:
            await self.db.commit()
        for est_id in est_ids:
            await self._sync_sponsored_flag(est_id)
        if est_ids:
            await self.db.commit()
        return count

    async def _sync_sponsored_flag(self, establishment_id: UUID) -> None:
        from app.core.ad_campaign_helpers import campaign_is_running

        today = datetime.now(UTC).date()
        result = await self.db.execute(
            select(AdCampaign).where(
                AdCampaign.establishment_id == establishment_id,
                AdCampaign.active == True,
                AdCampaign.start_date <= today,
                (AdCampaign.end_date.is_(None)) | (AdCampaign.end_date >= today),
            )
        )
        campaigns = result.scalars().all()
        has_active = any(campaign_is_running(c) for c in campaigns)
        est = await self.db.get(Establishment, establishment_id)
        if est:
            est.is_sponsored = has_active
            if has_active and campaigns:
                best = max(campaigns, key=lambda c: (c.priority, c.created_at))
                est.sponsored_until = (
                    datetime.combine(best.end_date, datetime.min.time()).replace(tzinfo=UTC)
                    if best.end_date
                    else None
                )
            elif not has_active:
                est.sponsored_until = None
