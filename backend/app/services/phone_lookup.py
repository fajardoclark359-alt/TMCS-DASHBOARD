import httpx
import re
from typing import Optional, Dict, Any
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
            "error": None,
        }

        try:
            parsed = phonenumbers.parse(phone_number, country_code)
            result["valid"] = phonenumbers.is_valid_number(parsed)
            result["formatted"] = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
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

        except Exception as e:
            result["error"] = f"Invalid phone number format: {str(e)}"
            return result

        return result

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
