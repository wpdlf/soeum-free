from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.models.base import Base


class Region(Base):
    __tablename__ = "regions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    district_name = Column(String(50), nullable=False, comment="구 이름")
    dong_name = Column(String(50), nullable=False, comment="동 이름")
    district_code = Column(String(10), nullable=True, comment="법정동 코드 5자리")
    latitude = Column(Numeric(10, 7), nullable=False)
    longitude = Column(Numeric(10, 7), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    noise_raw = relationship("NoiseRaw", back_populates="region", lazy="selectin")
    noise_summary = relationship(
        "NoiseSummary", back_populates="region", uselist=False, lazy="selectin"
    )
    construction_permits = relationship(
        "ConstructionPermit", back_populates="region", lazy="selectin"
    )
    real_estate_trades = relationship(
        "RealEstateTrade", back_populates="region", lazy="selectin"
    )
    real_estate_summary = relationship(
        "RealEstateSummary", back_populates="region", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint("district_name", "dong_name", name="uk_district_dong"),
        Index("idx_district", "district_name"),
        Index("idx_dong", "dong_name"),
    )

    def __repr__(self) -> str:
        return f"<Region(id={self.id}, district={self.district_name}, dong={self.dong_name})>"
