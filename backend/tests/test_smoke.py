"""Smoke tests for deep media forensics + NMAP network scan endpoints.

Covers:
  - /health
  - /api/media/deep-analysis (validation + happy path on a minimal PNG)
  - /api/network/profiles
  - /api/network/scan (authorization gate, SSRF gate, validation)
"""

import io

import pytest
from fastapi.testclient import TestClient

from app.main import app


# ─── helpers ─────────────────────────────────────────────────────────────────

_MINIMAL_PNG = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00"
    b"\x90wS\xde"
    b"\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\x0f\x00\x00\x01\x01\x01\x00\x18\xff"
    b"~\xc9"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture()
def client():
    return TestClient(app)


def _post_deep(client, filename="photo.png", content=b""):
    files = {"file": (filename, io.BytesIO(content), "image/png")}
    return client.post("/api/media/deep-analysis", files=files)


# ─── health ──────────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


# ─── deep media forensics ────────────────────────────────────────────────────

def test_deep_analysis_rejects_empty_file(client):
    r = _post_deep(client, content=b"")
    assert r.status_code == 400


def test_deep_analysis_rejects_unsupported_type(client):
    r = client.post(
        "/api/media/deep-analysis",
        files={"file": ("script.sh", io.BytesIO(b"echo hi"), "text/plain")},
    )
    assert r.status_code == 400


def test_deep_analysis_happy_path(client):
    r = _post_deep(client, content=_MINIMAL_PNG)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "deep" in body
    deep = body["deep"]
    # Forensic fields present (may be empty dict if media_deep has no data)
    assert isinstance(deep, dict)
    assert "file" in body
    assert "kind" in body


# ─── network scan profiles ───────────────────────────────────────────────────

def test_network_profiles(client):
    r = client.get("/api/network/profiles")
    assert r.status_code == 200
    body = r.json()
    assert "nmap_available" in body
    assert "profiles" in body
    ids = {p["id"] for p in body["profiles"]}
    assert {"quick", "standard", "deep", "full", "udp"} <= ids


# ─── network scan gates ──────────────────────────────────────────────────────

def test_network_scan_requires_authorization(client):
    r = client.post(
        "/api/network/scan",
        json={"target": "example.com", "profile": "quick", "authorized": False},
    )
    assert r.status_code == 403


def test_network_scan_requires_target(client):
    r = client.post(
        "/api/network/scan",
        json={"target": "", "profile": "quick", "authorized": True},
    )
    assert r.status_code == 400


def test_network_scan_blocks_private_targets(client):
    for target in ["127.0.0.1", "localhost", "192.168.1.1", "http://169.254.169.254/"]:
        r = client.post(
            "/api/network/scan",
            json={"target": target, "profile": "quick", "authorized": True},
        )
        assert r.status_code == 400, f"{target} should be blocked"


def test_network_scan_blocks_invalid_profile(client):
    r = client.post(
        "/api/network/scan",
        json={"target": "example.com", "profile": "bogus", "authorized": True},
    )
    assert r.status_code == 400
