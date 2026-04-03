from datetime import date

from pydantic import BaseModel, ConfigDict


class RealEstateTradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    region_id: int
    district_name: str
    dong_name: str
    trade_type: str
    building_type: str
    building_name: str | None
    exclusive_area: float | None
    floor: int | None
    price: int
    monthly_rent: int | None
    build_year: int | None
    trade_date: date | None
    address: str | None


class RealEstateSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    region_id: int
    district_name: str
    dong_name: str
    trade_type: str
    avg_price: int | None
    min_price: int | None
    max_price: int | None
    avg_monthly_rent: int | None = None
    trade_count: int | None
    period_start: date | None
    period_end: date | None
    naver_link: str | None


class RealEstateMapResponse(BaseModel):
    items: list[RealEstateSummaryResponse]


class NaverLinkResponse(BaseModel):
    district_name: str
    dong_name: str
    naver_url: str
