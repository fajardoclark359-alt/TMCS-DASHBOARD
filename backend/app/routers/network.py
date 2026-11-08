"""NMAP network scanner API — exposed for authorized recon from the UI.

Wraps ``app.services.network_scan.scan_network``. Authorization is enforced
twice: the request body must carry ``authorized=True`` (the UI shows a
checkbox) and the target must pass the shared SSRF gate
(``assert_public_host``) unless ``ALLOW_PRIVATE_TARGETS`` is set for lab use.
"""
from __future__ import annotations

from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app import config
from app.rate_limit import limiter
from app.services.network_scan import PROFILES, nmap_available, scan_network
from app.services.validators import assert_public_host

router = APIRouter()


class ScanRequest(BaseModel):
    target: str
    profile: str = "standard"
    ports: str | None = None
    authorized: bool = False


@router.get("/profiles")
async def list_profiles():
    """Available scan profiles + whether the real nmap binary is installed."""
    available, path = nmap_available()
    return {
        "nmap_available": available,
        "nmap_path": path,
        "engine_note": None if available
        else "nmap binary not installed on the server — scans run with the built-in TCP connect engine (slower, no OS/version fingerprinting)",
        "profiles": [
            {"id": pid, "label": p["label"], "description": p["desc"], "top_ports": p["top_ports"]}
            for pid, p in PROFILES.items()
        ],
    }


@router.post("/scan")
@limiter.limit(config.RATE_LIMIT_SEARCH)
async def run_scan(request: Request, body: ScanRequest):
    if not body.authorized:
        raise HTTPException(status_code=403, detail="Scan authorization not confirmed — tick the authorization box")

    target = (body.target or "").strip()
    if not target:
        raise HTTPException(status_code=400, detail="Target required")

    # SSRF gate: only public hosts unless ALLOW_PRIVATE_TARGETS=1 (lab mode).
    host = target
    if host.startswith(("http://", "https://")):
        host = urlparse(host).hostname or host
    host = host.split("/")[0].split(":")[0].strip("[]")
    try:
        await assert_public_host(host)
    except HTTPException as exc:
        raise HTTPException(status_code=400, detail=exc.detail) from exc

    if body.profile not in PROFILES:
        raise HTTPException(status_code=400, detail=f"Unknown profile '{body.profile}'. Valid: {sorted(PROFILES)}")

    try:
        return await scan_network(target, profile=body.profile, port_spec=body.ports, authorized=True)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
