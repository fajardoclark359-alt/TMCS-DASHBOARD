"""Evidence API endpoints (database-backed)."""


from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import config
from app.auth import verify_api_key
from app.database import get_db
from app.models import EvidenceRecord, EvidenceType
from app.tasks.evidence_tasks import capture_evidence_task

router = APIRouter(tags=["Evidence"])

# Auth dependency
auth_dep = [Depends(verify_api_key)] if config.API_KEY else []


class EvidenceCreateRequest(BaseModel):
    evidence_id: str = Field(..., min_length=1, max_length=64)
    evidence_type: str = Field(..., pattern="^(email|domain|url|phone|username|media|darkweb|breach_alert)$")
    target: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(None, max_length=5000)
    data: dict = Field(default_factory=dict)
    evidence_hash: str = Field(..., min_length=64, max_length=64)
    case_id: str | None = Field(None, max_length=64)
    priority: str = Field("medium", pattern="^(low|medium|high|critical)$")
    tags: list[str] = Field(default_factory=list)
    notes: str | None = Field(None, max_length=5000)
    source: str | None = Field(None, max_length=100)


class EvidenceResponse(BaseModel):
    evidence: list[dict]
    total: int
    limit: int
    offset: int


@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=auth_dep)
async def create_evidence(request: EvidenceCreateRequest):
    """Create a new evidence record."""
    # Offload to background task
    task = capture_evidence_task.delay(request.model_dump())
    return {"task_id": task.id, "status": "queued"}


@router.post("/sync", status_code=status.HTTP_201_CREATED, dependencies=auth_dep)
async def create_evidence_sync(request: EvidenceCreateRequest, db: AsyncSession = Depends(get_db)):
    """Create a new evidence record synchronously."""
    evidence = EvidenceRecord(
        evidence_id=request.evidence_id,
        evidence_type=EvidenceType(request.evidence_type),
        target=request.target,
        title=request.title,
        description=request.description,
        data=request.data,
        evidence_hash=request.evidence_hash,
        case_id=request.case_id,
        priority=request.priority,
        tags=request.tags,
        notes=request.notes,
        source=request.source,
    )
    db.add(evidence)
    await db.flush()
    return evidence.to_dict()


@router.get("/", response_model=EvidenceResponse)
async def list_evidence(
    evidence_type: str | None = Query(None, pattern="^(email|domain|url|phone|username|media|darkweb|breach_alert)$"),
    target: str | None = Query(None, max_length=255),
    case_id: str | None = Query(None, max_length=64),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """List evidence records synchronously."""
    query = select(EvidenceRecord)
    count_query = select(func.count(EvidenceRecord.id))

    if evidence_type:
        query = query.where(EvidenceRecord.evidence_type == EvidenceType(evidence_type))
        count_query = count_query.where(EvidenceRecord.evidence_type == EvidenceType(evidence_type))
    if target:
        query = query.where(EvidenceRecord.target.ilike(f"%{target}%"))
        count_query = count_query.where(EvidenceRecord.target.ilike(f"%{target}%"))
    if case_id:
        query = query.where(EvidenceRecord.case_id == case_id)
        count_query = count_query.where(EvidenceRecord.case_id == case_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(EvidenceRecord.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()

    return {
        "evidence": [r.to_dict() for r in records],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/sync")
async def list_evidence_sync(
    evidence_type: str | None = Query(None, pattern="^(email|domain|url|phone|username|media|darkweb|breach_alert)$"),
    target: str | None = Query(None, max_length=255),
    case_id: str | None = Query(None, max_length=64),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """List evidence records synchronously."""
    from sqlalchemy import func, select
    
    query = select(EvidenceRecord)
    count_query = select(func.count(EvidenceRecord.id))
    
    if evidence_type:
        query = query.where(EvidenceRecord.evidence_type == EvidenceType(evidence_type))
        count_query = count_query.where(EvidenceRecord.evidence_type == EvidenceType(evidence_type))
    if target:
        query = query.where(EvidenceRecord.target.ilike(f"%{target}%"))
        count_query = count_query.where(EvidenceRecord.target.ilike(f"%{target}%"))
    if case_id:
        query = query.where(EvidenceRecord.case_id == case_id)
        count_query = count_query.where(EvidenceRecord.case_id == case_id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    query = query.order_by(EvidenceRecord.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()
    
    return {
        "evidence": [r.to_dict() for r in records],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{evidence_id}")
async def get_evidence(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """Get a specific evidence record."""
    from sqlalchemy import select
    result = await db.execute(select(EvidenceRecord).where(EvidenceRecord.evidence_id == evidence_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return record.to_dict()


@router.get("/{evidence_id}/sync")
async def get_evidence_sync(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """Get a specific evidence record synchronously."""
    from sqlalchemy import select
    result = await db.execute(select(EvidenceRecord).where(EvidenceRecord.evidence_id == evidence_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return record.to_dict()


@router.delete("/{evidence_id}", dependencies=auth_dep)
async def delete_evidence(evidence_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an evidence record."""
    from sqlalchemy import select
    result = await db.execute(select(EvidenceRecord).where(EvidenceRecord.evidence_id == evidence_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")
    await db.delete(record)
    return {"message": "Evidence deleted", "evidence_id": evidence_id}


@router.delete("/{evidence_id}/sync", dependencies=auth_dep)
async def delete_evidence_sync(evidence_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an evidence record synchronously."""
    from sqlalchemy import select
    result = await db.execute(select(EvidenceRecord).where(EvidenceRecord.evidence_id == evidence_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")
    await db.delete(record)
    return {"message": "Evidence deleted", "evidence_id": evidence_id}


@router.get("/export/all")
async def export_evidence(
    evidence_type: str | None = Query(None, pattern="^(email|domain|url|phone|username|media|darkweb|breach_alert)$"),
    case_id: str | None = Query(None, max_length=64),
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """Export all evidence records for backup/analysis."""
    from app.tasks.evidence_tasks import export_evidence_task
    task = export_evidence_task.delay(evidence_type, case_id)
    return {"task_id": task.id, "status": "queued"}