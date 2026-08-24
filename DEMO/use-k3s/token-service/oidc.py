"""Token Service — OIDC client for Keycloak.

Keycloak's job in this system is narrow and specific: send the user to Google,
receive the confirmed identity back, and keep the profile. It is an *identity
broker*. The ID token it hands us at the end of that flow is consumed here and
thrown away — no Sudhood service ever sees it, and none would accept it.
What services accept is the token this service mints afterwards.

    browser → /auth/login → Keycloak → Google → Keycloak → /auth/callback
                                                         → we verify, then
                                                           issue our own token

Three protections ride along, each covering a different attack:

* ``state``         — the response belongs to a login *we* started (CSRF)
* ``nonce``         — the ID token belongs to *this* login (replay)
* ``code_verifier`` — the code is redeemed by whoever requested it (PKCE)

Endpoints are built from Keycloak's documented realm paths rather than read
from its discovery document. Discovery returns whatever hostname Keycloak was
configured to advertise, which in a container deployment is the browser-facing
one — unusable for the back-channel calls this service makes. Constructing both
sets explicitly keeps the split honest instead of papering over it with URL
rewriting.
"""

import base64
import hashlib
import logging
import secrets
import time
from typing import Optional
from urllib.parse import urlencode

import httpx
from jose import jwt

import config

logger = logging.getLogger("token-service.oidc")


class AuthError(Exception):
    """Login failed upstream. The detail is for logs, never for the user."""


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def new_pkce_pair() -> tuple[str, str]:
    """Return ``(code_verifier, code_challenge)`` for one login attempt."""
    verifier = _b64url(secrets.token_bytes(48))
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge


# Keycloak realm endpoints. Front-channel URLs must be reachable by the
# browser; back-channel URLs must be reachable from inside the network.
def _front(path: str) -> str:
    return f"{config.OIDC_PUBLIC_ISSUER_URL}/protocol/openid-connect/{path}"


def _back(path: str) -> str:
    return f"{config.OIDC_ISSUER_URL}/protocol/openid-connect/{path}"


def authorization_url(state: str, nonce: str, code_challenge: str) -> str:
    params = {
        "client_id": config.OIDC_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": config.OIDC_REDIRECT_URI,
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    # Skip Keycloak's own login form and go straight to Google. Without this
    # the user sees an interstitial page whose only option is "Sign in with
    # Google", which just adds a click.
    if config.OIDC_IDP_HINT:
        params["kc_idp_hint"] = config.OIDC_IDP_HINT
    return f"{_front('auth')}?{urlencode(params)}"


def end_session_url(post_logout_redirect: str = "") -> str:
    """RP-initiated logout, so the Keycloak session ends with ours.

    Without this, revoking our refresh token still leaves the Keycloak session
    alive and the next login silently reuses it — which looks like logout never
    happened, especially on a shared machine.
    """
    params = {"client_id": config.OIDC_CLIENT_ID}
    if post_logout_redirect:
        params["post_logout_redirect_uri"] = post_logout_redirect
    return f"{_front('logout')}?{urlencode(params)}"


class OIDCClient:
    """Talks to Keycloak: redeems codes and verifies the ID tokens it returns."""

    def __init__(self) -> None:
        self._jwks: dict = {}
        self._fetched_at: int = 0

    async def _get_jwks(self, force: bool = False) -> dict:
        now = int(time.time())
        if self._jwks and not force and now - self._fetched_at < config.OIDC_JWKS_TTL:
            return self._jwks

        async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.get(_back("certs"))
            resp.raise_for_status()
            self._jwks = resp.json()
            self._fetched_at = now

        logger.info(f"Keycloak JWKS loaded: {len(self._jwks.get('keys', []))} keys")
        return self._jwks

    async def _key_for(self, kid: str) -> Optional[dict]:
        jwks = await self._get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            # Keycloak rotates realm keys; an unknown kid is far more often a
            # stale cache than a forged token, so refetch once before rejecting.
            jwks = await self._get_jwks(force=True)
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        return key

    async def ready(self) -> bool:
        """True when Keycloak is reachable and serving keys."""
        try:
            jwks = await self._get_jwks()
            return bool(jwks.get("keys"))
        except Exception as exc:
            logger.error(f"Keycloak not reachable: {exc}")
            return False

    async def exchange_code(self, code: str, code_verifier: str) -> tuple[str, str]:
        """Redeem an authorization code for Keycloak's ID and access tokens.

        Returns ``(id_token, access_token)``. The access token is not used to
        call anything — Keycloak's tokens are consumed here and discarded — but
        it is needed to check the ID token's ``at_hash``, which binds the two
        together. Returning only the ID token, as an earlier version did, made
        that check impossible and every login failed with
        "No access_token provided to compare against at_hash claim".
        """
        try:
            async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT_SECONDS) as client:
                resp = await client.post(
                    _back("token"),
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "client_id": config.OIDC_CLIENT_ID,
                        "client_secret": config.OIDC_CLIENT_SECRET,
                        "redirect_uri": config.OIDC_REDIRECT_URI,
                        "code_verifier": code_verifier,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except httpx.HTTPError as exc:
            raise AuthError(f"could not reach Keycloak token endpoint: {exc}") from exc

        if resp.status_code != 200:
            raise AuthError(
                f"code exchange returned {resp.status_code}: {resp.text[:200]}"
            )

        payload = resp.json()
        id_token = payload.get("id_token")
        if not id_token:
            raise AuthError("code exchange response contained no id_token")
        return id_token, payload.get("access_token", "")

    async def verify_id_token(
        self, id_token: str, expected_nonce: str, access_token: str = ""
    ) -> dict:
        """Verify signature, audience, issuer, nonce, and email confirmation."""
        try:
            kid = jwt.get_unverified_header(id_token).get("kid")
        except Exception as exc:
            raise AuthError(f"malformed ID token header: {exc}") from exc

        key = await self._key_for(kid) if kid else None
        if key is None:
            raise AuthError(f"no Keycloak key matches kid {kid}")

        # Accept either spelling of the issuer: which one Keycloak stamps
        # depends on its hostname configuration, and both identify the same realm.
        issuers = (config.OIDC_PUBLIC_ISSUER_URL, config.OIDC_ISSUER_URL)

        try:
            claims = jwt.decode(
                id_token,
                key,
                algorithms=["RS256"],
                audience=config.OIDC_CLIENT_ID,
                issuer=issuers,
                # at_hash ties this ID token to the access token issued beside
                # it. Passing the access token is what lets that be checked;
                # without it python-jose refuses the token outright rather than
                # skipping the claim.
                access_token=access_token or None,
                options={
                    "leeway": config.CLOCK_SKEW_SECONDS,
                    # Only meaningful when there is something to compare
                    # against. Both tokens came straight from the token
                    # endpoint over the cluster network here, never through the
                    # browser, so the binding this proves is a belt-and-braces
                    # check rather than the load-bearing one it is in the
                    # implicit flow.
                    "verify_at_hash": bool(access_token),
                },
            )
        except Exception as exc:
            raise AuthError(f"ID token rejected: {exc}") from exc

        if not secrets.compare_digest(str(claims.get("nonce", "")), expected_nonce):
            raise AuthError("ID token nonce does not match this login attempt")

        email = claims.get("email", "")
        if not email:
            raise AuthError("ID token carried no email")

        # Google asserts the address exists; email_verified asserts the user
        # proved control of it. Skipping this would let an unverified alias
        # impersonate a real institutional address.
        if not claims.get("email_verified"):
            raise AuthError(f"email not verified upstream: {email}")

        return claims
