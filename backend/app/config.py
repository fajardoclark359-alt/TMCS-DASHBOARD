"""Application-wide configuration.

Everything that defines the identity of the platform lives here so the name,
developer credit and version stay consistent across the API, the evidence
records and the UI.
"""

import os
import secrets
from pathlib import Path

APP_NAME = "Advance Ultimate OSINT Tools"
APP_SHORT_NAME = "AUOSINT"
APP_DESCRIPTION = (
    "Open Source Intelligence gathering platform for authorized security "
    "research, threat monitoring and digital forensics."
)
DEVELOPER = "Clark Fajardo"
VERSION = "2.2.0"

BACKEND_DIR = Path(__file__).resolve().parent.parent
EVIDENCE_DIR = Path(os.getenv("EVIDENCE_DIR", str(BACKEND_DIR / "evidence"))).resolve()

DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fajardoclark359-alt.github.io",
]


def _origins_from_env() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    return [o.strip() for o in raw.split(",") if o.strip()]


ALLOWED_ORIGINS = _origins_from_env() or DEFAULT_ORIGINS

# SSRF protection: refuse to fetch loopback/private/link-local targets unless
# explicitly allowed (useful when investigating a lab machine).
ALLOW_PRIVATE_TARGETS = os.getenv("ALLOW_PRIVATE_TARGETS", "").lower() in {"1", "true", "yes"}

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))

# Optional API key for authentication (set to enable)
API_KEY = os.getenv("API_KEY", "")

# Rate limiting
RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "30/minute")
RATE_LIMIT_SEARCH = os.getenv("RATE_LIMIT_SEARCH", "10/minute")

# Breach alert store
BREACH_ALERT_DIR = Path(os.getenv("BREACH_ALERT_DIR", str(BACKEND_DIR / "breach_alerts"))).resolve()

# Database


def _normalize_database_url(url: str) -> str:
    """Make provider-issued URLs usable by SQLAlchemy's asyncpg dialect.

    Render (and Heroku) hand out ``postgres://`` / ``postgresql://`` URLs, but
    the async engine needs the ``postgresql+asyncpg://`` driver prefix. asyncpg
    also expects ``ssl=`` rather than libpq's ``sslmode=`` query parameter.
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+asyncpg://" + url[len(prefix):]
            break

    if "sslmode=" in url:
        for mode in ("require", "verify-ca", "verify-full", "prefer", "allow", "disable"):
            url = url.replace(f"sslmode={mode}", f"ssl={mode}")

    return url


DATABASE_URL = _normalize_database_url(
    os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BACKEND_DIR / 'auosint.db'}")
)
DATABASE_ECHO = os.getenv("DATABASE_ECHO", "").lower() in {"1", "true", "yes"}

# Celery / Redis
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

# JWT Secret (for future auth)
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# External API Keys (optional)
SHODAN_API_KEY = os.getenv("SHODAN_API_KEY", "")
CENSYS_API_ID = os.getenv("CENSYS_API_ID", "")
CENSYS_API_SECRET = os.getenv("CENSYS_API_SECRET", "")
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "")
ABUSEIPDB_API_KEY = os.getenv("ABUSEIPDB_API_KEY", "")
GREYNOISE_API_KEY = os.getenv("GREYNOISE_API_KEY", "")
OTX_API_KEY = os.getenv("OTX_API_KEY", "")
HIBP_API_KEY = os.getenv("HIBP_API_KEY", "")