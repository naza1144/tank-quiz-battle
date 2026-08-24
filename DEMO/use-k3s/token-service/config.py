"""Token Service — configuration.

Everything the service needs comes from the environment. Values that would be
unsafe to guess at (Google credentials, the internal API key, the allowed email
domain) have no default and fail fast at import time instead of silently
starting up in an insecure state.
"""

import os
import sys


class ConfigError(RuntimeError):
    """Raised when a required setting is missing or unusable."""


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ConfigError(
            f"{name} is required. Copy .env.example to .env and fill it in."
        )
    return value


def _int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        raise ConfigError(f"{name} must be an integer, got {raw!r}")


def _csv(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SERVICE_PORT = _int("SERVICE_PORT", 8100)

# ── Token lifetimes ───────────────────────────────
# Access tokens are deliberately short. Revocation works by refusing to mint a
# new one, so the access token's lifetime is the worst-case delay between
# "this person lost access" and "the platform stops honouring their token".
TOKEN_EXPIRY_SECONDS = _int("TOKEN_EXPIRY_SECONDS", 900)  # 15 minutes
REFRESH_EXPIRY_SECONDS = _int("REFRESH_EXPIRY_SECONDS", 86400)  # 24 hours

# Tolerance for clock drift between the issuer and the verifying service.
CLOCK_SKEW_SECONDS = _int("CLOCK_SKEW_SECONDS", 60)

JWT_ISSUER = os.getenv("JWT_ISSUER", "sudhood-token-service")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "sudhood-services")

# ── Signing keys ──────────────────────────────────
JWT_KEYS_DIR = os.getenv("JWT_KEYS_DIR", "/keys")
# Which key signs new tokens. Empty means "the only key present"; during a
# rotation this pins the new one while the old key stays published for
# verification of tokens already in the wild.
JWT_ACTIVE_KID = os.getenv("JWT_ACTIVE_KID", "").strip()

# ── Upstream OIDC provider (Keycloak) ─────────────
# Keycloak brokers Google and holds the profile. We are one of its OIDC
# clients. Nothing Keycloak signs is trusted by Sudhood services — its ID
# token is consumed here, at login, and discarded.
#
# Two URLs, because they genuinely differ: containers reach Keycloak on the
# docker network, while the browser is redirected to a host-visible address.
# Keycloak stamps the public one into the `iss` claim, so that is what we
# validate against.
OIDC_ISSUER_URL = os.getenv(
    "OIDC_ISSUER_URL", "http://keycloak:8080/realms/sudhood"
).rstrip("/")
OIDC_PUBLIC_ISSUER_URL = os.getenv(
    "OIDC_PUBLIC_ISSUER_URL", "http://localhost:8080/realms/sudhood"
).rstrip("/")
OIDC_CLIENT_ID = os.getenv("OIDC_CLIENT_ID", "sudhood-token-service")
OIDC_CLIENT_SECRET = _required("OIDC_CLIENT_SECRET")
OIDC_REDIRECT_URI = os.getenv(
    "OIDC_REDIRECT_URI", f"http://localhost:{SERVICE_PORT}/auth/callback"
)
# Keycloak's identity provider alias for Google, so the user goes straight to
# the Google consent screen instead of a Keycloak login form with one button.
OIDC_IDP_HINT = os.getenv("OIDC_IDP_HINT", "google")
OIDC_JWKS_TTL = _int("OIDC_JWKS_TTL", 3600)
OIDC_DISCOVERY_TTL = _int("OIDC_DISCOVERY_TTL", 3600)

# ── Membership ────────────────────────────────────
# Authenticating proves identity, not membership. This is the first gate; M0
# decides the rest (is there an active account, what roles does it carry).
# Required, because leaving it empty would let any Google account in the world
# reach the account lookup.
ALLOWED_EMAIL_DOMAIN = _required("ALLOWED_EMAIL_DOMAIN").lower().lstrip("@")

# ── Downstream ────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
M0_INTERNAL_URL = os.getenv("M0_INTERNAL_URL", "http://m0-identity:8000").rstrip("/")
INTERNAL_API_KEY = _required("INTERNAL_API_KEY")

