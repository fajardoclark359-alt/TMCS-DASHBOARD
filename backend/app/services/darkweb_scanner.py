"""Philippines-focused dark web scanning for breach detection."""

from __future__ import annotations

import httpx
from typing import Any

from app.services.breach_alerts import (
    PH_BREACH_TARGETS,
    create_breach_alert,
    extract_ph_target,
    is_philippines_related,
)

AHMIA_API = "https://ahmia.fi/api/v1/search"
URLHAUS_API = "https://urlhaus-api.abuse.ch/v1/urls/recent/"

# PH-specific dark web search queries
PH_DARKWEB_QUERIES = [
    "philippines data breach",
    "philippine data leak",
    "philippines database",
    "philippines dump",
    "philippines credentials",
    "philippines PII",
    "philhealth breach",
    "COMELEC breach",
    "DepEd breach",
    "PhilSys breach",
    "National ID philippines",
    "globe telecom breach",
    "smart communications breach",
    "bdounibank breach",
    "bpi breach",
    "metrobank breach",
    "gcash breach",
    "maya breach",
    "paymaya breach",
    "philippines government leak",
    "philippines corporate leak",
]

# PH ransomware groups to monitor
PH_RANSOMWARE_QUERIES = [
    "lockbit philippines",
    "blackcat philippines",
    "alphv philippines",
    "medusa philippines",
    "play ransomware philippines",
    "philippines ransomware",
]


async def scan_ahmia_philippines() -> list[dict]:
    """Scan Ahmia.fi for Philippines-related dark web content."""
    alerts = []

    for query in PH_DARKWEB_QUERIES:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{AHMIA_API}?q={query}")
                if resp.status_code == 200:
                    data = resp.json()
                    for item in (data.get("items", []) or data.get("results", []) or [])[:5]:
                        title = item.get("title", "")
                        description = item.get("description", "")
                        url = item.get("onion_url", item.get("url", ""))

                        # Determine severity based on content
                        text = f"{title} {description}".lower()
                        severity = "CRITICAL" if any(k in text for k in ["dump", "database", "credentials", "pii", "ssn", "passport"]) else "HIGH"

                        target = extract_ph_target(f"{title} {description}") or "Philippines Entity"

                        alert = create_breach_alert(
                            title=f"🌐 DARK WEB: {title or query}",
                            target=target,
                            severity=severity,
                            source="Ahmia.fi",
                            description=f"Query: {query}\n{description[:400]}",
                            link=url,
                            alert_type="darkweb",
                            tags=["data-breach", "philippines", "darkweb", query],
                        )
                        alerts.append(alert)

        except Exception:
            continue

    return alerts


async def scan_urlhaus_philippines() -> list[dict]:
    """Scan URLhaus for Philippines-targeted malicious URLs."""
    alerts = []

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(URLHAUS_API, data={"limit": 500})
            if resp.status_code == 200:
                data = resp.json()
                for entry in data.get("urls", []):
                    url = (entry.get("url", "") or "").lower()
                    tags = (entry.get("tags", []) or [])
                    tags_str = " ".join(tags).lower()
                    threat = (entry.get("threat", "") or "").lower()
                    host = (entry.get("host", "") or "").lower()

                    # Check if PH-related
                    is_ph = any(target.lower() in f"{url} {tags_str} {host}" for target in PH_BREACH_TARGETS)

                    if is_ph and any(k in tags_str for k in ["breach", "leak", "dump", "credentials", "stealer", "infostealer"]):
                        severity = "CRITICAL" if "breach" in tags_str or "leak" in tags_str else "HIGH"
                        target = extract_ph_target(f"{url} {tags_str}") or "Philippines Entity"

                        alert = create_breach_alert(
                            title=f"🔗 URLHAUS: PH-Targeted {threat or 'malware'} — {url[:60]}",
                            target=target,
                            severity=severity,
                            source="URLhaus",
                            description=f"URL: {entry.get('url')}\nThreat: {entry.get('threat')}\nTags: {', '.join(tags)}",
                            link=entry.get("url"),
                            alert_type="urlhaus",
                            tags=["data-breach", "philippines", "urlhaus"] + tags,
                        )
                        alerts.append(alert)

    except Exception:
        pass

    return alerts


async def scan_philippines_darkweb() -> list[dict]:
    """Run all Philippines dark web scans."""
    all_alerts = []

    # Scan Ahmia
    ahmia_alerts = await scan_ahmia_philippines()
    all_alerts.extend(ahmia_alerts)

    # Scan URLhaus
    urlhaus_alerts = await scan_urlhaus_philippines()
    all_alerts.extend(urlhaus_alerts)

    # Sort by creation time (newest first)
    all_alerts.sort(key=lambda a: a.get("created", ""), reverse=True)

    return all_alerts


async def scan_philippines_ransomware() -> list[dict]:
    """Scan for PH-targeted ransomware activity."""
    alerts = []

    for query in PH_RANSOMWARE_QUERIES:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{AHMIA_API}?q={query}")
                if resp.status_code == 200:
                    data = resp.json()
                    for item in (data.get("items", []) or data.get("results", []) or [])[:3]:
                        title = item.get("title", "")
                        description = item.get("description", "")
                        url = item.get("onion_url", item.get("url", ""))

                        target = extract_ph_target(f"{title} {description}") or "Philippines Entity"

                        alert = create_breach_alert(
                            title=f"🔒 RANSOMWARE: {title or query}",
                            target=target,
                            severity="CRITICAL",
                            source="Ahmia.fi",
                            description=f"Ransomware query: {query}\n{description[:400]}",
                            link=url,
                            alert_type="darkweb",
                            tags=["ransomware", "philippines", "darkweb", query],
                        )
                        alerts.append(alert)

        except Exception:
            continue

    return alerts