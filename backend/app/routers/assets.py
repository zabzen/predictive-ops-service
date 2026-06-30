import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import AdminUser, CurrentUser, TenantId
from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetOut, AssetUpdate

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/", response_model=list[AssetOut])
def list_assets(tenant_id: TenantId, db: Session = Depends(get_db)) -> list[Asset]:
    return db.query(Asset).filter(Asset.tenant_id == tenant_id).order_by(Asset.name).all()


@router.post("/", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(body: AssetCreate, tenant_id: TenantId, _: AdminUser, db: Session = Depends(get_db)) -> Asset:
    asset = Asset(tenant_id=tenant_id, **body.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: uuid.UUID, tenant_id: TenantId, db: Session = Depends(get_db)) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.tenant_id == tenant_id).first()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: uuid.UUID,
    body: AssetUpdate,
    tenant_id: TenantId,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.tenant_id == tenant_id).first()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: uuid.UUID, tenant_id: TenantId, _: AdminUser, db: Session = Depends(get_db)) -> None:
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.tenant_id == tenant_id).first()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    db.delete(asset)
    db.commit()
