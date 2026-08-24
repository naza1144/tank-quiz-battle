"""Token Service — the only issuer of tokens Sudhood services trust.

Roles in the login path:

    Keycloak       brokers Google and stores the profile. Issues nothing this
                   platform trusts; its ID token dies here at the callback.
    Token Service  decides membership (via M0) and mints the platform's JWT.
    Traefik        verifies that JWT at the gateway.

Login:

    GET  /auth/login      → redirect to Keycloak (→ Google)
    GET  /auth/callback   → verify identity, resolve account, issue tokens
    POST /auth/refresh    → rotate refresh token, issue a new access token
    POST /auth/logout     → revoke the refresh token

Verification:

    GET  /.well-known/jwks.json   public keys, for offline verification
    GET  /auth/verify             Traefik forwardAuth target
"""

import logging
import secrets
import sys
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional
from urllib.parse import quote, urlencode

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from fastapi.responses import JSONResponse, PlainTextResponse, RedirectResponse
from pydantic import BaseModel

import accounts
import config
import observability
import oidc
from keys import KeyRing
from store import RefreshTokenReuse, SessionStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("token-service")

# Auth events are worth their own logger so they can be shipped to the M10
# audit service without dragging along ordinary application chatter.
audit = logging.getLogger("token-service.audit")

keyring: KeyRing = None  # set during startup
store: SessionStore = None
oidc_client: oidc.OIDCClient = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global keyring, store, oidc_client
    keyring = KeyRing(config.JWT_KEYS_DIR, config.JWT_ACTIVE_KID)
    store = SessionStore()
    oidc_client = oidc.OIDCClient()
    logger.info(f"Token Service starting: {config.describe()}")
    if not await store.ping():
        # Loud, but not fatal: Redis may still be coming up. /ready stays
        # false until it answers, so the gateway will not send traffic here.
        logger.error("Redis is not answering yet — /ready will report unhealthy")
    yield
    await store.close()


app = FastAPI(
    title="Sudhood Token Service",
    description=(
        "Issues every JWT the Sudhood platform accepts. Authentication is "
        "brokered through Keycloak (which in turn uses Google); authorization "
        "data comes from M0."
    ),
    version="1.0.0",
    docs_url="/auth/docs",
    redoc_url="/auth/redoc",
    openapi_url="/auth/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

# After the middleware stack is assembled, so the timings recorded include
# everything the request actually passes through rather than the handler alone.
observability.instrument(app, "token-service")


# ── Models ────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = config.TOKEN_EXPIRY_SECONDS
    refresh_token: Optional[str] = None
    refresh_expires_in: int = config.REFRESH_EXPIRY_SECONDS


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


class VerifyRequest(BaseModel):
    token: str


class VerifyResponse(BaseModel):
    active: bool
    sub: Optional[str] = None
    email: Optional[str] = None
    preferred_username: Optional[str] = None
    name: Optional[str] = None
    roles: list[str] = []
    account_type: Optional[str] = None
    dept_id: Optional[str] = None
    api_key_id: Optional[str] = None
    exp: Optional[int] = None


class RevokeRequest(BaseModel):
    account_id: str
    reason: str = ""


class ApiKeyExchangeRequest(BaseModel):
    grant_type: str = "api_key"
    api_key: Optional[str] = None


class ApiKeyTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ── Token issuance ────────────────────────────────
def issue_access_token(user: dict) -> str:
    """Mint an access token carrying the ERP identity, not the Google one.

    `sub` is M0's account_id on purpose: it is the identifier every other
    service already keys its data on. Putting the identity provider's opaque
    id there instead would force all eleven services to translate it on every
    request.
    """
    now = int(time.time())
    payload = {
        "iss": config.JWT_ISSUER,
        "sub": user["account_id"],
        "aud": config.JWT_AUDIENCE,
        "iat": now,
        "nbf": now,
        "exp": now + config.TOKEN_EXPIRY_SECONDS,
        "jti": uuid.uuid4().hex,
        "email": user.get("email", ""),
        "preferred_username": user.get("preferred_username", ""),
        "name": user.get("name", ""),
        "roles": user.get("roles", []),
        "account_type": user.get("account_type", ""),
        "dept_id": user.get("dept_id", ""),
        # Kept for traceability back to the identity provider; services should
        # key on `sub`, never on this.
        "idp_sub": user.get("idp_sub", ""),
        "api_key_id": user.get("api_key_id", ""),
    }
    return keyring.sign(payload)


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=config.REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=config.REFRESH_EXPIRY_SECONDS,
        httponly=True,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,
        domain=config.COOKIE_DOMAIN or None,
        path="/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=config.REFRESH_COOKIE_NAME,
        domain=config.COOKIE_DOMAIN or None,
        path="/auth",
    )


