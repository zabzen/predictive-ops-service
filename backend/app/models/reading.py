import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.asset import Asset


class ReadingSource(str, Enum):
    manual = "manual"
    csv_upload = "csv_upload"
    api_pull = "api_pull"


class Reading(Base):
    """A single sensor/measurement reading for an asset at a point in time."""

    __tablename__ = "readings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # tenant_id denormalised here so every table is independently scopeable
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    source: Mapped[ReadingSource] = mapped_column(String(32), nullable=False, default=ReadingSource.manual)

    # Core sensor values — nullable so partial readings are allowed
    temperature_c: Mapped[float | None] = mapped_column(Float)
    vibration_mm_s: Mapped[float | None] = mapped_column(Float)
    pressure_bar: Mapped[float | None] = mapped_column(Float)
    flow_rate_m3h: Mapped[float | None] = mapped_column(Float)
    operating_hours: Mapped[float | None] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    asset: Mapped["Asset"] = relationship(back_populates="readings")
