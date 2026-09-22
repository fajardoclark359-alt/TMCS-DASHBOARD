"""
Dark Web & Extremism Monitoring Dashboard
Aggregates open-source threat intelligence from legal, public feeds.
"""
import asyncio
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/darkweb", tags=["darkweb"])

# ── Config ────────────────────────────────────────────────────────
AHMIA_SEARCH_URL = "https://ahmia.fi/api/v1/search"
OTX_PULSES_URL = "https://otx.alienvault.com/api/v1/pulses/subscribed"
URLHAUS_API = "https://urlhaus-api.abuse.ch/v1/"
ABUSEIPDB_API = "https://api.abuseipdb.com/api/v2"

HEADERS = {"User-Agent": "OSINT-Research-Dashboard/2.0"}

# Keywords related to nihilistic violent extremism, 764 network, and related threats
DEFAULT_KEYWORDS = [
    "764", "764 network", "nihilistic extremism", "violent nihilism",
    "order of the nine angles", "O9A", "atomwaffen", "sonnenkrieg",
    "national socialist liberation front", "feuerkrieg division",
    "accelerationism", "lone wolf", "incel extremism", "true crime obsession",
    "glorification of violence", "manifesto", "accelerationist manifesto",
    "dark web recruitment", "extremist grooming", "violent radicalization",
    "school shooting", "mass casualty", "terrorism recruitment",
]

# RSS feeds for threat intelligence news
RSS_FEEDS = {
    "BleepingComputer": "https://www.bleepingcomputer.com/feed/",
    "The Hacker News": "https://feeds.feedburner.com/TheHackersNews",
    "SecurityWeek": "https://feeds.feedburner.com/securityweek",
    "KrebsOnSecurity": "https://krebsonsecurity.com/feed/",
    "DarkReading": "https://www.darkreading.com/rss.xml",
    "ThreatPost": "https://threatpost.com/feed/",
    "Cyberscoop": "https://cyberscoop.com/feed/",
    "Recorded Future": "https://www.recordedfuture.com/feed",
}


# ── Helpers ───────────────────────────────────────────────────────
async def fetch_json(url: str, params: dict = None, headers: dict = None, timeout: int = 15) -> dict:
    """Safe JSON fetch with error handling."""
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            h = {**HEADERS, **(headers or {})}
            resp = await client.get(url, params=params, headers=h)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return {}


async def fetch_text(url: str, timeout: int = 15) -> str:
    """Safe text fetch."""
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code == 200:
                return resp.text
    except Exception:
        pass
    return ""


def parse_rss_items(xml_text: str, source: str, limit: int = 10) -> list:
    """Parse RSS XML into structured items."""
    items = []
    # Simple regex-based RSS parser (no lxml dependency needed)
    entries = re.findall(r'<item>(.*?)</item>', xml_text, re.DOTALL)
    for entry in entries[:limit]:
        title = re.search(r'<title[^>]*>(.*?)</title>', entry, re.DOTALL)
        link = re.search(r'<link[^>]*>(.*?)</link>', entry, re.DOTALL)
        desc = re.search(r'<description[^>]*>(.*?)</description>', entry, re.DOTALL)
        pub = re.search(r'<pubDate[^>]*>(.*?)</pubDate>', entry, re.DOTALL)
        items.append({
            "title": title.group(1).strip() if title else "No title",
            "url": link.group(1).strip() if link else "",
            "description": re.sub(r'<[^>]+>', '', desc.group(1).strip())[:300] if desc else "",
            "published": pub.group(1).strip() if pub else "",
            "source": source,
        })
    return items


