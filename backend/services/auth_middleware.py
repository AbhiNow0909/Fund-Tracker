"""Validate Supabase-issued JWTs on protected FastAPI routes.

Usage in a router:

    from services.auth_middleware import get_current_user_id

    @router.get("/portfolio/dashboard")
    def dashboard(user_id: str = Depends(get_current_user_id)):
        ...

Two validation paths, tried in order:
  1. Local HS256 verification with the project's JWT secret (legacy shared-secret
     projects — fast, no network).
  2. Ask Supabase to validate the token (`auth.get_user`). This works for projects
     using the newer ASYMMETRIC JWT signing keys (ES256/RS256), where the HS256
     shared secret cannot verify the signature.

Returns the user's UUID (the `sub` claim).
"""
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from config import get_settings

logger = logging.getLogger("auth")
_bearer = HTTPBearer(auto_error=True)


def _verify_hs256(token: str, secret: str) -> str | None:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
    except JWTError:
        return None
    return payload.get("sub")


def _verify_via_supabase(token: str) -> str | None:
    """Validate by calling Supabase's auth endpoint — algorithm-agnostic."""
    try:
        from services.supabase_client import get_supabase

        resp = get_supabase().auth.get_user(token)
        user = getattr(resp, "user", None)
        return getattr(user, "id", None) if user else None
    except Exception as exc:  # network / invalid token / not configured
        logger.warning("Supabase token validation failed: %s", exc)
        return None


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    settings = get_settings()
    token = credentials.credentials

    user_id = None
    if settings.supabase_jwt_secret:
        user_id = _verify_hs256(token, settings.supabase_jwt_secret)
    if not user_id:
        user_id = _verify_via_supabase(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id
