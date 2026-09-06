# Promptfoo local evaluation

This suite is intentionally offline and synthetic. It exercises the same
canonical onboarding system prompt and the versioned `onboarding.v1` JSON
schema used by the API, but its provider is a deterministic local fixture.
It does not measure Nemotron quality and its evaluation provider does not call
Nebius, NVIDIA NIM, OpenCode2API, Render, Google, Neon, or any other model/app
service. On a clean machine, `npx` may download the pinned Promptfoo CLI from
the npm registry; that is installation traffic, not an inference call.

The local provider is a contract harness: it emits predictable drafts from
synthetic descriptions so Promptfoo can verify strict JSON, missing-field
discipline, prompt-injection boundaries, inventory handling, provider
provenance, and the disabled-effects marker. Connected provider evaluation is
a separate gate and must use private environment variables plus an explicit
budget.

## Run

From the repository root, with Node 22.22+:

```powershell
npm run eval:promptfoo:local
```

The runner pins `promptfoo@0.122.2` through `npx`, disables telemetry,
updates, remote generation, and sharing, and writes raw results only to the
ignored `.promptfoo/` directory. It writes a redacted summary to
`evidence/promptfoo-local.md`.

The canonical system prompt lives at
`services/api/onboarding-system-prompt.txt` because the Render API runs with
`services/api` as its root directory. Promptfoo reads that same file; there is
no second prompt copy to drift.

The Promptfoo package is not a runtime dependency of the product. Keeping it
out of the root lockfile avoids adding its large, tool-only dependency tree to
the deployed application and preserves the production dependency audit.
