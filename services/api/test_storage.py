import json
from datetime import datetime, timedelta, timezone

import pytest

import storage
from storage import PostgresTenantRepository, persistence_manifest


def test_default_manifest_is_safe_in_memory_mode(monkeypatch) -> None:
    monkeypatch.delenv("NOAH_DATABASE_URL", raising=False)
    manifest = persistence_manifest(PostgresTenantRepository())
    assert manifest["provider"] == "in-memory"
    assert manifest["mode"] == "in-memory-demo"
    assert manifest["configured"] is False
    assert manifest["browser_access"] == "server-only"
    assert manifest["secrets_in_browser"] is False


def test_tenant_snapshot_must_match_tenant_id() -> None:
    with pytest.raises(RuntimeError, match="POSTGRES_TENANT_STATE_INVALID"):
        PostgresTenantRepository._validate_tenant_state("tenant-a", {"tenant_id": "tenant-b"})


def test_tenant_snapshot_is_json_serializable() -> None:
    state = {"tenant_id": "tenant-a", "items": [{"id": "item-1"}]}
    validated = PostgresTenantRepository._validate_tenant_state("tenant-a", state)
    assert validated == state
    assert PostgresTenantRepository._decode_state(json.dumps(state)) == state


def test_configured_manifest_never_exposes_database_url(monkeypatch) -> None:
    repository = PostgresTenantRepository("postgresql://private-user:private-password@db.internal/noah")
    manifest = persistence_manifest(repository)
    assert manifest["provider"] == "postgresql"
    assert manifest["mode"] == "postgres-jsonb"
    assert manifest["configured"] is True
    assert "private-password" not in json.dumps(manifest)
    assert "db.internal" not in json.dumps(manifest)


class _FakeDatabase:
    def __init__(self) -> None:
        self.tenants = {}
        self.oauth = {}
        self.usage_total = {}
        self.usage_daily = {}
        self.usage_reservations = {}

    def connect(self, _url: str, **_kwargs):
        return _FakeConnection(self)


class _FakeConnection:
    def __init__(self, database: _FakeDatabase) -> None:
        self.database = database

    def __enter__(self):
        return self

    def __exit__(self, *_args) -> None:
        return None

    def execute(self, statement: str, params=()):
        if "SELECT state" in statement:
            state = self.database.tenants.get(params[0])
            return _FakeResult((state,) if state is not None else None)
        if "INSERT INTO noah_tenant_state" in statement:
            tenant_id, payload = params
            self.database.tenants[tenant_id] = json.loads(payload)
            return _FakeResult(None)
        if "SELECT tenant_id, code_verifier, expires_at" in statement:
            row = self.database.oauth.get(params[0])
            return _FakeResult(row)
        if "DELETE FROM noah_oauth_state" in statement:
            self.database.oauth.pop(params[0], None)
            return _FakeResult(None)
        if "INSERT INTO noah_oauth_state" in statement:
            state, tenant_id, code_verifier, expires_at = params
            self.database.oauth[state] = (tenant_id, code_verifier, expires_at)
            return _FakeResult(None)
        if "INSERT INTO noah_public_usage_total" in statement:
            source, bucket_key = params
            self.database.usage_total.setdefault((source, bucket_key), {"consumed": 0, "provider_exhausted": False})
            return _FakeResult(None)
        if "INSERT INTO noah_public_usage_daily" in statement:
            source, bucket_key, usage_date = params
            self.database.usage_daily.setdefault((source, bucket_key, usage_date), {"consumed": 0})
            return _FakeResult(None)
        if "SELECT consumed, provider_exhausted" in statement:
            source, bucket_key = params
            row = self.database.usage_total.get((source, bucket_key), {"consumed": 0, "provider_exhausted": False})
            return _FakeResult((row["consumed"], row["provider_exhausted"]))
        if "SELECT consumed" in statement and "noah_public_usage_daily" in statement:
            source, bucket_key, usage_date = params
            row = self.database.usage_daily.get((source, bucket_key, usage_date), {"consumed": 0})
            return _FakeResult((row["consumed"],))
        if "SELECT COUNT(*)" in statement and "noah_public_usage_reservations" in statement:
            if len(params) == 4:
                source, bucket_key, usage_date, cutoff = params
            else:
                source, bucket_key, cutoff = params
                usage_date = None
            count = sum(
                1
                for row in self.database.usage_reservations.values()
                if row["source"] == source
                and row["bucket_key"] == bucket_key
                and (usage_date is None or row["usage_date"] == usage_date)
                and row["status"] == "reserved"
                and row["created_at"] >= cutoff
            )
            return _FakeResult((count,))
        if "INSERT INTO noah_public_usage_reservations" in statement:
            reservation_id, source, bucket_key, usage_date, created_at = params
            self.database.usage_reservations[reservation_id] = {
                "source": source,
                "bucket_key": bucket_key,
                "usage_date": usage_date,
                "status": "reserved",
                "created_at": created_at,
            }
            return _FakeResult(None)
        if "SELECT source, bucket_key, usage_date" in statement and "noah_public_usage_reservations" in statement:
            row = self.database.usage_reservations.get(params[0])
            if not row or row["status"] != "reserved":
                return _FakeResult(None)
            return _FakeResult((row["source"], row["bucket_key"], row["usage_date"]))
        if "UPDATE noah_public_usage_reservations" in statement:
            status, _consumed, reservation_id = params
            self.database.usage_reservations[reservation_id]["status"] = status
            return _FakeResult(None)
        if "UPDATE noah_public_usage_total" in statement and "consumed = consumed + 1" in statement:
            provider_exhausted, source, bucket_key = params
            row = self.database.usage_total[(source, bucket_key)]
            row["consumed"] += 1
            row["provider_exhausted"] = row["provider_exhausted"] or provider_exhausted
            return _FakeResult(None)
        if "UPDATE noah_public_usage_daily" in statement:
            source, bucket_key, usage_date = params
            self.database.usage_daily[(source, bucket_key, usage_date)]["consumed"] += 1
            return _FakeResult(None)
        if "UPDATE noah_public_usage_total" in statement and "provider_exhausted = true" in statement:
            source, bucket_key = params
            self.database.usage_total[(source, bucket_key)]["provider_exhausted"] = True
            return _FakeResult(None)
        return _FakeResult(None)


