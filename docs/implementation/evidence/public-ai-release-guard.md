# Public AI release guard

> Implemented 2026-09-05. This record contains no provider keys, OAuth
> credentials, database URLs, model responses, or private user data.

## Decision

The public Render surface stays in deterministic synthetic mode until the
server-side schedule opens. The release baseline is:

- `NOAH_PUBLIC_AI_MODE=scheduled`
- `NOAH_PUBLIC_AI_OPEN_AT=2026-10-27T17:00:00Z`
- `NOAH_PUBLIC_AI_DEADLINE_AT=2026-10-30T17:00:00Z`
- `NOAH_PUBLIC_MODEL_USAGE_LIMIT=20`
- `NOAH_PUBLIC_BYOK_USAGE_LIMIT=5`

The official deadline is outside this repository's runtime logic; the UTC
window is an operator-controlled safety window. Render remains manual deploy
only, and the open time is not advanced during routine testing.

## Runtime behavior

1. Before the window, public messages and onboarding extraction return a
   deterministic result or an honest manual-path error. They do not call
   Nebius, NVIDIA NIM, or OpenCode2API.
2. Inside the window, server-funded public calls go directly to the configured
   Nebius endpoint and require a NVIDIA Nemotron model. A process-local global
   budget is shared across browser workspaces and does not write visitor state
   to Neon.
3. A quota, billing, 402, or 429 response marks the server-funded budget
   exhausted. The UI states that the promotional credit is unavailable and
   continues with the synthetic proposal loop.
4. A reviewer may provide a NVIDIA NIM or Nebius key for the current browser
   session. The API chooses the fixed destination, validates Nemotron, applies
   a separate BYOK cap, and never persists or logs the key. No base URL is
   accepted from the browser.
5. External Gmail/Calendar effects remain disabled and all proposal actions
   remain behind approval.

## Verification

- Python tests cover the pre-window no-call path, one global server-funded
  budget across two browsers, quota stop behavior, BYOK provenance, Nemotron
  validation, and absence of the BYOK key from the response/tenant snapshot.
- Frontend tests and build cover the existing console; typecheck and lint pass
  with the public runtime panel and in-memory key handling.
- Render verification remains a manual post-commit step: set only the listed
  nonsecret policy variables, deploy both services from the commit, and confirm
  `bootstrap.public_ai` reports `mode=scheduled`, `effective_mode=synthetic`
  before the opening timestamp.
