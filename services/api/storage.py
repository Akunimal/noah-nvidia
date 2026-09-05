"""Optional Supabase PostgREST persistence boundary.

The demo uses the in-memory store in ``main.py`` so it can boot on a free
Render instance. This adapter keeps durable deployments on the same tenant
contracts without putting a Supabase service key in the browser.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


class SupabaseRepository:
    """Small server-side PostgREST client with tenant filters on every call."""

    def __init__(self, url: str | None = None, service_key: str | None = None) -> None:
        self.url = (url or os.getenv("NOAH_SUPABASE_URL", "")).rstrip("/")
        self.service_key = service_key or os.getenv("NOAH_SUPABASE_SERVICE_KEY", "")

    @property
    def configured(self) -> bool:
        return bool(self.url and self.service_key)

    def _headers(self) -> dict[str, str]:
        if not self.configured:
            raise RuntimeError("SUPABASE_NOT_CONFIGURED")
        return {
            "apikey": self.service_key,
            "Authorization": "Bearer " + self.service_key,
            "Content-Type": "application/json",
        }

    def _table_url(self, table: str) -> str:
        if not table.replace("_", "").isalnum():
            raise ValueError("invalid table name")
        return f"{self.url}/rest/v1/{table}"

    async def list(self, table: str, tenant_id: str, *, limit: int = 100) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                self._table_url(table),
                headers=self._headers(),
                params={"tenant_id": f"eq.{tenant_id}", "limit": str(limit)},
            )
        response.raise_for_status()
        return response.json()

    async def insert(self, table: str, tenant_id: str, record: dict[str, Any]) -> dict[str, Any]:
        payload = {**record, "tenant_id": tenant_id}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                self._table_url(table),
                headers={**self._headers(), "Prefer": "return=representation"},
                json=payload,
            )
        response.raise_for_status()
        data = response.json()
        return data[0] if isinstance(data, list) else data

    async def update(self, table: str, tenant_id: str, record_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.patch(
                self._table_url(table),
                headers={**self._headers(), "Prefer": "return=representation"},
                params={"id": f"eq.{record_id}", "tenant_id": f"eq.{tenant_id}"},
                json=patch,
            )
        response.raise_for_status()
        data = response.json()
        if not data:
            raise KeyError("RESOURCE_NOT_FOUND")
        return data[0]


def persistence_manifest() -> dict[str, Any]:
    configured = bool(os.getenv("NOAH_SUPABASE_URL") and os.getenv("NOAH_SUPABASE_SERVICE_KEY"))
    return {
        "provider": "supabase-postgres",
        "mode": "postgrest-adapter-ready" if configured else "in-memory-demo",
        "configured": configured,
        "active": False,
        "browser_access": "rls-authenticated-only",
        "secrets_in_browser": False,
    }
