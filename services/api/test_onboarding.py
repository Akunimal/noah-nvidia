import json
from copy import deepcopy

from fastapi.testclient import TestClient

from main import TENANTS, app, router
from providers import ProviderResult


client = TestClient(app)


def onboarding_payload() -> dict[str, object]:
    return {
        "schema_version": "onboarding.v1",
        "business": {
            "name": "Taller Norte",
            "description": "Mantenimiento de equipos industriales.",
            "category": "mantenimiento industrial",
            "timezone": None,
            "currency": None,
            "locale": None,
        },
        "inventory": [
            {"name": "Filtro industrial", "sku": None, "quantity": 2, "unit": "unidades"},
        ],
        "missing_fields": ["business.timezone", "business.currency", "business.locale"],
    }


def test_extract_uses_only_nebius_and_does_not_persist_private_text(monkeypatch) -> None:
    tenant_id = "tenant-phase3-nebius"
    private_text = "Somos Taller Norte y hacemos mantenimiento de equipos industriales."
    response_text = json.dumps(onboarding_payload())
    calls: list[dict[str, object]] = []

    async def fake_complete(prompt: str, system: str, *, allow_free_synthetic: bool = False) -> ProviderResult:
        calls.append({"prompt": prompt, "system": system, "allow_free_synthetic": allow_free_synthetic})
        return ProviderResult("nebius", "nvidia/nemotron-test", response_text)

    monkeypatch.setattr(router.nebius, "api_key", "synthetic-test-key")
    monkeypatch.setattr(router.nebius, "model", "nvidia/nemotron-test")
    monkeypatch.setattr(router, "complete", fake_complete)
    before_demo = deepcopy(TENANTS.get("tenant-demo"))

    response = client.post(
        "/api/v1/onboarding/extract",
        headers={"Authorization": "Bearer " + tenant_id},
        json={"text": private_text},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["draft"]["schema_version"] == "onboarding.v1"
    assert body["draft"]["business"]["name"] == "Taller Norte"
    assert body["draft"]["inventory"][0]["quantity"] == 2.0
    assert body["provenance"]["provider"] == "nebius"
    assert body["provenance"]["model"] == "nvidia/nemotron-test"
    assert "provider_result" not in body
    assert response_text not in response.text
    assert calls and calls[0]["prompt"] == private_text
    assert calls[0]["allow_free_synthetic"] is False
    assert "onboarding.v1" in str(calls[0]["system"])
    assert tenant_id not in TENANTS
    assert TENANTS.get("tenant-demo") == before_demo


def test_extract_rejects_unconfigured_nebius_without_calling_a_fallback(monkeypatch) -> None:
    tenant_id = "tenant-phase3-no-key"
    monkeypatch.setattr(router.nebius, "api_key", "")

    async def should_not_call(*args, **kwargs) -> ProviderResult:
        raise AssertionError("onboarding extraction must not call a fallback provider")

    monkeypatch.setattr(router, "complete", should_not_call)
    response = client.post(
        "/api/v1/onboarding/extract",
        headers={"Authorization": "Bearer " + tenant_id},
        json={"text": "Somos una empresa de soporte técnico."},
    )

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "NEBIUS_NOT_CONFIGURED"
    assert response.json()["detail"]["provider_result"]["provider"] == "nebius"
    assert tenant_id not in TENANTS


def test_extract_does_not_echo_invalid_model_output_or_write_state(monkeypatch) -> None:
    tenant_id = "tenant-phase3-invalid-json"
    invalid_output = '{"private":"do not echo", "unexpected": true}'

    async def fake_complete(prompt: str, system: str, *, allow_free_synthetic: bool = False) -> ProviderResult:
        return ProviderResult("nebius", "nvidia/nemotron-test", invalid_output)

    monkeypatch.setattr(router.nebius, "api_key", "synthetic-test-key")
    monkeypatch.setattr(router.nebius, "model", "nvidia/nemotron-test")
    monkeypatch.setattr(router, "complete", fake_complete)
    response = client.post(
        "/api/v1/onboarding/extract",
        headers={"Authorization": "Bearer " + tenant_id},
        json={"text": "Somos una empresa de soporte técnico."},
    )

    assert response.status_code == 502
    body = response.json()
    assert body["detail"]["code"] == "ONBOARDING_INVALID_MODEL_OUTPUT"
    assert body["detail"]["provider_result"]["text"] is None
    assert "private" not in response.text
    assert tenant_id not in TENANTS


def test_extract_forbids_demo_tenant_before_provider_call(monkeypatch) -> None:
    async def should_not_call(*args, **kwargs) -> ProviderResult:
        raise AssertionError("demo onboarding must not call Nebius")

    monkeypatch.setattr(router, "complete", should_not_call)
    response = client.post(
        "/api/v1/onboarding/extract",
        headers={"Authorization": "Bearer demo-owner"},
        json={"text": "Somos una empresa de soporte técnico."},
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "ONBOARDING_DEMO_FORBIDDEN"


def test_onboarding_state_is_empty_and_does_not_expose_private_fields() -> None:
    tenant_id = "tenant-phase4-state"
    response = client.get("/api/v1/onboarding", headers={"Authorization": "Bearer " + tenant_id})

    assert response.status_code == 200
    body = response.json()
    assert body["tenant_id"] == tenant_id
    assert body["workspace"] == {
        "mode": "playground",
        "data_source": "empty",
        "fixture_id": None,
        "synthetic": False,
    }
    assert body["onboarding"] == {
        "status": "not_started",
        "source": None,
        "draft": None,
        "updated_at": None,
    }
    assert "prompt" not in response.text
    assert "provider_result" not in response.text


def test_complete_applies_reviewed_json_once_and_is_tenant_safe() -> None:
    tenant_id = "tenant-phase4-complete"
    headers = {
        "Authorization": "Bearer " + tenant_id,
        "Idempotency-Key": "phase4-complete-1",
    }
    before_demo = deepcopy(client.get("/api/v1/bootstrap", headers={"Authorization": "Bearer demo-owner"}).json())

    first = client.post(
        "/api/v1/onboarding/complete",
        headers=headers,
        json={"confirmation": "confirm", "draft": onboarding_payload()},
    )
    assert first.status_code == 200
    assert first.json()["idempotent"] is False
    assert first.json()["onboarding"]["status"] == "completed"
    assert first.json()["business"]["name"] == "Taller Norte"
    assert first.json()["inventory"][0]["tenant_id"] == tenant_id

    retry = client.post(
        "/api/v1/onboarding/complete",
        headers=headers,
        json={"confirmation": "confirm", "draft": onboarding_payload()},
    )
    assert retry.status_code == 200
    assert retry.json()["idempotent"] is True
    assert len(TENANTS[tenant_id]["inventory"]) == 1

    changed_payload = onboarding_payload()
    changed_payload["business"] = {**changed_payload["business"], "name": "Otro negocio"}
    reused = client.post(
        "/api/v1/onboarding/complete",
        headers=headers,
        json={"confirmation": "confirm", "draft": changed_payload},
    )
    assert reused.status_code == 409
    assert reused.json()["detail"]["code"] == "IDEMPOTENCY_KEY_REUSED"

    second_key = client.post(
        "/api/v1/onboarding/complete",
        headers={**headers, "Idempotency-Key": "phase4-complete-2"},
        json={"confirmation": "confirm", "draft": onboarding_payload()},
    )
    assert second_key.status_code == 409
    assert second_key.json()["detail"]["code"] == "ONBOARDING_ALREADY_FINALIZED"
    assert client.get("/api/v1/bootstrap", headers={"Authorization": "Bearer " + tenant_id}).json()["workspace"]["data_source"] == "onboarding"
    assert client.get("/api/v1/bootstrap", headers={"Authorization": "Bearer demo-owner"}).json() == before_demo


def test_skip_copies_only_synthetic_fixture_and_retries_without_duplicates() -> None:
    tenant_id = "tenant-phase4-skip"
    headers = {
        "Authorization": "Bearer " + tenant_id,
        "Idempotency-Key": "phase4-skip-1",
    }
    before_demo = deepcopy(client.get("/api/v1/bootstrap", headers={"Authorization": "Bearer demo-owner"}).json())
    payload = {"confirmation": "skip", "source": "synthetic_fixture"}

    first = client.post("/api/v1/onboarding/skip", headers=headers, json=payload)
    assert first.status_code == 200
    assert first.json()["idempotent"] is False
    assert first.json()["onboarding"] == {
        "status": "skipped",
        "source": "synthetic_fixture",
        "draft": None,
        "updated_at": first.json()["onboarding"]["updated_at"],
    }
    assert first.json()["business"]["name"] == "Atlas Services"

    retry = client.post("/api/v1/onboarding/skip", headers=headers, json=payload)
    assert retry.status_code == 200
    assert retry.json()["idempotent"] is True
    assert len(TENANTS[tenant_id]["services"]) == 3
    assert len(TENANTS[tenant_id]["actions"]) == 3
    assert all(item.get("tenant_id") == tenant_id for item in TENANTS[tenant_id]["services"].values())
    assert all(item.get("tenant_id") == tenant_id for item in TENANTS[tenant_id]["actions"].values())

    bootstrap = client.get("/api/v1/bootstrap", headers={"Authorization": "Bearer " + tenant_id})
    assert bootstrap.status_code == 200
    assert bootstrap.json()["workspace"] == {
        "mode": "playground",
        "data_source": "synthetic-fixture",
        "fixture_id": "atlas-v1",
        "synthetic": True,
    }
    assert client.get("/api/v1/services", headers={"Authorization": "Bearer " + tenant_id}).json()
    assert client.get("/api/v1/bootstrap", headers={"Authorization": "Bearer demo-owner"}).json() == before_demo


def test_skip_never_calls_a_model_and_requires_confirmation_key(monkeypatch) -> None:
    tenant_id = "tenant-phase4-skip-no-model"

    async def should_not_call(*args, **kwargs) -> ProviderResult:
        raise AssertionError("skip must not call a provider")

    monkeypatch.setattr(router, "complete", should_not_call)
    missing_key = client.post(
        "/api/v1/onboarding/skip",
        headers={"Authorization": "Bearer " + tenant_id},
        json={"confirmation": "skip", "source": "synthetic_fixture"},
    )
    assert missing_key.status_code == 400
    assert missing_key.json()["detail"]["code"] == "ONBOARDING_IDEMPOTENCY_KEY_REQUIRED"

    response = client.post(
        "/api/v1/onboarding/skip",
        headers={"Authorization": "Bearer " + tenant_id, "Idempotency-Key": "phase4-skip-no-model"},
        json={"confirmation": "skip", "source": "synthetic_fixture"},
    )
    assert response.status_code == 200


def test_complete_rejects_missing_required_business_fields_without_writing() -> None:
    tenant_id = "tenant-phase4-required"
    payload = onboarding_payload()
    payload["business"] = {**payload["business"], "name": None}
    payload["missing_fields"] = ["business.name", *payload["missing_fields"]]

    response = client.post(
        "/api/v1/onboarding/complete",
        headers={"Authorization": "Bearer " + tenant_id, "Idempotency-Key": "phase4-required-1"},
        json={"confirmation": "confirm", "draft": payload},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ONBOARDING_REQUIRED_FIELDS"
    assert TENANTS[tenant_id]["onboarding"]["status"] == "not_started"
    assert TENANTS[tenant_id]["inventory"] == {}
