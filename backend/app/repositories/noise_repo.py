from datetime import date

from sqlalchemy import func, select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.noise import NoiseRaw, NoiseSummary
from app.models.region import Region


class NoiseRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_noise_data(
        self,
        district: str | None = None,
        dong: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[NoiseRaw], int]:
        base_stmt = (
            select(NoiseRaw)
            .join(Region, NoiseRaw.region_id == Region.id)
        )
        count_stmt = (
            select(func.count(NoiseRaw.id))
            .join(Region, NoiseRaw.region_id == Region.id)
        )

        if district:
            base_stmt = base_stmt.where(Region.district_name == district)
            count_stmt = count_stmt.where(Region.district_name == district)
        if dong:
            base_stmt = base_stmt.where(Region.dong_name == dong)
            count_stmt = count_stmt.where(Region.dong_name == dong)
        if date_from:
            base_stmt = base_stmt.where(NoiseRaw.measured_at >= date_from)
            count_stmt = count_stmt.where(NoiseRaw.measured_at >= date_from)
        if date_to:
            base_stmt = base_stmt.where(NoiseRaw.measured_at <= date_to)
            count_stmt = count_stmt.where(NoiseRaw.measured_at <= date_to)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        data_stmt = (
            base_stmt
            .order_by(NoiseRaw.measured_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(data_stmt)
        rows = list(result.scalars().all())

        return rows, total

    async def get_summary_by_region(
        self, region_id: int
    ) -> NoiseSummary | None:
        result = await self.db.execute(
            select(NoiseSummary).where(NoiseSummary.region_id == region_id)
        )
        return result.scalar_one_or_none()

    async def get_summaries_all(self) -> list[NoiseSummary]:
        result = await self.db.execute(
            select(NoiseSummary)
            .options(selectinload(NoiseSummary.region))
        )
        return list(result.scalars().all())

    async def bulk_upsert_raw(self, records: list[dict]) -> int:
        if not records:
            return 0

        # Batch insert (no unique constraint on raw data)
        inserted = 0
        batch_size = 200
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            stmt = mysql_insert(NoiseRaw).values(batch)
            result = await self.db.execute(stmt)
            inserted += result.rowcount
        await self.db.flush()
        return inserted

    async def bulk_upsert_summary(self, records: list[dict]) -> int:
        if not records:
            return 0

        stmt = mysql_insert(NoiseSummary).values(records)
        stmt = stmt.on_duplicate_key_update(
            avg_noise=stmt.inserted.avg_noise,
            noise_level=stmt.inserted.noise_level,
            noise_color=stmt.inserted.noise_color,
            sample_count=stmt.inserted.sample_count,
            period_start=stmt.inserted.period_start,
            period_end=stmt.inserted.period_end,
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount
