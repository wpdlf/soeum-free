from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.models.base import Base


class ConstructionPermit(Base):
    __tablename__ = "construction_permits"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    region_id = Column(
        BigInteger, ForeignKey("regions.id"), nullable=False, index=True
    )
    permit_number = Column(String(50), unique=True, nullable=True)
    project_name = Column(String(200), nullable=True)
    building_type = Column(String(100), nullable=True)
    permit_date = Column(Date, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    address = Column(String(300), nullable=True)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)
    status = Column(
        String(20),
        nullable=True,
        comment="permitted/in_progress/completed",
    )
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    region = relationship("Region", back_populates="construction_permits")

    __table_args__ = (
        Index("idx_construction_region_date", "region_id", "permit_date"),
    )

    def __repr__(self) -> str:
        return (
            f"<ConstructionPermit(id={self.id}, permit={self.permit_number}, "
            f"status={self.status})>"
        )
