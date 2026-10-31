"""Philippines-focused data breach alert storage and notification system."""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from fastapi import HTTPException

from app.config import APP_NAME, BREACH_ALERT_DIR, DEVELOPER, VERSION

# Alert ID pattern: ALRT-PH-<timestamp>-<random>
ALERT_ID_RE = re.compile(r"^ALRT-PH-\d{14}-[A-Fa-f0-9]{6}$")

# Philippines-specific breach targets
PH_BREACH_TARGETS = {
    # Government
    "DepEd", "PhilHealth", "GSIS", "SSS", "COMELEC", "DICT", "NBI", "PNP",
    "LTO", "BIR", "DILG", "DOJ", "DND", "AFP", "NICA", "NTF-ELCAC",
    "Official Gazette", "Malacañang", "Senate", "House of Representatives",
    "Supreme Court", "COA", "CSC", "NEDA", "PSA", "DFA", "DMW", "DOLE",
    "DENR", "DPWH", "DOTr", "DTI", "DA", "DOST", "DOH", "DSWD",
    "ARTA", "BOC", "DEPDev", "UPOU",
    # Financial
    "BDO", "BPI", "Metrobank", "Land Bank", "Security Bank", "UnionBank",
    "RCBC", "PNB", "EastWest", "UBP", "Robinsons Bank", "China Bank",
    "GCash", "Maya", "PayMaya", "GrabPay", "Coins.ph", "PDIC",
    # Telecom
    "Globe", "Smart", "DITO", "PLDT", "Converge", "Sky Cable", "Cignal",
    # Transport
    "Philippine Airlines", "Cebu Pacific", "AirAsia", "Philippine Air",
    # Retail/E-commerce
    "Ayala", "SM", "Robinsons", "Jollibee", "McDonalds", "Meralco",
    "Lazada", "Shopee", "FoodPanda", "Zalora", "BeautyMNL",
    # Identity
    "National ID", "PhilSys", "eGov", "officialgazette",
}