# ── ตัวตนของ service ──────────────────────────────
# One key per calling service, read from SERVICE_KEY_<NAME> in the environment.
# Discovered rather than listed: adding a service means adding a key to the
# Secret, and a list here would be a second place to remember.
#
# The caller sends only its key and never its name. Which key matched *is* the
# name, so a service cannot claim to be another one — a self-declared name is a
# name that can lie.
SERVICE_KEYS = {
    name[len("SERVICE_KEY_") :].lower().replace("_", "-"): value
    for name, value in os.environ.items()
    if name.startswith("SERVICE_KEY_") and value.strip()
}

# Deliberately a different audience from JWT_AUDIENCE, and this is the part
# that does the real work.
#
# Every user-facing verifier passes `audience=JWT_AUDIENCE` to jwt.decode, and
# PyJWT rejects a token whose `aud` does not match. A service token therefore
# cannot be presented to /api/v1/identity/me and be mistaken for a person —
# not because a rule says so, but because the library refuses it. The same
# token with the same audience as a user's would authenticate against every
# user endpoint in the platform and be denied only by whatever OPA happened to
# say about the role.
SERVICE_TOKEN_AUDIENCE = os.getenv("SERVICE_TOKEN_AUDIENCE", "sudhood-internal")

# Shorter than a person's 900s. Nobody is waiting on a login screen for this,
# so there is no reason to trade blast radius for convenience.
SERVICE_TOKEN_EXPIRY_SECONDS = _int("SERVICE_TOKEN_EXPIRY_SECONDS", 600)

# This service's own name, used when it calls a sibling. It signs its own
# tokens, so unlike every other caller it needs no key to present — the
# question "who is asking" is answered by the key that signs, not by a
# credential it has to be given.
SERVICE_NAME = os.getenv("SERVICE_NAME", "token-service")

# ── HTTP ──────────────────────────────────────────
ALLOWED_ORIGINS = _csv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
)
LOGIN_SUCCESS_REDIRECT = os.getenv("LOGIN_SUCCESS_REDIRECT", "").strip()

# How long an in-flight login (state/nonce) stays valid.
LOGIN_STATE_TTL_SECONDS = _int("LOGIN_STATE_TTL_SECONDS", 600)

HTTP_TIMEOUT_SECONDS = _int("HTTP_TIMEOUT_SECONDS", 10)

# ── Refresh token cookie ──────────────────────────
# The refresh token is the long-lived credential, so it is delivered as an
# httpOnly cookie: script on the page cannot read it, which takes it out of
# reach of an XSS bug. The short-lived access token is handed to the app
# directly, where it does need to be readable to set the Authorization header.
REFRESH_COOKIE_NAME = os.getenv("REFRESH_COOKIE_NAME", "sudhood_refresh")
# Off only for local HTTP development. Over plain HTTP a Secure cookie is
# never sent, so leaving this on would silently break login on localhost.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", "").strip()


def describe() -> dict:
    """Non-secret configuration summary, safe to log at startup."""
    return {
        "issuer": JWT_ISSUER,
        "audience": JWT_AUDIENCE,
        "allowed_email_domain": ALLOWED_EMAIL_DOMAIN,
        "access_token_ttl": TOKEN_EXPIRY_SECONDS,
        "refresh_token_ttl": REFRESH_EXPIRY_SECONDS,
        "keys_dir": JWT_KEYS_DIR,
        "active_kid": JWT_ACTIVE_KID or "(auto)",
        "oidc_issuer": OIDC_ISSUER_URL,
        "oidc_public_issuer": OIDC_PUBLIC_ISSUER_URL,
        "oidc_client_id": OIDC_CLIENT_ID,
        "redirect_uri": OIDC_REDIRECT_URI,
        "m0_url": M0_INTERNAL_URL,
    }


if __name__ == "__main__":  # `python config.py` validates the environment
    try:
        print(describe())
    except ConfigError as exc:
        print(f"config error: {exc}", file=sys.stderr)
        raise SystemExit(1)
