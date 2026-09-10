import httpx
import hashlib
import dns.resolver
import re
from typing import Optional, Dict, Any, List

class BreachService:
    def __init__(self):
        self.hibp_api_url = "https://haveibeenpwned.com/api/v3"

    async def check_email_breaches(self, email: str, api_key: Optional[str] = None) -> Dict[str, Any]:
        headers = {
            "hibp-api-key": api_key or "",
            "user-agent": "OSINT-Tool-1.0"
        }

        result = {
            "email": email,
            "breaches": [],
            "breach_count": 0,
            "pastes": [],
            "paste_count": 0,
            "gravatar": await self._check_gravatar(email),
            "dns_info": self._check_email_dns(email),
            "social_accounts": await self._check_social_accounts(email),
            "phone_numbers": [],
            "leaked_info": [],
            "leaked_files": [],
            "email_age": self._estimate_email_age(email),
            "username_hints": self._extract_username_hints(email),
            "reputation": {},
        }

        # HIBP breach check
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self.hibp_api_url}/breachedaccount/{email}",
                    headers=headers,
                    params={"truncateResponse": "false"},
                    timeout=10.0
                )
                if resp.status_code == 200:
                    breaches = resp.json()
                    result["breaches"] = [
                        {
                            "name": b.get("Name"),
                            "title": b.get("Title"),
                            "domain": b.get("Domain"),
                            "breach_date": b.get("BreachDate"),
                            "pwn_count": b.get("PwnCount"),
                            "data_classes": b.get("DataClasses", []),
                            "is_verified": b.get("IsVerified"),
                            "is_sensitive": b.get("IsSensitive"),
                        }
                        for b in breaches
                    ]
                    result["breach_count"] = len(breaches)
                    result["leaked_info"] = self._extract_leaked_info(breaches)
                    result["leaked_files"] = self._extract_leaked_files(breaches)
                elif resp.status_code == 404:
                    result["message"] = "No breaches found for this email"
        except Exception as e:
            result["error"] = str(e)

        # HIBP paste check
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{self.hibp_api_url}/pasteaccount/{email}",
                    headers=headers,
                    timeout=10.0
                )
                if resp.status_code == 200:
                    pastes = resp.json()
                    result["pastes"] = [
                        {
                            "source": p.get("Source"),
                            "title": p.get("Title"),
                            "date": p.get("Date"),
                            "email_count": p.get("EmailCount"),
                        }
                        for p in pastes
                    ]
                    result["paste_count"] = len(pastes)
        except Exception:
            pass

        # Combine phone numbers from breach data
        phone_set = set()
        for breach in result["breaches"]:
            for dc in breach.get("data_classes", []):
                if "phone" in dc.lower():
                    phone_set.add("Phone number exposed in breach: " + breach["title"])
        for paste in result["pastes"]:
            if paste.get("email_count", 0) > 0:
                phone_set.add(f"Email found in paste from {paste.get('source', 'unknown')}")
        result["phone_numbers"] = list(phone_set)

        # Reputation scoring
        result["reputation"] = self._calculate_reputation(result)

        return result

    def _extract_leaked_info(self, breaches: List[Dict]) -> List[Dict[str, Any]]:
        leaked = []
        for breach in breaches:
            classes = breach.get("data_classes", [])
            for dc in classes:
                dc_lower = dc.lower()
                entry = {"type": dc, "breach": breach.get("title"), "date": breach.get("breach_date")}
                if "password" in dc_lower:
                    entry["severity"] = "CRITICAL"
                    entry["description"] = "Password hash exposed - account may be compromised"
                elif "email" in dc_lower:
                    entry["severity"] = "HIGH"
                    entry["description"] = "Email address exposed"
                elif "phone" in dc_lower:
                    entry["severity"] = "HIGH"
                    entry["description"] = "Phone number exposed"
                elif "address" in dc_lower or "location" in dc_lower:
                    entry["severity"] = "HIGH"
                    entry["description"] = "Physical address exposed"
                elif "dob" in dc_lower or "birth" in dc_lower:
                    entry["severity"] = "MEDIUM"
                    entry["description"] = "Date of birth exposed"
                elif "name" in dc_lower:
                    entry["severity"] = "MEDIUM"
                    entry["description"] = "Full name exposed"
                elif "username" in dc_lower or "handle" in dc_lower:
                    entry["severity"] = "MEDIUM"
                    entry["description"] = "Username/handle exposed"
                elif "ip" in dc_lower:
                    entry["severity"] = "HIGH"
                    entry["description"] = "IP address exposed"
                elif "credit" in dc_lower or "payment" in dc_lower:
                    entry["severity"] = "CRITICAL"
                    entry["description"] = "Payment/credit card data exposed"
                elif "ssn" in dc_lower or "social security" in dc_lower:
                    entry["severity"] = "CRITICAL"
                    entry["description"] = "Social security number exposed"
                elif "password" not in dc_lower:
                    entry["severity"] = "LOW"
                    entry["description"] = f"{dc} exposed"
                leaked.append(entry)
        return leaked

    def _extract_leaked_files(self, breaches: List[Dict]) -> List[Dict[str, Any]]:
        files = []
        for breach in breaches:
            classes = breach.get("data_classes", [])
            for dc in classes:
                dc_lower = dc.lower()
                if any(ext in dc_lower for ext in ["file", "document", "attachment", "upload", "backup", "database", "dump", "export"]):
                    files.append({
                        "type": dc,
                        "breach": breach.get("title"),
                        "date": breach.get("breach_date"),
                        "records": breach.get("pwn_count"),
                        "description": f"Leaked file/data type: {dc}"
                    })
            if breach.get("pwn_count", 0) > 1000000:
                files.append({
                    "type": "Large Data Breach",
                    "breach": breach.get("title"),
                    "date": breach.get("breach_date"),
                    "records": breach.get("pwn_count"),
                    "description": f"Major breach with {breach.get('pwn_count', 0):,} records exposed"
                })
        return files

    def _estimate_email_age(self, email: str) -> Dict[str, Any]:
        domain = email.split('@')[1]
        result = {"domain": domain, "estimated_age": None, "domain_creation": None, "is_estimated": True}
        try:
            w = __import__('whois').whois(domain)
            if w.creation_date:
                creation = w.creation_date
                if isinstance(creation, list):
                    creation = creation[0]
                result["domain_creation"] = str(creation)
                from datetime import datetime
                if isinstance(creation, datetime):
                    age_days = (datetime.now() - creation).days
                    result["estimated_age"] = f"{age_days // 365} years, {(age_days % 365) // 30} months"
        except Exception:
            pass
        return result

    def _extract_username_hints(self, email: str) -> Dict[str, Any]:
        local = email.split('@')[0]
        hints = {"local_part": local, "possible_usernames": [], "possible_names": []}
        cleaned = re.sub(r'[0-9]+', '', local).replace('.', '').replace('_', '').replace('-', '')
        if cleaned:
            hints["possible_usernames"].append(cleaned)
        parts = re.split(r'[._\-]', local)
        if len(parts) > 1:
            hints["possible_names"].append(' '.join(p.capitalize() for p in parts))
            hints["possible_usernames"].extend(parts)
        if local != cleaned:
            hints["possible_usernames"].append(local)
        hints["possible_usernames"] = list(set(hints["possible_usernames"]))
        return hints

    async def _check_gravatar(self, email: str) -> Dict[str, Any]:
        email_hash = hashlib.md5(email.lower().strip().encode()).hexdigest()
        url = f"https://www.gravatar.com/avatar/{email_hash}?d=404"
        result = {"exists": False, "url": f"https://gravatar.com/{email_hash}", "profile_url": None}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=10.0)
                if resp.status_code == 200:
                    result["exists"] = True
                    profile_resp = await client.get(f"https://gravatar.com/{email_hash}.json", timeout=10.0)
                    if profile_resp.status_code == 200:
                        profile_data = profile_resp.json()
                        entry = profile_data.get("entry", [{}])[0]
                        result["display_name"] = entry.get("displayName")
                        result["profile_url"] = entry.get("profileUrl")
                        result["photos"] = [p.get("value") for p in entry.get("photos", [])]
                        urls = entry.get("urls", [])
                        result["linked_urls"] = [{"title": u.get("title"), "url": u.get("value")} for u in urls]
        except Exception:
            pass
        return result

    def _check_email_dns(self, email: str) -> Dict[str, Any]:
        domain = email.split('@')[1]
        result = {
            "domain": domain,
            "mx_records": [],
            "spf_record": None,
            "dmarc_record": None,
            "has_mx": False,
            "provider": None,
        }
        try:
            mx_records = dns.resolver.resolve(domain, "MX")
            result["mx_records"] = [str(r) for r in mx_records]
            result["has_mx"] = len(result["mx_records"]) > 0
            mx_str = " ".join(result["mx_records"]).lower()
            providers = {
                "google.com": "Google Workspace / Gmail",
                "outlook.com": "Microsoft 365 / Outlook",
                "protonmail.ch": "ProtonMail",
                "zoho.com": "Zoho Mail",
                "yahoo.com": "Yahoo Mail",
                "icloud.com": "iCloud Mail",
                "yandex.net": "Yandex Mail",
                "qq.com": "QQ Mail",
                "mail.ru": "Mail.ru",
                "gmx.com": "GMX Mail",
                "fastmail.com": "Fastmail",
                "tutanota.com": "Tutanota",
            }
            for key, name in providers.items():
                if key in mx_str:
                    result["provider"] = name
                    break
        except Exception:
            pass
        try:
            txt_records = dns.resolver.resolve(domain, "TXT")
            for record in txt_records:
                txt = str(record).strip('"')
                if txt.startswith("v=spf1"):
                    result["spf_record"] = txt
        except Exception:
            pass
        try:
            dmarc_records = dns.resolver.resolve(f"_dmarc.{domain}", "TXT")
            for record in dmarc_records:
                txt = str(record).strip('"')
                if txt.startswith("v=DMARC1"):
                    result["dmarc_record"] = txt
        except Exception:
            pass
        return result

    async def _check_social_accounts(self, email: str) -> Dict[str, Any]:
        accounts = {}
        username_hints = self._extract_username_hints(email)
        possible_usernames = username_hints.get("possible_usernames", [])

        async with httpx.AsyncClient(follow_redirects=True, timeout=8.0) as client:
            # Gravatar
            email_hash = hashlib.md5(email.lower().strip().encode()).hexdigest()
            try:
                resp = await client.get(f"https://www.gravatar.com/avatar/{email_hash}?d=404")
                accounts["gravatar"] = resp.status_code == 200
            except Exception:
                accounts["gravatar"] = False

            # GitHub by email
            try:
                resp = await client.get(f"https://api.github.com/search/users?q={email}+in:email")
                if resp.status_code == 200:
                    items = resp.json().get("items", [])
                    if items:
                        accounts["github"] = {"username": items[0].get("login"), "url": items[0].get("html_url"), "source": "email search"}
            except Exception:
                pass

            # GitHub by possible username
            if not accounts.get("github") and possible_usernames:
                try:
                    resp = await client.get(f"https://api.github.com/users/{possible_usernames[0]}")
                    if resp.status_code == 200:
                        data = resp.json()
                        accounts["github"] = {"username": data.get("login"), "url": data.get("html_url"), "source": "username inference"}
                except Exception:
                    pass

            # GitLab by possible username
            if possible_usernames:
                try:
                    resp = await client.get(f"https://gitlab.com/api/v4/users?username={possible_usernames[0]}")
                    if resp.status_code == 200:
                        users = resp.json()
                        if users:
                            accounts["gitlab"] = {"username": users[0].get("username"), "url": users[0].get("web_url"), "source": "username inference"}
                except Exception:
                    pass

            # Twitter/X - check via embed
            if possible_usernames:
                for username in possible_usernames[:3]:
                    try:
                        resp = await client.get(f"https://publish.twitter.com/oembed?url=https://twitter.com/{username}", follow_redirects=False)
                        if resp.status_code == 200:
                            accounts["twitter"] = {"username": username, "url": f"https://x.com/{username}", "source": "username inference"}
                            break
                    except Exception:
                        continue

            # LinkedIn - check via public profile
            if possible_usernames:
                for username in possible_usernames[:3]:
                    try:
                        resp = await client.get(f"https://www.linkedin.com/in/{username}/")
                        if resp.status_code == 200:
                            accounts["linkedin"] = {"username": username, "url": f"https://www.linkedin.com/in/{username}", "source": "username inference"}
                            break
                    except Exception:
                        continue

            # Facebook - check via graph API
            try:
                resp = await client.get(f"https://graph.facebook.com/{email}", timeout=5.0)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("id"):
                        accounts["facebook"] = {"id": data.get("id"), "url": f"https://facebook.com/{data.get('id')}", "source": "email lookup"}
            except Exception:
                pass

            # YouTube by possible username
            if possible_usernames:
                for username in possible_usernames[:3]:
                    try:
                        resp = await client.get(f"https://www.youtube.com/@{username}")
                        if resp.status_code == 200 and '"channelId"' in resp.text:
                            import re
                            match = re.search(r'"channelId":"([^"]+)"', resp.text)
                            if match:
                                accounts["youtube"] = {"username": username, "url": f"https://www.youtube.com/@{username}", "channel_id": match.group(1), "source": "username inference"}
                                break
                    except Exception:
                        continue

            # Twitch
            if possible_usernames:
                for username in possible_usernames[:3]:
                    try:
                        resp = await client.get(f"https://m.twitch.tv/{username}/profile")
                        if resp.status_code == 200:
                            accounts["twitch"] = {"username": username, "url": f"https://www.twitch.tv/{username}", "source": "username inference"}
                            break
                    except Exception:
                        continue

            # Reddit
            if possible_usernames:
                for username in possible_usernames[:3]:
                    try:
                        resp = await client.get(f"https://www.reddit.com/user/{username}/about.json", headers={"User-Agent": "OSINT-Tool/1.0"})
                        if resp.status_code == 200:
                            data = resp.json().get("data", {})
                            if data.get("name"):
                                accounts["reddit"] = {"username": username, "url": f"https://www.reddit.com/user/{username}", "karma": data.get("total_karma"), "source": "username inference"}
                                break
                    except Exception:
                        continue

            # Steam
            if possible_usernames:
                for username in possible_usernames[:3]:
                    try:
                        resp = await client.get(f"https://steamcommunity.com/id/{username}")
                        if resp.status_code == 200 and "persona" in resp.text.lower():
                            accounts["steam"] = {"username": username, "url": f"https://steamcommunity.com/id/{username}", "source": "username inference"}
                            break
                    except Exception:
                        continue

            # TikTok
            if possible_usernames:
                for username in possible_usernames[:3]:
                    try:
                        resp = await client.get(f"https://www.tiktok.com/@{username}", headers={"User-Agent": "Mozilla/5.0"})
                        if resp.status_code == 200 and ('"uniqueId"' in resp.text or '"nickname"' in resp.text):
                            accounts["tiktok"] = {"username": username, "url": f"https://www.tiktok.com/@{username}", "source": "username inference"}
                            break
                    except Exception:
                        continue

            # Instagram
            if possible_usernames:
                for username in possible_usernames[:3]:
                    try:
                        resp = await client.get(f"https://www.instagram.com/{username}/")
                        if resp.status_code == 200 and "login" not in resp.url.path:
                            accounts["instagram"] = {"username": username, "url": f"https://www.instagram.com/{username}", "source": "username inference"}
                            break
                    except Exception:
                        continue

            # Keybase
            if possible_usernames:
                try:
                    resp = await client.get(f"https://keybase.io/_/api/1.0/user/lookup.json?username={possible_usernames[0]}")
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("them"):
                            accounts["keybase"] = {"username": possible_usernames[0], "url": f"https://keybase.io/{possible_usernames[0]}", "source": "username inference"}
                except Exception:
                    pass

            # DockerHub
            if possible_usernames:
                try:
                    resp = await client.get(f"https://hub.docker.com/v2/users/{possible_usernames[0]}")
                    if resp.status_code == 200:
                        accounts["dockerhub"] = {"username": possible_usernames[0], "url": f"https://hub.docker.com/u/{possible_usernames[0]}", "source": "username inference"}
                except Exception:
                    pass

            # NPM
            if possible_usernames:
                try:
                    resp = await client.get(f"https://registry.npmjs.org/-/user/org.couchdb.user:{possible_usernames[0]}")
                    if resp.status_code == 200:
                        accounts["npm"] = {"username": possible_usernames[0], "url": f"https://www.npmjs.com/~{possible_usernames[0]}", "source": "username inference"}
                except Exception:
                    pass

            # StackOverflow
            if possible_usernames:
                try:
                    resp = await client.get(f"https://api.stackexchange.com/2.3/users?order=desc&inname={possible_usernames[0]}&site=stackoverflow")
                    if resp.status_code == 200:
                        items = resp.json().get("items", [])
                        for user in items:
                            if user.get("display_name", "").lower() == possible_usernames[0].lower():
                                accounts["stackoverflow"] = {"username": user.get("display_name"), "url": f"https://stackoverflow.com/users/{user['account_id']}", "reputation": user.get("reputation"), "source": "username inference"}
                                break
                except Exception:
                    pass

        return accounts

    def _calculate_reputation(self, data: Dict) -> Dict[str, Any]:
        score = 100
        reasons = []

        if data["breach_count"] > 0:
            score -= data["breach_count"] * 10
            reasons.append(f"Found in {data['breach_count']} data breach(es)")

        if data["paste_count"] > 0:
            score -= data["paste_count"] * 5
            reasons.append(f"Found in {data['paste_count']} paste(s)")

        if data.get("validation", {}).get("is_disposable"):
            score -= 30
            reasons.append("Disposable email address")

        if not data.get("dns_info", {}).get("has_mx"):
            score -= 20
            reasons.append("No MX records (may not receive email)")

        if not data.get("gravatar", {}).get("exists"):
            score -= 5
            reasons.append("No Gravatar profile")

        social_count = len([k for k in data.get("social_accounts", {}).keys() if k != "gravatar"])
        if social_count > 0:
            score += social_count * 5
            reasons.append(f"Found on {social_count} social platform(s)")

        for breach in data.get("breaches", []):
            for dc in breach.get("data_classes", []):
                if "password" in dc.lower():
                    score -= 20
                    reasons.append(f"Password exposed in {breach.get('title')}")
                    break

        score = max(0, min(100, score))
        risk = "LOW" if score >= 80 else "MEDIUM" if score >= 50 else "HIGH" if score >= 20 else "CRITICAL"

        return {"score": score, "risk_level": risk, "reasons": reasons}

breach_service = BreachService()
