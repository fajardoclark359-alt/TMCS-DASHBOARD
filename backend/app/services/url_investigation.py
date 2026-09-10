import httpx
import socket
import ssl
import dns.resolver
import whois
import re
from datetime import datetime
from typing import Dict, Any, Optional
from urllib.parse import urlparse

class URLInvestigationService:
    async def investigate_url(self, url: str) -> Dict[str, Any]:
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url

        parsed = urlparse(url)
        domain = parsed.hostname
        scheme = parsed.scheme
        path = parsed.path

        result = {
            "original_url": url,
            "domain": domain,
            "scheme": scheme,
            "path": path,
            "ip_addresses": await self._resolve_ip(domain),
            "whois": self._whois_lookup(domain),
            "dns": self._dns_lookup(domain),
            "ssl": await self._ssl_check(domain),
            "http_headers": await self._http_headers(url),
            "domain_status": await self._check_domain_status(domain),
            "redirects": await self._check_redirects(url),
            "security": await self._security_checks(url, domain),
            "geolocation": {},
            "technology": await self._detect_tech(url),
            "screenshot": f"https://image.thum.io/get/width/800/crop/600/{url}",
            "reputation": {},
        }

        if result["ip_addresses"]:
            primary_ip = result["ip_addresses"][0]
            result["geolocation"] = await self._geolocate_ip(primary_ip)

        result["reputation"] = self._calculate_url_reputation(result)

        return result

    async def _resolve_ip(self, domain: str) -> list:
        ips = []
        try:
            answers = dns.resolver.resolve(domain, "A")
            for a in answers:
                ips.append(str(a))
        except Exception:
            pass
        try:
            answers = dns.resolver.resolve(domain, "AAAA")
            for a in answers:
                ips.append(str(a))
        except Exception:
            pass
        return ips

    def _whois_lookup(self, domain: str) -> Dict[str, Any]:
        result = {"registrar": None, "creation_date": None, "expiration_date": None, "name_servers": [], "emails": [], "org": None, "country": None, "address": None, "status": []}
        try:
            w = whois.whois(domain)
            result["registrar"] = w.registrar
            cd = w.creation_date
            if isinstance(cd, list): cd = cd[0]
            result["creation_date"] = str(cd) if cd else None
            ed = w.expiration_date
            if isinstance(ed, list): ed = ed[0]
            result["expiration_date"] = str(ed) if ed else None
            ns = w.name_servers
            result["name_servers"] = list(ns) if ns else []
            em = w.emails
            result["emails"] = list(em) if em else []
            result["org"] = w.org
            result["country"] = w.country
            result["address"] = w.address
            st = w.status
            result["status"] = [str(s) for s in st] if isinstance(st, list) else [str(st)] if st else []
        except Exception:
            pass
        return result

    def _dns_lookup(self, domain: str) -> Dict[str, Any]:
        records = {}
        for rtype in ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]:
            try:
                answers = dns.resolver.resolve(domain, rtype)
                records[rtype] = [str(r) for r in answers]
            except Exception:
                continue
        return records

    async def _ssl_check(self, domain: str) -> Dict[str, Any]:
        result = {"valid": False, "issuer": None, "subject": None, "not_before": None, "not_after": None, "days_remaining": None, "protocol": None, "cipher": None}
        try:
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
                s.settimeout(10)
                s.connect((domain, 443))
                cert = s.getpeercert()
                result["valid"] = True
                issuer = dict(x[0] for x in cert.get("issuer", []))
                result["issuer"] = issuer.get("organizationName") or issuer.get("commonName")
                subject = dict(x[0] for x in cert.get("subject", []))
                result["subject"] = subject.get("commonName")
                nb = cert.get("notBefore")
                na = cert.get("notAfter")
                result["not_before"] = nb
                result["not_after"] = na
                if na:
                    try:
                        na_dt = datetime.strptime(na, "%b %d %H:%M:%S %Y %Z")
                        result["days_remaining"] = (na_dt - datetime.utcnow()).days
                    except Exception:
                        pass
                result["protocol"] = s.version()
                result["cipher"] = s.cipher()[0]
        except Exception:
            pass
        return result

    async def _http_headers(self, url: str) -> Dict[str, Any]:
        headers_info = {"status_code": None, "server": None, "content_type": None, "security_headers": {}, "all_headers": {}}
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                resp = await client.get(url)
                headers_info["status_code"] = resp.status_code
                headers_info["server"] = resp.headers.get("server")
                headers_info["content_type"] = resp.headers.get("content-type")
                h = dict(resp.headers)
                headers_info["all_headers"] = h
                security = {
                    "strict-transport-security": h.get("strict-transport-security"),
                    "content-security-policy": h.get("content-security-policy"),
                    "x-frame-options": h.get("x-frame-options"),
                    "x-content-type-options": h.get("x-content-type-options"),
                    "x-xss-protection": h.get("x-xss-protection"),
                    "referrer-policy": h.get("referrer-policy"),
                    "permissions-policy": h.get("permissions-policy"),
                }
                headers_info["security_headers"] = {k: v for k, v in security.items() if v}
        except Exception:
            pass
        return headers_info

    async def _check_domain_status(self, domain: str) -> Dict[str, Any]:
        result = {"active": False, "http_reachable": False, "https_reachable": False, "response_time_ms": None, "status": "unknown"}
        for scheme in ["https", "http"]:
            try:
                start = datetime.now()
                async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                    resp = await client.get(f"{scheme}://{domain}")
                    elapsed = (datetime.now() - start).total_seconds() * 1000
                    if scheme == "https":
                        result["https_reachable"] = True
                    else:
                        result["http_reachable"] = True
                    result["response_time_ms"] = round(elapsed)
                    result["active"] = True
                    result["status"] = "active"
            except Exception:
                continue
        if not result["active"]:
            result["status"] = "offline"
        return result

    async def _check_redirects(self, url: str) -> list:
        redirects = []
        try:
            async with httpx.AsyncClient(follow_redirects=False, timeout=10.0) as client:
                resp = await client.get(url)
                while resp.is_redirect:
                    location = resp.headers.get("location")
                    if location:
                        redirects.append({"status": resp.status_code, "location": location})
                        resp = await client.get(location)
                    else:
                        break
        except Exception:
            pass
        return redirects

    async def _security_checks(self, url: str, domain: str) -> Dict[str, Any]:
        checks = {
            "is_https": url.startswith("https"),
            "has_redirects": False,
            "suspicious_tlds": False,
            "ip_based_url": False,
            "short_url": False,
            "phishing_keywords": False,
            "free_hosting": False,
            "recently_registered": False,
            "flags": [],
        }

        suspicious_tlds = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".buzz", ".club", ".work", ".icu"]
        for tld in suspicious_tlds:
            if domain.endswith(tld):
                checks["suspicious_tlds"] = True
                checks["flags"].append(f"Suspicious TLD: {tld}")
                break

        try:
            socket.inet_aton(domain)
            checks["ip_based_url"] = True
            checks["flags"].append("IP-based URL (no domain)")
        except Exception:
            pass

        shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "buff.ly", "ow.ly", "rb.gy", "cutt.ly"]
        for s in shorteners:
            if s in domain:
                checks["short_url"] = True
                checks["flags"].append(f"URL shortener: {s}")
                break

        phishing_words = ["login", "verify", "account", "update", "secure", "banking", "confirm", "password", "signin", "wallet", "paypal", "apple", "microsoft", "google", "amazon"]
        url_lower = url.lower()
        found = [w for w in phishing_words if w in url_lower]
        if len(found) >= 2:
            checks["phishing_keywords"] = True
            checks["flags"].append(f"Phishing keywords: {', '.join(found)}")

        free_hosts = ["github.io", "netlify.app", "vercel.app", "herokuapp.com", "pages.dev", "web.app"]
        for fh in free_hosts:
            if domain.endswith(fh):
                checks["free_hosting"] = True
                checks["flags"].append(f"Free hosting: {fh}")
                break

        try:
            w = whois.whois(domain)
            cd = w.creation_date
            if isinstance(cd, list): cd = cd[0]
            if isinstance(cd, datetime):
                days_old = (datetime.now() - cd).days
                if days_old < 30:
                    checks["recently_registered"] = True
                    checks["flags"].append(f"Recently registered: {days_old} days ago")
        except Exception:
            pass

        return checks

    async def _detect_tech(self, url: str) -> Dict[str, Any]:
        tech = {"cms": None, "framework": None, "language": None, "analytics": [], "cdn": None}
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                resp = await client.get(url)
                headers = dict(resp.headers)
                body = resp.text[:50000]

                server = headers.get("server", "").lower()
                if "cloudflare" in server: tech["cdn"] = "Cloudflare"
                elif "cloudfront" in server: tech["cdn"] = "CloudFront"
                elif "akamai" in server: tech["cdn"] = "Akamai"
                elif "fastly" in server: tech["cdn"] = "Fastly"

                if "x-powered-by" in headers:
                    xpb = headers["x-powered-by"].lower()
                    if "php" in xpb: tech["language"] = "PHP"
                    elif "express" in xpb: tech["framework"] = "Express.js"
                    elif "asp.net" in xpb: tech["framework"] = "ASP.NET"

                if "wp-content" in body or "wordpress" in body.lower():
                    tech["cms"] = "WordPress"
                elif "drupal" in body.lower():
                    tech["cms"] = "Drupal"
                elif "joomla" in body.lower():
                    tech["cms"] = "Joomla"
                elif "shopify" in body.lower():
                    tech["cms"] = "Shopify"
                elif "wix" in body.lower():
                    tech["cms"] = "Wix"
                elif "squarespace" in body.lower():
                    tech["cms"] = "Squarespace"

                if "react" in body.lower() or "_next" in body:
                    tech["framework"] = "React/Next.js"
                elif "vue" in body.lower() or "nuxt" in body.lower():
                    tech["framework"] = "Vue/Nuxt.js"
                elif "angular" in body.lower():
                    tech["framework"] = "Angular"
                elif "svelte" in body.lower():
                    tech["framework"] = "Svelte"

                if "google-analytics" in body or "gtag" in body or "GA_TRACKING" in body:
                    tech["analytics"].append("Google Analytics")
                if "gtm.js" in body or "googletagmanager" in body:
                    tech["analytics"].append("Google Tag Manager")
                if "facebook" in body and "fbevents" in body:
                    tech["analytics"].append("Facebook Pixel")
                if "hotjar" in body.lower():
                    tech["analytics"].append("Hotjar")
                if "sentry" in body.lower():
                    tech["analytics"].append("Sentry")

                if "generator" in body.lower():
                    gen_match = re.search(r'<meta[^>]*name=["\']generator["\'][^>]*content=["\']([^"\']+)', body, re.IGNORECASE)
                    if gen_match:
                        tech["framework"] = gen_match.group(1)
        except Exception:
            pass
        return tech

    async def _geolocate_ip(self, ip: str) -> Dict[str, Any]:
        result = {"ip": ip, "country": None, "country_code": None, "city": None, "region": None, "latitude": None, "longitude": None, "isp": None, "org": None, "as": None}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org,as")
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "success":
                        result["country"] = data.get("country")
                        result["country_code"] = data.get("countryCode")
                        result["city"] = data.get("city")
                        result["region"] = data.get("regionName")
                        result["latitude"] = data.get("lat")
                        result["longitude"] = data.get("lon")
                        result["isp"] = data.get("isp")
                        result["org"] = data.get("org")
                        result["as"] = data.get("as")
        except Exception:
            pass
        return result

    def _calculate_url_reputation(self, data: Dict) -> Dict[str, Any]:
        score = 100
        flags = []

        if data.get("ssl") and not data["ssl"].get("valid"):
            score -= 20
            flags.append("No valid SSL certificate")

        if data.get("ssl") and data["ssl"].get("days_remaining") is not None:
            if data["ssl"]["days_remaining"] < 30:
                score -= 10
                flags.append("SSL expiring soon")

        sec = data.get("security", {})
        if sec.get("suspicious_tlds"):
            score -= 15
            flags.append("Suspicious TLD")
        if sec.get("ip_based_url"):
            score -= 10
            flags.append("IP-based URL")
        if sec.get("short_url"):
            score -= 5
            flags.append("URL shortener")
        if sec.get("phishing_keywords"):
            score -= 20
            flags.append("Phishing keywords detected")
        if sec.get("free_hosting"):
            score -= 10
            flags.append("Free hosting service")
        if sec.get("recently_registered"):
            score -= 15
            flags.append("Recently registered domain")

        headers = data.get("http_headers", {})
        sh = headers.get("security_headers", {})
        if not sh.get("strict-transport-security"):
            score -= 5
        if not sh.get("content-security-policy"):
            score -= 5
        if not sh.get("x-frame-options"):
            score -= 3

        if not data.get("domain_status", {}).get("active"):
            score -= 25
            flags.append("Domain not reachable")

        if data.get("redirects") and len(data["redirects"]) > 3:
            score -= 10
            flags.append(f"Multiple redirects: {len(data['redirects'])}")

        score = max(0, min(100, score))
        risk = "LOW" if score >= 80 else "MEDIUM" if score >= 50 else "HIGH" if score >= 20 else "CRITICAL"

        return {"score": score, "risk_level": risk, "flags": flags}

url_investigation_service = URLInvestigationService()
