# Noah Nvidia implementation plan

This checklist materializes the approved virtual employee plan for the
hackathon. Each phase has an observable exit condition and a truthful status.

| Phase | Deliverable | Exit condition | Status in this commit |
|---|---|---|---|
| 0 · Viability | Nebius/NVIDIA provider manifest, free-route policy, hosting limits | Real provider smoke tests recorded without secrets | Contract ready; credentials required |
| 1 · Extraction | Independent repository, new UI, fixtures, license, CI | App builds without donor imports or credentials | Implemented |
| 2 · Foundations | Tenant boundary, typed runs/actions, approval and idempotency | Duplicate approval/retry cannot duplicate a decision | Implemented in API and SQL baseline |
| 3 · NVIDIA agent | NeMo Agent Toolkit seam, NeMo Guardrails boundary, Nemotron router | Normal requests produce proposals and injection is blocked | Deterministic guardrail and optional Toolkit registration implemented |
| 4 · Google | Gmail read/draft/send and Calendar freebusy/events | Read, propose, approve, execute, reconcile with external receipt | Connector boundaries ready; OAuth smoke test pending |
| 5 · Administration | Quotes, ledger, receivables, CSV, document retrieval | Decimal-safe totals and source evidence | SQL schema, fixture, and UI slice implemented |
| 6 · Product | Summary, assistant, approvals, mail, agenda, finance, knowledge, settings | Five demo paths are usable from a clean browser | UI vertical slice implemented |
| 7 · Hardening | E2E, concurrency, prompt injection, cost and memory checks | No critical isolation or duplicate-effect failures | API/UI deterministic tests implemented; external tests pending |
| 8–9 · Presentation | README, demo script, public video, reviewer account | Links work and connected demo is reproducible | README and script prepared; operator credentials/video pending |

## Requirement to evidence map

| Requirement | Implementation evidence |
|---|---|
| Name and repository isolation | Repository root, package names, title metadata, and DONOR_PROVENANCE.md |
| Dark UI with new CSS | apps/web/src/styles/noah-nvidia.css |
| Owner supervision | apps/web/src/lib/authority.ts, approval cards, policies/guardrails.py |
| No false execution claims | API action status and external connector receipt contracts |
| NVIDIA-only AI routes | services/api/providers.py, providers_nim.py, workflow manifest |
| Free Nemotron endpoint | NOAH_OPENCODE2API_BASE_URL, synthetic-only route |
| Nebius hackathon route | NOAH_NEBIUS_* environment contract and provider manifest |
| Gmail and Calendar seam | services/api/connectors/gmail.py and calendar.py |
| Administrative money safety | integer minor units in SQL and Atlas fixture |
| Tenant isolation | tenant-derived dependency, RLS policies, API tests |
| Reproducibility | package locks, pinned requirements, render.yaml, fixtures |

The remaining statuses are intentionally explicit. A model key, Google OAuth
client, Supabase project, Render service, or public video cannot be fabricated
inside source control. Once those are supplied, the smoke tests in the plan
must be run and their evidence added under docs/implementation/evidence/.
