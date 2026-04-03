from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.region import Region


class RegionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Region]:
        result = await self.db.execute(select(Region))
        return list(result.scalars().all())

    async def get_by_id(self, region_id: int) -> Region | None:
        result = await self.db.execute(
            select(Region).where(Region.id == region_id)
        )
        return result.scalar_one_or_none()

    async def search(self, query: str, limit: int = 10) -> list[Region]:
        like_pattern = f"%{query}%"
        result = await self.db.execute(
            select(Region)
            .where(
                (Region.district_name.like(like_pattern))
                | (Region.dong_name.like(like_pattern))
            )
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_district_codes(
        self, district: str | None = None
    ) -> list[tuple[str, str]]:
        stmt = select(Region.district_name, Region.district_code).distinct()
        if district:
            stmt = stmt.where(Region.district_name == district)
        result = await self.db.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]
