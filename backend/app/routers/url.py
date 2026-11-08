from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app import config
from app.rate_limit import limiter
from app.services import evidence_store
from app.services.url_investigation import url_investigation_service
from app.services.validators import assert_public_host, normalize_url

router = APIRouter()

PREFIX = "EVD-URL"


class URLRequest(BaseModel):
    url: str


class EvidenceRequest(BaseModel):
    url: str
    notes: str | None = ""
    tags: list[str] | None = []
    priority: str | None = "medium"
    case_id: str | None = ""


async def _investigate(raw_url: str) -> dict:
    url = normalize_url(raw_url)
    host = urlparse(url).hostname or ""
    await assert_public_host(host)
    try:
        return await url_investigation_service.investigate_url(url)
    except Exception as exc:  # pragma: no cover - network dependent
        raise HTTPException(status_code=502, detail=f"URL investigation failed: {exc}") from exc


@router.post("/investigate")
@limiter.limit(config.RATE_LIMIT_SEARCH)
async def investigate_url(request: Request, body: URLRequest):
    return await _investigate(body.url)


@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceRequest):
    data = await _investigate(request.url)

    document = evidence_store.record(
        prefix=PREFIX,
        investigation_type="url_investigation",
        evidence_type="url_investigation",
        target=data["original_url"],
        data=data,
        notes=request.notes,
        tags=request.tags,
        priority=request.priority,
        case_id=request.case_id,
    )
    return {
        "evidence_id": document["evidence_id"],
        "filename": document.pop("_path", ""),
        "evidence_hash": document["metadata"]["chain_of_custody"]["hash"],
        "data": document,
    }


@router.get("/evidence/list")
async def list_evidence():
    return evidence_store.list_records([PREFIX])


@router.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    return evidence_store.load(evidence_id)


@router.delete("/evidence/{evidence_id}")
async def delete_evidence(evidence_id: str):
    evidence_store.delete(evidence_id)
    return {"message": "Evidence deleted", "evidence_id": evidence_id}
