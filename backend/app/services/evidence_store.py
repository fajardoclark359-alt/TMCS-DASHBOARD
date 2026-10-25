"""Shared, tamper-evident evidence storage.

Every investigation type used to copy/paste its own evidence handling, which
led to three bugs: hashes that were never persisted (the pre-hash JSON string
was written to disk), hashes produced with Python's salted ``hash()`` helper
(different on every process), and evidence ids that collided when two captures
happened in the same second.

This module is the single implementation used by all routers.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from fastapi import HTTPException

from app.config import APP_NAME, DEVELOPER, EVIDENCE_DIR, VERSION

# Evidence ids end up in file paths, so they are restricted to a conservative
# character set and never allowed to contain path separators or "..".
EVIDENCE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$")

# Phone evidence used to be stored as "EVD-<timestamp>" without a type segment.
LEGACY_PHONE_ID_RE = re.compile(r"^EVD-\d{14}$")

HASH_ALGORITHM = "sha256"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def utcnow_iso() -> str:
    return utcnow().isoformat()


def new_evidence_id(prefix: str) -> str:
    """Collision-resistant id: type + UTC timestamp + random suffix."""
    stamp = utcnow().strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{stamp}-{uuid.uuid4().hex[:6]}"


def _without_hash(document: dict) -> dict:
    """Deep copy of a record with the chain-of-custody hash removed."""
    copy = json.loads(json.dumps(document, default=str))
    metadata = copy.get("metadata")
    if isinstance(metadata, dict):
        custody = metadata.get("chain_of_custody")
        if isinstance(custody, dict):
            custody.pop("hash", None)
    return copy


def compute_hash(document: dict) -> str:
    """Deterministic hash over the record contents (excluding the hash itself)."""
    payload = json.dumps(_without_hash(document), sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def verify_hash(document: dict) -> bool:
    stored = (
        document.get("metadata", {}).get("chain_of_custody", {}).get("hash")
        if isinstance(document.get("metadata"), dict)
        else None
    )
    return bool(stored) and stored == compute_hash(document)


def evidence_path(evidence_id: str) -> Path:
    if not isinstance(evidence_id, str) or not EVIDENCE_ID_RE.match(evidence_id):
        raise HTTPException(status_code=400, detail="Invalid evidence id")
    path = (EVIDENCE_DIR / f"{evidence_id}.json").resolve()
    if path.parent != EVIDENCE_DIR:
        raise HTTPException(status_code=400, detail="Invalid evidence id")
    return path


def save(document: dict) -> dict:
    """Hash, then atomically persist an evidence record."""
    document.setdefault("metadata", {}).setdefault("chain_of_custody", {})
    custody = document["metadata"]["chain_of_custody"]
    custody["algorithm"] = HASH_ALGORITHM
    custody["hash"] = compute_hash(document)
    custody["verified"] = True

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    path = evidence_path(document["evidence_id"])

    # Write to a temp file in the same directory, then atomically replace, so a
    # crash or concurrent read never sees a half-written record.
    fd, tmp_name = tempfile.mkstemp(dir=str(EVIDENCE_DIR), prefix=".tmp-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(document, handle, indent=2, default=str)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp_name, 0o600)
        os.replace(tmp_name, path)
    except BaseException:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise

    document["_path"] = str(path)
    return document


def load(evidence_id: str) -> dict:
    path = evidence_path(evidence_id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Evidence not found")
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def delete(evidence_id: str) -> None:
    path = evidence_path(evidence_id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Evidence not found")
    path.unlink()


def _summary(document: dict) -> dict:
    return {
        "evidence_id": document.get("evidence_id"),
        "timestamp": document.get("timestamp"),
        "target": document.get("target"),
        "investigation_type": document.get("investigation_type"),
        "notes": document.get("notes"),
        "tags": document.get("tags"),
        "priority": document.get("priority"),
        "case_id": document.get("case_id"),
        "evidence_hash": document.get("metadata", {}).get("chain_of_custody", {}).get("hash"),
    }


def list_records(prefixes: Iterable[str], include_legacy_phone: bool = False) -> list[dict]:
    """Newest-first summaries, limited to the requested evidence types."""
    prefixes = tuple(prefixes)
    if not EVIDENCE_DIR.is_dir():
        return []

    records = []
    for path in EVIDENCE_DIR.glob("*.json"):
        evidence_id = path.stem
        matches = evidence_id.startswith(prefixes)
        if not matches and include_legacy_phone:
            matches = bool(LEGACY_PHONE_ID_RE.match(evidence_id))
        if not matches:
            continue
        try:
            with path.open(encoding="utf-8") as handle:
                records.append(_summary(json.load(handle)))
        except (OSError, json.JSONDecodeError):
            # A corrupt record must not break the whole listing.
            continue

    records.sort(key=lambda r: (r.get("timestamp") or "", r.get("evidence_id") or ""), reverse=True)
    return records


def record(
    *,
    prefix: str,
    investigation_type: str,
    evidence_type: str,
    target: str,
    data: Any,
    notes: str | None = "",
    tags: list[str] | None = None,
    priority: str | None = "medium",
    case_id: str | None = "",
    extra: dict | None = None,
) -> dict:
    """Build, hash and persist a standard evidence record."""
    created = utcnow_iso()
    document: dict[str, Any] = {
        "evidence_id": new_evidence_id(prefix),
        "timestamp": created,
        "investigation_type": investigation_type,
        "target": target,
        "notes": notes or "",
        "tags": tags or [],
        "priority": priority or "medium",
        "case_id": case_id or "",
        "data": data,
        "metadata": {
            "investigator": DEVELOPER,
            "tool": APP_NAME,
            "tool_version": VERSION,
            "evidence_type": evidence_type,
            "chain_of_custody": {
                "created_at": created,
                "algorithm": HASH_ALGORITHM,
                "hash": None,
                "verified": True,
            },
        },
    }
    if extra:
        document.update(extra)
    return save(document)
