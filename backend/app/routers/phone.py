from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.phone_lookup import phone_service
from datetime import datetime
import json
import os

router = APIRouter()

EVIDENCE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

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
async def validate_phone(phone_number: str, country_code: str = "US"):
    return await phone_service.lookup_phone(phone_number, country_code)

@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceRequest):
    result = await phone_service.lookup_phone(request.phone_number, request.country_code)
    
    evidence = {
        "evidence_id": f"EVD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "investigation_type": request.investigation_type,
        "target": request.phone_number,
        "country_code": request.country_code,
        "notes": request.notes,
        "tags": request.tags,
        "priority": request.priority,
        "case_id": request.case_id,
        "data": result,
        "metadata": {
            "investigator": "OSINT TMC/CLARK",
            "tool_version": "2.0.0",
            "evidence_type": "phone_investigation",
            "chain_of_custody": {
                "created_at": datetime.now().isoformat(),
                "hash": None,
                "verified": True
            }
        }
    }
    
    evidence_str = json.dumps(evidence, indent=2, default=str)
    evidence_hash = hash(evidence_str)
    evidence["metadata"]["chain_of_custody"]["hash"] = str(evidence_hash)
    
    filename = f"{EVIDENCE_DIR}/{evidence['evidence_id']}.json"
    with open(filename, "w") as f:
        f.write(evidence_str)
    
    return {
        "evidence_id": evidence["evidence_id"],
        "filename": filename,
        "evidence_hash": evidence_hash,
        "data": evidence
    }

@router.get("/evidence/list")
async def list_evidence():
    files = [f for f in os.listdir(EVIDENCE_DIR) if f.endswith('.json')]
    evidence_list = []
    for f in sorted(files, reverse=True):
        with open(os.path.join(EVIDENCE_DIR, f), 'r') as file:
            data = json.load(file)
            evidence_list.append({
                "evidence_id": data.get("evidence_id"),
                "timestamp": data.get("timestamp"),
                "target": data.get("target"),
                "investigation_type": data.get("investigation_type"),
                "notes": data.get("notes"),
                "tags": data.get("tags"),
                "priority": data.get("priority"),
                "evidence_hash": data.get("metadata", {}).get("chain_of_custody", {}).get("hash")
            })
    return evidence_list

@router.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    filename = f"{EVIDENCE_DIR}/{evidence_id}.json"
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            return json.load(f)
    return {"error": "Evidence not found"}

@router.delete("/evidence/{evidence_id}")
async def delete_evidence(evidence_id: str):
    filename = f"{EVIDENCE_DIR}/{evidence_id}.json"
    if os.path.exists(filename):
        os.remove(filename)
        return {"message": "Evidence deleted", "evidence_id": evidence_id}
    return {"error": "Evidence not found"}

@router.post("/evidence/export")
async def export_evidence(request: EvidenceRequest):
    result = await phone_service.lookup_phone(request.phone_number, request.country_code)
    
    export_data = {
        "case_info": {
            "case_id": request.case_id or f"CASE-{datetime.now().strftime('%Y%m%d')}",
            "investigation_type": request.investigation_type,
            "priority": request.priority,
            "created_at": datetime.now().isoformat(),
            "investigator": "OSINT TMC/CLARK v2.0.0"
        },
        "target": {
            "phone_number": request.phone_number,
            "country_code": request.country_code
        },
        "findings": result,
        "notes": request.notes,
        "tags": request.tags,
        "attachments": request.attachments,
        "screenshots": request.screenshots,
        "export_timestamp": datetime.now().isoformat(),
        "chain_of_custody": {
            "evidence_hash": str(hash(json.dumps(result, default=str))),
            "verification_status": "PENDING",
            "export_format": "JSON"
        }
    }
    
    filename = f"{EVIDENCE_DIR}/EXPORT-{export_data['case_info']['case_id']}.json"
    with open(filename, "w") as f:
        json.dump(export_data, f, indent=2, default=str)
    
    return {
        "export_id": export_data['case_info']['case_id'],
        "filename": filename,
        "data": export_data
    }
