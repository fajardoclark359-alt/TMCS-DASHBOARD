from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

from app import config
from app.services import evidence_store
from app.services.social_media import social_media_service
from app.services.validators import validate_username

router = APIRouter()

PREFIX = "EVD-USR"


class UsernameRequest(BaseModel):
    username: str


class EvidenceRequest(BaseModel):
    username: str
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []
    priority: Optional[str] = "medium"
    case_id: Optional[str] = ""


@router.post("/search")
async def search_username(request: UsernameRequest):
    username = validate_username(request.username)
    data = await social_media_service.search_all(username)
    return {
        "username": username,
        "profiles": data["profiles"],
        "evidence": data["evidence"],
    }


@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceRequest):
    username = validate_username(request.username)
    data = await social_media_service.search_all(username)

    document = evidence_store.record(
        prefix=PREFIX,
        investigation_type="username_osint",
        evidence_type="username_investigation",
        target=username,
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
