# Noah Nvidia

Noah Nvidia is a supervised virtual employee for service businesses. An owner
describes an outcome in plain language; Noah reads authorized context, prepares
typed work, and leaves every external effect behind an explicit approval and a
verifiable receipt.

The repository is a clean extraction inspired by the commercial Phoenix
Command Console donor. The donor remains untouched and no production code,
history, credentials, database, customer data, fiscal module, or deployment
configuration is included. See [DONOR_PROVENANCE.md](DONOR_PROVENANCE.md) for
the boundary.

## Implemented vertical slice

- New dark React/Vite console branded **Noah Nvidia** with Overview, Assistant,
  Approvals, Mailroom, Calendar, Finance, Knowledge, and Settings views.
- FastAPI `/api/v1` contracts for bootstrap, conversations, runs, approvals,
  services, contacts, tasks, quotes, ledger, receivables, documents, search,
  mail, calendar, quote PDF export, Google OAuth lifecycle, and audit history.
- Tenant-scoped identity dependency, idempotency fingerprints, run leases,
  cancellation, approval hash checks, expiry checks, deterministic execution,
  and visible provider errors.
- NVIDIA routes only: Nebius Token Factory for the connected Nemotron path, an
  opt-in synthetic OpenCode2API Nemotron route, and adapters for Nemotron Embed
  1B, Llama Nemotron Rerank, and Nemotron Parse.
- NVIDIA NeMo Agent Toolkit and NeMo Guardrails registration seams. The CPU
  demo applies deterministic guardrails and can boot without optional packages;
  connected deployments can install the pinned NVIDIA extras.
- Server-only PostgreSQL JSONB tenant snapshots, one-use OAuth PKCE state,
  private encrypted connection secrets, typed actions, external effect
  receipts, administrative money records, documents, payments, audit events,
  and usage reservations.
- Server-only AES-GCM envelope for Google tokens. The browser never receives a
  service key or encrypted credential.
- Synthetic Atlas Services fixtures and reproducible tests. When a connector
  or model is not configured, the API returns a clearly labeled sandbox result
  and never claims that Gmail, Calendar, or a financial effect succeeded.

## Onboarding workstream

The onboarding contract and staged delivery live in
[docs/implementation/onboarding-roadmap.md](docs/implementation/onboarding-roadmap.md).
The video demo may use the synthetic Atlas fixture in `tenant-demo`; every
other authenticated playground tenant now starts empty and is visibly labeled
as such. It can be configured through the next natural-language wizard phase.
User-provided onboarding text is reserved for the Nebius /
NVIDIA route. OpenCode2API remains synthetic-only, and skip explicitly loads
fictional Atlas data without external effects. The versioned data contract is
[contracts/onboarding.v1.schema.json](contracts/onboarding.v1.schema.json).

## Local development

Requirements: Node 20+ and Python 3.12.

```powershell
cd C:\Noe\noah-nvidia
npm install
Copy-Item .env.example .env.local
npm run dev
```

In a second terminal:

```powershell
cd C:\Noe\noah-nvidia\services\api
uv venv --python 3.12 .venv
uv pip install -r requirements-dev.txt --python .venv\Scripts\python.exe
Copy-Item .env.example .env
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

The frontend runs at http://localhost:5173. It shows the local sandbox while
the API is sleeping and uses `VITE_NOAH_AUTH_TOKEN` for the demo owner token.
The API returns OpenAPI at http://localhost:8000/docs.

## NVIDIA and connected configuration

Copy `services/api/.env.example` into the server environment. Set
`NOAH_NEBIUS_API_KEY` for the preferred Nebius route, or set
`NOAH_OPENCODE2API_BASE_URL` for a synthetic-only free Nemotron gateway.
Set `NOAH_OPENCODE2API_MODEL` only to an NVIDIA Nemotron identifier (the
default is `nemotron-3-ultra-free`). The API rejects non-NVIDIA request or
response model identifiers before accepting their text. OpenCode2API is a
gateway supplied by the operator, not an NVIDIA product; do not send private
customer data to it.

For document retrieval, set `NOAH_NVIDIA_NIM_API_KEY`. The adapters enforce
2048-dimensional Nemotron Embed 1B vectors and keep ranking on NVIDIA's
dedicated reranking endpoint. Install `requirements-nvidia.txt` only on a
connected worker that has enough memory for `nvidia-nat==1.8.0` and
`nemoguardrails==0.24.0`.

Google OAuth requires server-only `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REDIRECT_URI`, and `NOAH_CONNECTION_ENCRYPTION_KEY`. Set
`NOAH_ENABLE_EXTERNAL_EFFECTS=true` only for a test account after reviewing
the exact approval payloads. The default is false, so an approved action in a
local demo produces a failed sandbox receipt rather than a false success.

For durable state, set server-only `NOAH_DATABASE_URL` to a PostgreSQL
connection string. The API creates the two small tables it needs on first use;
the equivalent reviewable SQL is:

```text
services/api/storage_schema.sql
```

The in-memory mode remains the reproducible default when the variable is
empty. The database URL and encrypted token envelopes never reach Vite or the
browser. Nebius remains the inference provider; PostgreSQL only stores state.

Uploaded documents stay server-side; the browser receives metadata only. Text
files can be indexed when NVIDIA embeddings are configured, while image pages
remain in human review until the Nemotron Parse endpoint is configured. Quote
PDFs are labeled “not a tax invoice” and contain no fiscal calculations.

## API surface

All business routes use `/api/v1` and derive the tenant from the authenticated
request. The main flow is:

1. `POST /conversations/{id}/messages` stores an owner request and creates a
   run plus typed action proposal.
2. `GET /actions?status=awaiting_approval` returns the exact payload and hash.
3. `POST /actions/{id}/approve` requires that hash and creates an expiring
   approval record.
4. `POST /runs/{id}/advance` obtains a lease, executes internal work or a
   configured Gmail/Calendar connector, and stores an effect receipt.
5. `GET /audit` exposes the sanitized evidence trail.

Extraordinary quote discounts create a separate `quotes.apply_discount`
approval before the quote can be sent. Accepted quotes create a receivable;
payments are recorded in integer minor units and remain tenant-scoped.

The generated contract lives at [contracts/openapi.yaml](contracts/openapi.yaml).
Regenerate it with:

```powershell
services\api\.venv\Scripts\python.exe scripts\export_openapi.py
```

## Validation

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
cd services\api
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\python.exe ..\..\scripts\smoke_api.py
.venv\Scripts\python.exe -m py_compile main.py providers.py providers_nim.py policies\guardrails.py workflows\nvidia_workflow.py storage.py secrets_store.py connectors\gmail.py connectors\calendar.py
```

The tests cover tenant isolation, approval hash and replay behavior, run
leases and cancellation, no-false-success execution, integer minor-unit
calculations, partial payments, document review/quarantine, OAuth state reuse,
and provider URL normalization.

## Hackathon status and honest limits

The project is prepared for the Nebius Global AI Hackathon Best Apps and Agents
category. The code contains the NVIDIA/Nebius seams and the full deterministic
demo circuit. A connected submission still requires operator-supplied Nebius,
Google OAuth, PostgreSQL, Render, and NVIDIA NIM credentials plus real smoke
evidence. WhatsApp, voice, bank movement, fiscal filing, autonomous browsing,
and always-on background work remain outside this delivery.

## License

Apache-2.0. The donor provenance and third-party boundaries are documented
separately.
