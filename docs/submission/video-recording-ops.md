# Temporary video recording mode

This switch prepares the deployed app for a real Nebius Token Factory / NVIDIA Nemotron onboarding capture. The provider key must stay in the Render API service's secret environment variable; never put it in frontend code, `render.yaml`, Git, a browser bundle, or the video.

## Enable for the recording

In the Render dashboard, update only the `noah-nvidia-api` service environment:

- `NOAH_NEBIUS_API_KEY`: the temporary Nebius key, stored as a secret.
- `NOAH_NEBIUS_MODEL`: `nvidia/nemotron-3-super-120b-a12b`.
- `NOAH_PUBLIC_AI_MODE`: `nebius`.
- `NOAH_PUBLIC_MODEL_USAGE_LIMIT`: `5` total calls.
- `NOAH_PUBLIC_MODEL_DAILY_LIMIT`: `3` calls per UTC day.
- `NOAH_VIDEO_RECORDING_MODE`: `true`.

Keep external effects disabled. The recording flag hides the reviewer-key panel and its setup notice; it does not claim that inference succeeded. The onboarding review must show the returned Nebius provider/model provenance. Because this mode makes the shared public route real, enable it only immediately before testing/recording and keep its call caps low.

After changing API environment variables, deploy the API. Deploy the web service with the matching frontend change, then reload the capture tab. Reloading clears any in-memory reviewer BYOK key; the recording route uses the server-side secret instead.

## Revert after the video

In the Render API service, restore:

- `NOAH_PUBLIC_AI_MODE`: `scheduled`.
- `NOAH_PUBLIC_MODEL_USAGE_LIMIT`: `20`.
- `NOAH_PUBLIC_MODEL_DAILY_LIMIT`: `5`.
- `NOAH_VIDEO_RECORDING_MODE`: `false` or remove it.
- Remove `NOAH_NEBIUS_API_KEY` if the public runtime should remain closed until its scheduled opening.

Deploy the API, confirm the public status is scheduled/synthetic again, and revoke/delete the temporary Nebius key in Token Factory. The default opening and deadline remain controlled by `NOAH_PUBLIC_AI_OPEN_AT` and `NOAH_PUBLIC_AI_DEADLINE_AT`.
