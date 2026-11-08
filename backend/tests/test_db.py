"""DB-backed tests for auth/scan/evidence routers.

Use an in-memory SQLite DB so these tests never touch the tracked
``backend/auosint.db`` fixture.
"""

import os

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:////tmp/test_auosint.db"

# Remove any stale test DB so each run starts fresh
if os.path.exists("/tmp/test_auosint.db"):
    os.remove("/tmp/test_auosint.db")

from app.database import engine
from app.main import app
from app.models.base import Base


@pytest.fixture(scope="session", autouse=True)
def _init_test_db():
    async def _init():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    import asyncio
    asyncio.run(_init())
    yield
    async def _dispose():
        await engine.dispose()
    asyncio.run(_dispose())


@pytest.fixture()
def client():
    return TestClient(app)


def test_health_unauthenticated(client):
    """Health endpoint must not require an API key."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_meta_unauthenticated(client):
    """Meta endpoint must not require an API key."""
    resp = client.get("/api/meta")
    assert resp.status_code == 200


def test_evidence_crud_sync(client):
    """Synchronous evidence create/get/list/delete must persist to DB."""
    payload = {
        "evidence_id": "EVD-TEST-0001",
        "evidence_type": "url",
        "target": "https://example.com",
        "title": "Test evidence",
        "description": "desc",
        "data": {"url": "https://example.com"},
        "evidence_hash": "a" * 64,
        "priority": "medium",
    }
    created = client.post("/api/evidence/sync", json=payload)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["evidence_id"] == "EVD-TEST-0001"

    listed = client.get("/api/evidence/sync?limit=10&offset=0")
    assert listed.status_code == 200
    ids = [r["evidence_id"] for r in listed.json()["evidence"]]
    assert "EVD-TEST-0001" in ids

    fetched = client.get("/api/evidence/EVD-TEST-0001/sync")
    assert fetched.status_code == 200
    assert fetched.json()["target"] == "https://example.com"

    deleted = client.delete("/api/evidence/EVD-TEST-0001/sync")
    assert deleted.status_code == 200

    gone = client.get("/api/evidence/EVD-TEST-0001/sync")
    assert gone.status_code == 404


def test_auth_register_persists(client):
    """Register persists a user row in the DB."""
    import uuid
    suffix = uuid.uuid4().hex[:8]
    reg = client.post("/api/auth/register", json={
        "username": f"dbtester-{suffix}",
        "email": f"dbtester-{suffix}@example.com",
        "password": "Str0ngP@ssw0rd",
        "role": "viewer",
    })
    assert reg.status_code == 201, reg.text
    user = reg.json()
    assert user["username"] == f"dbtester-{suffix}"
    assert user["is_active"] is True


def test_scan_history_endpoints(client):
    """Scan history list/stats must return 200 without DB writes failing."""
    resp = client.get("/api/scans/stats/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_scans" in data
    assert "by_status" in data
    assert "by_type" in data
    assert "recent_7_days" in data

    listed = client.get("/api/scans/")
    assert listed.status_code == 200
    assert listed.json()["total"] == 0
