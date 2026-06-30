import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.asset import AssetType


class AssetCreate(BaseModel):
    name: str
    asset_type: AssetType
    location: str | None = None
    description: str | None = None
    commissioned_at: datetime | None = None


class AssetUpdate(BaseModel):
    name: str | None = None
    asset_type: AssetType | None = None
    location: str | None = None
    description: str | None = None


class AssetOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    asset_type: AssetType
    location: str | None
    description: str | None
    commissioned_at: datetime | None
    created_at: datetime
