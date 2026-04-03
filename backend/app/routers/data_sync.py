from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.database import get_db
from app.redis import get_redis
from app.repositories.region_repo import RegionRepository
from app.repositories.noise_repo import NoiseRepository
from app.repositories.construction_repo import ConstructionRepository
from app.repositories.real_estate_repo import RealEstateRepository
from app.services.data_collector import DataCollector
from app.services.cache_service import CacheService
from app.schemas.data_sync import SyncRequest, SyncResponse

router = APIRouter(prefix="/api/v1/data/sync", tags=["data-sync"])


def get_data_collector(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    return DataCollector(
        region_repo=RegionRepository(db),
        noise_repo=NoiseRepository(db),
        construction_repo=ConstructionRepository(db),
        real_estate_repo=RealEstateRepository(db),
        cache=CacheService(redis),
    )


@router.post("/noise", response_model=SyncResponse)
async def sync_noise_data(
    request: SyncRequest,
    collector: DataCollector = Depends(get_data_collector),
):
    return await collector.sync_noise_data(request.district, request.year_month)


@router.post("/construction", response_model=SyncResponse)
async def sync_construction_data(
    request: SyncRequest,
    collector: DataCollector = Depends(get_data_collector),
):
    """Try SafetyData(공유플랫폼) first, then SafeMap, then 국토교통부."""
    result = await collector.sync_construction_safetydata(request.district, request.year_month)
    if result.status == "failed" and result.collected_count == 0:
        result = await collector.sync_construction_safemap(request.district, request.year_month)
    if result.status == "failed" and result.collected_count == 0:
        result = await collector.sync_construction_data(request.district, request.year_month)
    return result


@router.post("/dust-emission", response_model=SyncResponse)
async def sync_dust_emission_data(
    request: SyncRequest,
    collector: DataCollector = Depends(get_data_collector),
):
    """Sync dust emission construction data from 비산먼지발생사업정보 API."""
    return await collector.sync_dust_emission(request.district)


@router.post("/construction/geocode", response_model=SyncResponse)
async def geocode_construction_data(
    collector: DataCollector = Depends(get_data_collector),
):
    """Fill missing coordinates for construction records using Kakao geocoding."""
    return await collector.geocode_constructions()


@router.post("/real-estate", response_model=SyncResponse)
async def sync_real_estate_data(
    request: SyncRequest,
    collector: DataCollector = Depends(get_data_collector),
):
    return await collector.sync_real_estate_data(request.district, request.year_month)
