"""Unit tests for the shared evidence store."""

import json

import pytest
from fastapi import HTTPException

from app.services import evidence_store


@pytest.fixture()
def store(tmp_path, monkeypatch):
    monkeypatch.setattr(evidence_store, "EVIDENCE_DIR", tmp_path)
    return tmp_path


def _record(**overrides):
    params = dict(
        prefix="EVD-TEST",
        investigation_type="unit_test",
        evidence_type="unit_test",
        target="example",
        data={"value": 42},
    )
    params.update(overrides)
    return evidence_store.record(**params)


def test_hash_is_persisted_and_verifies(store):
    document = _record()

    on_disk = json.loads((store / f"{document['evidence_id']}.json").read_text())

    stored_hash = on_disk["metadata"]["chain_of_custody"]["hash"]
    assert stored_hash, "capture must persist the hash, not null"
    assert len(stored_hash) == 64
    assert evidence_store.verify_hash(on_disk) is True
    assert evidence_store.compute_hash(on_disk) == stored_hash


def test_hash_detects_tampering(store):
    document = _record()
    path = store / f"{document['evidence_id']}.json"

    on_disk = json.loads(path.read_text())
    on_disk["data"]["value"] = 43
    path.write_text(json.dumps(on_disk))

    assert evidence_store.verify_hash(on_disk) is False


def test_ids_are_unique_within_the_same_second(store):
    ids = {_record()["evidence_id"] for _ in range(25)}
    assert len(ids) == 25


def test_listing_is_scoped_to_evidence_type(store):
    _record(prefix="EVD-USER-X")
    _record(prefix="EVD-OTHER-X")

    user_records = evidence_store.list_records(["EVD-USER-X"])
    other_records = evidence_store.list_records(["EVD-OTHER-X"])

    assert len(user_records) == 1
    assert len(other_records) == 1
    assert user_records[0]["evidence_id"] != other_records[0]["evidence_id"]


def test_legacy_phone_ids_are_listed_only_when_requested(store):
    legacy = "EVD-20260919161923"
    (store / f"{legacy}.json").write_text(
        json.dumps({"evidence_id": legacy, "timestamp": "2026-09-19T16:19:23", "target": "+15551234567"})
    )
    _record(prefix="EVD-PHONE")

    phone_records = evidence_store.list_records(["EVD-PHONE"], include_legacy_phone=True)
    plain_records = evidence_store.list_records(["EVD-PHONE"])

    assert {r["evidence_id"] for r in phone_records} == {legacy, phone_records[0]["evidence_id"]} | set()
    assert [r["evidence_id"] for r in plain_records] != [] and all(
        r["evidence_id"].startswith("EVD-PHONE") for r in plain_records
    )


@pytest.mark.parametrize(
    "bad_id",
    ["../secrets", "..%2Fsecrets", "a/b", "a\\b", "x" * 200, "", "EVD-OK/../../x"],
)
def test_unsafe_ids_are_rejected(store, bad_id):
    with pytest.raises(HTTPException) as exc:
        evidence_store.evidence_path(bad_id)
    assert exc.value.status_code == 400


def test_missing_records_raise_404(store):
    with pytest.raises(HTTPException) as exc:
        evidence_store.load("EVD-MISSING")
    assert exc.value.status_code == 404

    with pytest.raises(HTTPException) as exc:
        evidence_store.delete("EVD-MISSING")
    assert exc.value.status_code == 404


def test_records_are_written_with_owner_only_permissions(store):
    document = _record()
    mode = (store / f"{document['evidence_id']}.json").stat().st_mode & 0o777
    assert mode == 0o600


def test_record_metadata_uses_configured_identity(store):
    from app import config

    document = _record()
    metadata = document["metadata"]

    assert metadata["investigator"] == config.DEVELOPER
    assert metadata["tool"] == config.APP_NAME
    assert metadata["tool_version"] == config.VERSION
    assert metadata["chain_of_custody"]["algorithm"] == "sha256"
