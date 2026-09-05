# Implementation record

The current operational source of truth is [STATE.md](STATE.md). It defines
the active provider route, integration order, gates, and anti-drift rules.
The active onboarding workstream is specified in
[onboarding-roadmap.md](onboarding-roadmap.md), with its JSON contract in
`contracts/onboarding.v1.schema.json`.

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
- React and PostgreSQL are infrastructure. AI generation, embeddings,
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
and tenant-safe persistence contracts. Phases 3–5 now include deterministic Guardrails, NVIDIA
embedding/rerank/Parse adapters, Google OAuth+PKCE exchange, server-side token
envelopes, Gmail/Calendar connector execution, documents, quotes, receivables,
payments, and CSV export. Real Nebius, Google, embeddings, parse, and reranking
still require operator credentials and smoke evidence before claiming a
connected demo.

The onboarding phases 0, 1 and 2 are closed locally. The contract keeps
`tenant-demo` with the synthetic Atlas fixture for the video and the runtime
starts every other authenticated tenant empty, with no demo connection
fallback. User-provided onboarding text remains reserved for the Nebius/NVIDIA
route, and OpenCode2API remains synthetic-only. Extraction is a reviewable
draft; the phase 2 shell previews that review locally, while only a later
explicit completion can apply it. Skip shows the synthetic-data warning but
does not seed anything until phase 4.

## Next execution steps

Follow [STATE.md](STATE.md) instead of starting integrations from this record.
The active order is:

1. Replace the phase 2 local draft transition with Nebius extraction while
   preserving review-only behavior.
2. Add confirm/skip persistence, idempotency, and restart recovery on Neon.
3. Run the original tenant, approval, retry, calendar, monetary, document,
   and prompt-injection evaluations after connected evidence exists.
4. Add the guided tour only after onboarding is complete and verified.
