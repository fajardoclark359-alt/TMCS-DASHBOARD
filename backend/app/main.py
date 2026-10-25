from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app import config
from app.routers import breach_alerts, darkweb, domain, email, media, phone, url, username
from app.services import evidence_store
from app.services.breach_alerts import init_breach_alert_store
from app.auth import verify_api_key

# Rate limiter with default limits
limiter = Limiter(key_func=get_remote_address, default_limits=[config.RATE_LIMIT_DEFAULT])

# API Key auth (optional - can be enabled via env)
API_KEY = config.API_KEY  # Set in .env to enable auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Initialize breach alert store
    await init_breach_alert_store()
    yield


app = FastAPI(
    title=config.APP_NAME,
    description=f"{config.APP_DESCRIPTION} Maintained by {config.DEVELOPER}.",
    version=config.VERSION,
    lifespan=lifespan,
    dependencies=[Depends(verify_api_key)] if API_KEY else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(username.router, prefix="/api/username", tags=["Username"])
app.include_router(email.router, prefix="/api/email", tags=["Email"])
app.include_router(phone.router, prefix="/api/phone", tags=["Phone"])
app.include_router(domain.router, prefix="/api/domain", tags=["Domain"])
app.include_router(url.router, prefix="/api/url", tags=["URL"])
app.include_router(media.router, prefix="/api/media", tags=["Media"])
app.include_router(darkweb.router)
app.include_router(breach_alerts.router)


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


@app.get("/api/evidence/{evidence_id}")
def get_any_evidence(evidence_id: str):
    """Fetch any evidence record regardless of investigation type."""
    return evidence_store.load(evidence_id)


@app.get("/api/evidence/{evidence_id}/verify")
def verify_evidence(evidence_id: str):
    """Recompute the chain-of-custody hash and report whether it still matches."""
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
