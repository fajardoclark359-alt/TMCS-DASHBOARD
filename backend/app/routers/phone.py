from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict

from app import config
from app.services import evidence_store
from app.services.phone_lookup import phone_service

router = APIRouter()

PREFIX = "EVD-PHONE"


class PhoneRequest(BaseModel):
    phone_number: str
    country_code: Optional[str] = "US"


class EvidenceRequest(BaseModel):
    phone_number: str
    country_code: Optional[str] = "US"
    investigation_type: Optional[str] = "phone_lookup"
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []
    screenshots: Optional[List[Dict[str, str]]] = []
    attachments: Optional[List[Dict[str, str]]] = []
    priority: Optional[str] = "medium"
    case_id: Optional[str] = ""


@router.post("/lookup")
async def lookup_phone(request: PhoneRequest):
    return await phone_service.lookup_phone(request.phone_number, request.country_code)


@router.post("/validate")
async def validate_phone(request: PhoneRequest):
    return await phone_service.lookup_phone(request.phone_number, request.country_code)


@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceRequest):
    result = await phone_service.lookup_phone(request.phone_number, request.country_code)

    document = evidence_store.record(
        prefix=PREFIX,
        investigation_type=request.investigation_type or "phone_lookup",
        evidence_type="phone_investigation",
        target=request.phone_number,
        data=result,
        notes=request.notes,
        tags=request.tags,
        priority=request.priority,
        case_id=request.case_id,
        extra={"country_code": request.country_code},
    )
    return {
        "evidence_id": document["evidence_id"],
        "filename": document.pop("_path", ""),
        "evidence_hash": document["metadata"]["chain_of_custody"]["hash"],
        "data": document,
    }


@router.get("/evidence/list")
async def list_evidence():
    # Legacy ids ("EVD-<timestamp>") predate the EVD-PHONE prefix.
    return evidence_store.list_records([PREFIX], include_legacy_phone=True)


@router.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    return evidence_store.load(evidence_id)


@router.delete("/evidence/{evidence_id}")
async def delete_evidence(evidence_id: str):
    evidence_store.delete(evidence_id)
    return {"message": "Evidence deleted", "evidence_id": evidence_id}


@router.post("/evidence/export")
async def export_evidence(request: EvidenceRequest):
    result = await phone_service.lookup_phone(request.phone_number, request.country_code)

    export_data = {
        "case_info": {
            "case_id": request.case_id or evidence_store.new_evidence_id("CASE"),
            "investigation_type": request.investigation_type,
            "priority": request.priority,
            "created_at": evidence_store.utcnow_iso(),
            "investigator": f"{config.DEVELOPER} / {config.APP_NAME}",
        },
        "target": {"phone_number": request.phone_number, "country_code": request.country_code},
        "findings": result,
        "notes": request.notes,
        "tags": request.tags,
        "attachments": request.attachments,
        "screenshots": request.screenshots,
        "export_timestamp": evidence_store.utcnow_iso(),
        "chain_of_custody": {
            "evidence_hash": evidence_store.compute_hash({"findings": result}),
            "verification_status": "PENDING",
            "export_format": "JSON",
        },
    }
    return export_data
