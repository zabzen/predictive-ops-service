import io
import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import CurrentUser, TenantId
from app.models.asset import Asset
from app.models.reading import Reading, ReadingSource
from app.schemas.reading import ReadingCreate, ReadingOut

router = APIRouter(prefix="/readings", tags=["readings"])

_CSV_COLUMNS = {"asset_id", "recorded_at", "temperature_c", "vibration_mm_s", "pressure_bar", "flow_rate_m3h", "operating_hours"}


def _assert_asset_belongs_to_tenant(asset_id: uuid.UUID, tenant_id: uuid.UUID, db: Session) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.tenant_id == tenant_id).first()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


@router.get("/", response_model=list[ReadingOut])
def list_readings(
    tenant_id: TenantId,
    asset_id: uuid.UUID | None = Query(None),
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
) -> list[Reading]:
    q = db.query(Reading).filter(Reading.tenant_id == tenant_id)
    if asset_id:
        q = q.filter(Reading.asset_id == asset_id)
    return q.order_by(Reading.recorded_at.desc()).limit(limit).all()


@router.post("/", response_model=ReadingOut, status_code=status.HTTP_201_CREATED)
def create_reading(body: ReadingCreate, tenant_id: TenantId, db: Session = Depends(get_db)) -> Reading:
    _assert_asset_belongs_to_tenant(body.asset_id, tenant_id, db)
    reading = Reading(tenant_id=tenant_id, source=ReadingSource.manual, **body.model_dump())
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.post("/upload-csv", status_code=status.HTTP_201_CREATED)
async def upload_csv(
    file: UploadFile = File(...),
    tenant_id: TenantId = Depends(),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Bulk-ingest readings from a CSV file.

    Required columns: asset_id, recorded_at
    Optional: temperature_c, vibration_mm_s, pressure_bar, flow_rate_m3h, operating_hours
    """
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content), parse_dates=["recorded_at"])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"CSV parse error: {exc}") from exc

    missing = {"asset_id", "recorded_at"} - set(df.columns)
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing required columns: {missing}")

    # Validate all asset_ids belong to this tenant in one query
    asset_ids = [uuid.UUID(str(a)) for a in df["asset_id"].unique()]
    valid_ids = {
        row.id
        for row in db.query(Asset.id).filter(Asset.id.in_(asset_ids), Asset.tenant_id == tenant_id).all()
    }
    invalid = set(asset_ids) - valid_ids
    if invalid:
        raise HTTPException(status_code=422, detail=f"Unknown asset_ids: {[str(i) for i in invalid]}")

    rows: list[Reading] = []
    for _, row in df.iterrows():
        rows.append(
            Reading(
                tenant_id=tenant_id,
                asset_id=uuid.UUID(str(row["asset_id"])),
                recorded_at=row["recorded_at"].to_pydatetime().replace(tzinfo=timezone.utc),
                source=ReadingSource.csv_upload,
                temperature_c=row.get("temperature_c") if "temperature_c" in df.columns else None,
                vibration_mm_s=row.get("vibration_mm_s") if "vibration_mm_s" in df.columns else None,
                pressure_bar=row.get("pressure_bar") if "pressure_bar" in df.columns else None,
                flow_rate_m3h=row.get("flow_rate_m3h") if "flow_rate_m3h" in df.columns else None,
                operating_hours=row.get("operating_hours") if "operating_hours" in df.columns else None,
            )
        )

    db.bulk_save_objects(rows)
    db.commit()
    return {"inserted": len(rows)}
