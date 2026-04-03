from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.database import get_db
from app.redis import get_redis
from app.repositories.region_repo import RegionRepository
from app.repositories.noise_repo import NoiseRepository
from app.repositories.construction_repo import ConstructionRepository
from app.repositories.real_estate_repo import RealEstateRepository
from app.services.region_service import RegionService
from app.services.cache_service import CacheService

router = APIRouter(prefix="/api/v1", tags=["compare"])


@router.get("/compare")
async def compare_regions(
    regions: str = Query(..., description="Comma-separated region IDs (e.g., 1,2)"),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    region_ids = [int(rid.strip()) for rid in regions.split(",") if rid.strip()]
    service = RegionService(RegionRepository(db), CacheService(redis))
    noise_repo = NoiseRepository(db)
    construction_repo = ConstructionRepository(db)
    real_estate_repo = RealEstateRepository(db)

    results = []
    for rid in region_ids[:3]:  # Max 3 regions
        detail = await service.get_region_detail(rid, noise_repo, construction_repo, real_estate_repo)
        if detail:
            results.append(detail)

    return {"regions": results}
