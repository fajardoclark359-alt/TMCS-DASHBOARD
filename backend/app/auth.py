"""Authentication utilities."""

from fastapi import HTTPException, Depends, status
from fastapi.security import APIKeyHeader

from app import config

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
API_KEY = config.API_KEY


async def verify_api_key(api_key: str = Depends(API_KEY_HEADER)):
    """Verify API key if authentication is enabled."""
    if API_KEY and api_key != API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    return api_key