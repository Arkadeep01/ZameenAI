"""Shared hashing helpers (single authoritative implementation).

Consolidates the previously duplicated ``_sha256_bytes`` /
``_sha256_of`` / ``_sha256_path`` / ``_combined_sha256`` helpers copied
across remediation, resubmission and reprocessing. Digests are
identical regardless of read chunk size; the canonical reader uses
1 MiB chunks.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import List


def sha256_bytes(content: bytes) -> str:
    """Hex SHA-256 of in-memory bytes."""
    return hashlib.sha256(content).hexdigest()


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    """Hex SHA-256 of a file, streamed in chunks."""
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def combined_sha256(hashes: List[str]) -> str:
    """Deterministic combined integrity hash for a multi-file submission."""
    return hashlib.sha256("|".join(sorted(h for h in hashes if h)).encode()).hexdigest()
