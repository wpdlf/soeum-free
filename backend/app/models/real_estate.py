from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.models.base import Base


class RealEstateTrade(Base):
    __tablename__ = "real_estate_trades"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    region_id = Column(
        BigInteger, ForeignKey("regions.id"), nullable=False, index=True
    )
    trade_type = Column(
        String(20),
        nullable=False,
        comment="sale/jeonse/monthly",
    )
    building_type = Column(
        String(20),
        nullable=False,
        comment="apartment/villa/officetel/house",
    )
    building_name = Column(String(100), nullable=True)
    exclusive_area = Column(Float, nullable=True)
    floor = Column(Integer, nullable=True)
    price = Column(Integer, nullable=False, comment="만원")
    monthly_rent = Column(Integer, nullable=True, comment="월세 만원")
    build_year = Column(Integer, nullable=True)
    trade_date = Column(Date, nullable=True)
    address = Column(String(300), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    region = relationship("Region", back_populates="real_estate_trades")

    __table_args__ = (
        Index(
            "idx_trade_region_type_date",
            "region_id",
            "trade_type",
            "trade_date",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<RealEstateTrade(id={self.id}, type={self.trade_type}, "
            f"price={self.price})>"
        )


class RealEstateSummary(Base):
    __tablename__ = "real_estate_summary"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    region_id = Column(
        BigInteger, ForeignKey("regions.id"), nullable=False, index=True
    )
    trade_type = Column(String(20), nullable=False)
    building_type = Column(String(20), nullable=True, comment="apartment/multiplex/officetel")
    avg_price = Column(Integer, nullable=True)
    min_price = Column(Integer, nullable=True)
    max_price = Column(Integer, nullable=True)
    avg_monthly_rent = Column(Integer, nullable=True, comment="월세 평균 만원")
    trade_count = Column(Integer, nullable=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    naver_link = Column(String(500), nullable=True)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationship
    region = relationship("Region", back_populates="real_estate_summary")

    __table_args__ = (
        UniqueConstraint(
            "region_id", "trade_type", "building_type", name="uk_re_summary_region_type_bldg"
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<RealEstateSummary(id={self.id}, region_id={self.region_id}, "
            f"type={self.trade_type})>"
        )
