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
