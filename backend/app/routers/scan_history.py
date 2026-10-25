"""Scan History API endpoints."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ScanHistory, ScanType, ScanStatus
from app.auth import verify_api_key
from app import config

router = APIRouter(prefix="/api/scans", tags=["Scan History"])

auth_dep = [Depends(verify_api_key)] if config.API_KEY else []


class ScanCreateRequest(BaseModel):
    scan_type: str = Field(..., pattern="^(breach_news|darkweb_ahmia|darkweb_urlhaus|ransomware|domain|email|username|url|phone|media|full)$")
    triggered_by: str = Field("api", max_length=100)
    parameters: dict = Field(default_factory=dict)


class ScanResponse(BaseModel):
    scans: list[dict]
    total: int
    limit: int
    offset: int


@router.post("/", status_code=201, dependencies=auth_dep)
async def trigger_scan(request: ScanCreateRequest, background_tasks: BackgroundTasks):
    """Trigger a scan task."""
    from app.tasks import breach_tasks, scan_tasks
    
    task_map = {
        "breach_news": breach_tasks.scan_philippines_news_feeds_task,
        "darkweb_ahmia": breach_tasks.scan_philippines_darkweb_task,
        "darkweb_urlhaus": breach_tasks.scan_philippines_darkweb_task,
        "ransomware": breach_tasks.scan_philippines_ransomware_task,
        "full": breach_tasks.full_breach_scan_task,
        "domain": scan_tasks.domain_scan_task,
        "email": scan_tasks.email_scan_task,
        "username": scan_tasks.username_scan_task,
        "url": scan_tasks.url_scan_task,
        "phone": scan_tasks.phone_scan_task,
    }
    
    task_func = task_map.get(request.scan_type)
    if not task_func:
        raise HTTPException(status_code=400, detail=f"Unknown scan type: {request.scan_type}")
    
    if request.scan_type in ("domain", "email", "username", "url", "phone"):
        target = request.parameters.get("target") or request.parameters.get(request.scan_type)
        if not target:
            raise HTTPException(status_code=400, detail=f"Missing target for {request.scan_type}")
        task = task_func.delay(target, request.triggered_by)
    else:
        task = task_func.delay(request.triggered_by)
    
    return {"task_id": task.id, "status": "queued", "scan_type": request.scan_type}


@router.get("/", response_model=ScanResponse)
async def list_scans(
    scan_type: Optional[str] = Query(None, pattern="^(breach_news|darkweb_ahmia|darkweb_urlhaus|ransomware|domain|email|username|url|phone|media|full)$"),
    status: Optional[str] = Query(None, pattern="^(pending|running|completed|failed|partial)$"),
    triggered_by: Optional[str] = Query(None, max_length=100),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """List scan history records."""
    from sqlalchemy import select, func
    async with get_db() as db:
        query = select(ScanHistory)
        count_query = select(func.count(ScanHistory.id))
        
        if scan_type:
            query = query.where(ScanHistory.scan_type == ScanType(scan_type))
            count_query = count_query.where(ScanHistory.scan_type == ScanType(scan_type))
        if status:
            query = query.where(ScanHistory.status == ScanStatus(status))
            count_query = count_query.where(ScanHistory.status == ScanStatus(status))
        if triggered_by:
            query = query.where(ScanHistory.triggered_by == triggered_by)
            count_query = count_query.where(ScanHistory.triggered_by == triggered_by)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        query = query.order_by(ScanHistory.created_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        records = result.scalars().all()
        
        return {
            "scans": [r.to_dict() for r in records],
            "total": total,
            "limit": limit,
            "offset": offset,
        }


@router.get("/{scan_id}")
async def get_scan(
    scan_id: str,
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """Get a specific scan record."""
    from sqlalchemy import select
    async with get_db() as db:
        result = await db.execute(select(ScanHistory).where(ScanHistory.scan_id == scan_id))
        record = result.scalar_one_or_none()
        if not record:
            raise HTTPException(status_code=404, detail="Scan not found")
        return record.to_dict()


@router.get("/stats/summary")
async def get_scan_stats(
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """Get scan statistics summary."""
    from sqlalchemy import select, func
    async with get_db() as db:
        # Total scans
        total_scans = await db.execute(select(func.count(ScanHistory.id)))
        
        # By status
        status_counts = {}
        for s in ScanStatus:
            count = await db.execute(select(func.count(ScanHistory.id)).where(ScanHistory.status == s))
            status_counts[s.value] = count.scalar()
        
        # By type
        type_counts = {}
        for t in ScanType:
            count = await db.execute(select(func.count(ScanHistory.id)).where(ScanHistory.scan_type == t))
            type_counts[t.value] = count.scalar()
        
        # Recent scans (last 7 days)
        from datetime import datetime, timezone, timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        recent = await db.execute(
            select(func.count(ScanHistory.id)).where(ScanHistory.created_at >= cutoff)
        )
        
        # Total alerts created
        alerts_total = await db.execute(select(func.sum(ScanHistory.alerts_created)))
        
        return {
            "total_scans": total_scans.scalar(),
            "by_status": status_counts,
            "by_type": type_counts,
            "recent_7_days": recent.scalar(),
            "total_alerts_created": alerts_total.scalar() or 0,
        }


@router.delete("/{scan_id}", dependencies=auth_dep)
async def delete_scan(scan_id: str):
    """Delete a scan record."""
    from sqlalchemy import select
    async with get_db() as db:
        result = await db.execute(select(ScanHistory).where(ScanHistory.scan_id == scan_id))
        record = result.scalar_one_or_none()
        if not record:
            raise HTTPException(status_code=404, detail="Scan not found")
        await db.delete(record)
        return {"message": "Scan deleted", "scan_id": scan_id}