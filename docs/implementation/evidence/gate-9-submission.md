# Gate 9 — English submission pack

Status: **package drafted; final operator freeze pending**.

This checklist records delivery material without storing keys, tokens, private
prompts, connected response dumps, or customer data.

## Repository-complete items

- [x] Root README links to the English submission pack.
- [x] Submission overview documents the public URL, repository, license,
      NVIDIA/Nemotron attribution, Nebius primary route, Neon-only persistence,
      manual Render deployment, and no-cost fallback.
- [x] Reviewer guide covers a clean-browser synthetic path and the honest
      connected/BYOK alternatives.
- [x] Demo script is English and designed for less than three minutes.
- [x] Video plan maps the script to the judging criteria, capture safeguards,
      provider disclosures, and final Devpost fields.
- [x] Cutover policy is documented: 2026-10-27 17:00 UTC through the official
      deadline window; quota exhaustion returns to synthetic mode.
- [x] OpenCode2API is described as synthetic-only and disabled by the Render
      policy, while `ProviderResult` is identified as provenance rather than a
      provider.
- [x] Local release-check and Promptfoo commands are reproducible without
      provider credentials.

## Operator-only finalization

- [ ] Record the final English video and paste its public URL into
      `docs/submission/README.md`.
- [ ] Submit the hackathon form/Devpost entry and paste its URL into the pack.
- [ ] Deploy the reviewed `main` commit manually to API and web on Render.
- [ ] Run `python scripts/release_check.py --live --promptfoo --audit` from a
      clean tree and save redacted evidence.
- [ ] Run the clean-browser smoke and confirm the exact English labels in the
      reviewer guide.
- [ ] On 2026-10-27, confirm `bootstrap.public_ai` reports effective Nebius,
      NVIDIA Nemotron, and an available bounded credit budget; confirm the
      exhausted/quota fallback and `NOAH_ALLOW_FREE_SYNTHETIC=false` behavior.
- [ ] Confirm the final commit, API deploy id, web deploy id, video URL, and
      submission URL, then freeze the scope.

The blank fields are deliberate. Filling them is an operator submission step,
not a reason to put credentials in the repository.
