from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.database import get_db
from app.redis import get_redis
from app.repositories.noise_repo import NoiseRepository
from app.services.noise_service import NoiseService
from app.services.cache_service import CacheService

router = APIRouter(prefix="/api/v1/noise", tags=["noise"])


def get_noise_service(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    return NoiseService(NoiseRepository(db), CacheService(redis))


@router.get("")
async def get_noise_data(
    district: str | None = None,
    dong: str | None = None,
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    service: NoiseService = Depends(get_noise_service),
):
    return await service.get_noise_data(
        district=district,
        dong=dong,
        date_from=date_from,
        date_to=date_to,
        page=page,
        size=size,
    )


@router.get("/map")
async def get_noise_map(
    service: NoiseService = Depends(get_noise_service),
):
    return await service.get_noise_map()
