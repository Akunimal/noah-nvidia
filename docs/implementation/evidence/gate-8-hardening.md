# Gate 8 — Hardening baseline

> Updated 2026-09-06. This record contains no provider keys, OAuth tokens,
> database URLs, reviewer BYOK values, model responses, or private data.

## Scope closed locally

- API CORS now accepts only exact `http`/`https` origins without wildcards,
  paths, query strings, fragments, or embedded user information. Credentialed
  cross-origin requests are disabled because the browser uses bearer headers,
  not cookies.
- API responses receive defensive headers: `nosniff`, frame denial, no referrer,
  restrictive permissions, no cross-domain policy, no indexing, and
  `Cache-Control: no-store`. HTTPS responses also receive HSTS.
- A global request-body limit defaults to 8 MiB, caps configured values at
  16 MiB, rejects malformed `Content-Length`, and also bounds chunked
  `POST`/`PUT`/`PATCH` bodies. Document validation retains its 5 MiB raw limit.
- Optional idempotency keys are limited to 200 safe characters. Onboarding
  keeps its existing required-key error while rejecting unsafe key formats.
- The frontend bundle declares a CSP allowing only its own assets, the known
  Render API, loopback development API/WebSocket endpoints, and Google Fonts.

## Verification

Executed from the repository on 2026-09-06:

```text
services/api/.venv/Scripts/python.exe -m pytest -q  -> 57 passed, 1 warning
npm run typecheck                              -> passed
npm run lint                                   -> passed
npm run build                                  -> passed
services/api/.venv/Scripts/python.exe -m py_compile ... -> passed
git diff --check                               -> passed
```

The warning is the existing Starlette/AnyIO deprecation warning from the test
client; it does not fail the suite.

## Pending release verification

- Push and manually deploy the API and web changes on Render.
- Verify live headers, preflight from the exact frontend origin, CSP, cold
  start, public synthetic fallback, and the private-auth Neon smoke separately.
- Keep the 2026-10-27 Nebius cutover and OpenCode2API deactivation as a later
  operator action; this baseline does not consume provider credit.