class _FakeResult:
    def __init__(self, row) -> None:
        self.row = row

    def fetchone(self):
        return self.row


def test_postgres_repository_round_trips_tenant_and_single_use_oauth(monkeypatch) -> None:
    database = _FakeDatabase()
    monkeypatch.setattr(storage, "psycopg", database)
    repository = PostgresTenantRepository("postgresql://db.internal/noah")
    state = {"tenant_id": "tenant-a", "business": {"name": "Demo"}}
    repository.save_tenant("tenant-a", state)
    loaded = repository.load_tenant("tenant-a")
    assert loaded == state
    assert loaded is not state

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    repository.save_oauth_state(
        "oauth-state",
        {"tenant_id": "tenant-a", "code_verifier": "verifier", "expires_at": expires_at},
    )
    consumed = repository.consume_oauth_state("oauth-state")
    assert consumed == {"tenant_id": "tenant-a", "code_verifier": "verifier", "expires_at": expires_at}
    assert repository.consume_oauth_state("oauth-state") is None


def test_postgres_public_usage_survives_repository_restart_and_enforces_daily_limit(monkeypatch) -> None:
    database = _FakeDatabase()
    monkeypatch.setattr(storage, "psycopg", database)
    repository = PostgresTenantRepository("postgresql://db.internal/noah")

    reservation, error, usage = repository.reserve_public_usage("nebius", "server", 3, 1)
    assert reservation is not None
    assert error is None
    assert usage["remaining_daily_calls"] == 0
    blocked, blocked_error, _ = repository.reserve_public_usage("nebius", "server", 3, 1)
    assert blocked is None
    assert blocked_error == "PUBLIC_NVIDIA_INTERNAL_LIMIT"

    repository.settle_public_usage(reservation["id"], True)
    restarted = PostgresTenantRepository("postgresql://db.internal/noah")
    snapshot = restarted.public_usage_snapshot("nebius", "server", 3, 1)
    assert snapshot["consumed"] == 1
    assert snapshot["remaining_calls"] == 2
    assert snapshot["remaining_daily_calls"] == 0

    next_reservation, next_error, _ = restarted.reserve_public_usage("nebius", "server", 3, 1)
    assert next_reservation is None
    assert next_error == "PUBLIC_NVIDIA_INTERNAL_LIMIT"


def test_postgres_public_usage_persists_provider_exhaustion(monkeypatch) -> None:
    database = _FakeDatabase()
    monkeypatch.setattr(storage, "psycopg", database)
    repository = PostgresTenantRepository("postgresql://db.internal/noah")
    reservation, error, _ = repository.reserve_public_usage("byok", "key-hash", 5, 5)
    assert reservation is not None and error is None
    repository.settle_public_usage(reservation["id"], True, provider_exhausted=True)
    blocked, blocked_error, usage = repository.reserve_public_usage("byok", "key-hash", 5, 5)
    assert blocked is None
    assert blocked_error == "PUBLIC_NVIDIA_PROVIDER_EXHAUSTED"
    assert usage["provider_exhausted"] is True
