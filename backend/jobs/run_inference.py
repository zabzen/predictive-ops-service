"""Scheduled ML inference job.

Runs as an Azure Container Apps Job (cron trigger) or locally via:
    python -m jobs.run_inference

For each tenant, for each asset:
  1. Fetch the last N readings
  2. Engineer features
  3. Score with the risk model
  4. Persist a RiskScore row

The model here is a lightweight IsolationForest (anomaly detection proxy for risk).
In production this would be replaced with a domain-specific trained model.
"""

import json
import logging
import sys
from datetime import datetime, timezone

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.asset import Asset
from app.models.reading import Reading
from app.models.risk_score import RiskScore
from app.models.tenant import Tenant

MODEL_VERSION = "isolation-forest-v0.1"
LOOKBACK_READINGS = 50
FORECAST_HORIZON_DAYS = 30

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def _engineer_features(readings: list[Reading]) -> np.ndarray | None:
    """Returns a feature vector or None if insufficient data."""
    fields = ["temperature_c", "vibration_mm_s", "pressure_bar", "flow_rate_m3h", "operating_hours"]
    rows = []
    for r in readings:
        row = [getattr(r, f) for f in fields]
        if any(v is not None for v in row):
            rows.append([v if v is not None else 0.0 for v in row])
    if len(rows) < 3:
        return None
    arr = np.array(rows, dtype=float)
    return arr


def _score_asset(readings: list[Reading]) -> tuple[float, dict[str, float]] | None:
    """Returns (risk_probability, feature_contributions) or None."""
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler

    features = _engineer_features(readings)
    if features is None:
        return None

    scaler = StandardScaler()
    X = scaler.fit_transform(features)

    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(X)

    # Score the most recent reading
    latest = X[-1].reshape(1, -1)
    anomaly_score = -model.score_samples(latest)[0]  # higher = more anomalous

    # Normalise to [0, 1]
    risk_prob = float(np.clip((anomaly_score - 0.3) / 0.7, 0.0, 1.0))

    field_names = ["temperature_c", "vibration_mm_s", "pressure_bar", "flow_rate_m3h", "operating_hours"]
    contributions = {name: float(abs(X[-1, i])) for i, name in enumerate(field_names)}

    return risk_prob, contributions


def run(db: Session) -> None:
    tenants = db.execute(select(Tenant)).scalars().all()
    log.info("Running inference for %d tenant(s)", len(tenants))

    for tenant in tenants:
        assets = db.execute(select(Asset).where(Asset.tenant_id == tenant.id)).scalars().all()
        log.info("  Tenant %s: %d asset(s)", tenant.slug, len(assets))

        for asset in assets:
            readings = (
                db.execute(
                    select(Reading)
                    .where(Reading.asset_id == asset.id)
                    .order_by(Reading.recorded_at.desc())
                    .limit(LOOKBACK_READINGS)
                )
                .scalars()
                .all()
            )

            result = _score_asset(readings)
            if result is None:
                log.info("    Asset %s: insufficient data, skipping", asset.name)
                continue

            risk_prob, contributions = result
            score = RiskScore(
                tenant_id=tenant.id,
                asset_id=asset.id,
                model_version=MODEL_VERSION,
                scored_at=datetime.now(timezone.utc),
                risk_probability=risk_prob,
                forecast_horizon_days=FORECAST_HORIZON_DAYS,
                feature_contributions=json.dumps(contributions),
            )
            db.add(score)
            log.info("    Asset %s: risk=%.3f", asset.name, risk_prob)

        db.commit()

    log.info("Inference job complete")


if __name__ == "__main__":
    with SessionLocal() as db:
        run(db)
