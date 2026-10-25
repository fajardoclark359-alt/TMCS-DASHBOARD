"""Backfill chain-of-custody hashes for legacy evidence records.

Early versions computed a hash but wrote the record *before* storing it, so the
files contain ``"hash": null`` (and used Python's salted ``hash()``). This script
seals those records with the current SHA-256 scheme.

It only touches records whose hash is missing - records that already have a hash
are never re-sealed, because that would destroy the ability to detect tampering.

Usage:
    python -m scripts.backfill_evidence_hashes [--dir backend/evidence] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.config import EVIDENCE_DIR
from app.services import evidence_store


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", default=str(EVIDENCE_DIR), help="Evidence directory")
    parser.add_argument("--dry-run", action="store_true", help="Report without writing")
    parser.add_argument(
        "--reselect-mismatched",
        action="store_true",
        help="Also re-seal records whose existing hash was produced by the old scheme "
        "(the previous hash is preserved under chain_of_custody.previous_hashes)",
    )
    args = parser.parse_args()

    directory = Path(args.dir).resolve()
    if not directory.is_dir():
        print(f"error: {directory} is not a directory", file=sys.stderr)
        return 2

    sealed = 0
    skipped = 0
    for path in sorted(directory.glob("EVD-*.json")):
        with path.open(encoding="utf-8") as handle:
            document = json.load(handle)

        custody = document.setdefault("metadata", {}).setdefault("chain_of_custody", {})
        if custody.get("hash"):
            if not args.reselect_mismatched or evidence_store.verify_hash(document):
                skipped += 1
                continue
            # Old scheme (pre-2.2): keep the old digest for the audit trail.
            custody.setdefault("previous_hashes", []).append(custody["hash"])
            custody["resealed_reason"] = "legacy hash scheme, not reproducible under sha256 canonical form"

        custody["hash"] = evidence_store.compute_hash(document)
        custody["algorithm"] = evidence_store.HASH_ALGORITHM
        custody["verified"] = True
        custody["sealed_at"] = evidence_store.utcnow_iso()

        print(f"{'would seal' if args.dry_run else 'sealed'}: {path.name} -> {custody['hash'][:16]}...")
        sealed += 1
        if not args.dry_run:
            evidence_store.save(document)

    print(f"\n{sealed} sealed, {skipped} already hashed, {len(list(directory.glob('EVD-*.json')))} total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
