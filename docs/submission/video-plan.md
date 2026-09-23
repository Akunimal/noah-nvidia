# Noah Nvidia — final hackathon video plan

Status: **recording plan** · owner: operator · target: final English YouTube
video under three minutes.

This plan is optimized for the Nebius x NVIDIA Global AI Hackathon **Best Apps
and Agents** track. The official rules require a working project, a working
demo URL, a public source repository, a public YouTube demonstration of less
than three minutes, English submission materials (or English translations),
feedback, and an explanation of significant updates when a project existed
before the submission period. See the [official rules](https://nebiusglobalaihackathon.devpost.com/rules).

## The story to tell

Noah is a supervised virtual employee for service businesses. An owner
describes the business in natural language; NVIDIA Nemotron on Nebius prepares
typed, reviewable work; the owner decides what may be applied. The product
value is the complete control loop:

```text
plain language → structured JSON → human review → approval → auditable work
```

The video should make one promise and prove it: **Noah turns ambiguous work
into controlled, reviewable action without pretending that an external effect
already happened.**

## Recommended final cut — 3:00 maximum

Use one coherent connected take as the primary cut. The connected take should
show one controlled Nebius/NVIDIA Nemotron extraction with provider-controlled
credit availability and no external effects. If the connected route is unavailable,
use the synthetic take below, label it on screen, and never imply that the
synthetic response came from Nemotron.

| Time | Screen action | English narration / overlay | Judging signal |
|---|---|---|---|
| 0:00–0:12 | Open the English Noah console on the public Render URL. Show the product name and the first onboarding card. | “Small service businesses have work scattered across conversations, mail, calendars, and spreadsheets. Noah turns a plain-language request into reviewable work while keeping the owner in control.” | Problem, impact, product clarity |
| 0:12–0:28 | Point to `PUBLIC RUNTIME` and the visible mode label. Do not open a dashboard or terminal. | “This public surface is bounded. The connected route is Nebius Token Factory with NVIDIA Nemotron; when credit or access is unavailable, Noah stays usable and labels its deterministic sandbox honestly.” Overlay: `Nebius Token Factory · NVIDIA Nemotron · bounded fallback` | Technical implementation, trust |
| 0:28–0:58 | Select **Start setup**. Enter: “We are North Workshop. We maintain industrial equipment for local factories and keep filters and pumps in stock.” Select **Build draft**. | “The owner explains the business naturally. Noah sends only this onboarding description to the configured NVIDIA route and prepares a draft; it does not write business data yet.” | Natural-language UX, NVIDIA use |
| 0:58–1:23 | Show the editable fields, optional inventory, missing-field list, strict `onboarding.v1` JSON, and provider/model provenance. Edit one field on screen. | “The result is typed and reviewable. I can correct the fields before anything is applied. The provenance line makes the provider and model visible without exposing a key.” Overlay: `Reviewable JSON · human-editable · provenance` | Design, implementation, transparency |
| 1:23–1:45 | Select **Confirm setup**. Show the success state and the populated workspace. | “Only an explicit confirmation applies this snapshot. The operation is tenant-scoped and idempotent, so repeating the request does not create duplicate state.” | Human control, reliability |
| 1:45–2:25 | In the workspace, submit the harmless rehearsed request that passed the final smoke test. Open the resulting proposal in **Approvals**, then show the audit/receipt state. | “Now Noah turns context into a supervised business task. The proposal waits for approval, and the audit trail records what was proposed. Gmail, Calendar, payments, and other external effects are not reported as successful without an explicit approval and receipt.” Overlay: `Proposed → approved → receipted` | Multi-step workflow, safety, impact |
| 2:25–2:42 | Cut to a clean second session. Choose **Skip and explore**, then **I understand, skip**. Show the Atlas Services warning and fictional workspace. | “A reviewer can also skip setup. Skip does not invent understanding of a real company; it loads fictional Atlas Services data for safe exploration only.” Overlay: `Synthetic fixture · fictional data · no external effects` | Accessibility, fallback, honest demo |
| 2:42–2:58 | Show the final public workspace and the README/repository only if the transition is clean; otherwise stay in the app. | “Nebius provides the connected inference route for NVIDIA Nemotron. The repository includes the onboarding contract, tests, Promptfoo evaluation, safety boundaries, and reproducible release checks. OpenCode2API is only an operator-supplied synthetic NVIDIA-only test transport and is disabled in the public Render configuration.” | NVIDIA/Nebius attribution, engineering depth |
| 2:58–3:00 | End card with project name, repository, and demo URL. | On-screen only: `Noah Nvidia · Nebius x NVIDIA Global AI Hackathon · Best Apps and Agents` | Recall, submission clarity |

Aim for **2:45–2:55 of final runtime**, leaving a safety margin below the
three-minute rule. The narration should be in English, recorded clearly, and
subtitled in English.

## Provider-mode variants

Do not splice synthetic and connected claims together. Pick one primary mode
for the final edit and state it plainly in the first runtime shot.

### Preferred: connected Nebius/Nemotron take

- Record after the final reviewed Render deployment and a clean-browser smoke.
- Use one short fictional description and one controlled extraction call.
- Confirm that the UI shows the real provider/model provenance expected by the
  release evidence (`nebius` and the approved NVIDIA Nemotron model).
- Keep `NOAH_ENABLE_EXTERNAL_EFFECTS=false`; do not connect Gmail/Calendar
  mutations, payments, or real customer data for the recording.
- Stop after the required proof. Do not spend credit on repeated stylistic
  takes; rehearse locally first and record the successful path once.

### Safe fallback: public synthetic take

- Use the public URL while the scheduled NVIDIA window is closed or credit is
  unavailable.
- Keep the visible `Scheduled synthetic demo` banner in frame long enough to
  read it.
- Say “synthetic sandbox” or “deterministic fallback,” never “Nemotron
  generated this response.”
- The video can still prove the product experience, structured contract,
  approval boundary, tenant isolation, and receipt discipline.
- The connected Nebius/Nemotron implementation must then be described and
  evidenced separately in the Devpost text and repository; do not use a
  synthetic clip as proof of a live provider call.

## Capture direction

### Before recording

- Freeze the exact reviewed `main` commit and manually deploy API and web on
  Render. Record the commit and both deploy IDs in the operator checklist.
- Run the clean release gate, including local Promptfoo and safe live
  `GET/OPTIONS` checks. Do not run a model prompt as part of the gate.
- For the connected take, run one separate, explicitly budgeted provider
  smoke and verify the provenance in the UI. Never capture the key, headers,
  raw response dump, Render environment page, or terminal.
- Start a clean browser session. Close Gmail, Google accounts, Render,
  provider consoles, Devpost drafts, and unrelated tabs before recording.
- Use only the fictional North Workshop description and the versioned Atlas
  Services fixture. Do not paste a real business, email address, calendar
  entry, access token, or database value.

### Recording setup

- 1920×1080, 30 fps, one browser window, consistent zoom, and a visible but
  unobtrusive cursor.
- Use a clean microphone recording. Prefer no background music; if music is
  used, it must be original or properly licensed. The rules prohibit
  unlicensed copyrighted music and third-party material.
- Keep the browser URL visible briefly for demo credibility, but crop out
  personal profile information, bookmarks, notification counts, and other
  accounts.
- Capture a separate clean voice track if the UI interaction makes narration
  difficult. Add English subtitles and burn in the key safety/provider labels.
- Make every transition a purposeful cut. Avoid loading waits, repeated
  clicks, dashboard setup, source-code scrolling, or long static screens.

### On-screen language

Use these exact short labels where overlays are needed:

- `Nebius Token Factory · NVIDIA Nemotron`
- `Reviewable JSON · human approval required`
- `Tenant-scoped · idempotent · auditable`
- `Synthetic fixture · fictional data · no external effects`
- `OpenCode2API: synthetic NVIDIA-only test transport · disabled publicly`

Do not use “fully autonomous,” “production financial automation,” “free
forever,” or “external action completed.” Those claims exceed the demonstrated
scope and weaken trust.

## Shot acceptance checklist

Reject and rerecord a shot if any of these are false:

- [ ] The interface is in English and the text is legible at 1080p.
- [ ] The connected shot visibly identifies Nebius/NVIDIA provenance, or the
      synthetic shot visibly identifies the deterministic mode.
- [ ] The business description is fictional and contains no personal data.
- [ ] The JSON is shown after extraction and before confirmation.
- [ ] At least one human edit or review decision is visible.
- [ ] The flow reaches a proposal/approval/audit or receipt state without
      claiming an unexecuted external effect.
- [ ] The skip branch, if included, clearly labels Atlas as fictional.
- [ ] No credential, bearer token, OAuth state, database URL, private prompt,
      raw provider response, or personal account appears in any frame.
- [ ] The final runtime is less than three minutes, including the end card.

## Post-production and upload

1. Watch the complete cut once without sound: every claim must be supported by
   what is visible on screen.
2. Watch it once without looking at the UI: the narration must explain the
   problem, Nebius/NVIDIA use, human control, and the safe fallback clearly.
3. Check the transcript for English, provider attribution, and accidental
   secrets. Confirm the file has no notifications or private browser tabs.
4. Export a clean MP4, verify the final duration is under three minutes, and
   upload it to YouTube as **Public**. The hackathon rules require a public
   YouTube link.
5. Add the final YouTube URL to the Devpost form and
   `docs/submission/README.md` only after the video is public. Do not place
   credentials or raw recordings in the repository.

Suggested YouTube title:

> Noah Nvidia — supervised virtual employee with Nebius and NVIDIA Nemotron

Suggested description opening:

> Noah Nvidia turns a service business owner's natural-language context into
> reviewable structured work. It uses NVIDIA Nemotron through Nebius Token
> Factory, requires human approval before applying state, and keeps external
> effects behind an auditable receipt. The public demo includes an honest
> deterministic sandbox for safe judging.

## Devpost handoff checklist

Before the final submission, the operator must have these values ready:

- Public YouTube video URL.
- `https://noah-nvidia-web.onrender.com/` as the working demo URL.
- `https://github.com/Akunimal/noah-nvidia` as the public repository URL.
- Track: **Best Apps and Agents**.
- English project description focused on the supervised workflow and real
  service-business audience.
- Feedback on Nebius Token Factory, NVIDIA Nemotron, and the other NVIDIA
  interfaces actually used.
- Written explanation of what changed during the hackathon, including the
  onboarding contract, Nebius extraction, tenant-safe approval flow,
  hardening, evaluation, and release evidence.
- Final commit/deploy identifiers and the exact public runtime behavior.

## Release condition

The video is not the end of the delivery work. Before pressing Devpost's final
submission button, confirm that the public URL remains free and usable for
review through the judging period, as required by the rules. If the
server-funded Nebius window cannot remain open that long, keep the deterministic
sandbox available, describe it honestly in the reviewer instructions, and
retain separate connected Nemotron evidence. Never imply that a synthetic
fallback is a live provider call.

The final submission should be frozen only after the video, Devpost fields,
repository, Render deploy, and redacted release evidence all refer to the same
reviewed state.
