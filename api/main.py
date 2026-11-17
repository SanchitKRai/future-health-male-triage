"""Loopback-only API that calls the preserved, deterministic LOC triage engine."""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.intake import build_intake
from api.schemas import ScreeningResult, ScreeningSubmission
from triage import Triage, evaluate


DEFAULT_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
)
configured_origins = os.getenv("LOC_FRONTEND_ORIGINS")
allowed_origins = (
    [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
    if configured_origins
    else list(DEFAULT_ORIGINS)
)

app = FastAPI(
    title="LOC Local Screening API",
    version="2.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def prevent_sensitive_response_caching(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "loc-local-screening", "mode": "rules-only"}


@app.post("/api/screening/triage", response_model=ScreeningResult)
def screen(submission: ScreeningSubmission) -> ScreeningResult:
    """Evaluate a one-time submission; no request data is written to disk or logged."""
    result = evaluate(build_intake(submission))
    return ScreeningResult(
        status="cannot_continue" if result.triage == Triage.STOP else "result",
        triage=result.triage.value,
        rule=result.rule,
        band=result.band.value if result.band else None,
        score=result.score,
        low_confidence=result.low_confidence,
        safety_net=result.safety_net,
        top_factors=[
            {
                "id": factor.id,
                "label": factor.label,
                "points": factor.points,
                "modifiable": factor.modifiable,
            }
            for factor in result.top_factors
        ],
        notes=result.notes,
    )
