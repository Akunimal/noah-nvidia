"""Minimal Gmail connector boundary.

Tokens are passed by the server-side secret store. The connector refuses
external mutation unless the caller supplies an approval receipt.
"""

from __future__ import annotations

from typing import Any

import httpx


class GmailConnector:
    base_url = "https://gmail.googleapis.com/gmail/v1/users/me"

    def __init__(self, access_token: str | None = None) -> None:
        self.access_token = access_token

    @property
    def configured(self) -> bool:
        return bool(self.access_token)

    async def list_messages(self, query: str = "is:inbox", max_results: int = 20) -> dict[str, Any]:
        if not self.configured:
            return {"status": "not_configured", "items": []}
        headers = {"Authorization": "Bearer " + str(self.access_token)}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(self.base_url + "/messages", headers=headers, params={"q": query, "maxResults": max_results})
        response.raise_for_status()
        return {"status": "ok", "items": response.json().get("messages", [])}

    async def create_draft(self, raw_message: str) -> dict[str, Any]:
        if not self.configured:
            return {"status": "not_configured"}
        headers = {"Authorization": "Bearer " + str(self.access_token), "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(self.base_url + "/drafts", headers=headers, json={"message": {"raw": raw_message}})
        response.raise_for_status()
        return {"status": "ok", "draft": response.json()}

    async def send(self, raw_message: str, approved: bool, idempotency_key: str) -> dict[str, Any]:
        if not approved:
            return {"status": "approval_required", "idempotency_key": idempotency_key}
        if not self.configured:
            return {"status": "not_configured", "idempotency_key": idempotency_key}
        headers = {"Authorization": "Bearer " + str(self.access_token), "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(self.base_url + "/messages/send", headers=headers, json={"raw": raw_message})
        response.raise_for_status()
        return {"status": "ok", "external_id": response.json().get("id"), "idempotency_key": idempotency_key}
