import httpx
import re
import hashlib
from typing import Optional, Dict, Any, List
import phonenumbers
from phonenumbers import carrier, timezone, geocoder

class PhoneService:
    def __init__(self):
        self.numverify_api = "http://apilayer.net/api/validate"

    async def lookup_phone(self, phone_number: str, country_code: str = "US") -> Dict[str, Any]:
        result = {
            "phone_number": phone_number,
            "valid": False,
            "formatted": None,
            "country": None,
            "country_name": None,
            "carrier": None,
            "line_type": None,
            "timezone": None,
            "location": None,
            "error": None,
            "owner_info": {},
            "social_accounts": {},
            "breach_data": [],
            "spam_reports": [],
            "linked_emails": [],
            "reputation": {},
        }

        try:
            parsed = phonenumbers.parse(phone_number, country_code)
            result["valid"] = phonenumbers.is_valid_number(parsed)
            result["formatted"] = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            result["formatted_international"] = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
            result["formatted_national"] = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
            region = phonenumbers.region_code_for_number(parsed)
            result["country"] = region

            country_names = {
                "US": "United States", "UK": "United Kingdom", "CA": "Canada",
                "AU": "Australia", "DE": "Germany", "FR": "France", "JP": "Japan",
                "PH": "Philippines", "IN": "India", "CN": "China", "BR": "Brazil",
                "MX": "Mexico", "KR": "South Korea", "IT": "Italy", "ES": "Spain",
                "NL": "Netherlands", "SE": "Sweden", "NO": "Norway", "DK": "Denmark",
                "FI": "Finland", "PL": "Poland", "RU": "Russia", "UA": "Ukraine",
                "TH": "Thailand", "VN": "Vietnam", "ID": "Indonesia", "MY": "Malaysia",
                "SG": "Singapore", "NZ": "New Zealand", "IE": "Ireland", "ZA": "South Africa",
                "NG": "Nigeria", "KE": "Kenya", "EG": "Egypt", "AE": "UAE",
                "SA": "Saudi Arabia", "TR": "Turkey", "PK": "Pakistan", "BD": "Bangladesh",
            }
            result["country_name"] = country_names.get(region, region)

            try:
                result["carrier"] = carrier.name_for_number(parsed, "en")
            except Exception:
                pass

            try:
                tz_list = timezone.time_zones_for_number(parsed)
                result["timezone"] = tz_list[0] if tz_list else None
            except Exception:
                pass

            try:
                result["location"] = geocoder.description_for_number(parsed, "en")
            except Exception:
                pass

            num_type = phonenumbers.number_type(parsed)
            type_map = {
                phonenumbers.PhoneNumberType.FIXED_LINE: "Fixed Line",
                phonenumbers.PhoneNumberType.MOBILE: "Mobile",
                phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE: "Fixed Line or Mobile",
                phonenumbers.PhoneNumberType.TOLL_FREE: "Toll Free",
                phonenumbers.PhoneNumberType.PREMIUM_RATE: "Premium Rate",
                phonenumbers.PhoneNumberType.SHARED_COST: "Shared Cost",
                phonenumbers.PhoneNumberType.VOIP: "VoIP",
                phonenumbers.PhoneNumberType.PERSONAL_NUMBER: "Personal Number",
                phonenumbers.PhoneNumberType.PAGER: "Pager",
                phonenumbers.PhoneNumberType.UAN: "UAN",
                phonenumbers.PhoneNumberType.VOICEMAIL: "Voicemail",
            }
            result["line_type"] = type_map.get(num_type, "Unknown")

            national = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
            result["national_format"] = national
            digits_only = re.sub(r'[^\d]', '', national)
            result["local_digits"] = digits_only

        except Exception as e:
            result["error"] = f"Invalid phone number format: {str(e)}"
            return result

        async with httpx.AsyncClient(follow_redirects=True, timeout=8.0) as client:
            result["owner_info"] = await self._trace_owner(client, phone_number, result)
            result["social_accounts"] = await self._check_phone_social(client, phone_number, result)
            result["breach_data"] = await self._check_phone_breaches(client, phone_number)
            result["spam_reports"] = await self._check_spam(client, phone_number)
            result["linked_emails"] = await self._find_linked_emails(client, phone_number, result)

        result["reputation"] = self._calculate_reputation(result)

        return result

    async def _trace_owner(self, client: httpx.AsyncClient, phone_number: str, info: Dict) -> Dict[str, Any]:
        owner = {
            "possible_names": [],
            "possible_locations": [],
            "carrier_owner": info.get("carrier"),
            "country": info.get("country_name"),
            "location": info.get("location"),
            "timezone": info.get("timezone"),
            "number_type": info.get("line_type"),
            "is_business": False,
            "is_spam": False,
            "risk_flags": [],
        }

        if info.get("line_type") in ["Premium Rate", "Shared Cost", "UAN"]:
            owner["is_business"] = True
            owner["risk_flags"].append("Business/premium number detected")

        if info.get("line_type") == "VoIP":
            owner["risk_flags"].append("VoIP number - harder to trace owner")

        if info.get("line_type") == "Toll Free":
            owner["is_business"] = True
            owner["risk_flags"].append("Toll-free business number")

        if info.get("carrier"):
            carrier_lower = info["carrier"].lower()
            if any(spam in carrier_lower for spam in ["unknown", "mobile", "generic"]):
                owner["risk_flags"].append("Generic carrier - possible prepaid/burner")

        try:
            resp = await client.get(
                f"https://api.numverify.com/v2/validate",
                params={"access_key": "free", "number": phone_number, "country_code": info.get("country", "")}
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("valid"):
                    owner["is_valid_line"] = True
                    if data.get("carrier"):
                        owner["carrier_owner"] = data["carrier"]
                    if data.get("location"):
                        owner["possible_locations"].append(data["location"])
        except Exception:
            pass

        return owner

    async def _check_phone_social(self, client: httpx.AsyncClient, phone_number: str, info: Dict) -> Dict[str, Any]:
        accounts = {}
        phone_digits = re.sub(r'[^\d]', '', phone_number)

        try:
            resp = await client.get(f"https://api.github.com/search/users?q={phone_digits}")
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                if items:
                    accounts["github"] = {"username": items[0].get("login"), "url": items[0].get("html_url"), "source": "phone number search"}
        except Exception:
            pass

        try:
            resp = await client.get(f"https://api.telegram.org/bot{phone_digits}/getMe")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("result"):
                    accounts["telegram"] = {"username": data["result"].get("username"), "bot": data["result"].get("is_bot")}
        except Exception:
            pass

        try:
            resp = await client.get(f"https://api.viber.com/api/get_user_details", params={"id": phone_digits})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == 0:
                    accounts["viber"] = {"name": data.get("name"), "avatar": data.get("avatar")}
        except Exception:
            pass

        try:
            resp = await client.get(f"https://www.whatsapp.com/send?phone={phone_digits}")
            if resp.status_code == 200:
                accounts["whatsapp"] = {"status": "number exists on WhatsApp", "url": f"https://wa.me/{phone_digits}"}
        except Exception:
            pass

        return accounts

    async def _check_phone_breaches(self, client: httpx.AsyncClient, phone_number: str) -> List[Dict[str, Any]]:
        breaches = []
        phone_digits = re.sub(r'[^\d]', '', phone_number)

        try:
            resp = await client.get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{phone_digits}",
                headers={"hibp-api-key": "", "user-agent": "OSINT-Tool-1.0"},
                params={"truncateResponse": "false"}
            )
            if resp.status_code == 200:
                for b in resp.json():
                    breaches.append({
                        "name": b.get("Name"),
                        "title": b.get("Title"),
                        "domain": b.get("Domain"),
                        "breach_date": b.get("BreachDate"),
                        "pwn_count": b.get("PwnCount"),
                        "data_classes": b.get("DataClasses", []),
                        "is_verified": b.get("IsVerified"),
                    })
        except Exception:
            pass

        return breaches

    async def _check_spam(self, client: httpx.AsyncClient, phone_number: str) -> List[Dict[str, Any]]:
        reports = []
        phone_digits = re.sub(r'[^\d]', '', phone_number)

        try:
            resp = await client.get(f"https://api.numverify.com/v2/validate", params={"access_key": "free", "number": phone_digits})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("valid") is False:
                    reports.append({"source": "NumVerify", "status": "Number not valid", "risk": "high"})
        except Exception:
            pass

        return reports

    async def _find_linked_emails(self, client: httpx.AsyncClient, phone_number: str, info: Dict) -> List[Dict[str, Any]]:
        emails = []
        phone_digits = re.sub(r'[^\d]', '', phone_number)

        try:
            resp = await client.get(f"https://api.github.com/search/users?q={phone_digits}+in:email")
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                for item in items:
                    if item.get("email"):
                        emails.append({"email": item["email"], "source": "GitHub", "username": item.get("login")})
        except Exception:
            pass

        return emails

    def _calculate_reputation(self, data: Dict) -> Dict[str, Any]:
        score = 100
        flags = []

        if not data.get("valid"):
            score -= 30
            flags.append("Invalid phone number")

        if data.get("line_type") == "VoIP":
            score -= 15
            flags.append("VoIP number - harder to trace")

        if data.get("line_type") == "Toll Free":
            score -= 10
            flags.append("Toll-free number")

        if data.get("line_type") in ["Premium Rate", "Shared Cost"]:
            score -= 20
            flags.append("Premium/shared cost number")

        if data.get("breach_data"):
            score -= len(data["breach_data"]) * 10
            flags.append(f"Found in {len(data['breach_data'])} data breach(es)")

        if data.get("spam_reports"):
            score -= len(data["spam_reports"]) * 5
            flags.append(f"Flagged in {len(data['spam_reports'])} spam report(s)")

        if data.get("owner_info", {}).get("risk_flags"):
            for flag in data["owner_info"]["risk_flags"]:
                score -= 5
                flags.append(flag)

        if data.get("social_accounts"):
            social_count = len(data["social_accounts"])
            if social_count > 0:
                score += social_count * 3
                flags.append(f"Found on {social_count} social platform(s)")

        score = max(0, min(100, score))
        risk = "LOW" if score >= 80 else "MEDIUM" if score >= 50 else "HIGH" if score >= 20 else "CRITICAL"

        return {"score": score, "risk_level": risk, "flags": flags}

    def validate_email(self, email: str) -> Dict[str, Any]:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        is_valid = bool(re.match(pattern, email))

        result = {
            "email": email,
            "valid": is_valid,
            "local_part": email.split('@')[0] if is_valid else None,
            "domain": email.split('@')[1] if is_valid else None,
        }

        if is_valid:
            domain = email.split('@')[1]
            result["is_disposable"] = self._check_disposable_domain(domain)
            result["is_free_provider"] = self._check_free_provider(domain)
            result["mx_valid"] = self._check_mx_record(domain)

        return result

    def _check_disposable_domain(self, domain: str) -> bool:
        disposable_domains = {
            "guerrillamail.com", "tempmail.com", "throwaway.email",
            "temp-mail.org", "fakeinbox.com", "sharklasers.com",
            "guerrillamailblock.com", "grr.la", "dispostable.com",
            "mailinator.com", "yopmail.com", "trashmail.com",
            "10minutemail.com", "maildrop.cc", "discard.email",
            "mailexpire.com", "fakeemailaddress.org", "mohmal.com",
            "tmpmail.net", "burnermail.io", "tmail.io",
            "tmpmail.org", "getnada.com", "emailondeck.com",
        }
        return domain.lower() in disposable_domains

    def _check_free_provider(self, domain: str) -> bool:
        free_providers = {
            "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
            "aol.com", "icloud.com", "mail.com", "protonmail.com",
            "zoho.com", "yandex.com", "qq.com", "163.com",
            "live.com", "msn.com", "ymail.com", "rocketmail.com",
        }
        return domain.lower() in free_providers

    def _check_mx_record(self, domain: str) -> bool:
        import dns.resolver
        try:
            dns.resolver.resolve(domain, "MX")
            return True
        except Exception:
            return False

phone_service = PhoneService()