# Alert severity levels
SEVERITY_ORDER = {"INFO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_alert_id() -> str:
    """Collision-resistant alert ID."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"ALRT-PH-{stamp}-{os.urandom(3).hex().upper()}"


def _alert_path(alert_id: str) -> Path:
    if not ALERT_ID_RE.match(alert_id):
        raise HTTPException(status_code=400, detail="Invalid alert ID format")
    path = (BREACH_ALERT_DIR / f"{alert_id}.json").resolve()
    if path.parent != BREACH_ALERT_DIR:
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    return path


def _compute_hash(document: dict) -> str:
    """Compute SHA256 hash of alert document (excluding hash field)."""
    copy = json.loads(json.dumps(document, default=str))
    copy.pop("hash", None)
    payload = json.dumps(copy, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _verify_hash(document: dict) -> bool:
    stored = document.get("hash")
    return bool(stored) and stored == _compute_hash(document)


def save_alert(alert: dict) -> dict:
    """Persist an alert with integrity hash."""
    alert["hash"] = _compute_hash(alert)
    BREACH_ALERT_DIR.mkdir(parents=True, exist_ok=True)
    path = _alert_path(alert["alert_id"])

    # Atomic write
    import tempfile
    fd, tmp = tempfile.mkstemp(dir=str(BREACH_ALERT_DIR), prefix=".tmp-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(alert, f, indent=2, default=str)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise

    alert["_path"] = str(path)
    return alert


def load_alert(alert_id: str) -> dict:
    path = _alert_path(alert_id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Alert not found")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def list_alerts(
    severity: str | None = None,
    target: str | None = None,
    source: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """List alerts with filtering, newest first."""
    if not BREACH_ALERT_DIR.is_dir():
        return []

    alerts = []
    for path in BREACH_ALERT_DIR.glob("*.json"):
        try:
            with path.open(encoding="utf-8") as f:
                alert = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue

        # Filter
        if severity and alert.get("severity") != severity:
            continue
        if target and target.lower() not in (alert.get("target", "").lower()):
            continue
        if source and source.lower() not in (alert.get("source", "").lower()):
            continue

        alerts.append(alert)

    # Sort newest first
    alerts.sort(key=lambda a: a.get("created", ""), reverse=True)
    return alerts[offset:offset + limit]


def count_alerts(severity: str | None = None, since: str | None = None) -> int:
    """Count total alerts matching criteria."""
    alerts = list_alerts(severity=severity, limit=10000)
    if since:
        alerts = [a for a in alerts if a.get("created", "") >= since]
    return len(alerts)


def create_breach_alert(
    *,
    title: str,
    target: str,
    severity: str,
    source: str,
    description: str,
    link: str | None = None,
    alert_type: str = "news",
    tags: list[str] | None = None,
) -> dict:
    """Create a standardized Philippines breach alert."""
    if severity not in SEVERITY_ORDER:
        raise ValueError(f"Invalid severity: {severity}")

    alert = {
        "alert_id": new_alert_id(),
        "created": utcnow_iso(),
        "title": title,
        "target": target,
        "severity": severity,
        "source": source,
        "description": description,
        "link": link,
        "type": alert_type,
        "tags": tags or ["data-breach", "philippines"],
        "metadata": {
            "app": APP_NAME,
            "version": VERSION,
            "developer": DEVELOPER,
            "detection_method": "automated",
        },
    }
    return save_alert(alert)


def is_philippines_related(text: str) -> bool:
    """Check if text mentions Philippines-related entities."""
    text_lower = text.lower()
    return any(target.lower() in text_lower for target in PH_BREACH_TARGETS)


def extract_ph_target(text: str) -> str | None:
    """Extract Philippines target from text."""
    text_lower = text.lower()
    for target in PH_BREACH_TARGETS:
        if target.lower() in text_lower:
            return target
    return None


async def init_breach_alert_store() -> None:
    """Initialize breach alert store directory."""
    BREACH_ALERT_DIR.mkdir(parents=True, exist_ok=True)


class BreachAlertStore:
    """High-level breach alert operations."""

    @staticmethod
    async def scan_and_alert() -> dict:
        """Run automated scan for new PH breaches and create alerts."""
        # This would be called by a scheduled task
        from app.services.breach_check import breach_service
        from app.services.darkweb_scanner import scan_philippines_darkweb

        results = {"news_alerts": 0, "darkweb_alerts": 0, "errors": []}

        # 1. Scan news feeds
        try:
            alerts = await scan_philippines_news_feeds()
            results["news_alerts"] = len(alerts)
        except Exception as e:
            results["errors"].append(f"news: {e}")

        # 2. Scan dark web
        try:
            alerts = await scan_philippines_darkweb()
            results["darkweb_alerts"] = len(alerts)
        except Exception as e:
            results["errors"].append(f"darkweb: {e}")

        return results


# Placeholder for darkweb scanner import (circular dependency)
async def scan_philippines_darkweb() -> list[dict]:
    """Import and run dark web scan."""
    from app.services.darkweb_scanner import scan_philippines_darkweb as _scan
    return await _scan()


async def scan_philippines_news_feeds() -> list[dict]:
    """Scan PH news RSS feeds for breach keywords."""
    import httpx

    feeds = [
        "https://api.rss2json.com/v1/api.json?rss_url=https://www.rappler.com/nation/feed/",
        "https://api.rss2json.com/v1/api.json?rss_url=https://newsinfo.inquirer.net/feed",
        "https://api.rss2json.com/v1/api.json?rss_url=https://www.philstar.com/rss/headlines",
        "https://api.rss2json.com/v1/api.json?rss_url=https://news.abs-cbn.com/feed",
        "https://api.rss2json.com/v1/api.json?rss_url=https://www.gmanetwork.com/rss/news/nation/feed",
        "https://api.rss2json.com/v1/api.json?rss_url=https://www.mb.com.ph/feed",
    ]

    breach_keywords = [
        "data breach", "data leak", "leaked", "hacked", "compromised",
        "exposed", "stolen", "database", "records", "pii",
        "personal information", "customer data", "credential"
    ]

    alerts = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        for feed_url in feeds:
            try:
                resp = await client.get(feed_url)
                if resp.status_code != 200:
                    continue
                data = resp.json()
                source = data.get("feed", {}).get("title", "PH News")

                for item in (data.get("items", []) or [])[:20]:
                    text = f"{item.get('title', '')} {item.get('description', '')}".lower()
                    if (any(kw in text for kw in breach_keywords) and
                        any(t.lower() in text for t in PH_BREACH_TARGETS)):

                        severity = "CRITICAL" if any(k in text for k in ["critical", "major", "massive", "million", "thousand"]) else "HIGH"
                        target = next((t for t in PH_BREACH_TARGETS if t.lower() in text), "Unknown PH Entity")

                        alert = create_breach_alert(
                            title=f"🇵🇭 PH DATA BREACH: {item.get('title', 'Unknown')}",
                            target=target,
                            severity=severity,
                            source=source,
                            description=(item.get("description", "") or "").replace("<", "<").replace(">", ">")[:500],
                            link=item.get("link"),
                            alert_type="news",
                            tags=["data-breach", "philippines", "news"],
                        )
                        alerts.append(alert)

            except Exception:
                continue

    return alerts