"""Token Service — session state in Redis.

Three things live here, and none can live in process memory:

* **login state** — the ``state``/``nonce`` pair for an in-flight Google login.
  The browser may come back to a different replica than the one it left.
* **refresh tokens** — long-lived and revocable. Keeping them server-side is
  the whole reason revocation works at all; a self-contained JWT could not be
  taken back before it expired.
* **revocation marks** — one key per account whose access has been withdrawn,
  read by /auth/verify on every request. Deleting refresh tokens alone stops
  renewal but leaves any access token already issued working until it expires,
  which is up to TOKEN_EXPIRY_SECONDS — fifteen minutes by default, against an
  acceptance criterion of sixty seconds.

Refresh tokens rotate on every use and are grouped into a *family* (one family
per login). Reusing a token that was already exchanged is the classic signal of
a stolen token, so the entire family is revoked when it happens — the thief and
the real user both get logged out, which is the safe outcome.

Tokens are stored under a SHA-256 of their value, so a Redis dump does not hand
out usable credentials.
"""

import hashlib
import json
import logging
import secrets
import time
import uuid
from typing import Optional

import redis.asyncio as aioredis

import config

logger = logging.getLogger("token-service.store")

_LOGIN_PREFIX = "login:"
_REVOKED_PREFIX = "revoked:"
_REFRESH_PREFIX = "rt:"
_CONSUMED_PREFIX = "rtused:"
_FAMILY_PREFIX = "rtfam:"


