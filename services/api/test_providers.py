import asyncio
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

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


def test_opencode2api_rejects_non_nvidia_model_before_transport(monkeypatch) -> None:
    monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", "https://gateway.example/v1")
    monkeypatch.setenv("NOAH_OPENCODE2API_MODEL", "gpt-4o")

    provider = OpenCode2ApiProvider()
    assert provider.model_allowed() is False
    assert provider.configured() is False

    result = asyncio.run(provider.complete("prompt", "system"))

    assert result.provider == "opencode2api"
    assert result.model == "gpt-4o"
    assert result.error == "OPENCODE2API_NON_NVIDIA_MODEL"


def test_opencode2api_rejects_non_nvidia_response_model(monkeypatch) -> None:
    class NonNvidiaGatewayHandler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
            body = json.dumps(
                {
                    "model": "gpt-4o",
                    "choices": [{"message": {"content": "must be rejected"}}],
                }
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            return

    server = ThreadingHTTPServer(("127.0.0.1", 0), NonNvidiaGatewayHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", f"http://127.0.0.1:{server.server_port}/v1")
        monkeypatch.setenv("NOAH_OPENCODE2API_MODEL", "nemotron-3-ultra-free")
        result = asyncio.run(OpenCode2ApiProvider().complete("prompt", "system"))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    assert result.error == "OPENCODE2API_NON_NVIDIA_RESPONSE_MODEL"
    assert result.text is None


def test_opencode2api_http_contract_preserves_provider_result_provenance(monkeypatch) -> None:
    class SyntheticGatewayHandler(BaseHTTPRequestHandler):
        requests: list[tuple[str, dict[str, str], dict[str, object]]] = []

        def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            headers = {key.lower(): value for key, value in self.headers.items()}
            type(self).requests.append((self.path, headers, payload))
            body = json.dumps({"choices": [{"message": {"content": "synthetic gateway response"}}]}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            return

    server = ThreadingHTTPServer(("127.0.0.1", 0), SyntheticGatewayHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        monkeypatch.setenv("NOAH_OPENCODE2API_BASE_URL", f"http://127.0.0.1:{server.server_port}/v1")
        monkeypatch.setenv("NOAH_OPENCODE2API_KEY", "synthetic-test-key")
        monkeypatch.setenv("NOAH_OPENCODE2API_MODEL", "nemotron-3-ultra-free")
        monkeypatch.setenv("NOAH_ALLOW_FREE_SYNTHETIC", "true")
        monkeypatch.delenv("NOAH_NEBIUS_API_KEY", raising=False)

        result = asyncio.run(NvidiaRouter().complete("synthetic prompt", "synthetic system", allow_free_synthetic=True))

        assert result.provider == "opencode2api"
        assert result.model == "nemotron-3-ultra-free"
        assert result.text == "synthetic gateway response"
        assert result.error is None
        assert len(SyntheticGatewayHandler.requests) == 1
        path, headers, payload = SyntheticGatewayHandler.requests[0]
        assert path == "/v1/chat/completions"
        assert headers["authorization"] == "Bearer synthetic-test-key"
        assert payload["model"] == "nemotron-3-ultra-free"
        assert payload["messages"] == [
            {"role": "system", "content": "synthetic system"},
            {"role": "user", "content": "synthetic prompt"},
        ]
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