def compute_risk_score(indicators: dict) -> dict:
    """Compute a threat risk score based on indicators."""
    score = 0
    flags = []
    if indicators.get("otx_pulse_count", 0) > 0:
        score += min(indicators["otx_pulse_count"] * 10, 30)
        flags.append(f"{indicators['otx_pulse_count']} OTX threat pulses matched")
    if indicators.get("malicious_urls", 0) > 0:
        score += min(indicators["malicious_urls"] * 5, 25)
        flags.append(f"{indicators['malicious_urls']} malicious URLs found")
    if indicators.get("abuse_reports", 0) > 0:
        score += min(indicators["abuse_reports"] * 8, 25)
        flags.append(f"{indicators['abuse_reports']} abuse reports")
    if indicators.get("darkweb_mentions", 0) > 0:
        score += min(indicators["darkweb_mentions"] * 5, 20)
        flags.append(f"{indicators['darkweb_mentions']} dark web mentions")
    score = min(score, 100)
    risk_level = "CRITICAL" if score >= 70 else "HIGH" if score >= 50 else "MEDIUM" if score >= 30 else "LOW"
    return {"score": score, "risk_level": risk_level, "flags": flags}


# ── Endpoints ─────────────────────────────────────────────────────

@router.get("/feeds")
async def get_threat_feeds(limit: int = Query(20, ge=1, le=100)):
    """Aggregate threat intelligence from multiple open-source feeds."""
    tasks = []
    feed_results = {}

    # Fetch RSS feeds concurrently
    for name, url in RSS_FEEDS.items():
        tasks.append(fetch_text(url))

    texts = await asyncio.gather(*tasks, return_exceptions=True)

    all_items = []
    for (name, _), text in zip(RSS_FEEDS.items(), texts):
        if isinstance(text, str) and text:
            items = parse_rss_items(text, name, limit=5)
            all_items.extend(items)

    # Fetch URLhaus recent URLs
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{URLHAUS_API}urls/recent/URLhaus/", data={"limit": 10})
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("urls", [])[:10]:
                    all_items.append({
                        "title": f"Malicious URL: {item.get('url_status', 'unknown')}",
                        "url": item.get("url", ""),
                        "description": f"Tags: {item.get('tags', 'none')} | Status: {item.get('url_status', 'unknown')}",
                        "published": item.get("dateadded", ""),
                        "source": "URLhaus",
                        "threat_type": item.get("threat", ""),
                        "tags": item.get("tags", []),
                    })
    except Exception:
        pass

    # Fetch AlienVault OTX latest pulses (public)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://otx.alienvault.com/otxapi/pulses?limit=10&sort=-created&modified_since=2026-01-01",
                headers=HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                for pulse in data.get("results", [])[:10]:
                    all_items.append({
                        "title": pulse.get("name", "OTX Pulse"),
                        "url": f"https://otx.alienvault.com/pulse/{pulse.get('id', '')}",
                        "description": pulse.get("description", "")[:300],
                        "published": pulse.get("created", ""),
                        "source": "AlienVault OTX",
                        "tags": pulse.get("tags", []),
                        "adversary": pulse.get("adversary", ""),
                    })
    except Exception:
        pass

    # Sort by date (most recent first)
    all_items.sort(key=lambda x: x.get("published", ""), reverse=True)

    return {
        "feeds": all_items[:limit],
        "total": len(all_items),
        "sources": list(RSS_FEEDS.keys()) + ["URLhaus", "AlienVault OTX"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/search")
async def search_darkweb(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
):
    """Search dark web indices via Ahmia.fi (legal, surface-indexed)."""
    results = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://ahmia.fi/api/v1/search?q={q}",
                headers=HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("results", [])[:limit]:
                    results.append({
                        "title": item.get("title", "Untitled"),
                        "onion_url": item.get("url", ""),
                        "description": item.get("description", "")[:300],
                        "source": "Ahmia.fi",
                        "reliability": item.get("reliability", "unknown"),
                        "type": item.get("type", "unknown"),
                    })
    except Exception:
        pass

    # Also search Ahmia's meta search
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://ahmia.fi/api/v1/search?q={q}&type=meta",
                headers=HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("results", [])[:5]:
                    results.append({
                        "title": item.get("title", "Meta Result"),
                        "onion_url": item.get("url", ""),
                        "description": item.get("description", "")[:300],
                        "source": "Ahmia Meta",
                        "type": "meta",
                    })
    except Exception:
        pass

    return {
        "query": q,
        "results": results,
        "total": len(results),
        "searched_at": datetime.now(timezone.utc).isoformat(),
        "source": "Ahmia.fi (Legal Dark Web Search Engine)",
    }


@router.get("/keywords")
async def monitor_keywords(
    keywords: Optional[str] = Query(None, description="Comma-separated keywords to monitor"),
    limit: int = Query(15, ge=1, le=50),
):
    """Monitor keywords across open-source threat feeds."""
    kw_list = [k.strip() for k in keywords.split(",")] if keywords else DEFAULT_KEYWORDS

    # Fetch recent threat feeds
    all_feeds = []
    for name, url in list(RSS_FEEDS.items())[:4]:  # Limit to avoid rate limiting
        text = await fetch_text(url)
        if text:
            items = parse_rss_items(text, name, limit=20)
            all_feeds.extend(items)

    # Search for keyword matches
    matches = {}
    for item in all_feeds:
        text = f"{item.get('title', '')} {item.get('description', '')}".lower()
        for kw in kw_list:
            if kw.lower() in text:
                if kw not in matches:
                    matches[kw] = []
                matches[kw].append(item)

    # Also check URLhaus for malicious URLs
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{URLHAUS_API}urls/recent/URLhaus/", data={"limit": 50})
            if resp.status_code == 200:
                data = resp.json()
                for url_item in data.get("urls", []):
                    tags = " ".join(url_item.get("tags", [])).lower()
                    url_str = url_item.get("url", "").lower()
                    for kw in kw_list:
                        if kw.lower() in tags or kw.lower() in url_str:
                            if kw not in matches:
                                matches[kw] = []
                            matches[kw].append({
                                "title": f"Malicious URL match: {kw}",
                                "url": url_item.get("url", ""),
                                "description": f"Tags: {url_item.get('tags', [])}",
                                "published": url_item.get("dateadded", ""),
                                "source": "URLhaus",
                            })
    except Exception:
        pass

    return {
        "keywords": kw_list,
        "matches": {k: v[:limit] for k, v in matches.items()},
        "match_count": {k: len(v) for k, v in matches.items()},
        "total_matches": sum(len(v) for v in matches.values()),
        "monitored_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/alerts")
async def get_alerts(limit: int = Query(20, ge=1, le=50)):
    """Get latest threat alerts from multiple sources."""
    alerts = []

    # OTX latest pulses
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://otx.alienvault.com/otxapi/pulses?limit=10&sort=-created&modified_since=2026-09-01",
                headers=HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                for pulse in data.get("results", [])[:10]:
                    alerts.append({
                        "id": pulse.get("id", ""),
                        "title": pulse.get("name", ""),
                        "description": pulse.get("description", "")[:200],
                        "severity": "high" if any(t in str(pulse.get("tags", [])).lower() for t in ["apt", "malware", "ransomware", "extremism"]) else "medium",
                        "source": "AlienVault OTX",
                        "url": f"https://otx.alienvault.com/pulse/{pulse.get('id', '')}",
                        "created": pulse.get("created", ""),
                        "tags": pulse.get("tags", []),
                        "indicator_count": len(pulse.get("indicators", [])),
                    })
    except Exception:
        pass

    # URLhaus latest
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{URLHAUS_API}urls/recent/URLhaus/", data={"limit": 10})
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("urls", [])[:10]:
                    alerts.append({
                        "id": hashlib.md5(item.get("url", "").encode()).hexdigest()[:12],
                        "title": f"Malicious URL: {item.get('url', '')[:60]}",
                        "description": f"Status: {item.get('url_status', 'unknown')} | Tags: {item.get('tags', [])}",
                        "severity": "high" if item.get("url_status") == "online" else "medium",
                        "source": "URLhaus",
                        "url": item.get("url", ""),
                        "created": item.get("dateadded", ""),
                        "tags": item.get("tags", []),
                    })
    except Exception:
        pass

    # Sort by date
    alerts.sort(key=lambda x: x.get("created", ""), reverse=True)

    return {
        "alerts": alerts[:limit],
        "total": len(alerts),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/trends")
async def get_trends():
    """Get trend analysis from aggregated threat intelligence."""
    # Fetch recent data
    tasks = [
        fetch_text(RSS_FEEDS.get("BleepingComputer", "")),
        fetch_text(RSS_FEEDS.get("The Hacker News", "")),
    ]
    texts = await asyncio.gather(*tasks, return_exceptions=True)

    all_items = []
    for text in texts:
        if isinstance(text, str) and text:
            all_items.extend(parse_rss_items(text, "Security", limit=30))

    # Count topic frequency
    topic_counts = {}
    topic_keywords = {
        "Ransomware": ["ransomware", "ransom", "encrypt"],
        "Data Breach": ["breach", "leak", "exposed", "stolen"],
        "Phishing": ["phishing", "phish", "social engineering"],
        "Malware": ["malware", "trojan", "virus", "backdoor"],
        "Zero-Day": ["zero-day", "0day", "exploit", "vulnerability"],
        "Extremism": ["extremism", "terrorist", "radical", "violent", "764", "nihilistic"],
        "APT": ["apt", "nation-state", "state-sponsored"],
        "Infrastructure": ["botnet", "ddos", "infrastructure"],
    }

    for item in all_items:
        text = f"{item.get('title', '')} {item.get('description', '')}".lower()
        for topic, keywords_list in topic_keywords.items():
            if any(kw in text for kw in keywords_list):
                topic_counts[topic] = topic_counts.get(topic, 0) + 1

    # Source distribution
    source_counts = {}
    for item in all_items:
        src = item.get("source", "Unknown")
        source_counts[src] = source_counts.get(src, 0) + 1

    return {
        "topics": [{"topic": k, "count": v} for k, v in sorted(topic_counts.items(), key=lambda x: -x[1])],
        "sources": [{"source": k, "count": v} for k, v in sorted(source_counts.items(), key=lambda x: -x[1])],
        "total_articles": len(all_items),
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/indicators")
async def get_indicators(
    q: str = Query(..., min_length=2, description="Search for IOCs"),
):
    """Search for Indicators of Compromise (IOCs) across threat feeds."""
    indicators = {
        "ips": [],
        "domains": [],
        "urls": [],
        "hashes": [],
    }

    # Search URLhaus
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{URLHAUS_API}urls/search/hostname={q}", data={"limit": 20})
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("urls", [])[:20]:
                    indicators["urls"].append({
                        "url": item.get("url", ""),
                        "status": item.get("url_status", ""),
                        "tags": item.get("tags", []),
                        "date_added": item.get("dateadded", ""),
                    })
    except Exception:
        pass

    # Search OTX for IOCs
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://otx.alienvault.com/otxapi/indicators?q={q}&limit=20",
                headers=HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("results", [])[:20]:
                    ind_type = item.get("type", "")
                    ind_val = item.get("indicator", "")
                    if ind_type in ("IPv4", "IPv6"):
                        indicators["ips"].append({"ip": ind_val, "source": "OTX"})
                    elif ind_type in ("domain", "hostname"):
                        indicators["domains"].append({"domain": ind_val, "source": "OTX"})
                    elif ind_type == "URL":
                        indicators["urls"].append({"url": ind_val, "source": "OTX"})
                    elif ind_type in ("FileHash-MD5", "FileHash-SHA1", "FileHash-SHA256"):
                        indicators["hashes"].append({"hash": ind_val, "type": ind_type, "source": "OTX"})
    except Exception:
        pass

    total = sum(len(v) for v in indicators.values())

    return {
        "query": q,
        "indicators": indicators,
        "total": total,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }
