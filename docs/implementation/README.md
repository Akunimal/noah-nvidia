# Implementation record

## Vertical slice

The first slice proves the central behavior: an owner asks for work, Noah
plans it with an NVIDIA model when configured, creates a typed action, and
waits for a human decision. Approving an action changes its persisted state
but does not pretend to have sent an email or changed a calendar until a real
connector records an external receipt.

## Decisions carried from the plan

- The new display name is Noah Nvidia.
- The local project directory is C:\Noe\noah-nvidia and the repository slug is
  noah-nvidia.
- React and Postgres/Supabase are infrastructure. AI generation, embeddings,
  guardrails, and agent orchestration use NVIDIA technology.
- Nebius is the preferred connected route. OpenCode2API is an explicit,
  synthetic-only free route supplied by the operator.
- Gmail and Google Calendar are the initial external platforms; WhatsApp is an
  adapter boundary for a later phase, not a fake button in this MVP.
- External effects default to ask. Reading, searching, summarizing, drafts, and
  internal tasks may be automatic.
- The app works while open; there are no background workers or cron jobs.
- Finance is administrative tracking and CSV export, not fiscal filing or bank
  movement.

## Phase evidence

Phase 0 is represented by provider manifest and environment contracts. Phase 1
is the independent repository and new UI. Phase 2 is the API lifecycle,
tenant-derived auth boundary, idempotency fingerprinting, and SQL baseline.
Phases 3–5 have explicit adapter seams and demo fixtures; real Nebius,
Google OAuth, embeddings, parse, and reranking require operator credentials and
must be smoke-tested before claiming connected-demo completion.

## Next execution steps

1. Create a separate Supabase project and apply the baseline migration.
2. Add Google Cloud OAuth test users and implement Gmail/Calendar connector
   receipts behind the existing approval boundary.
3. Install Python 3.12, then add NeMo Agent Toolkit and NeMo Guardrails
   workflow registration around the provider adapter.
4. Smoke-test Nebius /v1/models and a structured Nemotron response; record
   model IDs and timestamps without committing keys.
5. Run tenant, approval, retry, calendar conflict, monetary arithmetic,
   document, and prompt-injection evaluations.
