"""Shared rate-limit limiter instance.

Imported by both ``app.main`` (to attach to the FastAPI app) and individual
routers (to decorate search endpoints with ``@limiter.limit``).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app import config

limiter = Limiter(key_func=get_remote_address, default_limits=[config.RATE_LIMIT_DEFAULT])
