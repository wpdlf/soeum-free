from datetime import date

from sqlalchemy import func, select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.real_estate import RealEstateSummary, RealEstateTrade
from app.models.region import Region


class RealEstateRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_trades(
        self,
        district: str | None = None,
        dong: str | None = None,
        trade_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[RealEstateTrade], int]:
        base_stmt = (
            select(RealEstateTrade)
            .join(Region, RealEstateTrade.region_id == Region.id)
        )
        count_stmt = (
            select(func.count(RealEstateTrade.id))
            .join(Region, RealEstateTrade.region_id == Region.id)
        )

        if district:
            base_stmt = base_stmt.where(Region.district_name == district)
            count_stmt = count_stmt.where(Region.district_name == district)
        if dong:
            base_stmt = base_stmt.where(Region.dong_name == dong)
            count_stmt = count_stmt.where(Region.dong_name == dong)
        if trade_type:
            base_stmt = base_stmt.where(
                RealEstateTrade.trade_type == trade_type
            )
            count_stmt = count_stmt.where(
                RealEstateTrade.trade_type == trade_type
            )
        if date_from:
            base_stmt = base_stmt.where(
                RealEstateTrade.trade_date >= date_from
            )
            count_stmt = count_stmt.where(
                RealEstateTrade.trade_date >= date_from
            )
        if date_to:
            base_stmt = base_stmt.where(
                RealEstateTrade.trade_date <= date_to
            )
            count_stmt = count_stmt.where(
                RealEstateTrade.trade_date <= date_to
            )

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        data_stmt = (
            base_stmt
            .order_by(RealEstateTrade.trade_date.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(data_stmt)
        rows = list(result.scalars().all())

        return rows, total

    async def get_summaries_by_region(
        self,
        region_id: int,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[RealEstateSummary]:
        stmt = select(RealEstateSummary).where(
            RealEstateSummary.region_id == region_id
        )
        if date_from:
            stmt = stmt.where(RealEstateSummary.period_end >= date_from)
        if date_to:
            stmt = stmt.where(RealEstateSummary.period_start <= date_to)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def bulk_upsert_trades(self, records: list[dict]) -> int:
        if not records:
            return 0

        stmt = mysql_insert(RealEstateTrade).values(records)
        # RealEstateTrade has no unique constraint beyond PK,
        # so we use insert-ignore semantics or just insert.
        # For idempotent upserts, the caller should ensure no duplicates.
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount

    async def bulk_upsert_summary(self, records: list[dict]) -> int:
        if not records:
            return 0

        stmt = mysql_insert(RealEstateSummary).values(records)
        stmt = stmt.on_duplicate_key_update(
            avg_price=stmt.inserted.avg_price,
            min_price=stmt.inserted.min_price,
            max_price=stmt.inserted.max_price,
            avg_monthly_rent=stmt.inserted.avg_monthly_rent,
            trade_count=stmt.inserted.trade_count,
            period_start=stmt.inserted.period_start,
            period_end=stmt.inserted.period_end,
            naver_link=stmt.inserted.naver_link,
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount
