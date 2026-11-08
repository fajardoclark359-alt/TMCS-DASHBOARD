
from fastapi import APIRouter, Request
from pydantic import BaseModel

from app import config
from app.rate_limit import limiter
from app.services import evidence_store
from app.services.breach_check import breach_service
from app.services.phone_lookup import phone_service
from app.services.validators import validate_email

router = APIRouter()

PREFIX = "EVD-EMAIL"


class EmailRequest(BaseModel):
    email: str
    api_key: str | None = None


class EvidenceRequest(BaseModel):
    email: str
    api_key: str | None = None
    notes: str | None = ""
    tags: list[str] | None = []
    priority: str | None = "medium"
    case_id: str | None = ""


async def _investigate(email: str, api_key: str | None) -> dict:
    validation = phone_service.validate_email(email)
    breaches = await breach_service.check_email_breaches(email, api_key)
    return {"email": email, "validation": validation, "breaches": breaches}


@router.post("/search")
@limiter.limit(config.RATE_LIMIT_SEARCH)
async def search_email(request: Request, body: EmailRequest):
    return await _investigate(validate_email(body.email), body.api_key)


@router.post("/validate")
@limiter.limit(config.RATE_LIMIT_SEARCH)
async def validate_email_endpoint(request: Request, body: EmailRequest):
    return phone_service.validate_email(validate_email(body.email))


@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceRequest):
    data = await _investigate(validate_email(request.email), request.api_key)

    document = evidence_store.record(
        prefix=PREFIX,
        investigation_type="email_osint",
        evidence_type="email_investigation",
        target=data["email"],
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
