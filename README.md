# Noah Nvidia

Noah Nvidia is a supervised virtual employee for service businesses. An owner
describes an outcome in plain language; Noah reads authorized context, plans
typed work, prepares drafts, and leaves every external effect behind an
explicit approval. The demo business is the synthetic Atlas Services.

The project is a fresh extraction inspired by the commercial Phoenix Command
Console donor. It does not copy the donor repository, its history, production
credentials, production database, fiscal module, or customer data. See
DONOR_PROVENANCE.md for the boundary.

## What is implemented

- A new dark console with Overview, Assistant, Approvals, Mailroom, Calendar,
  Finance, Knowledge, and Settings screens.
- A FastAPI run and approval API with tenant-derived identity, idempotency
  fingerprints, visible provider errors, and deterministic demo execution.
- NVIDIA model adapters for Nebius Token Factory and an optional user-supplied
  OpenCode2API free Nemotron gateway. The free gateway is marked synthetic-only.
- A provider manifest for Nemotron 3 Super, Nemotron 3 Embed 1B, NeMo Agent
  Toolkit, and NeMo Guardrails.
- A clean Supabase baseline migration with RLS, explicit grants, private
  connection secrets, typed actions, approvals, external effect receipts,
  business records, documents, and audit events.
- Synthetic Atlas Services fixtures and a reproducible implementation record.

Gmail and Google Calendar are represented by the demo connectors in this
vertical slice. Real OAuth credentials are intentionally injected at deploy
time; no credentials are committed. The deterministic boundary prevents the
model from claiming that a message was sent or an event was created without a
receipt.

## Local development

Requirements: Node 20+ and Python 3.12 for the API.

    cd C:\Noe\noah-nvidia
    npm install
    npm run dev

In a second terminal:

    cd C:\Noe\noah-nvidia\services\api
    python -m venv .venv
    .venv\Scripts\pip install -r requirements.txt
    .venv\Scripts\python -m uvicorn main:app --reload --port 8000

The frontend runs at http://localhost:5173 and uses demo mode when the API is
sleeping. To use a real NVIDIA route, copy services/api/.env.example to the
deployment environment and provide a Nebius key. For free synthetic tests,
provide NOAH_OPENCODE2API_BASE_URL. Never send customer or confidential data
to a free anonymous gateway.

## Validation

    npm run typecheck
    npm run lint
    npm run build
    npm run test

The API exposes GET /health, GET /api/v1/bootstrap, the conversation message
route, run lookup, and approve/reject action routes. The OpenAPI contract is in
contracts/openapi.yaml.

## Hackathon evidence

The implementation is designed for the Nebius Global AI Hackathon Best Apps
and Agents category. The connected demo route uses Nebius Token Factory with a
NVIDIA Nemotron model. NVIDIA embedding, orchestration, and guardrail
configuration are recorded in docs/implementation/provider-manifest.md.
Deployment must use separate free-tier Supabase and Render projects and
credentials supplied by the operator.

## License

Apache-2.0. Third-party notices and the donor boundary are documented
separately.
