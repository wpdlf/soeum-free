from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.database import get_db
from app.redis import get_redis
from app.repositories.construction_repo import ConstructionRepository
from app.services.construction_service import ConstructionService
from app.services.cache_service import CacheService

router = APIRouter(prefix="/api/v1/construction", tags=["construction"])


def get_construction_service(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    return ConstructionService(ConstructionRepository(db), CacheService(redis))


@router.get("")
async def get_construction_data(
    district: str | None = None,
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    service: ConstructionService = Depends(get_construction_service),
):
    return await service.get_construction_data(
        district=district,
        date_from=date_from,
        date_to=date_to,
        page=page,
        size=size,
    )


@router.get("/map")
async def get_construction_map(
    service: ConstructionService = Depends(get_construction_service),
):
    return await service.get_construction_map()
