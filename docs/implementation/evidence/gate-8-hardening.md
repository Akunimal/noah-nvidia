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

## Render verification

- API deploy `dep-daf0ncv40ujc7392grl0` and web deploy
  `dep-daf0o0id0e5s73aahf5g` are Live from commit `660b93b`.
- Live HTTP checks returned API health 200, all defensive headers including
  HSTS, an allowed preflight only for `https://noah-nvidia-web.onrender.com`,
  and a rejected external-origin preflight (400).
- The public web returned 200 with the CSP marker. The public bootstrap declared
  `public_demo=true`, `public_ai.mode=scheduled`,
  `public_ai.effective_mode=synthetic`, `external_effects=false`, and
  `persistence=postgres-jsonb`.
- Render build logs reported 0 npm vulnerabilities for the web bundle.

## Remaining release verification

- Repeat cold-start and full clean-browser smoke, plus the private-auth Neon
  smoke separately, before the final freeze.
- Keep the 2026-10-27 Nebius cutover and OpenCode2API deactivation as a later
  operator action; this baseline does not consume provider credit.
