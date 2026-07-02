import uuid

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import TenantId
from app.models.asset import Asset
from app.models.reading import Reading, ReadingSource
from app.schemas.reading import ReadingCreate, ReadingOut

router = APIRouter(prefix="/readings", tags=["readings"])

_REQUIRED_CSV_COLUMNS = {"asset_id", "recorded_at"}
_OPTIONAL_CSV_COLUMNS = [
    "temperature_c", "vibration_mm_s", "pressure_bar", "flow_rate_m3h", "operating_hours"
]


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
def upload_csv(
    file: UploadFile,
    tenant_id: TenantId,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Bulk-ingest readings from a CSV file.

    Required columns: asset_id, recorded_at
    Optional: temperature_c, vibration_mm_s, pressure_bar, flow_rate_m3h, operating_hours
    """
    try:
        df = pd.read_csv(file.file)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"CSV parse error: {exc}"
        ) from exc

    missing = _REQUIRED_CSV_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing required columns: {sorted(missing)}")

    # utc=True converts offset-bearing timestamps instead of overwriting the offset
    recorded_at = pd.to_datetime(df["recorded_at"], utc=True, errors="coerce")
    bad_dates = df.loc[recorded_at.isna(), "recorded_at"]
    if not bad_dates.empty:
        raise HTTPException(
            status_code=422, detail=f"Unparseable recorded_at values: {bad_dates.head(5).tolist()}"
        )

    uuid_by_raw: dict[object, uuid.UUID] = {}
    bad_asset_ids: list[str] = []
    for raw in df["asset_id"].unique():
        try:
            uuid_by_raw[raw] = uuid.UUID(str(raw))
        except ValueError:
            bad_asset_ids.append(str(raw))
    if bad_asset_ids:
        raise HTTPException(status_code=422, detail=f"Invalid asset_id values: {bad_asset_ids[:5]}")

    # Validate all asset_ids belong to this tenant in one query
    valid_ids = {
        row.id
        for row in db.query(Asset.id)
        .filter(Asset.id.in_(uuid_by_raw.values()), Asset.tenant_id == tenant_id)
        .all()
    }
    invalid = set(uuid_by_raw.values()) - valid_ids
    if invalid:
        raise HTTPException(
            status_code=422, detail=f"Unknown asset_ids: {[str(i) for i in invalid]}"
        )

    for col in _OPTIONAL_CSV_COLUMNS:
        if col in df.columns:
            numeric = pd.to_numeric(df[col], errors="coerce")
            bad_values = df.loc[numeric.isna() & df[col].notna(), col]
            if not bad_values.empty:
                raise HTTPException(
                    status_code=422,
                    detail=f"Non-numeric {col} values: {bad_values.head(5).tolist()}",
                )
            df[col] = numeric

    sensor_records = df.reindex(columns=_OPTIONAL_CSV_COLUMNS).to_dict("records")
    rows = [
        Reading(
            tenant_id=tenant_id,
            asset_id=uuid_by_raw[raw_id],
            recorded_at=ts.to_pydatetime(),
            source=ReadingSource.csv_upload,
            **{col: None if pd.isna(val) else float(val) for col, val in sensors.items()},
        )
        for raw_id, ts, sensors in zip(df["asset_id"], recorded_at, sensor_records)
    ]

    db.bulk_save_objects(rows)
    db.commit()
    return {"inserted": len(rows)}
