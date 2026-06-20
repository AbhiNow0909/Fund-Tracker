"""Server-side Supabase client using the service role key.

The service role key bypasses Row Level Security, so it must NEVER be exposed to
the frontend. It is used by the backend to write market data, run parsers, and
delete raw CAS PDFs from storage after parsing.
"""
from functools import lru_cache

from supabase import Client, create_client

from config import get_settings


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in backend/.env."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
