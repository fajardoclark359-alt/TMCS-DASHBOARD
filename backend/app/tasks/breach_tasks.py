"""Breach scanning Celery tasks."""

import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from typing import Any

from celery import shared_task

from app import config
from app.models import BreachAlert, ScanHistory
from app.database import get_db_context
from app.services.breach_alerts import (
    PH_BREACH_TARGETS,
    create_breach_alert,
    extract_ph_target,
    is_philippines_related,
    scan_philippines_news_feeds as _scan_news,
)
from app.services.darkweb_scanner import (
    scan_philippines_darkweb as _scan_darkweb,
    scan_philippines_ransomware as _scan_ransomware,
)


def _compute_hash(document: dict) -> str:
    copy = json.loads(json.dumps(document, default=str))
    copy.pop("hash", None)
    payload = json.dumps(copy, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _save_alert_to_db(alert: dict) -> dict:
    """Save breach alert to database."""
    import asyncio
    
    async def _save():
        async with get_db_context() as db:
            db_alert = BreachAlert(
                alert_id=alert["alert_id"],
                title=alert["title"],
                target=alert["target"],
                severity=alert["severity"],
                source=alert["source"],
                description=alert["description"],
                link=alert.get("link"),
                alert_type=alert["type"],
                tags=alert.get("tags", []),
                evidence_hash=alert["hash"],
                alert_metadata=alert.get("metadata", {}),
            )
            db.add(db_alert)
            await db.flush()
            return db_alert.to_dict()
    
    return asyncio.run(_save())


def _create_scan_record(scan_type: str, triggered_by: str = "scheduler", parameters: dict = None) -> str:
    """Create a scan history record and return scan_id."""
    import asyncio
    import uuid
    
    scan_id = f"SCAN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
    
    async def _save():
        async with get_db_context() as db:
            scan = ScanHistory(
                scan_id=scan_id,
                scan_type=scan_type,
                status="running",
                triggered_by=triggered_by,
                parameters=parameters or {},
                started_at=datetime.now(timezone.utc).isoformat(),
            )
            db.add(scan)
            await db.flush()
    
    asyncio.run(_save())
    return scan_id


def _update_scan_record(scan_id: str, status: str, results_summary: dict = None, alerts_created: int = 0, error: str = None):
    """Update scan history record."""
    import asyncio
    
    async def _update():
        async with get_db_context() as db:
            from sqlalchemy import select
            result = await db.execute(select(ScanHistory).where(ScanHistory.scan_id == scan_id))
            scan = result.scalar_one_or_none()
            if scan:
                scan.status = status
                if results_summary:
                    scan.results_summary = results_summary
                scan.alerts_created = alerts_created
                if error:
                    scan.error_message = error
                if status in ("completed", "failed", "partial"):
                    scan.completed_at = datetime.now(timezone.utc).isoformat()
                    if scan.started_at:
                        from dateutil import parser
                        start = parser.isoparse(scan.started_at)
                        scan.duration_seconds = (datetime.now(timezone.utc) - start).total_seconds()
    
    asyncio.run(_update())


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def scan_philippines_news_feeds_task(self) -> dict:
    """Celery task to scan PH news feeds for breach alerts."""
    scan_id = _create_scan_record("breach_news", "scheduler")
    alerts_created = 0
    errors = []
    
    try:
        # Run the async scan function
        import asyncio
        news_alerts = asyncio.run(_scan_news())
        
        for alert in news_alerts:
            try:
                _save_alert_to_db(alert)
                alerts_created += 1
            except Exception as e:
                errors.append(f"save alert: {e}")
        
        results = {
            "news_alerts": len(news_alerts),
            "alerts_created": alerts_created,
            "errors": errors,
        }
        
        _update_scan_record(scan_id, "completed" if not errors else "partial", results, alerts_created)
        return {"scan_id": scan_id, "status": "completed", **results}
        
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def scan_philippines_darkweb_task(self) -> dict:
    """Celery task to scan dark web for PH breach indicators."""
    scan_id = _create_scan_record("darkweb_ahmia", "scheduler")
    alerts_created = 0
    errors = []
    
    try:
        import asyncio
        darkweb_alerts = asyncio.run(_scan_darkweb())
        
        for alert in darkweb_alerts:
            try:
                _save_alert_to_db(alert)
                alerts_created += 1
            except Exception as e:
                errors.append(f"save alert: {e}")
        
        results = {
            "darkweb_alerts": len(darkweb_alerts),
            "alerts_created": alerts_created,
            "errors": errors,
        }
        
        _update_scan_record(scan_id, "completed" if not errors else "partial", results, alerts_created)
        return {"scan_id": scan_id, "status": "completed", **results}
        
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def scan_philippines_ransomware_task(self) -> dict:
    """Celery task to scan for PH ransomware activity."""
    scan_id = _create_scan_record("ransomware", "scheduler")
    alerts_created = 0
    errors = []
    
    try:
        import asyncio
        ransomware_alerts = asyncio.run(_scan_ransomware())
        
        for alert in ransomware_alerts:
            try:
                _save_alert_to_db(alert)
                alerts_created += 1
            except Exception as e:
                errors.append(f"save alert: {e}")
        
        results = {
            "ransomware_alerts": len(ransomware_alerts),
            "alerts_created": alerts_created,
            "errors": errors,
        }
        
        _update_scan_record(scan_id, "completed" if not errors else "partial", results, alerts_created)
        return {"scan_id": scan_id, "status": "completed", **results}
        
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True)
def full_breach_scan_task(self, triggered_by: str = "manual") -> dict:
    """Run all breach scans in sequence."""
    scan_id = _create_scan_record("full", triggered_by)
    total_alerts = 0
    all_errors = []
    results = {}
    
    # Run news scan
    try:
        import asyncio
        news_alerts = asyncio.run(_scan_news())
        for alert in news_alerts:
            _save_alert_to_db(alert)
            total_alerts += 1
        results["news"] = {"scanned": len(news_alerts), "created": len(news_alerts)}
    except Exception as e:
        all_errors.append(f"news: {e}")
        results["news"] = {"error": str(e)}
    
    # Run darkweb scan
    try:
        darkweb_alerts = asyncio.run(_scan_darkweb())
        for alert in darkweb_alerts:
            _save_alert_to_db(alert)
            total_alerts += 1
        results["darkweb"] = {"scanned": len(darkweb_alerts), "created": len(darkweb_alerts)}
    except Exception as e:
        all_errors.append(f"darkweb: {e}")
        results["darkweb"] = {"error": str(e)}
    
    # Run ransomware scan
    try:
        ransomware_alerts = asyncio.run(_scan_ransomware())
        for alert in ransomware_alerts:
            _save_alert_to_db(alert)
            total_alerts += 1
        results["ransomware"] = {"scanned": len(ransomware_alerts), "created": len(ransomware_alerts)}
    except Exception as e:
        all_errors.append(f"ransomware: {e}")
        results["ransomware"] = {"error": str(e)}
    
    status = "completed" if not all_errors else "partial"
    _update_scan_record(scan_id, status, results, total_alerts, "; ".join(all_errors) if all_errors else None)
    
    return {"scan_id": scan_id, "status": status, "total_alerts": total_alerts, "results": results, "errors": all_errors}


@shared_task
def create_manual_breach_alert_task(alert_data: dict) -> dict:
    """Create a manual breach alert from API."""
    import asyncio
    
    async def _create():
        async with get_db_context() as db:
            alert = BreachAlert(
                alert_id=alert_data["alert_id"],
                title=alert_data["title"],
                target=alert_data["target"],
                severity=alert_data["severity"],
                source=alert_data["source"],
                description=alert_data["description"],
                link=alert_data.get("link"),
                alert_type=alert_data.get("alert_type", "manual"),
                tags=alert_data.get("tags", []),
                evidence_hash=alert_data["hash"],
                metadata=alert_data.get("metadata", {}),
            )
            db.add(alert)
            await db.flush()
            return alert.to_dict()
    
    return asyncio.run(_create())