def verify_own_service_token(token: str) -> Optional[str]:
    """Verify a service token this service issued, without a network call.

    token-service holds the signing keys, so fetching its own JWKS over HTTP to
    check its own signature would be a round trip to itself — and one that
    fails while it is still starting up.
    """
    try:
        kid = jwt.get_unverified_header(token).get("kid")
    except Exception as exc:
        audit.warning(f"service_token.malformed {exc}")
        return None

    key = keyring.public_jwk(kid) if kid else None
    if key is None:
        audit.warning(f"service_token.unknown_kid {kid!r}")
        return None

    try:
        claims = jwt.decode(
            token,
            # The JWK dict as-is. python-jose takes one directly, which is
            # also why m0 and m10 hand it straight to jwt.decode. PyJWT would
            # not — and an `import jwt` here crash-looped the pod until the
            # library the rest of this service uses was the one imported.
            key,
            # Pinned. Reading the algorithm out of the token would let the
            # token choose how it gets checked.
            algorithms=["RS256"],
            audience=config.SERVICE_TOKEN_AUDIENCE,
            issuer=config.JWT_ISSUER,
        )
    except Exception as exc:
        audit.warning(f"service_token.rejected {exc}")
        return None

    sub = str(claims.get("sub", ""))
    if not sub.startswith("service:"):
        audit.warning(f"service_token.bad_sub {sub!r}")
        return None
    return sub[len("service:") :]


def require_internal_key(
    authorization: str = Header(default=""),
) -> str:
    """Guard for service-to-service endpoints that no browser should reach.

    Uses asymmetric Service JWT (Step 6). Returns the authenticated service name.
    """
    if authorization[:7].lower() == "bearer ":
        name = verify_own_service_token(authorization[7:].strip())
        if name:
            return name

    raise HTTPException(
        status_code=401,
        detail="Valid Service Token (Authorization: Bearer ...) required",
    )


def _header_safe(value: str) -> str:
    """Percent-encode a header value so non-ASCII survives the trip.

    HTTP header values are latin-1. Thai names are not, and every account in
    this system has one — passing them through raw raises UnicodeEncodeError
    and turns a working login into a 500. Consumers decode with
    urllib.parse.unquote.
    """
    return quote(value or "", safe="")


# ── Health ────────────────────────────────────────
@app.get("/health")
async def health():
    """Liveness: the process is up. Says nothing about dependencies."""
    return {"status": "ok", "service": "token-service"}


@app.get("/ready")
async def ready():
    """Readiness: can this instance actually complete a login?

    A replica that cannot reach Redis or Keycloak must not receive traffic —
    it would fail every request in a way that looks like the user's fault.
    """
    checks = {
        "keys": bool(keyring and keyring.active_kid),
        "redis": await store.ping(),
        "keycloak": await oidc_client.ready(),
    }
    healthy = all(checks.values())
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={"status": "ok" if healthy else "unhealthy", "checks": checks},
    )


@app.get("/.well-known/jwks.json")
async def jwks(response: Response):
    """Public keys. Cached briefly so rotation propagates within minutes."""
    response.headers["Cache-Control"] = "public, max-age=300"
    return keyring.jwks()


# ── Login ─────────────────────────────────────────
@app.get("/auth/login")
async def login(request: Request, redirect_uri: Optional[str] = None):
    """Start the login: redirect to Keycloak, which redirects on to Google."""
    referer = request.headers.get("referer") or "/"
    target_redirect = redirect_uri or referer
    verifier, challenge = oidc.new_pkce_pair()
    nonce = secrets.token_urlsafe(24)
    state = await store.create_login_state({
        "nonce": nonce,
        "verifier": verifier,
        "return_to": target_redirect
    })
    return RedirectResponse(oidc.authorization_url(state, nonce, challenge))


