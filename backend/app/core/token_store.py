"""In-memory token lifecycle stores (revocation, refresh, OTP, rate-limit).

Refresh/revoked state is ALSO persisted to DB (RevokedToken) when available
so restarts do not un-revoke. OTPs are short-lived in-memory only by design
(restart invalidates pending OTPs — fail closed).
"""
from __future__ import annotations

import secrets
import time
from dataclasses import dataclass, field


@dataclass
class _Entry:
    value: str
    expires_at: float


class _ExpiringStore:
    def __init__(self) -> None:
        self._data: dict[str, _Entry] = {}

    def set(self, key: str, value: str, ttl_seconds: int) -> None:
        self._data[key] = _Entry(value=value, expires_at=time.time() + ttl_seconds)
        self._prune()

    def get(self, key: str) -> str | None:
        ent = self._data.get(key)
        if not ent:
            return None
        if ent.expires_at < time.time():
            self._data.pop(key, None)
            return None
        return ent.value

    def pop(self, key: str) -> str | None:
        val = self.get(key)
        self._data.pop(key, None)
        return val

    def contains(self, key: str) -> bool:
        return self.get(key) is not None

    def _prune(self) -> None:
        now = time.time()
        for k in [k for k, e in self._data.items() if e.expires_at < now]:
            self._data.pop(k, None)


revoked_jti = _ExpiringStore()          # jti -> "1" (memory fallback)
refresh_tokens = _ExpiringStore()      # refresh jti -> user_id
otp_challenges = _ExpiringStore()      # phone/username -> otp code

# Simple fixed-window rate limiter: key -> list[timestamps]
_rate_buckets: dict[str, list[float]] = {}


def rate_limit_ok(key: str, *, limit: int, window_seconds: int) -> bool:
    now = time.time()
    bucket = [t for t in _rate_buckets.get(key, []) if now - t < window_seconds]
    if len(bucket) >= limit:
        _rate_buckets[key] = bucket
        return False
    bucket.append(now)
    _rate_buckets[key] = bucket
    return True


def new_jti() -> str:
    return secrets.token_hex(16)


def new_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"
