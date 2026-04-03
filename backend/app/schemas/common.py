from datetime import date, datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    total_pages: int

    @classmethod
    def create(cls, items: list[T], total: int, page: int, size: int):
        return cls(
            items=items,
            total=total,
            page=page,
            size=size,
            total_pages=(total + size - 1) // size,
        )


class ErrorResponse(BaseModel):
    success: bool = False
    error: dict
