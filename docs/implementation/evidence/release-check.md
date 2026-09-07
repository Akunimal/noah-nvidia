# Reproducible release check

- Generated: 2026-09-07T09:26:35.944786Z
- Scope: local checks + safe live GET/OPTIONS checks
- Provider calls: none (live requests were GET/OPTIONS only)
- Promptfoo local evaluation: included
- Results: 27 passed, 0 failed, 1 skipped
- Secrets: values are not recorded; subprocess output and response bodies are withheld.

## Checks

- [PASS] Clean working tree: no uncommitted changes (46 ms)
- [PASS] Render safety contract: scheduled demo, synthetic fallback, and external effects are bounded
- [PASS] Frontend CSP contract: restrictive CSP marker is present
- [PASS] API request-limit contract: 8 MiB default is documented
- [PASS] Repository whitespace: completed (38 ms)
- [PASS] Tracked secret scan: completed (334 ms)
- [PASS] Web typecheck: completed (2676 ms)
- [PASS] Web lint: completed (5194 ms)
- [PASS] Web tests: completed (1921 ms)
- [PASS] Web build: completed (5252 ms)
- [PASS] API tests: completed (4709 ms)
- [PASS] API compile check: completed (324 ms)
- [PASS] API deterministic smoke: completed (1386 ms)
- [PASS] OpenAPI export: completed (1452 ms)
- [PASS] OpenAPI is committed: completed (42 ms)
- [PASS] Promptfoo local offline evaluation: completed (12451 ms)
- [SKIP] npm production audit: not requested; use --audit
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
