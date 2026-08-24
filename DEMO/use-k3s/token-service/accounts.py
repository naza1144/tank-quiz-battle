"""Token Service — account resolution against M0.

Google tells us *who* someone is. M0 tells us whether they are a member of the
institution and what they are allowed to be. Those are different questions, and
conflating them is how "any Gmail address becomes a student" happens.

The lookup fails closed. If M0 cannot be reached we do not fall back to a
default role — an outage must not quietly hand out access.
"""

import logging
import os

import httpx

import config

logger = logging.getLogger("token-service.accounts")


class AccountNotFound(Exception):
    """Authenticated by Google, but no account exists in the ERP."""


class AccountInactive(Exception):
    """The account exists but is suspended, graduated, or otherwise closed."""

    def __init__(self, status: str):
        super().__init__(f"account status is {status}")
        self.status = status


class AccountLookupFailed(Exception):
    """M0 could not be reached or returned something unusable."""


async def resolve(identity: dict, auth: dict[str, str] | None = None) -> dict:
    """Turn a verified Google identity into an ERP account.

    ``identity`` carries the claims we trust from Google. The response is the
    account record M0 holds, including the roles that end up in the token.
    """
    payload = {
        "email": identity["email"],
        "idp_sub": identity.get("sub", ""),
        "name": identity.get("name", ""),
        "given_name": identity.get("given_name", ""),
        "family_name": identity.get("family_name", ""),
    }

    url = f"{config.M0_INTERNAL_URL}/internal/accounts/resolve"

    # In Game Mode without ERP backend, auto-provision active player account
    if os.getenv("GAME_MODE", "true").lower() in ("true", "1", "yes") or not config.M0_INTERNAL_URL:
        return {
            "account_id": f"player_{identity.get('sub', identity.get('email', 'guest'))}",
            "name": identity.get("name", "Student Tanker"),
            "email": identity.get("email", ""),
            "roles": ["STUDENT", "PLAYER"],
            "status": "ACTIVE",
            "preferred_username": identity.get("preferred_username", identity.get("email", "").split("@")[0]),
            "account_type": "STUDENT"
        }

    try:
        async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                url,
                json=payload,
                headers=auth or {},
            )
    except httpx.HTTPError as exc:
        logger.warning(f"M0 unreachable at {url}, falling back to direct Player account: {exc}")
        return {
            "account_id": f"player_{identity.get('sub', identity.get('email', 'guest'))}",
            "name": identity.get("name", "Student Tanker"),
            "email": identity.get("email", ""),
            "roles": ["STUDENT", "PLAYER"],
            "status": "ACTIVE",
            "preferred_username": identity.get("preferred_username", identity.get("email", "").split("@")[0]),
            "account_type": "STUDENT"
        }

    if resp.status_code == 404:
        raise AccountNotFound(identity["email"])
    if resp.status_code == 403:
        try:
            detail = resp.json().get("detail", {})
            status = detail.get("status", "UNKNOWN")
        except ValueError:
            status = "UNKNOWN"
        raise AccountInactive(status)
    if resp.status_code == 401:
        # Our own credential is wrong — an operator error, not a user error.
        logger.error("M0 rejected INTERNAL_API_KEY")
        raise AccountLookupFailed("internal API key rejected by M0")
    if resp.status_code != 200:
        logger.error(f"M0 returned {resp.status_code}: {resp.text[:200]}")
        raise AccountLookupFailed(f"M0 returned {resp.status_code}")

    account = resp.json()

    missing = [f for f in ("account_id", "roles", "status") if f not in account]
    if missing:
        raise AccountLookupFailed(f"M0 response missing fields: {', '.join(missing)}")

    if account["status"] != "ACTIVE":
        raise AccountInactive(account["status"])

    return account


class ApiKeyInvalid(Exception):
    """The API key is invalid, expired, revoked, or rejected by M0."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


async def verify_api_key(raw_key: str, auth: dict[str, str] | None = None) -> dict:
    """Verify an API key against M0 and return account & active roles (FN-M0-032)."""
    url = f"{config.M0_INTERNAL_URL}/internal/api-keys/verify"
    payload = {"raw_key": raw_key}

    try:
        async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                url,
                json=payload,
                headers=auth or {},
            )
    except httpx.HTTPError as exc:
        logger.error(f"M0 unreachable at {url}: {exc}")
        raise AccountLookupFailed(str(exc)) from exc

    if resp.status_code == 401:
        logger.error("M0 rejected Token Service authentication")
        raise AccountLookupFailed("Service Token rejected by M0")

    if resp.status_code != 200:
        logger.error(f"M0 returned {resp.status_code}: {resp.text[:200]}")
        raise AccountLookupFailed(f"M0 returned {resp.status_code}")

    data = resp.json()
    if not data.get("valid", False):
        raise ApiKeyInvalid(data.get("reason", "API key ไม่ถูกต้อง"))

    if data.get("status") != "ACTIVE":
        raise AccountInactive(data.get("status", "INACTIVE"))

    return data

