from fastapi import APIRouter, Depends, Query, HTTPException
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

router = APIRouter(prefix="/api/v1/regions", tags=["regions"])


def get_region_service(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    return RegionService(RegionRepository(db), CacheService(redis))


def get_repos(db: AsyncSession = Depends(get_db)):
    return {
        "noise": NoiseRepository(db),
        "construction": ConstructionRepository(db),
        "real_estate": RealEstateRepository(db),
    }


@router.get("")
async def get_regions(
    service: RegionService = Depends(get_region_service),
):
    return await service.get_all_regions()


@router.get("/search")
async def search_regions(
    q: str = Query(..., min_length=1),
    service: RegionService = Depends(get_region_service),
):
    return await service.search_regions(q)


@router.get("/{region_id}")
async def get_region_detail(
    region_id: int,
    service: RegionService = Depends(get_region_service),
    repos: dict = Depends(get_repos),
):
    result = await service.get_region_detail(
        region_id, repos["noise"], repos["construction"], repos["real_estate"]
    )
    if result is None:
        raise HTTPException(
            status_code=404, detail=f"Region {region_id} not found"
        )
    return result
