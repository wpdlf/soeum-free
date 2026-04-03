from pydantic import BaseModel, Field


class SyncRequest(BaseModel):
    district: str | None = None
    year_month: str | None = Field(
        default=None,
        pattern=r"^\d{4}(0[1-9]|1[0-2])$",
    )


class SyncResponse(BaseModel):
    status: str
    collected_count: int
    error_count: int
    duration_seconds: float
    details: list[str]
