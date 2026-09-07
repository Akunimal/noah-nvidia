# Reproducible release check

- Generated: 2026-09-07T09:29:50.262492Z
- Scope: local checks + safe live GET/OPTIONS checks
- Provider calls: none (live requests were GET/OPTIONS only)
- Promptfoo local evaluation: included
- Results: 28 passed, 0 failed, 0 skipped
- Secrets: values are not recorded; subprocess output and response bodies are withheld.

## Checks

- [PASS] Clean working tree: no uncommitted changes (43 ms)
- [PASS] Render safety contract: scheduled demo, synthetic fallback, and external effects are bounded
- [PASS] Frontend CSP contract: restrictive CSP marker is present
- [PASS] API request-limit contract: 8 MiB default is documented
- [PASS] Repository whitespace: completed (39 ms)
- [PASS] Tracked secret scan: completed (335 ms)
- [PASS] Web typecheck: completed (2648 ms)
- [PASS] Web lint: completed (2391 ms)
- [PASS] Web tests: completed (1907 ms)
- [PASS] Web build: completed (5026 ms)
- [PASS] API tests: completed (4562 ms)
- [PASS] API compile check: completed (308 ms)
- [PASS] API deterministic smoke: completed (1300 ms)
- [PASS] OpenAPI export: completed (1416 ms)
- [PASS] OpenAPI is committed: completed (44 ms)
- [PASS] Promptfoo local offline evaluation: completed (9385 ms)
- [PASS] npm production audit: completed (1753 ms)
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
