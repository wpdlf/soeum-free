import json
import logging
from datetime import date

from app.repositories.region_repo import RegionRepository
from app.repositories.construction_repo import ConstructionRepository
from app.repositories.noise_repo import NoiseRepository
from app.repositories.real_estate_repo import RealEstateRepository
from app.schemas.region import RegionDetailResponse, RegionResponse, RegionSearchResponse
from app.schemas.noise import NoiseSummaryResponse
from app.schemas.construction import ConstructionResponse
from app.schemas.real_estate import RealEstateSummaryResponse
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)


class RegionService:
    def __init__(self, repo: RegionRepository, cache: CacheService):
        self._repo = repo
        self._cache = cache

    async def get_all_regions(self) -> list[RegionResponse]:
        """Get all regions with caching (TTL 86400 = 24h)."""

        async def _fetch() -> str:
            regions = await self._repo.get_all()
            items = [RegionResponse.model_validate(r) for r in regions]
            return json.dumps(
                [item.model_dump(mode="json") for item in items],
                ensure_ascii=False,
            )

        raw = await self._cache.get_or_set("regions:all", _fetch, ttl=86400)
        data = json.loads(raw)
        return [RegionResponse.model_validate(item) for item in data]

    async def get_region_detail(
        self,
        region_id: int,
        noise_repo: NoiseRepository,
        construction_repo: ConstructionRepository,
        real_estate_repo: RealEstateRepository,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> RegionDetailResponse | None:
        """Get detailed region info with noise summary, construction, and
        real estate data."""

        cache_key = f"region:detail:{region_id}:{date_from}:{date_to}"

        async def _fetch() -> str:
            region = await self._repo.get_by_id(region_id)
            if region is None:
                return json.dumps(None)

            region_resp = RegionResponse.model_validate(region)

            # Noise summary
            noise_summary = await noise_repo.get_summary_by_region(region_id)
            noise_resp = None
            if noise_summary is not None:
                noise_resp = NoiseSummaryResponse(
                    region_id=noise_summary.region_id,
                    district_name=region.district_name,
                    dong_name=region.dong_name,
                    latitude=float(region.latitude),
                    longitude=float(region.longitude),
                    avg_noise=noise_summary.avg_noise,
                    noise_level=noise_summary.noise_level,
                    noise_color=noise_summary.noise_color,
                    sample_count=noise_summary.sample_count,
                    period_start=noise_summary.period_start,
                    period_end=noise_summary.period_end,
                )

            # Construction (filter by date range if provided)
            construction_count = await construction_repo.count_by_region(
                region_id, date_from=date_from, date_to=date_to
            )
            active_constructions = await construction_repo.get_active_by_region(
                region_id, date_from=date_from, date_to=date_to
            )
            active_resp = [
                ConstructionResponse(
                    id=c.id,
                    region_id=c.region_id,
                    district_name=region.district_name,
                    dong_name=region.dong_name,
                    permit_number=c.permit_number,
                    project_name=c.project_name,
                    building_type=c.building_type,
                    permit_date=c.permit_date,
                    start_date=c.start_date,
                    end_date=c.end_date,
                    address=c.address,
                    latitude=float(c.latitude) if c.latitude else None,
                    longitude=float(c.longitude) if c.longitude else None,
                    status=c.status,
                )
                for c in active_constructions
            ]

            # Real estate summaries (filter by period)
            re_summaries = await real_estate_repo.get_summaries_by_region(
                region_id, date_from=date_from, date_to=date_to
            )
            re_resp = [
                RealEstateSummaryResponse(
                    region_id=s.region_id,
                    district_name=region.district_name,
                    dong_name=region.dong_name,
                    trade_type=s.trade_type,
                    building_type=s.building_type,
                    avg_price=s.avg_price,
                    min_price=s.min_price,
                    max_price=s.max_price,
                    avg_monthly_rent=s.avg_monthly_rent,
                    trade_count=s.trade_count,
                    period_start=s.period_start,
                    period_end=s.period_end,
                    naver_link=s.naver_link,
                )
                for s in re_summaries
            ]

            detail = RegionDetailResponse(
                region=region_resp,
                noise=noise_resp,
                construction_count=construction_count,
                active_constructions=active_resp,
                real_estate=re_resp,
            )
            return detail.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=900)
        data = json.loads(raw)
        if data is None:
            return None
        return RegionDetailResponse.model_validate(data)

    async def search_regions(self, query: str) -> RegionSearchResponse:
        """Search regions by name. Cache key: regions:search:{query}, TTL 86400."""

        cache_key = f"regions:search:{query}"

        async def _fetch() -> str:
            regions = await self._repo.search(query)
            items = [RegionResponse.model_validate(r) for r in regions]
            resp = RegionSearchResponse(
                items=items,
                query=query,
            )
            return resp.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=86400)
        data = json.loads(raw)
        return RegionSearchResponse.model_validate(data)
