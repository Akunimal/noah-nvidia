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
from datetime import date, datetime, timedelta, timezone
from threading import Lock
from typing import Any
from uuid import uuid4

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
    """
    CREATE TABLE IF NOT EXISTS noah_public_usage_total (
        source text NOT NULL,
        bucket_key text NOT NULL,
        consumed bigint NOT NULL DEFAULT 0,
        provider_exhausted boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (source, bucket_key),
        CONSTRAINT noah_public_usage_total_nonnegative
            CHECK (consumed >= 0)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS noah_public_usage_daily (
        source text NOT NULL,
        bucket_key text NOT NULL,
        usage_date date NOT NULL,
        consumed bigint NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (source, bucket_key, usage_date),
        CONSTRAINT noah_public_usage_daily_nonnegative
            CHECK (consumed >= 0)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS noah_public_usage_reservations (
        reservation_id text PRIMARY KEY,
        source text NOT NULL,
        bucket_key text NOT NULL,
        usage_date date NOT NULL,
        status text NOT NULL DEFAULT 'reserved',
        created_at timestamptz NOT NULL DEFAULT now(),
        settled_at timestamptz,
        consumed boolean NOT NULL DEFAULT false,
        CONSTRAINT noah_public_usage_reservation_status
            CHECK (status IN ('reserved', 'consumed', 'released', 'expired'))
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS noah_public_usage_reservations_active_idx
        ON noah_public_usage_reservations (source, bucket_key, created_at)
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

    @staticmethod
    def _validate_public_usage_key(source: str, bucket_key: str) -> None:
        if source not in {"nebius", "byok"}:
            raise RuntimeError("PUBLIC_USAGE_SOURCE_UNSUPPORTED")
        if not bucket_key or len(bucket_key) > 128 or any(ord(character) < 32 for character in bucket_key):
            raise RuntimeError("PUBLIC_USAGE_BUCKET_INVALID")

    @staticmethod
    def _usage_date(current: datetime | None = None) -> date:
        value = current or datetime.now(timezone.utc)
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).date()

    @staticmethod
    def _usage_snapshot(
        total_consumed: int,
        total_reserved: int,
        daily_consumed: int,
        daily_reserved: int,
        total_limit: int,
        daily_limit: int,
        provider_exhausted: bool,
    ) -> dict[str, Any]:
        return {
            "consumed": total_consumed,
            "reserved": total_reserved,
            "limit": total_limit,
            "remaining_calls": max(0, total_limit - total_consumed - total_reserved),
            "daily_consumed": daily_consumed,
            "daily_reserved": daily_reserved,
            "daily_limit": daily_limit,
            "remaining_daily_calls": max(0, daily_limit - daily_consumed - daily_reserved),
            "provider_exhausted": provider_exhausted,
        }

    def public_usage_snapshot(
        self,
        source: str,
        bucket_key: str,
        total_limit: int,
        daily_limit: int,
        *,
        current: datetime | None = None,
        reservation_ttl_seconds: int = 900,
    ) -> dict[str, Any]:
        """Read durable public usage without exposing the bucket key."""

        if not self.configured:
            raise RuntimeError("PUBLIC_USAGE_STORE_NOT_CONFIGURED")
        self._validate_public_usage_key(source, bucket_key)
        usage_date = self._usage_date(current)
        cutoff = (current or datetime.now(timezone.utc)) - timedelta(seconds=reservation_ttl_seconds)
        self.ensure_schema()
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO noah_public_usage_total (source, bucket_key)
                    VALUES (%s, %s)
                    ON CONFLICT (source, bucket_key) DO NOTHING
                    """,
                    (source, bucket_key),
                )
                connection.execute(
                    """
                    INSERT INTO noah_public_usage_daily (source, bucket_key, usage_date)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (source, bucket_key, usage_date) DO NOTHING
                    """,
                    (source, bucket_key, usage_date),
                )
                total = connection.execute(
                    """
                    SELECT consumed, provider_exhausted
                    FROM noah_public_usage_total
                    WHERE source = %s AND bucket_key = %s
                    """,
                    (source, bucket_key),
                ).fetchone()
                daily = connection.execute(
                    """
                    SELECT consumed
                    FROM noah_public_usage_daily
                    WHERE source = %s AND bucket_key = %s AND usage_date = %s
                    """,
                    (source, bucket_key, usage_date),
                ).fetchone()
                pending_total = connection.execute(
                    """
                    SELECT COUNT(*)
                    FROM noah_public_usage_reservations
                    WHERE source = %s AND bucket_key = %s
                      AND status = 'reserved' AND created_at >= %s
                    """,
                    (source, bucket_key, cutoff),
                ).fetchone()
                pending_daily = connection.execute(
                    """
                    SELECT COUNT(*)
                    FROM noah_public_usage_reservations
                    WHERE source = %s AND bucket_key = %s AND usage_date = %s
                      AND status = 'reserved' AND created_at >= %s
                    """,
                    (source, bucket_key, usage_date, cutoff),
                ).fetchone()
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError("PUBLIC_USAGE_STORE_READ_FAILED") from exc
        if not total or not daily:
            raise RuntimeError("PUBLIC_USAGE_STORE_INVALID")
        return self._usage_snapshot(
            int(total[0]),
            int(pending_total[0] if pending_total else 0),
            int(daily[0]),
            int(pending_daily[0] if pending_daily else 0),
            total_limit,
            daily_limit,
            bool(total[1]),
        )

    def reserve_public_usage(
        self,
        source: str,
        bucket_key: str,
        total_limit: int,
        daily_limit: int,
        *,
        current: datetime | None = None,
        reservation_ttl_seconds: int = 900,
    ) -> tuple[dict[str, str] | None, str | None, dict[str, Any]]:
        """Reserve one public model call atomically across processes."""

        if not self.configured:
            raise RuntimeError("PUBLIC_USAGE_STORE_NOT_CONFIGURED")
        self._validate_public_usage_key(source, bucket_key)
        usage_date = self._usage_date(current)
        now = current or datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=reservation_ttl_seconds)
        empty = self._usage_snapshot(0, 0, 0, 0, total_limit, daily_limit, False)
        if total_limit <= 0 or daily_limit <= 0:
            return None, "PUBLIC_NVIDIA_INTERNAL_LIMIT", empty
        self.ensure_schema()
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO noah_public_usage_total (source, bucket_key)
                    VALUES (%s, %s)
                    ON CONFLICT (source, bucket_key) DO NOTHING
                    """,
                    (source, bucket_key),
                )
                connection.execute(
                    """
                    INSERT INTO noah_public_usage_daily (source, bucket_key, usage_date)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (source, bucket_key, usage_date) DO NOTHING
                    """,
                    (source, bucket_key, usage_date),
                )
                total = connection.execute(
                    """
                    SELECT consumed, provider_exhausted
                    FROM noah_public_usage_total
                    WHERE source = %s AND bucket_key = %s
                    FOR UPDATE
                    """,
                    (source, bucket_key),
                ).fetchone()
                daily = connection.execute(
                    """
                    SELECT consumed
                    FROM noah_public_usage_daily
                    WHERE source = %s AND bucket_key = %s AND usage_date = %s
                    FOR UPDATE
                    """,
                    (source, bucket_key, usage_date),
                ).fetchone()
                pending_total = connection.execute(
                    """
                    SELECT COUNT(*)
                    FROM noah_public_usage_reservations
                    WHERE source = %s AND bucket_key = %s
                      AND status = 'reserved' AND created_at >= %s
                    """,
                    (source, bucket_key, cutoff),
                ).fetchone()
                pending_daily = connection.execute(
                    """
                    SELECT COUNT(*)
                    FROM noah_public_usage_reservations
                    WHERE source = %s AND bucket_key = %s AND usage_date = %s
                      AND status = 'reserved' AND created_at >= %s
                    """,
                    (source, bucket_key, usage_date, cutoff),
                ).fetchone()
                total_consumed = int(total[0] if total else 0)
                daily_consumed = int(daily[0] if daily else 0)
                active_total = int(pending_total[0] if pending_total else 0)
                active_daily = int(pending_daily[0] if pending_daily else 0)
                provider_exhausted = bool(total[1]) if total else False
                usage = self._usage_snapshot(
                    total_consumed,
                    active_total,
                    daily_consumed,
                    active_daily,
                    total_limit,
                    daily_limit,
                    provider_exhausted,
                )
                if provider_exhausted:
                    return None, "PUBLIC_NVIDIA_PROVIDER_EXHAUSTED", usage
                if total_consumed + active_total >= total_limit or daily_consumed + active_daily >= daily_limit:
                    return None, "PUBLIC_NVIDIA_INTERNAL_LIMIT", usage
                reservation_id = "public-usage-" + uuid4().hex
                connection.execute(
                    """
                    INSERT INTO noah_public_usage_reservations
                        (reservation_id, source, bucket_key, usage_date, status, created_at)
                    VALUES (%s, %s, %s, %s, 'reserved', %s)
                    """,
                    (reservation_id, source, bucket_key, usage_date, now),
                )
                usage = self._usage_snapshot(
                    total_consumed,
                    active_total + 1,
                    daily_consumed,
                    active_daily + 1,
                    total_limit,
                    daily_limit,
                    provider_exhausted,
                )
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError("PUBLIC_USAGE_STORE_RESERVE_FAILED") from exc
        return {"id": reservation_id, "source": source, "bucket_key": bucket_key, "usage_date": usage_date.isoformat()}, None, usage

    def settle_public_usage(self, reservation_id: str, consumed: bool, *, provider_exhausted: bool = False) -> None:
        """Settle a durable reservation exactly once."""

        if not self.configured:
            return
        self.ensure_schema()
        try:
            with self._connect() as connection:
                row = connection.execute(
                    """
                    SELECT source, bucket_key, usage_date
                    FROM noah_public_usage_reservations
                    WHERE reservation_id = %s AND status = 'reserved'
                    FOR UPDATE
                    """,
                    (reservation_id,),
                ).fetchone()
                if not row:
                    return
                source, bucket_key, usage_date = row
                status = "consumed" if consumed else "released"
                connection.execute(
                    """
                    UPDATE noah_public_usage_reservations
                    SET status = %s, consumed = %s, settled_at = now()
                    WHERE reservation_id = %s
                    """,
                    (status, consumed, reservation_id),
                )
                if consumed:
                    connection.execute(
                        """
                        UPDATE noah_public_usage_total
                        SET consumed = consumed + 1,
                            provider_exhausted = provider_exhausted OR %s,
                            updated_at = now()
                        WHERE source = %s AND bucket_key = %s
                        """,
                        (provider_exhausted, source, bucket_key),
                    )
                    connection.execute(
                        """
                        UPDATE noah_public_usage_daily
                        SET consumed = consumed + 1, updated_at = now()
                        WHERE source = %s AND bucket_key = %s AND usage_date = %s
                        """,
                        (source, bucket_key, usage_date),
                    )
                elif provider_exhausted:
                    connection.execute(
                        """
                        UPDATE noah_public_usage_total
                        SET provider_exhausted = true, updated_at = now()
                        WHERE source = %s AND bucket_key = %s
                        """,
                        (source, bucket_key),
                    )
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError("PUBLIC_USAGE_STORE_SETTLE_FAILED") from exc


def persistence_manifest(repository: PostgresTenantRepository | None = None) -> dict[str, Any]:
    """Return a safe runtime description without URLs, keys, or tokens."""

    return (repository or PostgresTenantRepository()).manifest()
