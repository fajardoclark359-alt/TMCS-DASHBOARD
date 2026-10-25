"""General scan tasks."""

import asyncio
import uuid
from datetime import datetime, timezone
from celery import shared_task
from typing import Any, Dict

from app.database import get_db_context
from app.models import ScanHistory, ScanType, ScanStatus


def _create_scan_record(scan_type: str, triggered_by: str = "manual", parameters: dict = None) -> str:
    scan_id = f"SCAN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
    
    async def _save():
        async with get_db_context() as db:
            scan = ScanHistory(
                scan_id=scan_id,
                scan_type=ScanType(scan_type),
                status=ScanStatus.RUNNING,
                triggered_by=triggered_by,
                parameters=parameters or {},
                started_at=datetime.now(timezone.utc).isoformat(),
            )
            db.add(scan)
            await db.flush()
    
    asyncio.run(_save())
    return scan_id


def _update_scan_record(scan_id: str, status: str, results_summary: dict = None, alerts_created: int = 0, error: str = None):
    async def _update():
        async with get_db_context() as db:
            from sqlalchemy import select
            result = await db.execute(select(ScanHistory).where(ScanHistory.scan_id == scan_id))
            scan = result.scalar_one_or_none()
            if scan:
                scan.status = ScanStatus(status)
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


@shared_task(bind=True, max_retries=2)
def domain_scan_task(self, domain: str, triggered_by: str = "api") -> Dict[str, Any]:
    """Run domain investigation scan."""
    scan_id = _create_scan_record("domain", triggered_by, {"domain": domain})
    
    try:
        # Import here to avoid circular imports
        from app.routers.domain import domain_footprint
        from pydantic import BaseModel
        
        class DomainRequest(BaseModel):
            domain: str
            deep: bool = True
        
        result = asyncio.run(domain_footprint(DomainRequest(domain=domain, deep=True)))
        _update_scan_record(scan_id, "completed", {"domain": domain, "result_keys": list(result.keys())})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def email_scan_task(self, email: str, triggered_by: str = "api") -> Dict[str, Any]:
    """Run email investigation scan."""
    scan_id = _create_scan_record("email", triggered_by, {"email": email})
    
    try:
        from app.routers.email import investigate_email
        from pydantic import BaseModel
        
        class EmailRequest(BaseModel):
            email: str
        
        result = asyncio.run(investigate_email(EmailRequest(email=email)))
        _update_scan_record(scan_id, "completed", {"email": email, "result_keys": list(result.keys())})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def username_scan_task(self, username: str, triggered_by: str = "api") -> Dict[str, Any]:
    """Run username investigation scan."""
    scan_id = _create_scan_record("username", triggered_by, {"username": username})
    
    try:
        from app.services.social_media import social_media_service
        result = asyncio.run(social_media_service.check_username(username))
        _update_scan_record(scan_id, "completed", {"username": username, "platforms_found": len(result)})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def url_scan_task(self, url: str, triggered_by: str = "api") -> Dict[str, Any]:
    """Run URL investigation scan."""
    scan_id = _create_scan_record("url", triggered_by, {"url": url})
    
    try:
        from app.routers.url import investigate_url
        from pydantic import BaseModel
        
        class URLRequest(BaseModel):
            url: str
        
        result = asyncio.run(investigate_url(URLRequest(url=url)))
        _update_scan_record(scan_id, "completed", {"url": url, "result_keys": list(result.keys())})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def phone_scan_task(self, phone: str, triggered_by: str = "api") -> Dict[str, Any]:
    """Run phone investigation scan."""
    scan_id = _create_scan_record("phone", triggered_by, {"phone": phone})
    
    try:
        from app.services.phone_lookup import phone_lookup_service
        result = asyncio.run(phone_lookup_service.lookup_phone(phone))
        _update_scan_record(scan_id, "completed", {"phone": phone, "result_keys": list(result.keys())})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)