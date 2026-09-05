"""Server-side durable persistence for tenant state.

The demo can still run without a database, in which case ``main.py`` keeps
the state in memory. When ``NOAH_DATABASE_URL`` is present, this module stores
one tenant-scoped JSONB snapshot in PostgreSQL and keeps OAuth PKCE state in a
separate short-lived table. The database URL and the encrypted credential
envelopes never leave the API process.

This deliberately uses PostgreSQL directly instead of a hosted database
vendor-specific adapter. Nebius remains the inference provider; PostgreSQL is
only the persistence layer.
"""

from __future__ import annotations

import json
import os
from copy import deepcopy
from datetime import datetime, timezone
from threading import Lock
from typing import Any

try:
    import psycopg
except ImportError:  # Keep the free in-memory demo runnable without extras.
    psycopg = None  # type: ignore[assignment]


SCHEMA_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS noah_tenant_state (
        tenant_id text PRIMARY KEY,
        state jsonb NOT NULL,
        version bigint NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT noah_tenant_state_tenant_match
            CHECK (state->>'tenant_id' = tenant_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS noah_oauth_state (
        state text PRIMARY KEY,
        tenant_id text NOT NULL,
        code_verifier text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS noah_oauth_state_expires_at_idx
        ON noah_oauth_state (expires_at)
    """,
)


class PostgresTenantRepository:
    """Small synchronous PostgreSQL repository used only by the API process."""

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url if database_url is not None else os.getenv("NOAH_DATABASE_URL", "")
        self.database_url = self.database_url.strip()
        self._schema_ready = False
        self._schema_lock = Lock()

    @property
    def configured(self) -> bool:
        return bool(self.database_url)

    @property
    def driver_available(self) -> bool:
        return psycopg is not None

    @property
    def active(self) -> bool:
        return self.configured and self.driver_available

    def manifest(self) -> dict[str, Any]:
        return {
            "provider": "postgresql" if self.configured else "in-memory",
            "mode": "postgres-jsonb" if self.configured else "in-memory-demo",
            "configured": self.configured,
            "active": self.active,
            "driver": "psycopg3" if self.driver_available else "unavailable",
            "state_model": "tenant-jsonb-snapshot" if self.configured else "process-memory",
            "browser_access": "server-only",
            "secrets_in_browser": False,
        }

    def _connect(self):
        if not self.configured:
            raise RuntimeError("POSTGRES_NOT_CONFIGURED")
        if psycopg is None:
            raise RuntimeError("POSTGRES_DRIVER_UNAVAILABLE")
        try:
            return psycopg.connect(self.database_url, connect_timeout=10)
        except Exception as exc:
            raise RuntimeError("POSTGRES_UNAVAILABLE") from exc

    def ensure_schema(self) -> None:
        if not self.configured:
            return
        if self._schema_ready:
            return
        with self._schema_lock:
            if self._schema_ready:
                return
            try:
                with self._connect() as connection:
                    for statement in SCHEMA_STATEMENTS:
                        connection.execute(statement)
            except RuntimeError:
                raise
            except Exception as exc:
                raise RuntimeError("POSTGRES_SCHEMA_UNAVAILABLE") from exc
            self._schema_ready = True

    @staticmethod
    def _validate_tenant_state(tenant_id: str, state: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(state, dict) or str(state.get("tenant_id", "")) != tenant_id:
            raise RuntimeError("POSTGRES_TENANT_STATE_INVALID")
        try:
            json.dumps(state, ensure_ascii=False, separators=(",", ":"))
        except (TypeError, ValueError) as exc:
            raise RuntimeError("POSTGRES_TENANT_STATE_NOT_SERIALIZABLE") from exc
        return state

    @staticmethod
    def _decode_state(payload: Any) -> dict[str, Any]:
        if isinstance(payload, str):
            decoded = json.loads(payload)
        elif isinstance(payload, dict):
            decoded = payload
        else:
            raise RuntimeError("POSTGRES_TENANT_STATE_INVALID")
        if not isinstance(decoded, dict):
            raise RuntimeError("POSTGRES_TENANT_STATE_INVALID")
        return decoded

    def load_tenant(self, tenant_id: str) -> dict[str, Any] | None:
        """Load a tenant snapshot, or ``None`` when this tenant is new."""

        if not self.configured:
            return None
        self.ensure_schema()
        try:
            with self._connect() as connection:
                row = connection.execute(
                    "SELECT state FROM noah_tenant_state WHERE tenant_id = %s",
                    (tenant_id,),
                ).fetchone()
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError("POSTGRES_READ_FAILED") from exc
        if not row:
            return None
        decoded = self._decode_state(row[0])
        self._validate_tenant_state(tenant_id, decoded)
        return deepcopy(decoded)

    def save_tenant(self, tenant_id: str, state: dict[str, Any]) -> None:
        """Upsert a complete tenant snapshot atomically."""

        if not self.configured:
            return
        state = self._validate_tenant_state(tenant_id, state)
        payload = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
        self.ensure_schema()
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO noah_tenant_state (tenant_id, state, version, updated_at)
                    VALUES (%s, %s::jsonb, 1, now())
                    ON CONFLICT (tenant_id) DO UPDATE SET
                        state = EXCLUDED.state,
                        version = noah_tenant_state.version + 1,
                        updated_at = now()
                    """,
                    (tenant_id, payload),
                )
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError("POSTGRES_WRITE_FAILED") from exc

    def save_oauth_state(self, state: str, context: dict[str, Any]) -> None:
        """Persist one PKCE context so a callback survives an API restart."""

        if not self.configured:
            return
        tenant_id = str(context.get("tenant_id", ""))
        code_verifier = str(context.get("code_verifier", ""))
        expires_at = context.get("expires_at")
        if not tenant_id or not code_verifier or not isinstance(expires_at, datetime):
            raise RuntimeError("POSTGRES_OAUTH_STATE_INVALID")
        self.ensure_schema()
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO noah_oauth_state (state, tenant_id, code_verifier, expires_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (state) DO UPDATE SET
                        tenant_id = EXCLUDED.tenant_id,
                        code_verifier = EXCLUDED.code_verifier,
                        expires_at = EXCLUDED.expires_at
                    """,
                    (state, tenant_id, code_verifier, expires_at),
                )
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError("POSTGRES_OAUTH_STATE_WRITE_FAILED") from exc

    def consume_oauth_state(self, state: str) -> dict[str, Any] | None:
        """Read and delete a PKCE context in one transaction."""

        if not self.configured:
            return None
        self.ensure_schema()
        try:
            with self._connect() as connection:
                row = connection.execute(
                    """
                    SELECT tenant_id, code_verifier, expires_at
                    FROM noah_oauth_state
                    WHERE state = %s
                    FOR UPDATE
                    """,
                    (state,),
                ).fetchone()
                if not row:
                    return None
                connection.execute("DELETE FROM noah_oauth_state WHERE state = %s", (state,))
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError("POSTGRES_OAUTH_STATE_READ_FAILED") from exc
        expires_at = row[2]
        if not isinstance(expires_at, datetime):
            try:
                expires_at = datetime.fromisoformat(str(expires_at))
            except ValueError as exc:
                raise RuntimeError("POSTGRES_OAUTH_STATE_INVALID") from exc
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return {"tenant_id": row[0], "code_verifier": row[1], "expires_at": expires_at}


def persistence_manifest(repository: PostgresTenantRepository | None = None) -> dict[str, Any]:
    """Return a safe runtime description without URLs, keys, or tokens."""

    return (repository or PostgresTenantRepository()).manifest()