class RefreshTokenReuse(Exception):
    """A refresh token was presented twice — treated as theft."""

    def __init__(self, family: str):
        super().__init__(f"refresh token reuse detected for family {family}")
        self.family = family


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class SessionStore:
    def __init__(self, url: str = ""):
        self._redis = aioredis.from_url(
            url or config.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )

    async def ping(self) -> bool:
        try:
            return bool(await self._redis.ping())
        except Exception as exc:
            logger.error(f"Redis unreachable: {exc}")
            return False

    async def close(self) -> None:
        await self._redis.aclose()

    # ── Login state ───────────────────────────────
    async def create_login_state(self, data: dict) -> str:
        """Park the nonce and PKCE verifier for an in-flight login."""
        state = secrets.token_urlsafe(24)
        await self._redis.set(
            f"{_LOGIN_PREFIX}{state}",
            json.dumps(data),
            ex=config.LOGIN_STATE_TTL_SECONDS,
        )
        return state

    async def consume_login_state(self, state: str) -> Optional[dict]:
        """Fetch and delete in one step so a state cannot be replayed."""
        raw = await self._redis.getdel(f"{_LOGIN_PREFIX}{state}")
        return json.loads(raw) if raw else None

    # ── Refresh tokens ────────────────────────────
    async def issue_refresh(self, user: dict, family: str = "") -> str:
        token = secrets.token_urlsafe(32)
        family = family or uuid.uuid4().hex
        digest = _hash(token)
        ttl = config.REFRESH_EXPIRY_SECONDS

        payload = json.dumps(
            {"family": family, "user": user, "issued_at": int(time.time())}
        )

        pipe = self._redis.pipeline()
        pipe.set(f"{_REFRESH_PREFIX}{digest}", payload, ex=ttl)
        pipe.sadd(f"{_FAMILY_PREFIX}{family}", digest)
        pipe.expire(f"{_FAMILY_PREFIX}{family}", ttl)
        await pipe.execute()

        return token

    async def rotate_refresh(self, token: str) -> Optional[tuple[dict, str]]:
        """Exchange a refresh token for a new one.

        Returns ``(user, new_token)``, or None when the token is unknown or
        expired. Raises :class:`RefreshTokenReuse` when the token was already
        exchanged, after revoking the whole family.
        """
        digest = _hash(token)
        raw = await self._redis.getdel(f"{_REFRESH_PREFIX}{digest}")

        if raw is None:
            family = await self._redis.get(f"{_CONSUMED_PREFIX}{digest}")
            if family:
                await self.revoke_family(family)
                raise RefreshTokenReuse(family)
            return None

        entry = json.loads(raw)
        family = entry["family"]

        # Remember it long enough to still recognise a replay after rotation.
        pipe = self._redis.pipeline()
        pipe.set(
            f"{_CONSUMED_PREFIX}{digest}", family, ex=config.REFRESH_EXPIRY_SECONDS
        )
        pipe.srem(f"{_FAMILY_PREFIX}{family}", digest)
        await pipe.execute()

        new_token = await self.issue_refresh(entry["user"], family=family)
        return entry["user"], new_token

    async def revoke_refresh(self, token: str) -> bool:
        """Revoke a single refresh token (ordinary logout)."""
        digest = _hash(token)
        raw = await self._redis.getdel(f"{_REFRESH_PREFIX}{digest}")
        if raw is None:
            return False
        family = json.loads(raw)["family"]
        await self._redis.srem(f"{_FAMILY_PREFIX}{family}", digest)
        return True

    async def revoke_family(self, family: str) -> int:
        """Revoke every refresh token issued from one login."""
        family_key = f"{_FAMILY_PREFIX}{family}"
        digests = await self._redis.smembers(family_key)
        if not digests:
            await self._redis.delete(family_key)
            return 0

        pipe = self._redis.pipeline()
        for digest in digests:
            pipe.delete(f"{_REFRESH_PREFIX}{digest}")
        pipe.delete(family_key)
        await pipe.execute()

        logger.warning(f"Revoked {len(digests)} refresh token(s) in family {family}")
        return len(digests)

    async def revoke_all_for_account(self, account_id: str) -> int:
        """Revoke every session belonging to an account.

        Used when someone loses access mid-session — a resignation, a
        graduation, a suspected compromise. Scans rather than keeping an index,
        which is fine at faculty scale (thousands of sessions, not millions).
        """
        revoked = 0
        async for key in self._redis.scan_iter(match=f"{_REFRESH_PREFIX}*", count=500):
            raw = await self._redis.get(key)
            if not raw:
                continue
            entry = json.loads(raw)
            if entry.get("user", {}).get("account_id") == account_id:
                revoked += await self.revoke_family(entry["family"])
        if revoked:
            logger.warning(f"Revoked {revoked} refresh token(s) for {account_id}")
        return revoked

    # ── Access-token revocation ───────────────────
    async def mark_account_revoked(self, account_id: str) -> int:
        """Withdraw every access token issued to this account up to now.

        Stores the moment of revocation, not a list of tokens: /auth/verify
        compares it against the token's `iat`, so one key covers however many
        tokens are in flight and a token minted *after* this instant still
        works. That last part is required rather than convenient — M0 revokes
        on a role change specifically so a fresh token can be issued with the
        new roles, and a blanket account ban would deadlock that flow.

        The TTL is exactly TOKEN_EXPIRY_SECONDS. A token issued one second
        before this call expires one second before the mark does, so once the
        key is gone no token predating it can still be alive and the entry has
        nothing left to deny. Which is why this stays tiny: the deny list only
        ever holds accounts revoked within the last access-token lifetime.

        Returns the timestamp recorded, for the audit line.
        """
        now = int(time.time())
        await self._redis.set(
            f"{_REVOKED_PREFIX}{account_id}",
            now,
            ex=config.TOKEN_EXPIRY_SECONDS,
        )
        return now

    async def revoked_at(self, account_id: str) -> Optional[int]:
        """When this account's tokens were withdrawn, or None.

        Fails open on a Redis error, loudly. This runs on every request through
        the gateway, so a Redis blip that raised here would 401 the entire
        platform — trading a fifteen-minute revocation window for a total
        outage. The refresh path is already dead in that state (its tokens live
        in the same Redis), so the exposure is bounded by the access token's own
        expiry rather than open-ended.
        """
        try:
            raw = await self._redis.get(f"{_REVOKED_PREFIX}{account_id}")
        except Exception as exc:
            logger.error(
                f"deny-list unreachable, allowing request for {account_id}: {exc}"
            )
            return None
        return int(raw) if raw else None