@app.get("/auth/callback")
async def callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
):
    """Keycloak's redirect back: verify the identity, then issue our tokens."""
    if error:
        logger.warning(f"Upstream returned error={error} ({error_description})")
        raise HTTPException(status_code=401, detail="Authentication failed")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    pending = await store.consume_login_state(state)
    if pending is None:
        # Either forged, already used, or the user sat on the consent screen
        # past the TTL. Indistinguishable from here, and all are a restart.
        logger.warning("Callback with unknown or expired state")
        raise HTTPException(status_code=400, detail="Login expired, please try again")

    try:
        id_token, upstream_access_token = await oidc_client.exchange_code(
            code, pending["verifier"]
        )
        claims = await oidc_client.verify_id_token(
            id_token, pending["nonce"], upstream_access_token
        )
    except oidc.AuthError as exc:
        logger.warning(f"Authentication failed: {exc}")
        raise HTTPException(status_code=401, detail="Authentication failed")

    email = claims["email"].lower()

    # First gate: institutional domain. Cheap, and keeps unknown addresses
    # from reaching the account lookup at all.
    if not email.endswith(f"@{config.ALLOWED_EMAIL_DOMAIN}"):
        audit.warning(f"login.rejected.domain email={email}")
        raise HTTPException(
            status_code=403,
            detail=f"Only {config.ALLOWED_EMAIL_DOMAIN} accounts may sign in",
        )

    # Second gate: M0 decides whether this person is a member, and what of.
    try:
        account = await accounts.resolve(
            {**claims, "email": email}, auth=own_auth_header()
        )
    except accounts.AccountNotFound:
        audit.warning(f"login.rejected.no_account email={email}")
        raise HTTPException(
            status_code=403, detail="No Sudhood account exists for this address"
        )
    except accounts.AccountInactive as exc:
        audit.warning(f"login.rejected.inactive email={email} status={exc.status}")
        # PENDING is the one status the person can do something about, and the
        # one they will actually hit — it means the account was just created by
        # this very sign-in and is waiting on an administrator. Saying "this
        # account is pending" leaves them guessing whether to try again.
        if exc.status == "PENDING":
            raise HTTPException(
                status_code=403,
                detail=(
                    "บัญชีของคุณถูกสร้างแล้ว รอผู้ดูแลระบบอนุมัติและกำหนดสิทธิ์ "
                    "— Your account has been created and is awaiting approval."
                ),
            )
        raise HTTPException(
            status_code=403, detail=f"This account is {exc.status.lower()}"
        )
    except accounts.AccountLookupFailed as exc:
        # Fail closed: an M0 outage must not hand out a default role.
        logger.error(f"Account lookup failed for {email}: {exc}")
        raise HTTPException(
            status_code=503, detail="Account service unavailable, please retry"
        )

    user = {
        "account_id": account["account_id"],
        "email": email,
        "preferred_username": account.get("preferred_username") or email.split("@")[0],
        "name": account.get("name", ""),
        "roles": account.get("roles", []),
        "account_type": account.get("type", ""),
        "dept_id": account.get("dept_id", ""),
        "idp_sub": claims.get("sub", ""),
    }

    access_token = issue_access_token(user)
    refresh_token = await store.issue_refresh(user)

    audit.info(
        f"login.success account_id={user['account_id']} email={email} "
        f"roles={user['roles']}"
    )

    return_to = pending.get("return_to")
    if return_to and not return_to.endswith("/auth/login") and not "/auth/login?" in return_to:
        base_return = return_to.split("#")[0].rstrip("/")
        if not base_return.startswith("http"):
            base_url = (config.LOGIN_SUCCESS_REDIRECT or "https://sudhood.192-168-50-96.sslip.io/").rstrip("/")
            base_return = f"{base_url}{base_return}"
        redirect = RedirectResponse(
            f"{base_return}/#"
            f"{urlencode({'access_token': access_token, 'expires_in': config.TOKEN_EXPIRY_SECONDS})}"
        )
        _set_refresh_cookie(redirect, refresh_token)
        return redirect

    if config.LOGIN_SUCCESS_REDIRECT:
        base_url = config.LOGIN_SUCCESS_REDIRECT.rstrip("/")
        redirect = RedirectResponse(
            f"{base_url}/#"
            f"{urlencode({'access_token': access_token, 'expires_in': config.TOKEN_EXPIRY_SECONDS})}"
        )
        _set_refresh_cookie(redirect, refresh_token)
        return redirect

    response = JSONResponse(
        content=TokenResponse(
            access_token=access_token, refresh_token=refresh_token
        ).model_dump()
    )
    _set_refresh_cookie(response, refresh_token)
    return response


