import json
import logging
from datetime import date

from app.repositories.noise_repo import NoiseRepository
from app.schemas.common import PaginatedResponse
from app.schemas.noise import NoiseMapResponse, NoiseResponse, NoiseSummaryResponse
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)


class NoiseService:
    def __init__(self, repo: NoiseRepository, cache: CacheService):
        self._repo = repo
        self._cache = cache

    async def get_noise_data(
        self,
        district: str | None = None,
        dong: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        size: int = 20,
    ) -> PaginatedResponse[NoiseResponse]:
        """Get paginated noise raw data with caching (TTL 300 = 5min)."""

        cache_key = (
            f"noise:data:{district}:{dong}:"
            f"{date_from}:{date_to}:{page}:{size}"
        )

        async def _fetch() -> str:
            offset = (page - 1) * size
            rows, total = await self._repo.get_noise_data(
                district=district,
                dong=dong,
                date_from=date_from,
                date_to=date_to,
                offset=offset,
                limit=size,
            )
            items = [
                NoiseResponse(
                    id=r.id,
                    region_id=r.region_id,
                    district_name=r.region.district_name,
                    dong_name=r.region.dong_name,
                    region_type=r.region_type,
                    max_noise=r.max_noise,
                    min_noise=r.min_noise,
                    avg_noise=r.avg_noise,
                    measured_at=r.measured_at,
                )
                for r in rows
            ]
            result = PaginatedResponse[NoiseResponse].create(
                items=items,
                total=total,
                page=page,
                size=size,
            )
            return result.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=300)
        data = json.loads(raw)
        return PaginatedResponse[NoiseResponse].model_validate(data)

    async def get_noise_map(self) -> NoiseMapResponse:
        """Get all noise summaries for map display (TTL 3600 = 1h)."""

        cache_key = "noise:map"

        async def _fetch() -> str:
            summaries = await self._repo.get_summaries_all()
            items = [
                NoiseSummaryResponse(
                    region_id=s.region_id,
                    district_name=s.region.district_name,
                    dong_name=s.region.dong_name,
                    latitude=float(s.region.latitude),
                    longitude=float(s.region.longitude),
                    avg_noise=s.avg_noise,
                    noise_level=s.noise_level,
                    noise_color=s.noise_color,
                    sample_count=s.sample_count,
                    period_start=s.period_start,
                    period_end=s.period_end,
                )
                for s in summaries
            ]
            resp = NoiseMapResponse(items=items)
            return resp.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=3600)
        data = json.loads(raw)
        return NoiseMapResponse.model_validate(data)
