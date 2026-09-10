from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.social_media import social_media_service
from datetime import datetime
import json
import os

router = APIRouter()

EVIDENCE_DIR = "/home/clark/Work/osint-tool/backend/evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)

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
    data = await social_media_service.search_all(request.username)
    profiles = data["profiles"]
    evidence = data["evidence"]
    return {
        "username": request.username,
        "profiles": profiles,
        "evidence": evidence,
    }

@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceRequest):
    data = await social_media_service.search_all(request.username)
    
    evidence = {
        "evidence_id": f"EVD-USR-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "investigation_type": "username_osint",
        "target": request.username,
        "notes": request.notes,
        "tags": request.tags,
        "priority": request.priority,
        "case_id": request.case_id,
        "data": data,
        "metadata": {
            "investigator": "OSINT TMC/CLARK",
            "tool_version": "2.0.0",
            "evidence_type": "username_investigation",
            "chain_of_custody": {
                "created_at": datetime.now().isoformat(),
                "hash": None,
                "verified": True
            }
        }
    }
    
    evidence_str = json.dumps(evidence, indent=2, default=str)
    evidence["metadata"]["chain_of_custody"]["hash"] = str(hash(evidence_str))
    
    filename = f"{EVIDENCE_DIR}/{evidence['evidence_id']}.json"
    with open(filename, "w") as f:
        f.write(evidence_str)
    
    return {
        "evidence_id": evidence["evidence_id"],
        "filename": filename,
        "evidence_hash": evidence["metadata"]["chain_of_custody"]["hash"],
        "data": evidence
    }

@router.get("/evidence/list")
async def list_evidence():
    files = [f for f in os.listdir(EVIDENCE_DIR) if f.startswith("EVD-USR-") and f.endswith('.json')]
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
