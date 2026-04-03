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


class NoiseRaw(Base):
    __tablename__ = "noise_raw"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    region_id = Column(
        BigInteger, ForeignKey("regions.id"), nullable=False, index=True
    )
    region_type = Column(
        String(20),
        nullable=False,
        comment="residential/road_park/main_street",
    )
    max_noise = Column(Float, nullable=False)
    min_noise = Column(Float, nullable=False)
    avg_noise = Column(Float, nullable=False)
    measured_at = Column(Date, nullable=False)
    source = Column(String(50), default="data.go.kr")
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    region = relationship("Region", back_populates="noise_raw")

    __table_args__ = (
        Index("idx_noise_raw_region_date", "region_id", "measured_at"),
        UniqueConstraint(
            "region_id",
            "region_type",
            "measured_at",
            name="uk_noise_raw_region_type_date",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<NoiseRaw(id={self.id}, region_id={self.region_id}, "
            f"avg={self.avg_noise}, date={self.measured_at})>"
        )


class NoiseSummary(Base):
    __tablename__ = "noise_summary"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    region_id = Column(
        BigInteger,
        ForeignKey("regions.id"),
        unique=True,
        nullable=False,
    )
    avg_noise = Column(Float, nullable=False)
    noise_level = Column(
        String(20),
        nullable=False,
        comment="quiet/normal/loud/very_loud",
    )
    noise_color = Column(
        String(10),
        nullable=False,
        comment="green/yellow/red/black",
    )
    sample_count = Column(Integer, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationship
    region = relationship("Region", back_populates="noise_summary")

    def __repr__(self) -> str:
        return (
            f"<NoiseSummary(id={self.id}, region_id={self.region_id}, "
            f"level={self.noise_level})>"
        )
