"""Run the deterministic owner -> approval -> receipt circuit locally."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services" / "api"))
from main import app  # noqa: E402


def main() -> int:
    client = TestClient(app)
    headers = {"Authorization": "Bearer demo-owner"}
    assert client.get("/health").status_code == 200
    bootstrap = client.get("/api/v1/bootstrap", headers=headers)
    assert bootstrap.status_code == 200
    created = client.post("/api/v1/conversations/demo/messages", headers=headers, json={"message": "Registrar gasto de equipo"})
    assert created.status_code == 200, created.text
    payload = created.json()
    action = payload["action"]
    run_id = payload["run"]["id"]
    approved = client.post(
        f"/api/v1/actions/{action['id']}/approve",
        headers=headers,
        json={"expected_hash": action["arguments_hash"], "reason": "smoke test"},
    )
    assert approved.status_code == 200, approved.text
    advanced = client.post(f"/api/v1/runs/{run_id}/advance", headers=headers)
    assert advanced.status_code == 200, advanced.text
    body = advanced.json()
    assert body["status"] == "succeeded"
    assert body["effects"][0]["status"] == "succeeded"
    print(json.dumps({"business": bootstrap.json()["business"]["name"], "run": run_id, "status": body["status"], "receipt": body["effects"][0]["id"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
