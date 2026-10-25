"""API-level tests: validation, identity and the evidence lifecycle."""

import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import app
from app.services import evidence_store


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(evidence_store, "EVIDENCE_DIR", tmp_path)
    return TestClient(app)


def test_health_and_identity(client):
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

    meta = client.get("/api/meta").json()
    assert meta["name"] == config.APP_NAME
    assert meta["developer"] == config.DEVELOPER


def test_rejects_empty_username(client):
    response = client.post("/api/username/search", json={"username": ""})
    assert response.status_code == 400


def test_rejects_invalid_domain(client):
    response = client.post("/api/domain/whois", json={"domain": "not a domain!!"})
    assert response.status_code == 400


def test_rejects_non_http_urls(client):
    response = client.post("/api/url/investigate", json={"url": "file:///etc/passwd"})
    assert response.status_code == 400


def test_blocks_ssrf_targets(client):
    for target in ["http://127.0.0.1:8000/health", "http://localhost/admin", "http://169.254.169.254/latest/meta-data/"]:
        response = client.post("/api/url/investigate", json={"url": target})
        assert response.status_code == 400, target


def test_media_evidence_lifecycle(client):
    payload = {
        "filename": "photo.jpg",
        "analysis": {"file": {"name": "photo.jpg"}, "exif": {"Make": "TestCam"}},
        "notes": "unit test",
        "tags": ["exif"],
        "priority": "low",
    }
    captured = client.post("/api/media/evidence/capture", json=payload)
    assert captured.status_code == 200
    body = captured.json()
    evidence_id = body["evidence_id"]
    assert evidence_id.startswith("EVD-MEDIA-")
    assert body["evidence_hash"]

    listing = client.get("/api/media/evidence/list").json()
    assert [r["evidence_id"] for r in listing] == [evidence_id]
    assert listing[0]["evidence_hash"] == body["evidence_hash"]

    fetched = client.get(f"/api/media/evidence/{evidence_id}")
    assert fetched.status_code == 200
    assert fetched.json()["data"]["exif"]["Make"] == "TestCam"

    verified = client.get(f"/api/evidence/{evidence_id}/verify").json()
    assert verified["verified"] is True
    assert verified["stored_hash"] == verified["computed_hash"]

    exported = client.get(f"/api/media/evidence/{evidence_id}/export?format=html")
    assert exported.status_code == 200

    deleted = client.delete(f"/api/media/evidence/{evidence_id}")
    assert deleted.status_code == 200
    assert client.get(f"/api/media/evidence/{evidence_id}").status_code == 404


def test_phone_evidence_is_not_listed_under_other_types(client):
    phone = evidence_store.record(
        prefix="EVD-PHONE",
        investigation_type="phone_lookup",
        evidence_type="phone_investigation",
        target="+15551234567",
        data={},
    )
    username = evidence_store.record(
        prefix="EVD-USR",
        investigation_type="username_osint",
        evidence_type="username_investigation",
        target="octocat",
        data={},
    )

    phone_ids = {r["evidence_id"] for r in client.get("/api/phone/evidence/list").json()}
    user_ids = {r["evidence_id"] for r in client.get("/api/username/evidence/list").json()}

    assert phone["evidence_id"] in phone_ids
    assert username["evidence_id"] not in phone_ids
    assert username["evidence_id"] in user_ids
    assert phone["evidence_id"] not in user_ids


def test_unknown_evidence_returns_404(client):
    assert client.get("/api/media/evidence/EVD-NOPE").status_code == 404
    assert client.get("/api/evidence/EVD-NOPE/verify").status_code == 404
    assert client.delete("/api/media/evidence/EVD-NOPE").status_code == 404
