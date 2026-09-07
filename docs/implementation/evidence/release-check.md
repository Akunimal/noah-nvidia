# Reproducible release check

- Generated: 2026-09-07T09:44:19.266047Z
- Scope: local checks + safe live GET/OPTIONS checks
- Provider calls: none (live requests were GET/OPTIONS only)
- Promptfoo local evaluation: included
- Results: 28 passed, 0 failed, 0 skipped
- Secrets: values are not recorded; subprocess output and response bodies are withheld.

## Checks

- [PASS] Clean working tree: no uncommitted changes (40 ms)
- [PASS] Render safety contract: scheduled demo, synthetic fallback, and external effects are bounded
- [PASS] Frontend CSP contract: restrictive CSP marker is present
- [PASS] API request-limit contract: 8 MiB default is documented
- [PASS] Repository whitespace: completed (38 ms)
- [PASS] Tracked secret scan: completed (334 ms)
- [PASS] Web typecheck: completed (2494 ms)
- [PASS] Web lint: completed (2287 ms)
- [PASS] Web tests: completed (1905 ms)
- [PASS] Web build: completed (4835 ms)
- [PASS] API tests: completed (4312 ms)
- [PASS] API compile check: completed (299 ms)
- [PASS] API deterministic smoke: completed (1247 ms)
- [PASS] OpenAPI export: completed (1322 ms)
- [PASS] OpenAPI is committed: completed (37 ms)
- [PASS] Promptfoo local offline evaluation: completed (9498 ms)
- [PASS] npm production audit: completed (1610 ms)
- [PASS] Live URL contract: origins are explicit http(s) URLs without credentials
- [PASS] Live API health: HTTP 200
- [PASS] Live API health payload: status=ok
- [PASS] Live API security headers: defensive headers and HTTPS HSTS are present
- [PASS] Live CORS allowed origin: frontend origin is exact and credentialed CORS is disabled
- [PASS] Live CORS rejects foreign origin: untrusted origin rejected
- [PASS] Live public bootstrap: HTTP 200
- [PASS] Live public safety contract: public demo safe; effective_mode=synthetic; persistence=postgres-jsonb; no secrets
- [PASS] Live frontend: HTTP 200
- [PASS] Live frontend CSP: CSP marker present and bundle contains no credential-like format
- [PASS] Live OpenAPI: HTTP 200
