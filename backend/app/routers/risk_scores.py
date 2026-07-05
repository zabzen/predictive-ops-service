import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import TenantId
from app.models.risk_score import RiskScore
from app.schemas.risk_score import RiskScoreOut

router = APIRouter(prefix="/risk-scores", tags=["risk-scores"])


@router.get("/", response_model=list[RiskScoreOut])
def list_risk_scores(
    tenant_id: TenantId,
    asset_id: uuid.UUID | None = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
) -> list[RiskScore]:
    q = db.query(RiskScore).filter(RiskScore.tenant_id == tenant_id)
    if asset_id:
        q = q.filter(RiskScore.asset_id == asset_id)
    return q.order_by(RiskScore.scored_at.desc()).limit(limit).all()


@router.get("/latest", response_model=list[RiskScoreOut])
def latest_risk_scores(tenant_id: TenantId, db: Session = Depends(get_db)) -> list[RiskScore]:
    """Returns the most recent risk score per asset - the dashboard view."""
    from sqlalchemy import func

    subq = (
        db.query(RiskScore.asset_id, func.max(RiskScore.scored_at).label("max_scored_at"))
        .filter(RiskScore.tenant_id == tenant_id)
        .group_by(RiskScore.asset_id)
        .subquery()
    )
    return (
        db.query(RiskScore)
        .join(subq, (RiskScore.asset_id == subq.c.asset_id) & (RiskScore.scored_at == subq.c.max_scored_at))
        .filter(RiskScore.tenant_id == tenant_id)
        .order_by(RiskScore.risk_probability.desc())
        .all()
    )
