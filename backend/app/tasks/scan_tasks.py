"""General scan tasks."""

import asyncio
import uuid
from datetime import UTC, datetime
from typing import Any

from celery import shared_task

from app.database import get_db_context
from app.models import ScanHistory, ScanStatus, ScanType


def _create_scan_record(scan_type: str, triggered_by: str = "manual", parameters: dict = None) -> str:
    scan_id = f"SCAN-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

    async def _save():
        async with get_db_context() as db:
            scan = ScanHistory(
                scan_id=scan_id,
                scan_type=ScanType(scan_type),
                status=ScanStatus.RUNNING,
                triggered_by=triggered_by,
                parameters=parameters or {},
                started_at=datetime.now(UTC).isoformat(),
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
                    scan.completed_at = datetime.now(UTC).isoformat()
                    if scan.started_at:
                        from dateutil import parser
                        start = parser.isoparse(scan.started_at)
                        scan.duration_seconds = (datetime.now(UTC) - start).total_seconds()

    asyncio.run(_update())


@shared_task(bind=True, max_retries=2)
def domain_scan_task(self, domain: str, triggered_by: str = "api") -> dict[str, Any]:
    """Run domain investigation scan."""
    scan_id = _create_scan_record("domain", triggered_by, {"domain": domain})

    try:
        from pydantic import BaseModel

        from app.routers.domain import domain_footprint

        class DomainRequest(BaseModel):
            domain: str

        result = asyncio.run(domain_footprint(None, DomainRequest(domain=domain)))
        _update_scan_record(scan_id, "completed", {"domain": domain, "result_keys": list(result.keys())})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def email_scan_task(self, email: str, triggered_by: str = "api") -> dict[str, Any]:
    """Run email investigation scan."""
    scan_id = _create_scan_record("email", triggered_by, {"email": email})

    try:
        # Import here to avoid circular imports
        from app.routers.email import _investigate as investigate_email

        result = asyncio.run(investigate_email(email=email, api_key=None))
        _update_scan_record(scan_id, "completed", {"email": email, "result_keys": list(result.keys())})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def username_scan_task(self, username: str, triggered_by: str = "api") -> dict[str, Any]:
    """Run username investigation scan."""
    scan_id = _create_scan_record("username", triggered_by, {"username": username})

    try:
        from app.services.social_media import social_media_service

        result = asyncio.run(social_media_service.search_all(username))
        profiles = result.get("profiles", [])
        _update_scan_record(scan_id, "completed", {"username": username, "platforms_found": len(profiles)})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def url_scan_task(self, url: str, triggered_by: str = "api") -> dict[str, Any]:
    """Run URL investigation scan."""
    scan_id = _create_scan_record("url", triggered_by, {"url": url})

    try:
        # Import here to avoid circular imports
        from app.routers.url import _investigate as investigate_url

        result = asyncio.run(investigate_url(raw_url=url))
        _update_scan_record(scan_id, "completed", {"url": url, "result_keys": list(result.keys())})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def phone_scan_task(self, phone: str, triggered_by: str = "api") -> dict[str, Any]:
    """Run phone investigation scan."""
    scan_id = _create_scan_record("phone", triggered_by, {"phone": phone})

    try:
        from app.services.phone_lookup import phone_service

        result = asyncio.run(phone_service.lookup_phone(phone))
        _update_scan_record(scan_id, "completed", {"phone": phone, "result_keys": list(result.keys())})
        return {"scan_id": scan_id, "status": "completed", "result": result}
    except Exception as exc:
        _update_scan_record(scan_id, "failed", error=str(exc))
        raise self.retry(exc=exc)
