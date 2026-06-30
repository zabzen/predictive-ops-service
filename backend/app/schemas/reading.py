import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.reading import ReadingSource


class ReadingCreate(BaseModel):
    asset_id: uuid.UUID
    recorded_at: datetime
    temperature_c: float | None = None
    vibration_mm_s: float | None = None
    pressure_bar: float | None = None
    flow_rate_m3h: float | None = None
    operating_hours: float | None = None


class ReadingOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    asset_id: uuid.UUID
    tenant_id: uuid.UUID
    recorded_at: datetime
    source: ReadingSource
    temperature_c: float | None
    vibration_mm_s: float | None
    pressure_bar: float | None
    flow_rate_m3h: float | None
    operating_hours: float | None
    created_at: datetime