@app.post("/auth/token", response_model=ApiKeyTokenResponse)
async def exchange_api_key(
    body: Optional[ApiKeyExchangeRequest] = None,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """แลกเปลี่ยน API Credentials Key เป็น Access Token (FN-M0-032 & FN-M0-033).

    รองรับการส่งคีย์ผ่าน JSON body `{"grant_type": "api_key", "api_key": "sdh_..."}`
    หรือ Header `X-API-Key: sdh_...`
    ไม่ออก Refresh Token ให้ตามข้อกำหนด FN-M0-032
    """
    if body and body.grant_type != "api_key":
        audit.warning(f"api_key.rejected.unsupported_grant_type grant_type={body.grant_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported grant_type '{body.grant_type}', must be 'api_key'",
        )

    raw_key = ""
    if body and body.api_key:
        raw_key = body.api_key.strip()
    elif x_api_key:
        raw_key = x_api_key.strip()

    if not raw_key:
        audit.warning("api_key.rejected.missing_key")
        raise HTTPException(
            status_code=400,
            detail="API key is required in request body or X-API-Key header",
        )

    try:
        data = await accounts.verify_api_key(raw_key, auth=own_auth_header())
    except accounts.ApiKeyInvalid as exc:
        audit.warning(f"api_key.rejected.invalid reason={exc.reason}")
        raise HTTPException(status_code=401, detail=exc.reason)
    except accounts.AccountInactive as exc:
        audit.warning(f"api_key.rejected.inactive status={exc.status}")
        raise HTTPException(
            status_code=403, detail=f"This account is {exc.status.lower()}"
        )
    except accounts.AccountLookupFailed as exc:
        logger.error(f"API key verification failed at M0: {exc}")
        raise HTTPException(
            status_code=503, detail="Account service unavailable, please retry"
        )

    user = {
        "account_id": data["account_id"],
        "email": data.get("email", ""),
        "preferred_username": (data.get("email") or "").split("@")[0],
        "name": data.get("name", ""),
        "roles": data.get("roles", []),
        "account_type": data.get("account_type", ""),
        "dept_id": data.get("dept_id", ""),
        "api_key_id": data.get("key_id", ""),
    }

    access_token = issue_access_token(user)

    audit.info(
        f"api_key.exchange.success account_id={user['account_id']} "
        f"key_id={data.get('key_id')} roles={user['roles']}"
    )

    return ApiKeyTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=config.TOKEN_EXPIRY_SECONDS,
    )


@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh(request: Request, body: RefreshRequest):
    """Exchange a refresh token for a new pair, rotating the refresh token."""
    token = body.refresh_token or request.cookies.get(config.REFRESH_COOKIE_NAME, "")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token supplied")

    try:
        rotated = await store.rotate_refresh(token)
    except RefreshTokenReuse as exc:
        # A token that was already exchanged came back. Either it was stolen,
        # or a client is retrying badly — both are handled by ending every
        # session from that login and making the user sign in again.
        audit.error(f"refresh.reuse_detected family={exc.family}")
        response = JSONResponse(
            status_code=401,
            content={"detail": "Session ended for security reasons, please sign in"},
        )
        _clear_refresh_cookie(response)
        return response

    if rotated is None:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user, new_refresh = rotated
    body_out = TokenResponse(
        access_token=issue_access_token(user), refresh_token=new_refresh
    )
    audit.info(f"refresh.success account_id={user['account_id']}")

    response = JSONResponse(content=body_out.model_dump())
    _set_refresh_cookie(response, new_refresh)
    return response


@app.post("/auth/logout")
async def logout(request: Request, body: RefreshRequest):
    """Revoke the refresh token. Access tokens expire on their own."""
    token = body.refresh_token or request.cookies.get(config.REFRESH_COOKIE_NAME, "")
    revoked = await store.revoke_refresh(token) if token else False
    audit.info(f"logout revoked={revoked}")

    response = JSONResponse(
        content={
            "revoked": revoked,
            # Ending our session leaves the Keycloak session alive; send the
            # browser here too or the next login silently reuses it.
            "end_session_url": oidc.end_session_url(config.LOGIN_SUCCESS_REDIRECT),
        }
    )
    _clear_refresh_cookie(response)
    return response


