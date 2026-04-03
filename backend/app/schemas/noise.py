from datetime import date

from pydantic import BaseModel, ConfigDict


class NoiseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    region_id: int
    district_name: str
    dong_name: str
    region_type: str
    max_noise: float
    min_noise: float
    avg_noise: float
    measured_at: date


class NoiseSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    region_id: int
    district_name: str
    dong_name: str
    latitude: float
    longitude: float
    avg_noise: float
    noise_level: str
    noise_color: str
    sample_count: int
    period_start: date
    period_end: date


class NoiseMapResponse(BaseModel):
    items: list[NoiseSummaryResponse]
