import asyncio

from providers import NvidiaRouter, OpenCode2ApiProvider


def test_opencode2api_accepts_root_v1_or_full_endpoint(monkeypatch) -> None:
    monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", "https://gateway.example/v1")
    provider = OpenCode2ApiProvider()
    assert provider.completions_url() == "https://gateway.example/v1/chat/completions"


def test_free_gateway_is_only_available_when_explicitly_allowed(monkeypatch) -> None:
    monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", "https://gateway.example/v1")
    monkeypatch.delenv("NOAH_NEBIUS_API_KEY", raising=False)
    router = NvidiaRouter()
    result = asyncio.run(router.complete("synthetic prompt", "system", allow_free_synthetic=False))
    assert result.provider == "deterministic-demo"
    assert result.error == "NO_NVIDIA_PROVIDER_CONFIGURED"

    monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", "https://gateway.example")
    provider = OpenCode2ApiProvider()
    assert provider.completions_url() == "https://gateway.example/v1/chat/completions"

    monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", "https://gateway.example/v1/chat/completions")
    provider = OpenCode2ApiProvider()
    assert provider.completions_url() == "https://gateway.example/v1/chat/completions"
