import asyncio
from typing import List, Optional

import dns.resolver
import httpx
import whois
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import evidence_store
from app.services.validators import normalize_domain

router = APIRouter()

PREFIX = "EVD-DOMAIN"

DNS_RECORD_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "SRV", "CAA", "DNSKEY", "DS", "NSEC", "NSEC3", "RRSIG"]
COMMON_SUBDOMAINS = [
    "www", "mail", "ftp", "webmail", "smtp", "pop", "ns1", "ns2", "ns3", "ns4",
    "cpanel", "whm", "api", "dev", "staging", "test", "admin", "blog", "portal",
    "vpn", "shop", "store", "news", "forum", "support", "help", "docs", "wiki",
    "git", "gitlab", "jenkins", "ci", "cd", "k8s", "docker", "registry", "grafana",
    "prometheus", "kibana", "elastic", "db", "database", "redis", "mongo", "mysql",
    "postgres", "es", "search", "auth", "login", "sso", "oauth", "api-v1", "api-v2",
    "graphql", "rest", "ws", "socket", "cdn", "static", "media", "img", "images",
    "assets", "files", "download",
]


class DomainRequest(BaseModel):
    domain: str


class EvidenceRequest(BaseModel):
    domain: str
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []
    priority: Optional[str] = "medium"
    case_id: Optional[str] = ""


def _whois_dict(domain: str) -> dict:
    try:
        w = whois.whois(domain)
    except Exception:
        return {}
    return {
        "registrar": w.registrar,
        "creation_date": str(w.creation_date),
        "expiration_date": str(w.expiration_date),
        "name_servers": w.name_servers,
        "emails": w.emails,
        "org": w.org,
        "country": w.country,
        "address": w.address,
        "registrant": getattr(w, "registrant_name", None),
        "registrant_org": getattr(w, "registrant_organization", None),
    }


def _dns_dict(domain: str, record_types: List[str]) -> dict:
    records = {}
    for record_type in record_types:
        try:
            answers = dns.resolver.resolve(domain, record_type)
            records[record_type] = [str(r) for r in answers]
        except Exception:
            continue
    return records


def _subdomains(domain: str, candidates: List[str]) -> list:
    found = []
    for sub in candidates:
        try:
            dns.resolver.resolve(f"{sub}.{domain}", "A")
            found.append(f"{sub}.{domain}")
        except Exception:
            continue
    return found


@router.post("/whois")
async def whois_lookup(request: DomainRequest):
    domain = normalize_domain(request.domain)
    data = await asyncio.to_thread(_whois_dict, domain)
    if not data:
        raise HTTPException(status_code=502, detail=f"WHOIS lookup failed for '{domain}'")
    return {"domain": domain, **data}


@router.post("/dns")
async def dns_lookup(request: DomainRequest):
    domain = normalize_domain(request.domain)
    records = await asyncio.to_thread(_dns_dict, domain, DNS_RECORD_TYPES)
    return {"domain": domain, "records": records}


@router.post("/subdomains")
async def subdomain_enum(request: DomainRequest):
    domain = normalize_domain(request.domain)
    found = await asyncio.to_thread(_subdomains, domain, COMMON_SUBDOMAINS)
    return {"domain": domain, "subdomains": found, "total_found": len(found)}


@router.post("/footprint")
async def domain_footprint(request: DomainRequest):
    domain = normalize_domain(request.domain)
    footprint = {
        "domain": domain,
        "whois": await asyncio.to_thread(_whois_dict, domain),
        "dns": await asyncio.to_thread(_dns_dict, domain, ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "SRV", "CAA"]),
        "subdomains": await asyncio.to_thread(
            _subdomains,
            domain,
            ["www", "mail", "ftp", "webmail", "smtp", "ns1", "ns2", "api", "dev", "admin", "blog", "vpn", "shop", "cdn"],
        ),
        "security_headers": {},
        "ssl_info": {},
        "tech_stack": [],
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=5.0) as client:
            resp = await client.get(f"https://{domain}")
            security_headers = {
                "strict_transport_security": resp.headers.get("strict-transport-security"),
                "content_security_policy": resp.headers.get("content-security-policy"),
                "x_frame_options": resp.headers.get("x-frame-options"),
                "x_content_type_options": resp.headers.get("x-content-type-options"),
                "x_xss_protection": resp.headers.get("x-xss-protection"),
                "referrer_policy": resp.headers.get("referrer-policy"),
                "permissions_policy": resp.headers.get("permissions-policy"),
            }
            footprint["security_headers"] = {k: v for k, v in security_headers.items() if v}
            if "server" in resp.headers:
                footprint["tech_stack"].append(f"Server: {resp.headers['server']}")
            if "x-powered-by" in resp.headers:
                footprint["tech_stack"].append(f"Powered-By: {resp.headers['x-powered-by']}")
    except Exception:
        pass

    return footprint


@router.post("/evidence/capture")
async def capture_evidence(request: EvidenceRequest):
    domain = normalize_domain(request.domain)
    data = {
        "domain": domain,
        "whois": await asyncio.to_thread(_whois_dict, domain),
        "dns": await asyncio.to_thread(
            _dns_dict, domain, ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "SRV", "CAA"]
        ),
        "subdomains": await asyncio.to_thread(
            _subdomains, domain, ["www", "mail", "ftp", "webmail", "smtp", "ns1", "ns2", "api", "dev", "admin", "blog"]
        ),
    }
    data["total_subdomains"] = len(data["subdomains"])

    document = evidence_store.record(
        prefix=PREFIX,
        investigation_type="domain_recon",
        evidence_type="domain_investigation",
        target=domain,
        data=data,
        notes=request.notes,
        tags=request.tags,
        priority=request.priority,
        case_id=request.case_id,
    )
    return {
        "evidence_id": document["evidence_id"],
        "filename": document.pop("_path", ""),
        "evidence_hash": document["metadata"]["chain_of_custody"]["hash"],
        "data": document,
    }


@router.get("/evidence/list")
async def list_evidence():
    return evidence_store.list_records([PREFIX])


@router.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    return evidence_store.load(evidence_id)


@router.delete("/evidence/{evidence_id}")
async def delete_evidence(evidence_id: str):
    evidence_store.delete(evidence_id)
    return {"message": "Evidence deleted", "evidence_id": evidence_id}
