# Noah Nvidia API

FastAPI service for the supervised employee lifecycle. Every request resolves
one tenant, every proposed effect carries an arguments hash, and every
approved execution ends in an internal or external receipt.

## Run

```powershell
uv venv --python 3.12 .venv
uv pip install -r requirements-dev.txt --python .venv\Scripts\python.exe
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Use `services/api/.env.example` as the server-only configuration template. The
default process uses synthetic Atlas Services fixtures and an in-memory
store. Set the server-only `NOAH_DATABASE_URL` to enable the PostgreSQL JSONB
repository; the API creates its tables on first use. Keep the database URL out
of the browser. The schema is also checked in at `storage_schema.sql`.

## Provider policy

`NOAH_NEBIUS_API_KEY` selects the Nebius Token Factory Nemotron route.
`NOAH_OPENCODE2API_BASE_URL` selects an explicit free Nemotron sandbox and
must receive synthetic fixtures only. The API reports provider errors instead
of silently switching to an unrelated model. NVIDIA NIM retrieval adapters
require `NOAH_NVIDIA_NIM_API_KEY` and enforce 2048-dimensional embeddings.

Install `requirements-nvidia.txt` only on a connected worker that can run the
pinned NeMo Agent Toolkit and NeMo Guardrails packages. The CPU API keeps the
same deterministic policy boundary when those optional packages are absent.

## Execution policy

`POST /api/v1/actions/{id}/approve` requires the current `arguments_hash`.
Approval creates a 24-hour server-side record. `POST /api/v1/runs/{id}/advance`
takes a short lease, skips completed effect keys, and invokes only the
deterministic executor. Internal ledger/task effects can succeed in the demo;
Gmail and Calendar require a connected OAuth token and
`NOAH_ENABLE_EXTERNAL_EFFECTS=true`. With that flag off the API returns a
failed sandbox receipt, never a success message.

Google OAuth uses a one-use state and PKCE verifier. Tokens are encrypted with
AES-GCM using `NOAH_CONNECTION_ENCRYPTION_KEY`; bootstrap responses redact the
encrypted envelope. Gmail and Calendar connectors handle read/sync, draft,
send, freebusy, create, update, and delete boundaries.

`GET /api/v1/quotes/{quote_id}/pdf` returns a deterministic, non-fiscal quote
artifact. Document uploads are bounded at 5 MB and ten PDF pages; image uploads
stay in review until the configured NVIDIA Nemotron Parse adapter extracts text.

## Checks

```powershell
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\python.exe -m py_compile main.py providers.py providers_nim.py policies\guardrails.py workflows\nvidia_workflow.py storage.py secrets_store.py connectors\gmail.py connectors\calendar.py
```
