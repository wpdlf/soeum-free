from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.database import get_db
from app.redis import get_redis
from app.repositories.real_estate_repo import RealEstateRepository
from app.services.real_estate_service import RealEstateService
from app.services.cache_service import CacheService

router = APIRouter(prefix="/api/v1/real-estate", tags=["real-estate"])


def get_real_estate_service(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    return RealEstateService(RealEstateRepository(db), CacheService(redis))


@router.get("")
async def get_real_estate_trades(
    district: str | None = None,
    dong: str | None = None,
    trade_type: str | None = None,
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    service: RealEstateService = Depends(get_real_estate_service),
):
    return await service.get_trades(
        district=district,
        dong=dong,
        trade_type=trade_type,
        date_from=date_from,
        date_to=date_to,
        page=page,
        size=size,
    )


@router.get("/map")
async def get_real_estate_map(
    service: RealEstateService = Depends(get_real_estate_service),
):
    return await service.get_map_data()


@router.get("/link")
async def get_naver_link(
    district: str = Query(...),
    dong: str = Query(...),
    service: RealEstateService = Depends(get_real_estate_service),
):
    return await service.get_naver_link(district=district, dong=dong)
