import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from app import config
from app.services import evidence_store
from app.services.media_metadata import IMAGE_EXTS, VIDEO_EXTS, analyze_media, build_html_report

router = APIRouter()

PREFIX = "EVD-MEDIA"
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
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 25 MB limit")

    return analyze_media(data, file.filename or "upload", file.content_type)


@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceCaptureRequest):
    document = evidence_store.record(
        prefix=PREFIX,
        investigation_type="media_metadata",
        evidence_type="media_metadata",
        target=request.filename,
        data=request.analysis,
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


@router.get("/evidence/{evidence_id}/export")
async def export_evidence(evidence_id: str, format: str = "json"):
    evidence = evidence_store.load(evidence_id)
    if format.lower() == "html":
        analysis = evidence.get("data", evidence)
        title = f"Media Report {evidence_id}"
        return HTMLResponse(content=build_html_report(analysis, title=title))
    return JSONResponse(content=evidence)


@router.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    return evidence_store.load(evidence_id)


@router.delete("/evidence/{evidence_id}")
async def delete_evidence(evidence_id: str):
    evidence_store.delete(evidence_id)
    return {"message": "Evidence deleted", "evidence_id": evidence_id}
