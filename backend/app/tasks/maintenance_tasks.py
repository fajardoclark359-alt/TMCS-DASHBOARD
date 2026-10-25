"""Maintenance and cleanup tasks."""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Dict
from celery import shared_task

from app.database import get_db_context
from app.models import ScanHistory, BreachAlert, EvidenceRecord


@shared_task
def cleanup_old_scans_task(days: int = 90) -> Dict[str, Any]:
    """Clean up old scan history records."""
    
    async def _cleanup():
        async with get_db_context() as db:
            from sqlalchemy import select, delete
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Count first
            count_result = await db.execute(
                select(ScanHistory).where(ScanHistory.created_at < cutoff)
            )
            old_scans = count_result.scalars().all()
            count = len(old_scans)
            
            # Delete
            await db.execute(
                delete(ScanHistory).where(ScanHistory.created_at < cutoff)
            )
            
            return {"deleted": count, "cutoff_days": days}
    
    return asyncio.run(_cleanup())


@shared_task
def cleanup_old_breach_alerts_task(days: int = 365, keep_acknowledged: bool = True) -> Dict[str, Any]:
    """Clean up old breach alerts."""
    
    async def _cleanup():
        async with get_db_context() as db:
            from sqlalchemy import select, delete
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            
            query = select(BreachAlert).where(BreachAlert.created_at < cutoff)
            if keep_acknowledged:
                query = query.where(BreachAlert.acknowledged == False)
            
            count_result = await db.execute(query)
            old_alerts = count_result.scalars().all()
            count = len(old_alerts)
            
            await db.execute(
                delete(BreachAlert).where(BreachAlert.created_at < cutoff)
                .where(BreachAlert.acknowledged == False if keep_acknowledged else True)
            )
            
            return {"deleted": count, "cutoff_days": days, "kept_acknowledged": keep_acknowledged}
    
    return asyncio.run(_cleanup())


@shared_task
def cleanup_unreferenced_evidence_task(days: int = 30) -> Dict[str, Any]:
    """Clean up evidence records not linked to cases."""
    
    async def _cleanup():
        async with get_db_context() as db:
            from sqlalchemy import select, delete
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            
            query = select(EvidenceRecord).where(
                EvidenceRecord.created_at < cutoff,
                EvidenceRecord.case_id == None,
            )
            
            count_result = await db.execute(query)
            old_evidence = count_result.scalars().all()
            count = len(old_evidence)
            
            await db.execute(
                delete(EvidenceRecord).where(
                    EvidenceRecord.created_at < cutoff,
                    EvidenceRecord.case_id == None,
                )
            )
            
            return {"deleted": count, "cutoff_days": days}
    
    return asyncio.run(_cleanup())


@shared_task
def vacuum_database_task() -> Dict[str, Any]:
    """Run database vacuum (SQLite) or analyze (PostgreSQL)."""
    
    async def _vacuum():
        async with get_db_context() as db:
            from app import config
            if "sqlite" in config.DATABASE_URL:
                await db.execute("VACUUM")
                return {"action": "vacuum", "database": "sqlite"}
            else:
                await db.execute("ANALYZE")
                return {"action": "analyze", "database": "postgresql"}
    
    return asyncio.run(_vacuum())


@shared_task
def health_check_task() -> Dict[str, Any]:
    """System health check."""
    
    async def _check():
        async with get_db_context() as db:
            from sqlalchemy import select, func
            
            # Check database connectivity
            await db.execute(select(1))
            
            # Get counts
            scan_count = await db.execute(select(func.count(ScanHistory.id)))
            alert_count = await db.execute(select(func.count(BreachAlert.id)))
            evidence_count = await db.execute(select(func.count(EvidenceRecord.id)))
            
            return {
                "status": "healthy",
                "database": "connected",
                "counts": {
                    "scans": scan_count.scalar(),
                    "breach_alerts": alert_count.scalar(),
                    "evidence": evidence_count.scalar(),
                },
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
    
    return asyncio.run(_check())