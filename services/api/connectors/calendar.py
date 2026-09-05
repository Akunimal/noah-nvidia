"""Google Calendar connector boundary with approval and deterministic IDs."""

from __future__ import annotations

from typing import Any

import httpx


class GoogleCalendarConnector:
    base_url = "https://www.googleapis.com/calendar/v3"

    def __init__(self, access_token: str | None = None, calendar_id: str = "primary") -> None:
        self.access_token = access_token
        self.calendar_id = calendar_id

    @property
    def configured(self) -> bool:
        return bool(self.access_token)

    async def freebusy(self, time_min: str, time_max: str) -> dict[str, Any]:
        if not self.configured:
            return {"status": "not_configured", "busy": []}
        headers = {"Authorization": "Bearer " + str(self.access_token)}
        payload = {"timeMin": time_min, "timeMax": time_max, "items": [{"id": self.calendar_id}]}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(self.base_url + "/freeBusy", headers=headers, json=payload)
        response.raise_for_status()
        calendars = response.json().get("calendars", {})
        return {"status": "ok", "busy": calendars.get(self.calendar_id, {}).get("busy", [])}

    async def create_event(self, event: dict[str, Any], approved: bool, event_id: str) -> dict[str, Any]:
        if not approved:
            return {"status": "approval_required", "event_id": event_id}
        if not self.configured:
            return {"status": "not_configured", "event_id": event_id}
        headers = {"Authorization": "Bearer " + str(self.access_token), "Content-Type": "application/json"}
        payload = {**event, "id": event_id}
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(self.base_url + "/calendars/" + self.calendar_id + "/events", headers=headers, json=payload)
        response.raise_for_status()
        return {"status": "ok", "external_id": response.json().get("id"), "event_id": event_id}
