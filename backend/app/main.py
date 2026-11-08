from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app import config
from app.database import close_db, init_db
from app.rate_limit import limiter
from app.routers import (
    auth as auth_router,
)
from app.routers import (
    breach_alerts,
    darkweb,
    domain,
    email,
    evidence,
    media,
    phone,
    scan_history,
    url,
    username,
)
from app.services.breach_alerts import init_breach_alert_store

# API Key auth (optional - can be enabled via env)
API_KEY = config.API_KEY  # Set in .env to enable auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Initialize database
    await init_db()
    # Initialize breach alert store (legacy file-based)
    await init_breach_alert_store()
    yield
    # Cleanup
    await close_db()


app = FastAPI(
    title=config.APP_NAME,
    description=f"{config.APP_DESCRIPTION} Maintained by {config.DEVELOPER}.",
    version=config.VERSION,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(username.router, prefix="/api/username", tags=["Username"])
app.include_router(email.router, prefix="/api/email", tags=["Email"])
app.include_router(phone.router, prefix="/api/phone", tags=["Phone"])
app.include_router(domain.router, prefix="/api/domain", tags=["Domain"])
app.include_router(url.router, prefix="/api/url", tags=["URL"])
app.include_router(media.router, prefix="/api/media", tags=["Media"])
app.include_router(darkweb.router)
app.include_router(breach_alerts.router)
app.include_router(evidence.router, prefix="/api/evidence", tags=["Evidence"])
app.include_router(scan_history.router, prefix="/api/scans", tags=["Scan History"])
app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])


@app.get("/")
def root():
    return {
        "message": config.APP_NAME,
        "description": config.APP_DESCRIPTION,
        "developer": config.DEVELOPER,
        "version": config.VERSION,
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "version": config.VERSION}


@app.get("/api/meta")
def meta():
    """Identity of the running platform, used by clients and dashboards."""
    return {
        "name": config.APP_NAME,
        "short_name": config.APP_SHORT_NAME,
        "developer": config.DEVELOPER,
        "version": config.VERSION,
    }


@app.get("/api/evidence/{evidence_id}/verify")
def verify_evidence(evidence_id: str):
    """Recompute the chain-of-custody hash and report whether it still matches (legacy)."""
    from app.services import evidence_store
    document = evidence_store.load(evidence_id)
    stored = document.get("metadata", {}).get("chain_of_custody", {}).get("hash")
    if not stored:
        raise HTTPException(status_code=409, detail="Evidence has no chain-of-custody hash")
    return {
        "evidence_id": evidence_id,
        "algorithm": evidence_store.HASH_ALGORITHM,
        "stored_hash": stored,
        "computed_hash": evidence_store.compute_hash(document),
        "verified": evidence_store.verify_hash(document),
    }
