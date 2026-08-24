"""Token Service — signing keys and JWKS.

Every private key found in ``JWT_KEYS_DIR`` is published as a public key in the
JWKS; exactly one of them signs new tokens. That split is what makes rotation
possible without downtime:

    1. set JWT_ACTIVE_KID to the *current* kid, restart
                                                   → signing key now pinned
    2. drop a new .pem into the keys dir, restart  → JWKS advertises both,
                                                     still signing with the old
    3. wait for verifiers' JWKS caches to expire   → everyone knows the new key
    4. set JWT_ACTIVE_KID to the new kid, restart  → new tokens use it
    5. wait out the access-token lifetime          → old tokens have expired
    6. delete the old .pem, restart                → rotation complete

Step 1 is not optional: with more than one key present and no JWT_ACTIVE_KID,
startup fails rather than picking one by filename order. Which key signs your
tokens should never depend on how the filesystem sorts.

Key ids are RFC 7638 JWK thumbprints, so a given key always yields the same
kid — restarting the service or adding a replica never invalidates tokens.
"""

import base64
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Optional

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt
from jose.constants import Algorithms

import config

logger = logging.getLogger("token-service.keys")

KEY_SIZE = 2048


class KeyError_(RuntimeError):
    """Raised when the signing keys cannot be loaded."""


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _int_b64url(value: int) -> str:
    return _b64url(value.to_bytes((value.bit_length() + 7) // 8, byteorder="big"))


def _thumbprint(n: str, e: str) -> str:
    """RFC 7638 JWK thumbprint — a stable id derived from the key material."""
    canonical = json.dumps(
        {"e": e, "kty": "RSA", "n": n}, separators=(",", ":"), sort_keys=True
    )
    return _b64url(hashlib.sha256(canonical.encode("ascii")).digest())


class SigningKey:
    """One RSA key pair, with its derived kid and public JWK."""

    def __init__(self, private_key, source: str):
        self.source = source
        self.private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        numbers = private_key.public_key().public_numbers()
        self.n = _int_b64url(numbers.n)
        self.e = _int_b64url(numbers.e)
        self.kid = _thumbprint(self.n, self.e)

    @property
    def public_jwk(self) -> dict:
        return {
            "kty": "RSA",
            "kid": self.kid,
            "use": "sig",
            "alg": "RS256",
            "n": self.n,
            "e": self.e,
        }


def _generate_key_file(path: Path) -> None:
    """Create a key on first run so a fresh checkout starts without ceremony."""
    key = rsa.generate_private_key(
        public_exponent=65537, key_size=KEY_SIZE, backend=default_backend()
    )
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    # Write with restrictive permissions from the start rather than chmod-ing
    # afterwards, which would leave a window where the key is world-readable.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(pem)
    logger.info(f"Generated signing key at {path}")


class KeyRing:
    """The set of keys this service verifies with, and the one it signs with."""

    def __init__(self, keys_dir: str, active_kid: str = ""):
        self._keys: dict[str, SigningKey] = {}
        self._active_kid = ""
        self._load(Path(keys_dir), active_kid)

    def _load(self, keys_dir: Path, active_kid: str) -> None:
        pem_files = sorted(keys_dir.glob("*.pem")) if keys_dir.is_dir() else []

        if not pem_files:
            default = keys_dir / "token-service.pem"
            try:
                _generate_key_file(default)
            except OSError as exc:
                raise KeyError_(
                    f"No keys in {keys_dir} and one could not be created: {exc}. "
                    f"Mount a volume there or generate a key with: "
                    f"openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:{KEY_SIZE} "
                    f"-out {default}"
                ) from exc
            pem_files = [default]

        for path in pem_files:
            try:
                private_key = serialization.load_pem_private_key(
                    path.read_bytes(), password=None, backend=default_backend()
                )
            except Exception as exc:
                raise KeyError_(f"Could not load signing key {path}: {exc}") from exc

            if not isinstance(private_key, rsa.RSAPrivateKey):
                raise KeyError_(f"{path} is not an RSA private key")
            if private_key.key_size < KEY_SIZE:
                raise KeyError_(
                    f"{path} is {private_key.key_size}-bit; "
                    f"minimum is {KEY_SIZE}-bit"
                )

            key = SigningKey(private_key, source=str(path))
            self._keys[key.kid] = key
            logger.info(f"Loaded signing key {key.kid} from {path.name}")

        if active_kid:
            if active_kid not in self._keys:
                raise KeyError_(
                    f"JWT_ACTIVE_KID={active_kid} is not among the loaded keys "
                    f"({', '.join(self._keys)}). Add the key file before pinning it."
                )
            self._active_kid = active_kid
        elif len(self._keys) == 1:
            self._active_kid = next(iter(self._keys))
        else:
            # Ambiguous on purpose: with several keys present, picking one
            # implicitly would make rotation depend on filesystem ordering.
            raise KeyError_(
                f"{len(self._keys)} keys found; set JWT_ACTIVE_KID to the one "
                f"that should sign new tokens ({', '.join(self._keys)})"
            )

        logger.info(f"Signing with kid {self._active_kid}")

    @property
    def active_kid(self) -> str:
        return self._active_kid

    def jwks(self) -> dict:
        """Public keys, for anyone verifying our tokens."""
        return {"keys": [key.public_jwk for key in self._keys.values()]}

    def public_jwk(self, kid: str) -> Optional[dict]:
        key = self._keys.get(kid)
        return key.public_jwk if key else None

    def sign(self, payload: dict) -> str:
        key = self._keys[self._active_kid]
        return jwt.encode(
            payload,
            key.private_pem,
            algorithm=Algorithms.RS256,
            headers={"kid": key.kid},
        )

    def verify(self, token: str) -> Optional[dict]:
        """Verify one of our own access tokens. Returns claims, or None."""
        try:
            kid = jwt.get_unverified_header(token).get("kid")
        except Exception as exc:
            logger.warning(f"Malformed token header: {exc}")
            return None

        jwk_data = self.public_jwk(kid) if kid else None
        if jwk_data is None:
            logger.warning(f"Token signed with unknown kid: {kid}")
            return None

        try:
            return jwt.decode(
                token,
                jwk_data,
                # Pinned, never read from the token header: otherwise an
                # attacker chooses the algorithm used to check their own token.
                algorithms=[Algorithms.RS256],
                audience=config.JWT_AUDIENCE,
                issuer=config.JWT_ISSUER,
                options={"leeway": config.CLOCK_SKEW_SECONDS},
            )
        except Exception as exc:
            logger.warning(f"Token verification failed: {exc}")
            return None
