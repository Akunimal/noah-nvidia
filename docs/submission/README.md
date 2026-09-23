# Noah Nvidia — hackathon delivery pack

Status: working delivery materials, updated 2026-09-11. This folder is safe to
publish with the repository: it contains no API keys, OAuth tokens, database
URLs, private prompts, connected model responses, or real customer data.

## Submission at a glance

- Project: **Noah Nvidia**
- Category: Nebius Global AI Hackathon — Best Apps and Agents
- Repository: <https://github.com/Akunimal/noah-nvidia>
- Live demo: <https://noah-nvidia-web.onrender.com/>
- License: Apache-2.0
- Primary connected route: Nebius Token Factory with NVIDIA Nemotron
- Persistence: server-only PostgreSQL JSONB on Neon Free; no Supabase
- Hosting: manually deployed Render Free services; Vercel is out of scope
- External effects: disabled by default and never presented as successful
  without a receipt
- Official deadline recorded by the project: **2026-10-30 10:00 PDT / 14:00
  ART**

The planned public AI window is **2026-10-27 17:00 UTC through 2026-12-16
00:00 UTC**. Before the window, the public URL remains a synthetic sandbox.
During the window, it may use a server-funded Nebius/NVIDIA Nemotron route
when configured; Noah imposes no total or daily call cap on this route. Neon
records usage and provider-reported exhaustion durably. If Nebius reports
exhausted credit/quota, the funded route stops and reviewers can provide their
own NVIDIA Nemotron key through the BYOK path; the synthetic sandbox remains
available. Noah imposes no call-count cap on either public route, so the
provider's own quotas and billing policies apply to BYOK keys. Noah cannot
distinguish promotional credit from paid usage, so Nebius must reject requests
at promotional-credit exhaustion or have a provider-side hard spend guard.

OpenCode2API is present only as an operator-supplied, synthetic NVIDIA
Nemotron transport for local evaluation. It is not an NVIDIA product, does not
receive private onboarding text, and is disabled in the Render public
configuration (`NOAH_ALLOW_FREE_SYNTHETIC=false`). `ProviderResult` is the
provenance envelope; it is not a third provider.

## What to submit

1. Link this public repository and keep the Apache-2.0 license visible.
2. Link the live Render frontend and API health surface.
3. Record the English demo using the script in
   [`demo-script.md`](demo-script.md), keeping it under three minutes.
4. Follow the shot list and release safeguards in
   [`video-plan.md`](video-plan.md).
5. Give reviewers the reproducible steps in
   [`reviewer-guide.md`](reviewer-guide.md).
6. Fill the operator-only fields in
   [`../implementation/evidence/gate-9-submission.md`](../implementation/evidence/gate-9-submission.md)
   only after the final manual deploy and rehearsal.

Do not put a provider key, OAuth secret, Neon connection string, or bearer
token in the submission form, video, screenshots, README, logs, or issue
comments.

## Product story

Noah is a supervised virtual employee for service businesses. An owner
describes the business or an intended task in natural language. The system
uses an NVIDIA Nemotron route to prepare typed, reviewable work, shows the
structured `onboarding.v1` JSON and provider provenance, and waits for a human
decision before applying internal state or attempting any external effect.

The smallest reviewer path is:

`natural language → reviewable JSON → human confirmation or skip → typed,
auditable workspace`

The public path is intentionally safe: a reviewer can explore fictional Atlas
Services data, but visitor data is ephemeral and external Gmail/Calendar,
payment, and OAuth effects remain disabled.

## Evidence and local reproduction

From the repository root:

```powershell
npm install
npm run typecheck
npm run lint
npm run test
npm run build
services\api\.venv\Scripts\python.exe -m pytest -q
npm run eval:promptfoo:local
python scripts/release_check.py --local-only --promptfoo --audit --require-clean
```

The release checker clears provider/database/effect credentials in its local
child processes. Its `--live` mode performs only GET and OPTIONS checks and
does not send a model prompt. Redacted evidence belongs in
[`../implementation/evidence/release-check.md`](../implementation/evidence/release-check.md).

## Final operator fields

These values intentionally remain blank until the final rehearsal:

- Video URL: `<add the final public English video URL>`
- Hackathon submission URL: `<add the submitted Devpost URL>`
- Final Git commit: `<add after freeze>`
- Final Render API deploy: `<add the manual deploy id>`
- Final Render web deploy: `<add the manual deploy id>`

The package is ready for those operator-controlled values; adding them is a
submission action, not a code change.
