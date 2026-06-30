# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**predictive-ops-service** — multi-tenant industrial asset risk monitoring platform. Monorepo with a FastAPI backend and a Vite + React + TypeScript frontend, designed to run locally via docker-compose and deploy to Azure Container Apps.

## Commands

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Dev server
uvicorn app.main:app --reload

# Migrations
alembic revision --autogenerate -m "<description>"
alembic upgrade head

# Lint / type-check
ruff check . && ruff format --check .
mypy app jobs

# Tests (requires postgres running)
pytest -v
pytest tests/test_api.py::test_tenant_isolation   # single test
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
npm run build
```

### Full stack

```bash
docker compose up                         # starts db + backend + frontend
curl -X POST http://localhost:8000/auth/seed-demo   # create demo tenants
docker compose run --rm inference-job     # run ML inference manually
```

## Architecture

### Backend (`backend/`)

- **`app/deps.py`** — the most important file to understand. Contains `TenantId`, `CurrentUser`, and `AdminUser` FastAPI dependencies. Every route that touches data must use `TenantId` — it extracts `tenant_id` from the JWT and is the sole source of truth. `tenant_id` is **never** accepted from request bodies.
- **`app/models/`** — SQLAlchemy 2 ORM models. `tenant_id` is denormalised onto every table (Tenant, User, Asset, Reading, RiskScore) so all tables are independently scopeable without joins.
- **`app/routers/`** — one file per resource. Routes are thin; business logic stays in deps and models.
- **`app/auth.py`** — JWT creation/validation. To swap in Microsoft Entra External ID: replace `decode_token()` with JWKS validation; the `CurrentUser` dependency is unchanged.
- **`alembic/env.py`** — reads `settings.database_url` from config; imports all models via `app.models` to auto-detect schema changes.
- **`jobs/run_inference.py`** — standalone script that scores every asset using IsolationForest. Runs as an Azure Container Apps Job (cron). Execute locally with `python -m jobs.run_inference` from `backend/`.

### Frontend (`frontend/src/`)

- **`api/client.ts`** — axios instance; attaches JWT from localStorage; redirects to `/login` on 401.
- **`api/queries.ts`** — all TanStack Query hooks. Data fetching and mutations are defined here; components only call hooks.
- **`api/types.ts`** — TypeScript interfaces mirroring backend Pydantic schemas.
- Route layout: `App.tsx` wraps routes in `AuthGuard` (redirects to `/login` if no valid session). Pages: Dashboard (risk scores), Assets (list + CSV upload), Asset Detail (sensor chart + manual reading entry).

### Data model

```
Tenant → User (role: admin | viewer)
       → Asset → Reading  (source: manual | csv_upload | api_pull)
               → RiskScore (risk_probability 0–1, model_version, feature_contributions JSON)
```

### Infrastructure

- **`infra/main.bicep`** — deploys Container Apps (backend + inference job), PostgreSQL Flexible Server, Key Vault, Application Insights, ACR. Parameterised by `env` (dev/staging/prod) and `imageTag`.
- **`.gitlab-ci.yml`** — stages: lint (ruff, mypy) → test (pytest against real postgres service) → build (docker push to ACR) → deploy staging (auto) → deploy prod (manual).
