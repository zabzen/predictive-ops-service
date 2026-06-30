import uuid
from datetime import datetime

from pydantic import BaseModel


class RiskScoreOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    asset_id: uuid.UUID
    tenant_id: uuid.UUID
    model_version: str
    scored_at: datetime
    risk_probability: float
    forecast_horizon_days: int
    feature_contributions: str | None
    notes: str | None
    created_at: datetime