# ── Verification ──────────────────────────────────
async def _reject_if_revoked(claims: dict) -> None:
    """Refuse a token that was valid when signed but has since been withdrawn.

    Signature checking alone cannot answer this. A JWT states what was true at
    the moment it was issued, and "this account may still act" stops being true
    the instant someone is suspended — so the only way to honour a revocation
    inside the token's lifetime is to ask something that knows about it.

    The comparison is `iat` against the revocation mark rather than a lookup of
    this specific token, which keeps it one GET regardless of how many tokens
    the account holds, and lets a token minted after the revocation through. M0
    depends on that: it revokes on a role change precisely so the next token
    carries the new roles.

    Cost is one Redis GET on every authenticated request through the gateway,
    against a claim that used to be made here — that verification was pure
    signature checking and therefore free. That claim bought fifteen minutes of
    stale authority, which is what FN-M0 §acceptance ("within 60 seconds")
    rules out.
    """
    account_id = claims.get("sub", "")
    if not account_id:
        return

    revoked = await store.revoked_at(account_id)
    if revoked is None:
        return

    # `iat` missing means a token this service did not mint the normal way.
    # Treating it as older than any revocation is the safe reading.
    issued = int(claims.get("iat", 0))
    if issued < revoked:
        audit.warning(
            f"verify.rejected account_id={account_id} reason=revoked "
            f"iat={issued} revoked_at={revoked}"
        )
        raise HTTPException(status_code=401, detail="Token has been revoked")


@app.post("/auth/verify", response_model=VerifyResponse)
async def verify_post(body: VerifyRequest):
    claims = keyring.verify(body.token)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    await _reject_if_revoked(claims)
    return VerifyResponse(
        active=True,
        sub=claims.get("sub"),
        email=claims.get("email"),
        preferred_username=claims.get("preferred_username"),
        name=claims.get("name"),
        roles=claims.get("roles", []),
        account_type=claims.get("account_type"),
        dept_id=claims.get("dept_id"),
        api_key_id=claims.get("api_key_id"),
        exp=claims.get("exp"),
    )


@app.get("/auth/verify")
async def verify_forward_auth(request: Request):
    """Traefik forwardAuth target.

    Signature check plus one deny-list lookup. Still cheap enough to sit in
    front of every request — no database, no network hop outside the cluster —
    and it is what makes a revocation take effect on the next request instead of
    whenever the token happens to expire.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    claims = keyring.verify(auth_header[7:])
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    await _reject_if_revoked(claims)

    # Values are percent-encoded: names here are Thai, and raw UTF-8 in a
    # header is not representable. Services should treat these as a convenience
    # and the verified token as the source of truth.
    return PlainTextResponse(
        content="Authenticated",
        headers={
            "X-Forwarded-User": _header_safe(claims.get("sub", "")),
            "X-Forwarded-Email": _header_safe(claims.get("email", "")),
            "X-Forwarded-Roles": _header_safe(",".join(claims.get("roles", []))),
            "X-Forwarded-Name": _header_safe(claims.get("name", "")),
            # claim นี้มีในโทเคนอยู่แล้วและ middleware ที่ gateway ก็รอรับอยู่แล้ว
            # ก่อนหน้านี้ไม่ได้ส่งจึงไม่มีอะไรมาให้คัดลอก — ต่างจาก Groups ที่ตัด
            # ออกจากรายการไปเพราะไม่มี claim ให้ส่งตั้งแต่ต้น
            "X-Forwarded-Preferred-Username": _header_safe(
                claims.get("preferred_username", "")
            ),
            "X-Forwarded-Account-Type": _header_safe(claims.get("account_type", "")),
            "X-Forwarded-Dept": _header_safe(claims.get("dept_id", "")),
        },
    )


# ── Service identity ──────────────────────────────
class ServiceTokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    subject: str


def identify_service(x_service_key: str = Header(default="")) -> str:
    """Return the name of the service that presented this key.

    The caller sends a key and nothing else. Which key matched *is* the name —
    a caller that could name itself could name itself anything, and the whole
    point of this endpoint is a name that cannot be claimed.

    Every key is compared even after one matches. `compare_digest` is constant
    time for a single comparison, but returning early makes the total time
    depend on where in the map the match was, which leaks the position of the
    caller's key. The leak is small and the fix is one line.
    """
    if not x_service_key:
        raise HTTPException(status_code=401, detail="X-Service-Key required")

    matched = ""
    for name, key in config.SERVICE_KEYS.items():
        if secrets.compare_digest(x_service_key, key):
            matched = name

    if not matched:
        # Same message whether no key was configured for that service or the
        # key was wrong. Telling a caller which of the two it was is telling it
        # which service names exist.
        audit.warning("service_token.rejected reason=unknown_key")
        raise HTTPException(status_code=401, detail="Unknown service key")

    return matched


def mint_service_token(service: str) -> str:
    """Sign a token that names `service`. Shared by the endpoint and by this
    service's own outbound calls — one definition of what a service token is."""
    now = int(time.time())
    return keyring.sign(
        {
            "iss": config.JWT_ISSUER,
            # `service:` prefix so the two kinds of subject cannot be confused.
            # A person's `sub` is M0's account_id, which is a UUID; without a
            # prefix the difference is a convention nobody checks.
            "sub": f"service:{service}",
            # Not JWT_AUDIENCE. Every user-facing verifier passes that audience
            # to jwt.decode, which means this token is refused at
            # /api/v1/identity/me — refused by the library, not by a rule
            # someone has to remember to write.
            "aud": config.SERVICE_TOKEN_AUDIENCE,
            "iat": now,
            "nbf": now,
            "exp": now + config.SERVICE_TOKEN_EXPIRY_SECONDS,
            "jti": uuid.uuid4().hex,
            "roles": ["service"],
        }
    )


