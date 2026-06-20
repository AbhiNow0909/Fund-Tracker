"""FastAPI entrypoint for the Equity Investment Tracker backend.

Conventional FastAPI app: routers call services, services call the database.
No AI layer. Routers are wired in as each implementation step lands.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings

settings = get_settings()

app = FastAPI(
    title="Equity Investment Tracker API",
    version="0.1.0",
    description="Backend for parsing NSDL eCAS statements and computing fund + equity analytics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """Liveness probe — the only route that does not require auth."""
    return {"status": "ok", "environment": settings.environment}


# Routers added in later steps:
#   from routers import portfolio, equity, analytics, explore, tax, transactions
#   app.include_router(portfolio.router)
#   ...
