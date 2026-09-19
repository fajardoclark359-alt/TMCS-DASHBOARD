from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.media_metadata import analyze_media, build_html_report, IMAGE_EXTS, VIDEO_EXTS
from datetime import datetime
import hashlib
import json
import os

router = APIRouter()

EVIDENCE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "evidence")
os.makedirs(EVIDENCE_DIR, exist_ok=True)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_EXTS = IMAGE_EXTS | VIDEO_EXTS


class EvidenceCaptureRequest(BaseModel):
    filename: str
    analysis: Dict[str, Any]
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []
    priority: Optional[str] = "medium"
    case_id: Optional[str] = ""


@router.post("/analyze")
async def analyze_upload(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTS)}")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 25 MB limit")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    return analyze_media(data, file.filename or "upload", file.content_type)


@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceCaptureRequest):
    evidence = {
        "evidence_id": f"EVD-MEDIA-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "investigation_type": "media_metadata",
        "target": request.filename,
        "notes": request.notes,
        "tags": request.tags,
        "priority": request.priority,
        "case_id": request.case_id,
        "data": request.analysis,
        "metadata": {
            "investigator": "OSINT TMC/CLARK",
            "tool_version": "2.1.0",
            "evidence_type": "media_metadata",
            "chain_of_custody": {
                "created_at": datetime.now().isoformat(),
                "hash": None,
                "verified": True,
            },
        },
    }
    evidence_str = json.dumps(evidence, indent=2, sort_keys=True, default=str)
    evidence["metadata"]["chain_of_custody"]["hash"] = hashlib.sha256(evidence_str.encode()).hexdigest()
    filename = f"{EVIDENCE_DIR}/{evidence['evidence_id']}.json"
    with open(filename, "w") as f:
        json.dump(evidence, f, indent=2, default=str)
    return {"evidence_id": evidence["evidence_id"], "filename": filename,
            "evidence_hash": evidence["metadata"]["chain_of_custody"]["hash"], "data": evidence}


@router.get("/evidence/list")
async def list_evidence():
    files = [f for f in os.listdir(EVIDENCE_DIR) if f.startswith("EVD-MEDIA-") and f.endswith(".json")]
    out = []
    for f in sorted(files, reverse=True):
        with open(os.path.join(EVIDENCE_DIR, f)) as fh:
            data = json.load(fh)
        out.append({
            "evidence_id": data.get("evidence_id"),
            "timestamp": data.get("timestamp"),
            "target": data.get("target"),
            "investigation_type": data.get("investigation_type"),
            "notes": data.get("notes"),
            "tags": data.get("tags"),
            "priority": data.get("priority"),
            "evidence_hash": data.get("metadata", {}).get("chain_of_custody", {}).get("hash"),
        })
    return out


@router.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    filename = f"{EVIDENCE_DIR}/{evidence_id}.json"
    if os.path.exists(filename):
        with open(filename) as f:
            return json.load(f)
    return {"error": "Evidence not found"}


@router.get("/evidence/{evidence_id}/export")
async def export_evidence(evidence_id: str, format: str = "json"):
    filename = f"{EVIDENCE_DIR}/{evidence_id}.json"
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail="Evidence not found")
    with open(filename) as f:
        evidence = json.load(f)
    if format == "html":
        analysis = evidence.get("data", evidence)
        return HTMLResponse(content=build_html_report(analysis, title=f"Media Report {evidence_id}"))
    return JSONResponse(content=evidence)


@router.delete("/evidence/{evidence_id}")
async def delete_evidence(evidence_id: str):
    filename = f"{EVIDENCE_DIR}/{evidence_id}.json"
    if os.path.exists(filename):
        os.remove(filename)
        return {"message": "Evidence deleted", "evidence_id": evidence_id}
    return {"error": "Evidence not found"}