def own_auth_header() -> dict[str, str]:
    """Credentials for this service's own outbound calls (Step 6).

    Token-service holds the signing key, so it mints its own Service JWT.
    """
    return {"Authorization": f"Bearer {mint_service_token(config.SERVICE_NAME)}"}


@app.post("/auth/service-token", response_model=ServiceTokenResponse)
async def service_token(service: str = Depends(identify_service)):
    """Exchange a service's own key for a short-lived token that names it.

    This is what replaces `INTERNAL_API_KEY`. The difference is not that a
    token is harder to steal — it is that the callee learns *who* called. A
    shared string can only ever support "somebody with the key".

    Nothing calls this yet. The callees still accept `X-Internal-Key`, and they
    have to keep accepting it until every caller has moved: the three services
    call each other in a cycle, so there is no single moment when all of them
    could switch. See ../SERVICE_IDENTITY.md.
    """
    # Logged at info, not debug. "which service asked for a token, and when" is
    # the record that did not exist before — it is the reason for the endpoint.
    audit.info(f"service_token.issued service={service}")

    return ServiceTokenResponse(
        access_token=mint_service_token(service),
        expires_in=config.SERVICE_TOKEN_EXPIRY_SECONDS,
        subject=f"service:{service}",
    )


# ── Internal ──────────────────────────────────────
@app.post("/internal/revoke", dependencies=[Depends(require_internal_key)])
async def revoke_account_sessions(body: RevokeRequest):
    """End every session for an account, immediately.

    This is what makes "revoke access now" real: M0 calls it when someone is
    suspended, graduates, or leaves.

    Two things happen, and both are needed. Deleting the refresh tokens closes
    renewal. Writing the revocation mark closes the tokens already out there —
    without it those keep working until they expire, up to fifteen minutes, and
    the sixty-second acceptance criterion is missed by a factor of fifteen.
    """
    count = await store.revoke_all_for_account(body.account_id)
    revoked_at = await store.mark_account_revoked(body.account_id)
    audit.warning(
        f"revoke.account account_id={body.account_id} sessions={count} "
        f"revoked_at={revoked_at} reason={body.reason or 'unspecified'}"
    )
    # revoked_at is returned so the caller can log the same instant the deny
    # list holds, rather than its own clock reading of "about now".
    return {
        "account_id": body.account_id,
        "sessions_revoked": count,
        "revoked_at": revoked_at,
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app", host="0.0.0.0", port=config.SERVICE_PORT, log_level="info"
    )
