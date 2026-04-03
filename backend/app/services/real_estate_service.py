import json
import logging
from datetime import date

from app.repositories.real_estate_repo import RealEstateRepository
from app.schemas.common import PaginatedResponse
from app.schemas.real_estate import (
    NaverLinkResponse,
    RealEstateMapResponse,
    RealEstateSummaryResponse,
    RealEstateTradeResponse,
)
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)


class RealEstateService:
    def __init__(self, repo: RealEstateRepository, cache: CacheService):
        self._repo = repo
        self._cache = cache

    async def get_trades(
        self,
        district: str | None = None,
        dong: str | None = None,
        trade_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        size: int = 20,
    ) -> PaginatedResponse[RealEstateTradeResponse]:
        """Get paginated real estate trade data (TTL 1800 = 30min)."""

        cache_key = (
            f"realestate:trades:{district}:{dong}:{trade_type}:"
            f"{date_from}:{date_to}:{page}:{size}"
        )

        async def _fetch() -> str:
            offset = (page - 1) * size
            rows, total = await self._repo.get_trades(
                district=district,
                dong=dong,
                trade_type=trade_type,
                date_from=date_from,
                date_to=date_to,
                offset=offset,
                limit=size,
            )
            items = [
                RealEstateTradeResponse(
                    id=t.id,
                    region_id=t.region_id,
                    district_name=t.region.district_name,
                    dong_name=t.region.dong_name,
                    trade_type=t.trade_type,
                    building_type=t.building_type,
                    building_name=t.building_name,
                    exclusive_area=t.exclusive_area,
                    floor=t.floor,
                    price=t.price,
                    monthly_rent=t.monthly_rent,
                    build_year=t.build_year,
                    trade_date=t.trade_date,
                    address=t.address,
                )
                for t in rows
            ]
            result = PaginatedResponse[RealEstateTradeResponse].create(
                items=items,
                total=total,
                page=page,
                size=size,
            )
            return result.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=1800)
        data = json.loads(raw)
        return PaginatedResponse[RealEstateTradeResponse].model_validate(data)

    async def get_map_data(self) -> RealEstateMapResponse:
        """Get all real estate summaries for map display (TTL 3600 = 1h)."""

        cache_key = "realestate:map"

        async def _fetch() -> str:
            # Fetch all summaries across all regions
            from sqlalchemy import select
            from app.models.real_estate import RealEstateSummary
            from app.models.region import Region

            db = self._repo.db
            result = await db.execute(
                select(RealEstateSummary)
                .join(Region, RealEstateSummary.region_id == Region.id)
            )
            summaries = list(result.scalars().all())

            items = [
                RealEstateSummaryResponse(
                    region_id=s.region_id,
                    district_name=s.region.district_name,
                    dong_name=s.region.dong_name,
                    trade_type=s.trade_type,
                    avg_price=s.avg_price,
                    min_price=s.min_price,
                    max_price=s.max_price,
                    trade_count=s.trade_count,
                    period_start=s.period_start,
                    period_end=s.period_end,
                    naver_link=s.naver_link,
                )
                for s in summaries
            ]
            resp = RealEstateMapResponse(items=items)
            return resp.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=3600)
        data = json.loads(raw)
        return RealEstateMapResponse.model_validate(data)

    async def get_naver_link(
        self,
        district: str,
        dong: str,
    ) -> NaverLinkResponse:
        """Generate Naver Land search link (TTL 604800 = 7 days)."""

        cache_key = f"realestate:naver:{district}:{dong}"

        async def _fetch() -> str:
            naver_url = (
                f"https://land.naver.com/search/result?query={district}+{dong}"
            )
            resp = NaverLinkResponse(
                district_name=district,
                dong_name=dong,
                naver_url=naver_url,
            )
            return resp.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=604800)
        data = json.loads(raw)
        return NaverLinkResponse.model_validate(data)
