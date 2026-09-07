"""Run a reproducible, no-provider-cost release check for Noah Nvidia.

The local checks run with database, provider, and external-effect credentials
cleared in the child-process environment. The optional live checks use only
GET and OPTIONS requests against the public Render surfaces; they never send a
model prompt, bearer token, provider key, or mutation request.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "services" / "api"
DEFAULT_API_URL = "https://noah-nvidia-api.onrender.com"
DEFAULT_WEB_URL = "https://noah-nvidia-web.onrender.com"
DEFAULT_TIMEOUT_SECONDS = 30.0
COMMAND_TIMEOUT_SECONDS = 300.0
LIVE_RETRY_DELAY_SECONDS = 2.0
MAX_LIVE_RESPONSE_BYTES = 4 * 1024 * 1024

SECRET_PATTERNS = (
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bAIza[0-9A-Za-z_-]{30,}\b"),
    re.compile(r"\bya29\.[0-9A-Za-z_-]{20,}\b"),
)

OFFLINE_ENV_OVERRIDES = {
    "NOAH_DATABASE_URL": "",
    "NOAH_NEBIUS_API_KEY": "",
    "NOAH_NVIDIA_NIM_API_KEY": "",
    "NOAH_OPENCODE2API_BASE_URL": "",
    "NOAH_OPENCODE2API_KEY": "",
    "NOAH_CONNECTION_ENCRYPTION_KEY": "",
    "NOAH_ENABLE_EXTERNAL_EFFECTS": "false",
    "NOAH_ALLOW_FREE_SYNTHETIC": "false",
    "NOAH_PUBLIC_AI_MODE": "synthetic",
    "PYTHONHASHSEED": "0",
    "PYTHONUNBUFFERED": "1",
}


@dataclass(frozen=True)
class CheckResult:
    name: str
    status: str
    detail: str
    duration_ms: int | None = None


@dataclass(frozen=True)
class HttpResult:
    status: int | None
    headers: dict[str, str]
    body: bytes
    error: str | None = None


class CheckRunner:
    def __init__(self) -> None:
        self.results: list[CheckResult] = []

    def record(self, name: str, status: str, detail: str, duration_ms: int | None = None) -> bool:
        result = CheckResult(name, status, detail, duration_ms)
        self.results.append(result)
        suffix = f" ({duration_ms} ms)" if duration_ms is not None else ""
        print(f"[{status}] {name}: {detail}{suffix}")
        return status != "FAIL"

    def skip(self, name: str, detail: str) -> None:
        self.record(name, "SKIP", detail)

    def command(
        self,
        name: str,
        command: list[str],
        *,
        cwd: Path = ROOT,
        env: dict[str, str] | None = None,
        timeout: float = COMMAND_TIMEOUT_SECONDS,
    ) -> bool:
        started = time.perf_counter()
        try:
            completed = subprocess.run(
                command,
                cwd=cwd,
                env=env,
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
            )
        except FileNotFoundError:
            return self.record(name, "FAIL", "command is not available", elapsed_ms(started))
        except subprocess.TimeoutExpired:
            return self.record(name, "FAIL", f"timed out after {int(timeout)} seconds", elapsed_ms(started))
        except OSError as exc:
            return self.record(name, "FAIL", f"could not start command ({type(exc).__name__})", elapsed_ms(started))

        if completed.returncode == 0:
            return self.record(name, "PASS", "completed", elapsed_ms(started))
        # Never echo subprocess output: a failing tool must not accidentally
        # print an inherited provider key or OAuth value into a release log.
        return self.record(name, "FAIL", f"exit code {completed.returncode}; output withheld", elapsed_ms(started))

    def failed(self) -> bool:
        return any(result.status == "FAIL" for result in self.results)


def elapsed_ms(started: float) -> int:
    return max(0, round((time.perf_counter() - started) * 1000))


def npm_command() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def api_python() -> str:
    candidates = (
        API_ROOT / ".venv" / "Scripts" / "python.exe",
        API_ROOT / ".venv" / "bin" / "python",
    )
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return sys.executable


def offline_environment() -> dict[str, str]:
    environment = os.environ.copy()
    environment.update(OFFLINE_ENV_OVERRIDES)
    return environment


def check_clean_tree(runner: CheckRunner) -> None:
    started = time.perf_counter()
    try:
        completed = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=all"],
            cwd=ROOT,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except (FileNotFoundError, OSError) as exc:
        runner.record("Clean working tree", "FAIL", f"could not inspect repository ({type(exc).__name__})")
        return
    if completed.returncode != 0:
        runner.record("Clean working tree", "FAIL", "git status failed", elapsed_ms(started))
    elif completed.stdout.strip():
        runner.record("Clean working tree", "FAIL", "uncommitted changes are present", elapsed_ms(started))
    else:
        runner.record("Clean working tree", "PASS", "no uncommitted changes", elapsed_ms(started))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def render_value_present(render_text: str, key: str, value: str) -> bool:
    pattern = re.compile(
        rf"-\s+key:\s+{re.escape(key)}\s+value:\s+[\"']?{re.escape(value)}[\"']?(?:\s|$)",
        re.MULTILINE,
    )
    return bool(pattern.search(render_text))


def check_static_contract(runner: CheckRunner) -> None:
    render_path = ROOT / "render.yaml"
    web_index_path = ROOT / "apps" / "web" / "index.html"
    env_example_path = API_ROOT / ".env.example"

    render_text = read_text(render_path)
    render_settings = (
        ("public demo enabled", "NOAH_PUBLIC_DEMO", "true"),
        ("public AI remains scheduled", "NOAH_PUBLIC_AI_MODE", "scheduled"),
        ("free synthetic route disabled", "NOAH_ALLOW_FREE_SYNTHETIC", "false"),
        ("external effects disabled", "NOAH_ENABLE_EXTERNAL_EFFECTS", "false"),
    )
    missing = [key for _, key, value in render_settings if not render_value_present(render_text, key, value)]
    if missing:
        runner.record("Render safety contract", "FAIL", f"missing expected settings: {', '.join(missing)}")
    else:
        runner.record("Render safety contract", "PASS", "scheduled demo, synthetic fallback, and external effects are bounded")

    csp = read_text(web_index_path).lower()
    required_csp = ("default-src 'self'", "object-src 'none'", "frame-src 'none'", "script-src 'self'", "connect-src")
    missing_csp = [directive for directive in required_csp if directive not in csp]
    if missing_csp:
        runner.record("Frontend CSP contract", "FAIL", f"missing directives: {', '.join(missing_csp)}")
    else:
        runner.record("Frontend CSP contract", "PASS", "restrictive CSP marker is present")

    env_example = read_text(env_example_path)
    if "NOAH_MAX_REQUEST_BYTES=8388608" in env_example:
        runner.record("API request-limit contract", "PASS", "8 MiB default is documented")
    else:
        runner.record("API request-limit contract", "FAIL", "documented 8 MiB default is missing")


def contains_secret_format(value: str) -> bool:
    return any(pattern.search(value) for pattern in SECRET_PATTERNS)


def normalize_base_url(value: str, label: str) -> str:
    candidate = value.strip().rstrip("/")
    parsed = urlsplit(candidate)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise ValueError(f"{label} must be an http(s) origin without path, query, or credentials")
    return f"{parsed.scheme}://{parsed.netloc}"


def http_request(url: str, method: str, headers: dict[str, str], timeout: float) -> HttpResult:
    request = Request(url, headers=headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            return HttpResult(
                status=response.status,
                headers={key.lower(): value for key, value in response.headers.items()},
                body=response.read(MAX_LIVE_RESPONSE_BYTES),
            )
    except HTTPError as exc:
        return HttpResult(
            status=exc.code,
            headers={key.lower(): value for key, value in exc.headers.items()},
            body=b"",
        )
    except (URLError, TimeoutError, OSError) as exc:
        return HttpResult(status=None, headers={}, body=b"", error=type(exc).__name__)


def request_with_retry(
    url: str,
    method: str,
    headers: dict[str, str],
    timeout: float,
    *,
    attempts: int = 2,
) -> HttpResult:
    """Give a free Render instance one safe retry after a cold start."""

    response = http_request(url, method, headers, timeout)
    for _ in range(max(0, attempts - 1)):
        if response.status is not None:
            return response
        time.sleep(LIVE_RETRY_DELAY_SECONDS)
        response = http_request(url, method, headers, timeout)
    return response


def response_status(runner: CheckRunner, name: str, response: HttpResult, expected: int) -> bool:
    if response.status == expected:
        return runner.record(name, "PASS", f"HTTP {expected}")
    if response.error:
        return runner.record(name, "FAIL", f"request failed ({response.error})")
    return runner.record(name, "FAIL", f"expected HTTP {expected}, got {response.status}")


def json_body(response: HttpResult) -> dict[str, Any] | None:
    if not response.body:
        return None
    try:
        decoded = json.loads(response.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return decoded if isinstance(decoded, dict) else None


def check_live(runner: CheckRunner, api_url: str, web_url: str, timeout: float, expected_mode: str, expected_persistence: str) -> None:
    health = request_with_retry(f"{api_url}/health", "GET", {}, timeout)
    if response_status(runner, "Live API health", health, 200):
        health_body = json_body(health)
        if health_body and health_body.get("status") == "ok":
            runner.record("Live API health payload", "PASS", "status=ok")
        else:
            runner.record("Live API health payload", "FAIL", "status marker is missing")

        required_headers = {
            "x-content-type-options": "nosniff",
            "x-frame-options": "deny",
            "referrer-policy": "no-referrer",
            "permissions-policy": "camera=(), microphone=(), geolocation=()",
            "x-permitted-cross-domain-policies": "none",
            "x-robots-tag": "noindex, nofollow, noarchive",
            "cache-control": "no-store",
        }
        missing_headers = [
            name
            for name, expected in required_headers.items()
            if health.headers.get(name, "").strip().lower() != expected
        ]
        if api_url.startswith("https://") and "max-age=31536000" not in health.headers.get("strict-transport-security", ""):
            missing_headers.append("strict-transport-security")
        if missing_headers:
            runner.record("Live API security headers", "FAIL", f"missing or incorrect: {', '.join(missing_headers)}")
        else:
            runner.record("Live API security headers", "PASS", "defensive headers and HTTPS HSTS are present")
    else:
        runner.skip("Live API security headers", "health request did not return a usable response")
        runner.skip("Live CORS allowed origin", "API health unavailable")
        runner.skip("Live CORS rejects foreign origin", "API health unavailable")
        runner.skip("Live public bootstrap", "API health unavailable")
        runner.skip("Live public safety contract", "API health unavailable")
        runner.skip("Live OpenAPI", "API health unavailable")
        return

    allowed_preflight = http_request(
        f"{api_url}/api/v1/bootstrap",
        "OPTIONS",
        {
            "Origin": web_url,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        },
        timeout,
    )
    allowed_ok = allowed_preflight.status == 200 and allowed_preflight.headers.get("access-control-allow-origin") == web_url
    credentials_header = allowed_preflight.headers.get("access-control-allow-credentials", "").strip()
    if allowed_ok and not credentials_header:
        runner.record("Live CORS allowed origin", "PASS", "frontend origin is exact and credentialed CORS is disabled")
    else:
        runner.record("Live CORS allowed origin", "FAIL", "exact frontend preflight policy did not match")

    blocked_preflight = http_request(
        f"{api_url}/api/v1/bootstrap",
        "OPTIONS",
        {
            "Origin": "https://not-noah.example",
            "Access-Control-Request-Method": "GET",
        },
        timeout,
    )
    if blocked_preflight.status == 400 and "access-control-allow-origin" not in blocked_preflight.headers:
        runner.record("Live CORS rejects foreign origin", "PASS", "untrusted origin rejected")
    else:
        runner.record("Live CORS rejects foreign origin", "FAIL", "untrusted origin was not rejected")

    bootstrap = http_request(
        f"{api_url}/api/v1/bootstrap",
        "GET",
        {"X-Noah-Public-Workspace": "release-check"},
        timeout,
    )
    if not response_status(runner, "Live public bootstrap", bootstrap, 200):
        runner.skip("Live public safety contract", "bootstrap request did not return JSON")
    else:
        payload = json_body(bootstrap)
        if payload is None:
            runner.record("Live public safety contract", "FAIL", "bootstrap is not a JSON object")
        elif contains_secret_format(bootstrap.body.decode("utf-8", errors="replace")):
            runner.record("Live public safety contract", "FAIL", "credential-like format appeared in bootstrap")
        else:
            failures: list[str] = []
            if payload.get("public_demo") is not True:
                failures.append("public_demo")
            execution = payload.get("execution")
            if not isinstance(execution, dict) or execution.get("external_effects_enabled") is not False:
                failures.append("external_effects_enabled")
            persistence = payload.get("persistence")
            if not isinstance(persistence, dict) or persistence.get("mode") != expected_persistence:
                failures.append(f"persistence={expected_persistence}")

            public_ai = payload.get("public_ai")
            if not isinstance(public_ai, dict):
                failures.append("public_ai")
            else:
                if public_ai.get("mode") != "scheduled":
                    failures.append("public_ai.mode=scheduled")
                effective_mode = public_ai.get("effective_mode")
                if effective_mode not in {"synthetic", "nebius"}:
                    failures.append("public_ai.effective_mode")
                if expected_mode != "auto" and effective_mode != expected_mode:
                    failures.append(f"public_ai.effective_mode={expected_mode}")
                if effective_mode == "synthetic" and public_ai.get("provider") is not None:
                    failures.append("synthetic provider marker")
                if effective_mode == "nebius" and public_ai.get("provider") != "nebius":
                    failures.append("nebius provider marker")

            providers = payload.get("providers")
            primary = providers.get("primary") if isinstance(providers, dict) else None
            free_sandbox = providers.get("free_sandbox") if isinstance(providers, dict) else None
            if not isinstance(primary, dict) or primary.get("name") != "nebius":
                failures.append("primary=nebius")
            if not isinstance(free_sandbox, dict) or free_sandbox.get("model_policy") != "nvidia-nemotron-only" or free_sandbox.get("model_allowed") is not True:
                failures.append("free sandbox NVIDIA-only policy")

            if failures:
                runner.record("Live public safety contract", "FAIL", f"failed markers: {', '.join(failures)}")
            else:
                effective = public_ai.get("effective_mode") if isinstance(public_ai, dict) else "unknown"
                runner.record(
                    "Live public safety contract",
                    "PASS",
                    f"public demo safe; effective_mode={effective}; persistence={expected_persistence}; no secrets",
                )

    web = http_request(web_url, "GET", {}, timeout)
    if response_status(runner, "Live frontend", web, 200):
        html = web.body.decode("utf-8", errors="replace").lower()
        required_markers = ("content-security-policy", "object-src 'none'", "frame-src 'none'", "script-src 'self'")
        missing_markers = [marker for marker in required_markers if marker not in html]
        if missing_markers:
            runner.record("Live frontend CSP", "FAIL", f"missing markers: {', '.join(missing_markers)}")
        elif contains_secret_format(html):
            runner.record("Live frontend CSP", "FAIL", "credential-like format appeared in frontend")
        else:
            runner.record("Live frontend CSP", "PASS", "CSP marker present and bundle contains no credential-like format")
    else:
        runner.skip("Live frontend CSP", "frontend request did not return HTML")

    openapi = http_request(f"{api_url}/openapi.json", "GET", {}, timeout)
    response_status(runner, "Live OpenAPI", openapi, 200)


def write_evidence(path: Path, runner: CheckRunner, *, live: bool, promptfoo: bool) -> None:
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    passed = sum(result.status == "PASS" for result in runner.results)
    failed = sum(result.status == "FAIL" for result in runner.results)
    skipped = sum(result.status == "SKIP" for result in runner.results)
    lines = [
        "# Reproducible release check",
        "",
        f"- Generated: {generated_at}",
        f"- Scope: local checks + {'safe live GET/OPTIONS checks' if live else 'no live checks'}",
        f"- Provider calls: none ({'live requests were GET/OPTIONS only' if live else 'offline child environment cleared provider/database credentials'})",
        f"- Promptfoo local evaluation: {'included' if promptfoo else 'not included; run with --promptfoo'}",
        f"- Results: {passed} passed, {failed} failed, {skipped} skipped",
        "- Secrets: values are not recorded; subprocess output and response bodies are withheld.",
        "",
        "## Checks",
        "",
    ]
    for result in runner.results:
        duration = f" ({result.duration_ms} ms)" if result.duration_ms is not None else ""
        lines.append(f"- [{result.status}] {result.name}: {result.detail}{duration}")
    lines.append("")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--live", action="store_true", help="also verify the public Render API and frontend")
    mode.add_argument("--local-only", action="store_true", help="run only offline repository checks (the default)")
    parser.add_argument("--promptfoo", action="store_true", help="include the offline deterministic Promptfoo evaluation")
    parser.add_argument("--audit", action="store_true", help="include npm audit; this contacts the npm registry")
    parser.add_argument("--require-clean", action="store_true", help="fail if the working tree has uncommitted changes")
    parser.add_argument("--write-evidence", action="store_true", help="write the redacted release evidence file")
    parser.add_argument("--api-url", default=os.getenv("NOAH_RELEASE_API_URL", DEFAULT_API_URL))
    parser.add_argument("--web-url", default=os.getenv("NOAH_RELEASE_WEB_URL", DEFAULT_WEB_URL))
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_SECONDS)
    parser.add_argument(
        "--expected-public-mode",
        choices=("auto", "synthetic", "nebius"),
        default="auto",
        help="assert the current scheduled public mode; auto accepts either safe state",
    )
    parser.add_argument("--expected-persistence", default="postgres-jsonb")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    runner = CheckRunner()
    python = api_python()
    npm = npm_command()
    offline_env = offline_environment()

    if args.require_clean:
        check_clean_tree(runner)
    else:
        runner.skip("Clean working tree", "not required; use --require-clean before freeze")

    check_static_contract(runner)
    runner.command("Repository whitespace", ["git", "diff", "--check"])
    runner.command("Tracked secret scan", [python, str(ROOT / "scripts" / "check_secrets.py")], env=offline_env)
    runner.command("Web typecheck", [npm, "run", "typecheck"], env=offline_env)
    runner.command("Web lint", [npm, "run", "lint"], env=offline_env)
    runner.command("Web tests", [npm, "run", "test"], env=offline_env)
    runner.command("Web build", [npm, "run", "build"], env=offline_env)
    runner.command("API tests", [python, "-m", "pytest", "-q"], cwd=API_ROOT, env=offline_env)
    runner.command(
        "API compile check",
        [
            python,
            "-m",
            "py_compile",
            "scripts/release_check.py",
            "services/api/main.py",
            "services/api/onboarding.py",
            "services/api/providers.py",
            "services/api/providers_nim.py",
            "services/api/policies/guardrails.py",
            "services/api/workflows/nvidia_workflow.py",
            "services/api/storage.py",
            "services/api/secrets_store.py",
            "services/api/connectors/gmail.py",
            "services/api/connectors/calendar.py",
        ],
        env=offline_env,
    )
    runner.command("API deterministic smoke", [python, str(ROOT / "scripts" / "smoke_api.py")], env=offline_env)
    runner.command("OpenAPI export", [python, str(ROOT / "scripts" / "export_openapi.py")], env=offline_env)
    runner.command("OpenAPI is committed", ["git", "diff", "--exit-code", "--", "contracts/openapi.yaml"])

    if args.promptfoo:
        runner.command("Promptfoo local offline evaluation", [npm, "run", "eval:promptfoo:local"], env=offline_env)
    else:
        runner.skip("Promptfoo local offline evaluation", "not requested; use --promptfoo")

    if args.audit:
        runner.command("npm production audit", [npm, "audit", "--omit=dev", "--audit-level=high"], env=offline_env)
    else:
        runner.skip("npm production audit", "not requested; use --audit")

    if args.live:
        try:
            api_url = normalize_base_url(args.api_url, "--api-url")
            web_url = normalize_base_url(args.web_url, "--web-url")
        except ValueError as exc:
            runner.record("Live URL contract", "FAIL", str(exc))
        else:
            runner.record("Live URL contract", "PASS", "origins are explicit http(s) URLs without credentials")
            check_live(
                runner,
                api_url,
                web_url,
                max(1.0, args.timeout),
                args.expected_public_mode,
                args.expected_persistence,
            )
    else:
        runner.skip("Live deployment checks", "not requested; use --live")

    if args.write_evidence:
        evidence_path = ROOT / "docs" / "implementation" / "evidence" / "release-check.md"
        write_evidence(evidence_path, runner, live=args.live, promptfoo=args.promptfoo)
        print(f"Evidence written: {evidence_path}")

    passed = sum(result.status == "PASS" for result in runner.results)
    failed = sum(result.status == "FAIL" for result in runner.results)
    skipped = sum(result.status == "SKIP" for result in runner.results)
    print(f"Release check summary: {passed} passed, {failed} failed, {skipped} skipped")
    return 1 if runner.failed() else 0


if __name__ == "__main__":
    raise SystemExit(main())
