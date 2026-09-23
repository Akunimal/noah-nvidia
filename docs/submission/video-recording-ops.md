# Temporary video recording mode

This switch prepares the deployed app for a real Nebius Token Factory / NVIDIA Nemotron onboarding capture. The provider key must stay in the Render API service's secret environment variable; never put it in frontend code, `render.yaml`, Git, a browser bundle, or the video.

## Enable for the recording

In the Render dashboard, update only the `noah-nvidia-api` service environment:

- `NOAH_NEBIUS_API_KEY`: the temporary Nebius key, stored as a secret.
- `NOAH_NEBIUS_MODEL`: `nvidia/nemotron-3-super-120b-a12b`.
- `NOAH_PUBLIC_AI_MODE`: `nebius`.
- `NOAH_VIDEO_RECORDING_MODE`: `true`.

Keep external effects disabled. The recording flag hides the reviewer-key panel and its setup notice; it does not claim that inference succeeded. The onboarding review must show the returned Nebius provider/model provenance. Because this mode makes the shared public route real, enable it only immediately before testing/recording and ensure Nebius rejects requests at promotional-credit exhaustion or has a provider-side hard spend guard.

Temporary Noah safety limits apply before the scheduled public opening (20 total/5 daily on the shared Nebius route, 5 total/2 daily per BYOK key). These lift automatically at the opening and are not a substitute for provider-side spend protection. Noah cannot distinguish promotional credit from paid usage; without a Nebius hard spend guard or credit-exhaustion rejection, requests could become billable after the grant is depleted.

After changing API environment variables, deploy the API. Deploy the web service with the matching frontend change, then reload the capture tab. Reloading clears any in-memory reviewer BYOK key; the recording route uses the server-side secret instead.

## Revert after the video

In the Render API service, restore:

- `NOAH_PUBLIC_AI_MODE`: `scheduled`.
- `NOAH_VIDEO_RECORDING_MODE`: `false` or remove it.
- Remove `NOAH_NEBIUS_API_KEY` if the public runtime should remain closed until its scheduled opening.

Deploy the API, confirm the public status is scheduled/synthetic again, and revoke/delete the temporary Nebius key in Token Factory. The default opening and deadline remain controlled by `NOAH_PUBLIC_AI_OPEN_AT` and `NOAH_PUBLIC_AI_DEADLINE_AT`.
