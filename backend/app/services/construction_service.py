import json
import logging
from datetime import date

from app.repositories.construction_repo import ConstructionRepository
from app.schemas.common import PaginatedResponse
from app.schemas.construction import ConstructionMapResponse, ConstructionResponse
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)


class ConstructionService:
    def __init__(self, repo: ConstructionRepository, cache: CacheService):
        self._repo = repo
        self._cache = cache

    async def get_construction_data(
        self,
        district: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        size: int = 20,
    ) -> PaginatedResponse[ConstructionResponse]:
        """Get paginated construction permit data (TTL 600 = 10min)."""

        cache_key = (
            f"construction:data:{district}:"
            f"{date_from}:{date_to}:{page}:{size}"
        )

        async def _fetch() -> str:
            offset = (page - 1) * size
            rows, total = await self._repo.get_permits(
                district=district,
                date_from=date_from,
                date_to=date_to,
                offset=offset,
                limit=size,
            )
            items = [
                ConstructionResponse(
                    id=c.id,
                    region_id=c.region_id,
                    district_name=c.region.district_name,
                    dong_name=c.region.dong_name,
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
                for c in rows
            ]
            result = PaginatedResponse[ConstructionResponse].create(
                items=items,
                total=total,
                page=page,
                size=size,
            )
            return result.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=600)
        data = json.loads(raw)
        return PaginatedResponse[ConstructionResponse].model_validate(data)

    async def get_construction_map(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> ConstructionMapResponse:
        """Get all construction permits for map display (TTL 3600 = 1h)."""

        cache_key = f"construction:map:{date_from}:{date_to}"

        async def _fetch() -> str:
            # Fetch all permits (no pagination) for map
            rows, _total = await self._repo.get_permits(
                date_from=date_from,
                date_to=date_to,
                status="not_completed",
                offset=0,
                limit=10000,
            )
            items = [
                ConstructionResponse(
                    id=c.id,
                    region_id=c.region_id,
                    district_name=c.region.district_name,
                    dong_name=c.region.dong_name,
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
                for c in rows
            ]
            resp = ConstructionMapResponse(items=items)
            return resp.model_dump_json()

        raw = await self._cache.get_or_set(cache_key, _fetch, ttl=3600)
        data = json.loads(raw)
        return ConstructionMapResponse.model_validate(data)
