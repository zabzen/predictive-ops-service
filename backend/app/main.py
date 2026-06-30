from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import assets, auth, readings, risk_scores

app = FastAPI(title="Predictive Ops Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(assets.router)
app.include_router(readings.router)
app.include_router(risk_scores.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
