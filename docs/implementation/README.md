# Implementation record

The current operational source of truth is [STATE.md](STATE.md). It defines
the active provider route, integration order, gates, and anti-drift rules.

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

Follow [STATE.md](STATE.md) instead of starting integrations from this record.
The active order is:

1. Configure Nebius server-side with a conservative usage limit and smoke-test
   a real Nemotron response without enabling external effects.
2. Reproduce the demo manually on the chosen host, aligning the API URL and
   CORS origin; Vercel is out of scope.
3. Optionally test OpenCode2API as the synthetic-only free sandbox and verify
   its `ProviderResult` provenance.
4. Add Google OAuth test users and smoke-test Gmail/Calendar behind approval.
5. Defer Supabase durable persistence until the demo explicitly needs state
   across restarts.
6. Run the tenant, approval, retry, calendar, monetary, document, and
   prompt-injection evaluations after connected evidence exists.
