"""Evidence processing tasks."""

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from celery import shared_task
from typing import Any, Dict

from app.database import get_db_context
from app.models import EvidenceRecord, EvidenceType


def _compute_hash(document: dict) -> str:
    copy = json.loads(json.dumps(document, default=str))
    copy.pop("hash", None)
    payload = json.dumps(copy, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@shared_task
def capture_evidence_task(evidence_data: Dict[str, Any]) -> Dict[str, Any]:
    """Capture evidence record to database."""
    
    async def _capture():
        async with get_db_context() as db:
            evidence = EvidenceRecord(
                evidence_id=evidence_data["evidence_id"],
                evidence_type=EvidenceType(evidence_data["evidence_type"]),
                target=evidence_data["target"],
                title=evidence_data["title"],
                description=evidence_data.get("description"),
                data=evidence_data.get("data", {}),
                evidence_hash=evidence_data["evidence_hash"],
                case_id=evidence_data.get("case_id"),
                priority=evidence_data.get("priority", "medium"),
                tags=evidence_data.get("tags", []),
                notes=evidence_data.get("notes"),
                source=evidence_data.get("source"),
            )
            db.add(evidence)
            await db.flush()
            return evidence.to_dict()
    
    return asyncio.run(_capture())


@shared_task
def list_evidence_task(evidence_type: str = None, target: str = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    """List evidence records from database."""
    
    async def _list():
        async with get_db_context() as db:
            from sqlalchemy import select, func
            query = select(EvidenceRecord)
            count_query = select(func.count(EvidenceRecord.id))
            
            if evidence_type:
                query = query.where(EvidenceRecord.evidence_type == EvidenceType(evidence_type))
                count_query = count_query.where(EvidenceRecord.evidence_type == EvidenceType(evidence_type))
            
            if target:
                query = query.where(EvidenceRecord.target.ilike(f"%{target}%"))
                count_query = count_query.where(EvidenceRecord.target.ilike(f"%{target}%"))
            
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
    
    return asyncio.run(_list())


@shared_task
def get_evidence_task(evidence_id: str) -> Dict[str, Any]:
    """Get single evidence record."""
    
    async def _get():
        async with get_db_context() as db:
            from sqlalchemy import select
            result = await db.execute(select(EvidenceRecord).where(EvidenceRecord.evidence_id == evidence_id))
            record = result.scalar_one_or_none()
            if not record:
                return None
            return record.to_dict()
    
    return asyncio.run(_get())


@shared_task
def delete_evidence_task(evidence_id: str) -> bool:
    """Delete evidence record."""
    
    async def _delete():
        async with get_db_context() as db:
            from sqlalchemy import select
            result = await db.execute(select(EvidenceRecord).where(EvidenceRecord.evidence_id == evidence_id))
            record = result.scalar_one_or_none()
            if not record:
                return False
            await db.delete(record)
            return True
    
    return asyncio.run(_delete())


@shared_task
def export_evidence_task(evidence_type: str = None, case_id: str = None) -> Dict[str, Any]:
    """Export evidence records for backup/analysis."""
    
    async def _export():
        async with get_db_context() as db:
            from sqlalchemy import select
            query = select(EvidenceRecord)
            
            if evidence_type:
                query = query.where(EvidenceRecord.evidence_type == EvidenceType(evidence_type))
            if case_id:
                query = query.where(EvidenceRecord.case_id == case_id)
            
            query = query.order_by(EvidenceRecord.created_at.desc())
            result = await db.execute(query)
            records = result.scalars().all()
            
            return {
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "count": len(records),
                "evidence": [r.to_dict() for r in records],
            }
    
    return asyncio.run(_export())