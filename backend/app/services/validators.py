"""Input validation and SSRF guards shared by the routers."""

from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
from urllib.parse import urlparse

from fastapi import HTTPException

from app.config import ALLOW_PRIVATE_TARGETS

USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{1,50}$")
# Hostname without scheme/path; requires at least one dot and a valid label set.
DOMAIN_RE = re.compile(
    r"^(?=.{3,253}$)"
    r"(?!-)[A-Za-z0-9-]{1,63}(?<!-)"
    r"(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$"
)
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")

BLOCKED_HOSTNAMES = {"localhost", "localhost.localdomain", "metadata.google.internal", "instance-data"}


def _bad(message: str) -> HTTPException:
    return HTTPException(status_code=400, detail=message)


def validate_username(value: str) -> str:
    value = (value or "").strip().lstrip("@")
    if not USERNAME_RE.match(value):
        raise _bad("Username must be 1-50 characters of letters, digits, dot, dash or underscore")
    return value


def validate_email(value: str) -> str:
    value = (value or "").strip()
    if len(value) > 254 or not EMAIL_RE.match(value):
        raise _bad("Invalid email address")
    return value


def normalize_domain(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        raise _bad("Domain is required")
    if "://" in value:
        value = urlparse(value).hostname or ""
    value = value.split("/")[0].split("?")[0].split("#")[0].rstrip(".")
    if value.startswith("www.") and value.count(".") >= 2:
        pass  # keep as provided; www is a valid hostname
    try:
        value.encode("idna")
    except UnicodeError as exc:  # pragma: no cover - defensive
        raise _bad("Invalid domain name") from exc
    if not DOMAIN_RE.match(value):
        raise _bad(f"'{value}' is not a valid domain name")
    return value


def normalize_url(value: str) -> str:
    value = (value or "").strip()
    if not value:
        raise _bad("URL is required")
    if len(value) > 2048:
        raise _bad("URL is too long")
    if "://" not in value:
        value = f"http://{value}"
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        raise _bad("Only http:// and https:// URLs can be investigated")
    if not parsed.hostname:
        raise _bad("URL is missing a host")
    if parsed.username or parsed.password:
        raise _bad("URLs containing credentials are not supported")
    try:
        parsed.port
    except ValueError as exc:
        raise _bad("URL contains an invalid port") from exc
    return value


def _is_public_ip(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


async def assert_public_host(host: str) -> None:
    """Refuse SSRF targets: loopback, private ranges, link-local (cloud metadata)."""
    if ALLOW_PRIVATE_TARGETS:
        return
    host = (host or "").strip().lower().rstrip(".")
    if not host or host in BLOCKED_HOSTNAMES:
        raise _bad("Refusing to investigate local or internal hosts")

    try:
        if _is_public_ip(host):
            return
        raise _bad(f"Refusing to investigate non-public address '{host}'")
    except ValueError:
        pass  # not an IP literal - resolve it below

    try:
        infos = await asyncio.to_thread(socket.getaddrinfo, host, None, 0, socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise _bad(f"Could not resolve host '{host}'") from exc

    addresses = {info[4][0] for info in infos}
    if not addresses:
        raise _bad(f"Could not resolve host '{host}'")
    for address in addresses:
        if not _is_public_ip(address):
            raise _bad(f"Refusing to investigate '{host}' because it resolves to a non-public address")
