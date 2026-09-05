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
