from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from app.schemas.construction import ConstructionResponse
from app.schemas.noise import NoiseSummaryResponse
from app.schemas.real_estate import RealEstateSummaryResponse


class RegionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    district_name: str
    dong_name: str
    district_code: str | None
    latitude: float
    longitude: float


class RegionSearchResponse(BaseModel):
    items: list[RegionResponse]
    query: str


class RegionDetailResponse(BaseModel):
    region: RegionResponse
    noise: NoiseSummaryResponse | None
    construction_count: int
    active_constructions: list[ConstructionResponse]
    real_estate: list[RealEstateSummaryResponse]
