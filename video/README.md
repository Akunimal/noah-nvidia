# Noah Nvidia video artifact

This is a deterministic Remotion playback of the English product walkthrough.
It is intentionally labeled `DEMO SIMULATION · NO EXTERNAL EFFECTS`: it does
not call Nebius, persist onboarding data, send email, create calendar events,
or execute money movement. The visual contract mirrors the public app flow:
natural-language onboarding, `onboarding.v1` JSON, provenance, human review,
and approval gates.

## Render

```powershell
npm install
npm run render
```

The output is written to `video/out/noah-nvidia-demo.mp4` and is excluded from
Git. The final MP4 is a local delivery artifact; raw recordings and keys are
not part of the repository.
