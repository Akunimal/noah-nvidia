# Implementation record

## Vertical slice

The first slice proves the central behavior: an owner asks for work, Noah
plans it with an NVIDIA model when configured, creates a typed action, and
waits for a human decision. Approving an action changes its persisted state
but does not pretend to have sent an email or changed a calendar until a real
connector records an external receipt. Internal ledger and task effects use the
same receipt contract and can complete in the synthetic demo.

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
tenant-derived auth boundary, idempotency fingerprinting, leases, cancellation,
and SQL baseline. Phases 3–5 now include deterministic Guardrails, NVIDIA
embedding/rerank/Parse adapters, Google OAuth+PKCE exchange, server-side token
envelopes, Gmail/Calendar connector execution, documents, quotes, receivables,
payments, and CSV export. Real Nebius, Google, embeddings, parse, and reranking
still require operator credentials and smoke evidence before claiming a
connected demo.

## Next execution steps

1. Create a separate Supabase project and wire the server-side repository into
   production persistence.
2. Add Google Cloud OAuth test users, run the sync path, and smoke-test Gmail/
   Calendar receipts behind the existing approval boundary.
3. Install the pinned NVIDIA extras on a connected worker and exercise the NeMo
   Agent Toolkit/Guardrails registration path under its memory budget.
4. Smoke-test Nebius `/v1/models` and a structured Nemotron response; record
   model IDs and timestamps without committing keys.
5. Run tenant, approval, retry, calendar conflict, monetary arithmetic,
   document, and prompt-injection evaluations.
