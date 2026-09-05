from providers import OpenCode2ApiProvider


def test_opencode2api_accepts_root_v1_or_full_endpoint(monkeypatch) -> None:
    monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", "https://gateway.example/v1")
    provider = OpenCode2ApiProvider()
    assert provider.completions_url() == "https://gateway.example/v1/chat/completions"

    monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", "https://gateway.example")
    provider = OpenCode2ApiProvider()
    assert provider.completions_url() == "https://gateway.example/v1/chat/completions"

    monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", "https://gateway.example/v1/chat/completions")
    provider = OpenCode2ApiProvider()
    assert provider.completions_url() == "https://gateway.example/v1/chat/completions"
