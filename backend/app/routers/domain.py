from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import whois
import dns.resolver
from datetime import datetime
import json
import os

router = APIRouter()

EVIDENCE_DIR = "/home/clark/Work/osint-tool/backend/evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)

class DomainRequest(BaseModel):
    domain: str

class EvidenceRequest(BaseModel):
    domain: str
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []
    priority: Optional[str] = "medium"
    case_id: Optional[str] = ""

@router.post("/whois")
async def whois_lookup(request: DomainRequest):
    try:
        w = whois.whois(request.domain)
        return {
            "domain": request.domain,
            "registrar": w.registrar,
            "creation_date": str(w.creation_date),
            "expiration_date": str(w.expiration_date),
            "name_servers": w.name_servers,
            "emails": w.emails,
            "org": w.org,
            "country": w.country,
            "address": w.address
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/dns")
async def dns_lookup(request: DomainRequest):
    results = {
        "domain": request.domain,
        "records": {}
    }
    
    record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "SRV", "CAA", "DNSKEY", "DS", "NSEC", "NSEC3", "RRSIG"]
    
    for record_type in record_types:
        try:
            answers = dns.resolver.resolve(request.domain, record_type)
            results["records"][record_type] = [str(r) for r in answers]
        except Exception:
            continue
    
    return results

@router.post("/subdomains")
async def subdomain_enum(request: DomainRequest):
    common_subdomains = [
        "www", "mail", "ftp", "localhost", "webmail", "smtp",
        "pop", "ns1", "ns2", "ns3", "ns4", "cpanel", "whm",
        "api", "dev", "staging", "test", "admin", "blog",
        "portal", "vpn", "shop", "store", "news", "forum",
        "support", "help", "docs", "wiki", "git", "gitlab",
        "jenkins", "ci", "cd", "k8s", "docker", "registry",
        "grafana", "prometheus", "kibana", "elastic", "db", "database",
        "redis", "mongo", "mysql", "postgres", "es", "search",
        "auth", "login", "sso", "oauth", "api-v1", "api-v2",
        "graphql", "rest", "ws", "socket", "cdn", "static",
        "media", "img", "images", "assets", "files", "download"
    ]
    
    found_subdomains = []
    
    for sub in common_subdomains:
        try:
            full_domain = f"{sub}.{request.domain}"
            dns.resolver.resolve(full_domain, "A")
            found_subdomains.append(full_domain)
        except Exception:
            continue
    
    return {
        "domain": request.domain,
        "subdomains": found_subdomains,
        "total_found": len(found_subdomains)
    }

@router.post("/footprint")
async def domain_footprint(request: DomainRequest):
    footprint = {
        "domain": request.domain,
        "whois": {},
        "dns": {},
        "subdomains": [],
        "security_headers": [],
        "ssl_info": {},
        "tech_stack": []
    }
    
    try:
        w = whois.whois(request.domain)
        footprint["whois"] = {
            "registrar": w.registrar,
            "creation_date": str(w.creation_date),
            "expiration_date": str(w.expiration_date),
            "name_servers": w.name_servers,
            "emails": w.emails,
            "org": w.org,
            "country": w.country,
            "address": w.address,
            "registrant": getattr(w, 'registrant_name', None),
            "registrant_org": getattr(w, 'registrant_organization', None)
        }
    except Exception:
        pass
    
    record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "SRV", "CAA"]
    for record_type in record_types:
        try:
            answers = dns.resolver.resolve(request.domain, record_type)
            footprint["dns"][record_type] = [str(r) for r in answers]
        except Exception:
            continue
    
    common_subdomains = ["www", "mail", "ftp", "webmail", "smtp", "ns1", "ns2", "api", "dev", "admin", "blog", "vpn", "shop", "cdn"]
    for sub in common_subdomains:
        try:
            full_domain = f"{sub}.{request.domain}"
            dns.resolver.resolve(full_domain, "A")
            footprint["subdomains"].append(full_domain)
        except Exception:
            continue
    
    import httpx
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=5.0) as client:
            resp = await client.get(f"https://{request.domain}")
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
    whois_data = {}
    try:
        w = whois.whois(request.domain)
        whois_data = {
            "registrar": w.registrar,
            "creation_date": str(w.creation_date),
            "expiration_date": str(w.expiration_date),
            "name_servers": w.name_servers,
            "emails": w.emails,
            "org": w.org,
            "country": w.country,
            "address": w.address
        }
    except Exception:
        pass
    
    dns_data = {}
    record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "SRV", "CAA"]
    for record_type in record_types:
        try:
            answers = dns.resolver.resolve(request.domain, record_type)
            dns_data[record_type] = [str(r) for r in answers]
        except Exception:
            continue
    
    subdomains = []
    common_subdomains = ["www", "mail", "ftp", "webmail", "smtp", "ns1", "ns2", "api", "dev", "admin", "blog"]
    for sub in common_subdomains:
        try:
            full_domain = f"{sub}.{request.domain}"
            dns.resolver.resolve(full_domain, "A")
            subdomains.append(full_domain)
        except Exception:
            continue
    
    evidence = {
        "evidence_id": f"EVD-DOMAIN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "investigation_type": "domain_recon",
        "target": request.domain,
        "notes": request.notes,
        "tags": request.tags,
        "priority": request.priority,
        "case_id": request.case_id,
        "data": {
            "domain": request.domain,
            "whois": whois_data,
            "dns": dns_data,
            "subdomains": subdomains,
            "total_subdomains": len(subdomains)
        },
        "metadata": {
            "investigator": "OSINT TMC/CLARK",
            "tool_version": "2.0.0",
            "evidence_type": "domain_investigation",
            "chain_of_custody": {
                "created_at": datetime.now().isoformat(),
                "hash": None,
                "verified": True
            }
        }
    }
    
    evidence_str = json.dumps(evidence, indent=2, default=str)
    evidence["metadata"]["chain_of_custody"]["hash"] = str(hash(evidence_str))
    
    filename = f"{EVIDENCE_DIR}/{evidence['evidence_id']}.json"
    with open(filename, "w") as f:
        f.write(evidence_str)
    
    return {
        "evidence_id": evidence["evidence_id"],
        "filename": filename,
        "evidence_hash": evidence["metadata"]["chain_of_custody"]["hash"],
        "data": evidence
    }

@router.get("/evidence/list")
async def list_evidence():
    files = [f for f in os.listdir(EVIDENCE_DIR) if f.startswith("EVD-DOMAIN-") and f.endswith('.json')]
    evidence_list = []
    for f in sorted(files, reverse=True):
        with open(os.path.join(EVIDENCE_DIR, f), 'r') as file:
            data = json.load(file)
            evidence_list.append({
                "evidence_id": data.get("evidence_id"),
                "timestamp": data.get("timestamp"),
                "target": data.get("target"),
                "investigation_type": data.get("investigation_type"),
                "notes": data.get("notes"),
                "tags": data.get("tags"),
                "priority": data.get("priority"),
                "evidence_hash": data.get("metadata", {}).get("chain_of_custody", {}).get("hash")
            })
    return evidence_list

@router.get("/evidence/{evidence_id}")
async def get_evidence(evidence_id: str):
    filename = f"{EVIDENCE_DIR}/{evidence_id}.json"
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            return json.load(f)
    return {"error": "Evidence not found"}

@router.delete("/evidence/{evidence_id}")
async def delete_evidence(evidence_id: str):
    filename = f"{EVIDENCE_DIR}/{evidence_id}.json"
    if os.path.exists(filename):
        os.remove(filename)
        return {"message": "Evidence deleted", "evidence_id": evidence_id}
    return {"error": "Evidence not found"}
