"""Server-only AES-GCM envelope for OAuth and connector secrets.

The API never serializes these values into bootstrap responses. The optional
dependency is pinned in ``requirements.txt`` for connected deployments; a
missing key or library fails closed instead of storing plaintext tokens.
"""

from __future__ import annotations

import base64
import os
import secrets


def _key() -> bytes:
    encoded = os.getenv("NOAH_CONNECTION_ENCRYPTION_KEY", "")
    if not encoded:
        raise RuntimeError("CONNECTION_ENCRYPTION_KEY_NOT_CONFIGURED")
    try:
        key = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
    except Exception as exc:  # pragma: no cover - defensive boundary
        raise RuntimeError("CONNECTION_ENCRYPTION_KEY_INVALID") from exc
    if len(key) not in {16, 24, 32}:
        raise RuntimeError("CONNECTION_ENCRYPTION_KEY_INVALID")
    return key


def encrypt_secret(plaintext: str, *, associated_data: str = "") -> str:
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError as exc:  # pragma: no cover - dependency guard
        raise RuntimeError("CRYPTOGRAPHY_NOT_INSTALLED") from exc
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(_key()).encrypt(nonce, plaintext.encode("utf-8"), associated_data.encode("utf-8"))
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_secret(envelope: str, *, associated_data: str = "") -> str:
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError as exc:  # pragma: no cover - dependency guard
        raise RuntimeError("CRYPTOGRAPHY_NOT_INSTALLED") from exc
    raw = base64.urlsafe_b64decode(envelope.encode("ascii"))
    if len(raw) <= 12:
        raise RuntimeError("SECRET_ENVELOPE_INVALID")
    plaintext = AESGCM(_key()).decrypt(raw[:12], raw[12:], associated_data.encode("utf-8"))
    return plaintext.decode("utf-8")
