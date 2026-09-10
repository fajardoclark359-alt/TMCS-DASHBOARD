from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
import whois
import dns.resolver

router = APIRouter()

class DomainRequest(BaseModel):
    domain: str

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
    
    record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME"]
    
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
        "api", "dev", "staging", "test", "admin", "blog"
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
