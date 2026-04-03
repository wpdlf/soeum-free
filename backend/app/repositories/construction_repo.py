from datetime import date

from sqlalchemy import func, select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.construction import ConstructionPermit
from app.models.region import Region


class ConstructionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_permits(
        self,
        district: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        status: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[ConstructionPermit], int]:
        base_stmt = (
            select(ConstructionPermit)
            .join(Region, ConstructionPermit.region_id == Region.id)
            .options(selectinload(ConstructionPermit.region))
        )
        count_stmt = (
            select(func.count(ConstructionPermit.id))
            .join(Region, ConstructionPermit.region_id == Region.id)
        )

        if district:
            base_stmt = base_stmt.where(Region.district_name == district)
            count_stmt = count_stmt.where(Region.district_name == district)
        if date_from:
            base_stmt = base_stmt.where(
                ConstructionPermit.permit_date >= date_from
            )
            count_stmt = count_stmt.where(
                ConstructionPermit.permit_date >= date_from
            )
        if date_to:
            base_stmt = base_stmt.where(
                ConstructionPermit.permit_date <= date_to
            )
            count_stmt = count_stmt.where(
                ConstructionPermit.permit_date <= date_to
            )
        if status == "not_completed":
            base_stmt = base_stmt.where(
                ConstructionPermit.status != "completed"
            )
            count_stmt = count_stmt.where(
                ConstructionPermit.status != "completed"
            )
        elif status:
            base_stmt = base_stmt.where(
                ConstructionPermit.status == status
            )
            count_stmt = count_stmt.where(
                ConstructionPermit.status == status
            )

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        data_stmt = (
            base_stmt
            .order_by(ConstructionPermit.permit_date.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(data_stmt)
        rows = list(result.scalars().all())

        return rows, total

    async def get_active_by_region(
        self, region_id: int
    ) -> list[ConstructionPermit]:
        result = await self.db.execute(
            select(ConstructionPermit)
            .where(ConstructionPermit.region_id == region_id)
            .where(ConstructionPermit.status != "completed")
            .order_by(ConstructionPermit.permit_date.desc())
        )
        return list(result.scalars().all())

    async def count_by_region(self, region_id: int) -> int:
        result = await self.db.execute(
            select(func.count(ConstructionPermit.id)).where(
                ConstructionPermit.region_id == region_id
            )
        )
        return result.scalar() or 0

    async def bulk_upsert(self, records: list[dict]) -> int:
        if not records:
            return 0

        stmt = mysql_insert(ConstructionPermit).values(records)
        stmt = stmt.on_duplicate_key_update(
            project_name=stmt.inserted.project_name,
            building_type=stmt.inserted.building_type,
            permit_date=stmt.inserted.permit_date,
            start_date=stmt.inserted.start_date,
            end_date=stmt.inserted.end_date,
            address=stmt.inserted.address,
            latitude=stmt.inserted.latitude,
            longitude=stmt.inserted.longitude,
            status=stmt.inserted.status,
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount
