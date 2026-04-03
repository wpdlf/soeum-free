from datetime import date

from pydantic import BaseModel, ConfigDict


class ConstructionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    region_id: int
    district_name: str
    dong_name: str
    permit_number: str | None
    project_name: str | None
    building_type: str | None
    permit_date: date | None
    start_date: date | None
    end_date: date | None
    address: str | None
    latitude: float | None
    longitude: float | None
    status: str | None


class ConstructionMapResponse(BaseModel):
    items: list[ConstructionResponse]
