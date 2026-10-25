"""Philippines breach alert API endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from pydantic import BaseModel, Field

from app.services.breach_alerts import (
    list_alerts,
    count_alerts,
    create_breach_alert,
    scan_philippines_news_feeds,
    PH_BREACH_TARGETS,
    BreachAlertStore,
)
from app.services.darkweb_scanner import scan_philippines_darkweb, scan_philippines_ransomware
from app.config import API_KEY
from app.auth import verify_api_key

router = APIRouter(prefix="/api/breach-alerts", tags=["PH Breach Alerts"])

# Use auth if API_KEY is set
auth_dep = [Depends(verify_api_key)] if API_KEY else []


class AlertCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    target: str = Field(..., min_length=1, max_length=100)
    severity: str = Field(..., pattern="^(INFO|LOW|MEDIUM|HIGH|CRITICAL)$")
    source: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=10, max_length=5000)
    link: Optional[str] = Field(None, max_length=500)
    alert_type: str = Field("news", pattern="^(news|darkweb|urlhaus|forum|social)$")
    tags: Optional[list[str]] = Field(default_factory=list)


class ScanResponse(BaseModel):
    news_alerts: int
    darkweb_alerts: int
    ransomware_alerts: int
    total_new: int
    errors: list[str]


@router.get("/")
async def get_alerts(
    severity: Optional[str] = Query(None, pattern="^(INFO|LOW|MEDIUM|HIGH|CRITICAL)$"),
    target: Optional[str] = Query(None, max_length=100),
    source: Optional[str] = Query(None, max_length=100),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: None = Depends(verify_api_key) if API_KEY else None,
):
    """List Philippines breach alerts with filtering."""
    alerts = list_alerts(severity=severity, target=target, source=source, limit=limit, offset=offset)
    total = count_alerts(severity=severity)
    return {
        "alerts": alerts,
        "total": total,
        "limit": limit,
        "offset": offset,
        "filters": {"severity": severity, "target": target, "source": source},
    }


@router.get("/stats")
async def get_stats(
    since: Optional[str] = Query(None, description="ISO timestamp filter (e.g., 2024-01-01T00:00:00)"),
    _: None = Depends(verify_api_key) if API_KEY else None,
):
    """Get alert statistics."""
    by_severity = {}
    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
        by_severity[sev] = count_alerts(severity=sev, since=since)

    return {
        "total": count_alerts(since=since),
        "by_severity": by_severity,
        "tracked_targets": len(PH_BREACH_TARGETS),
        "since": since,
    }


@router.get("/targets")
async def get_tracked_targets(
    _: None = Depends(verify_api_key) if API_KEY else None,
):
    """Get list of Philippines entities being monitored."""
    return {
        "targets": sorted(PH_BREACH_TARGETS),
        "count": len(PH_BREACH_TARGETS),
        "categories": {
            "government": [t for t in PH_BREACH_TARGETS if any(g in t.lower() for g in ["deped", "philhealth", "gsis", "sss", "comelec", "dict", "nbi", "pnp", "lto", "bir", "dilg", "doj", "dnd", "afp", "nica", "ntf", "gazette", "malacañang", "senate", "house", "supreme", "court", "coa", "csc", "neda", "psa", "dfa", "dmw", "dole", "denr", "dpwh", "dotr", "dti", "da", "dost", "doh", "dswd"])],
            "financial": [t for t in PH_BREACH_TARGETS if any(g in t.lower() for g in ["bdo", "bpi", "metro", "land bank", "security", "union", "rcbc", "pnb", "eastwest", "ubp", "robinsons bank", "china bank", "gcash", "maya", "paymaya", "grabpay", "coins", "pdic"])],
            "telecom": [t for t in PH_BREACH_TARGETS if any(g in t.lower() for g in ["globe", "smart", "dito", "pldt", "converge", "sky", "cignal"])],
            "transport": [t for t in PH_BREACH_TARGETS if any(g in t.lower() for g in ["philippine airlines", "cebu pacific", "airasia"])],
            "retail": [t for t in PH_BREACH_TARGETS if any(g in t.lower() for g in ["ayala", "sm ", "robinsons", "jollibee", "mcdonald", "meralco", "lazada", "shopee", "foodpanda", "zalora", "beautymnl"])],
            "identity": [t for t in PH_BREACH_TARGETS if any(g in t.lower() for g in ["national id", "philsys", "egov", "officialgazette"])],
        },
    }


@router.post("/scan", response_model=ScanResponse, dependencies=auth_dep)
async def trigger_scan(background_tasks: BackgroundTasks):
    """Manually trigger a full Philippines breach scan."""
    results = {"news_alerts": 0, "darkweb_alerts": 0, "ransomware_alerts": 0, "total_new": 0, "errors": []}

    # Run scans in background
    async def run_scans():
        try:
            news_alerts = await scan_philippines_news_feeds()
            results["news_alerts"] = len(news_alerts)
        except Exception as e:
            results["errors"].append(f"news: {e}")

        try:
            darkweb_alerts = await scan_philippines_darkweb()
            results["darkweb_alerts"] = len(darkweb_alerts)
        except Exception as e:
            results["errors"].append(f"darkweb: {e}")

        try:
            ransomware_alerts = await scan_philippines_ransomware()
            results["ransomware_alerts"] = len(ransomware_alerts)
        except Exception as e:
            results["errors"].append(f"ransomware: {e}")

        results["total_new"] = results["news_alerts"] + results["darkweb_alerts"] + results["ransomware_alerts"]

    background_tasks.add_task(run_scans)
    return results


@router.post("/", status_code=201, dependencies=auth_dep)
async def create_alert(request: AlertCreateRequest):
    """Manually create a breach alert."""
    try:
        alert = create_breach_alert(
            title=request.title,
            target=request.target,
            severity=request.severity,
            source=request.source,
            description=request.description,
            link=request.link,
            alert_type=request.alert_type,
            tags=request.tags,
        )
        return {"alert_id": alert["alert_id"], "message": "Alert created", "alert": alert}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{alert_id}")
async def get_alert(
    alert_id: str,
    _: None = Depends(verify_api_key) if API_KEY else None,
):
    """Get a specific alert by ID."""
    from app.services.breach_alerts import load_alert
    return load_alert(alert_id)


@router.delete("/{alert_id}", dependencies=auth_dep)
async def delete_alert(alert_id: str):
    """Delete an alert."""
    from app.services.breach_alerts import _alert_path
    path = _alert_path(alert_id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Alert not found")
    path.unlink()
    return {"message": "Alert deleted", "alert_id": alert_id}