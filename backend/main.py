"""FastAPI entrypoint for the Equity Investment Tracker backend.

Conventional FastAPI app: routers call services, services call the database.
No AI layer. Routers are wired in as each implementation step lands.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import analytics, explore, portfolio
from scheduler.daily_sync import start_scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = start_scheduler()  # no-op unless ENABLE_SCHEDULER=true
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="Equity Investment Tracker API",
    version="0.1.0",
    description="Backend for parsing NSDL eCAS statements and computing fund + equity analytics.",
    lifespan=lifespan,
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


app.include_router(portfolio.router)
app.include_router(analytics.router)
app.include_router(explore.router)

# Routers added in later steps:
#   from routers import tax, transactions
#   app.include_router(tax.router)
#   ...
