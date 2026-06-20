"""Application configuration loaded from environment variables.

Tax-related values (current FY, LTCG exemption threshold) and the risk-free rate
are intentionally configuration, not hardcoded constants, because they change with
each Union Budget. See CLAUDE.md Section 9.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # App
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    # Analytics / tax config (FY-specific — never hardcode in UI)
    risk_free_rate: float = 0.065
    current_fy: str = "2025-26"
    ltcg_exemption_threshold: float = 125000.0

    # Daily NAV/LTP sync scheduler — off by default so dev boots don't fire
    # network jobs. Enable in production (or to test the job locally).
    enable_scheduler: bool = False
    sync_hour: int = 21  # local hour to run the daily sync (after market/NAV close)


@lru_cache
def get_settings() -> Settings:
    return Settings()
