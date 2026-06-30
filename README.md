# predictive-ops-service

Industrial asset risk monitoring platform — multi-tenant SaaS prototype demonstrating:

- **FastAPI** + **SQLAlchemy 2** + **Alembic** migrations
- **React 19** + **TypeScript** + **Vite** + **TanStack Query**
- **Multi-tenant isolation** enforced at the query layer (every query scoped to `tenant_id`)
- **RBAC** (admin / viewer roles) via JWT
- **Data ingestion**: manual entry + CSV bulk upload
- **ML inference job** (IsolationForest anomaly detection) as an Azure Container Apps Job
- **Infrastructure as Code** via Bicep (Container Apps, PostgreSQL Flexible Server, Key Vault, Application Insights)
- **CI/CD** via GitLab pipelines (ruff, mypy, pytest, container build + deploy)

## Quick start (local)

```bash
# 1. Start everything
docker compose up

# 2. Seed demo data (two tenants with admin users)
curl -X POST http://localhost:8000/auth/seed-demo

# 3. Open the UI
open http://localhost:5173

# Login: admin@acme.example / acme-admin-pw
```

## Running the inference job

```bash
docker compose run --rm inference-job
# or locally:
cd backend && python -m jobs.run_inference
```

## Development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload

# Lint & type-check
ruff check . && mypy app jobs

# Tests (requires postgres running)
pytest -v
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Azure Container Apps                     │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Backend    │    │  Inference   │  │
│  │  (Vite SPA)  │───▶│  (FastAPI)   │    │     Job      │  │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘  │
│                             │                   │           │
│              ┌──────────────▼───────────────────▼──────┐   │
│              │     PostgreSQL Flexible Server           │   │
│              │  tenants → users → assets → readings     │   │
│              │                        → risk_scores     │   │
│              └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data model

```
Tenant (id, name, slug)
  └── User (id, tenant_id, email, role: admin|viewer)
  └── Asset (id, tenant_id, name, asset_type, location)
        └── Reading (id, tenant_id, asset_id, recorded_at, source,
                     temperature_c, vibration_mm_s, pressure_bar, ...)
        └── RiskScore (id, tenant_id, asset_id, model_version,
                       risk_probability 0–1, forecast_horizon_days,
                       feature_contributions JSON)
```

`tenant_id` is denormalised onto every table and enforced in `app/deps.py` — never accepted from the request.

## Entra External ID

Auth is JWT-based. To swap in real Microsoft Entra External ID:

1. Set `entra_tenant_id`, `entra_client_id`, `entra_issuer` in config
2. Replace `decode_token()` in `app/auth.py` with JWKS validation against the Entra JWKS endpoint
3. Point the frontend MSAL config at the Entra tenant

The `CurrentUser` dependency in `app/deps.py` stays unchanged.

## CSV format

```csv
asset_id,recorded_at,temperature_c,vibration_mm_s,pressure_bar,flow_rate_m3h,operating_hours
<uuid>,2024-01-15T08:00:00,72.3,2.1,4.5,120.0,8760
```
