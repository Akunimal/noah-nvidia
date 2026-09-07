# Reviewer guide

No credentials are required for the public synthetic path. Use a clean browser
profile or a new private window so the workspace identifier starts fresh. Do
not paste a real customer description or a provider key into a recording.

## Public three-minute path

1. Open <https://noah-nvidia-web.onrender.com/>.
2. Confirm the page is in English and the `PUBLIC RUNTIME` panel states the
   current public mode. Before the scheduled window it should say that the
   demo is synthetic and show the opening date.
3. In the onboarding card, choose **Skip and explore**.
4. Read the warning, choose **I understand, skip**, and confirm that the copy
   says Atlas Services is fictional and no external action was executed.
5. Choose **Explore playground**.
6. Open the workspace views and submit a simple synthetic request such as
   “Prepare a proposal for the synthetic demo.” The response should be labeled
   deterministic/synthetic when the server-funded NVIDIA window is unavailable.
7. Verify that the public surface does not offer Gmail, Calendar, OAuth, or
   payment effects as completed actions.

The skip operation is idempotent and only loads the versioned fictional Atlas
fixture into the ephemeral public playground. It does not write visitor state
to Neon.

## Natural-language onboarding path

When the public NVIDIA/Nemotron window is active and has credit, choose
**Start setup**, enter a short description, and choose **Build draft**. The
review screen should show editable business fields, optional inventory,
`onboarding.v1` JSON, missing fields, and a provenance line containing the
provider and model. Choose **Confirm setup** only after reviewing the fields.

If the public route is closed or out of credit, the UI must say so. Use
**Complete manually** to exercise the same review and confirmation flow, or
use the in-memory **Use temporary key** reviewer option with an allowlisted
NVIDIA NIM or Nebius Nemotron endpoint. The key is never persisted by Noah;
reviewers should still treat it as sensitive and remove it after the test.

## What the implementation demonstrates

- NVIDIA Nemotron is the only accepted model family.
- Nebius is the connected primary route.
- OpenCode2API is a synthetic-only local transport and is disabled in Render.
- `ProviderResult` preserves provenance without exposing credentials.
- Human approval is required before internal mutations or external effects.
- Missing configuration falls back to an honest synthetic result, not a false
  success.
- Neon stores tenant-scoped state server-side; the browser receives no
  connection string or encrypted OAuth secret.

## If the page appears stale

Render services are intentionally manual-deploy. A stale page means the
operator must deploy the reviewed commit from `main`; a reviewer should not
change environment variables or create provider keys. The repository’s
[`STATE.md`](../implementation/STATE.md) and redacted release evidence record
the expected commit and runtime contract.
