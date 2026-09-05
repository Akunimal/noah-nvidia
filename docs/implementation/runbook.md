# Noah Nvidia operator runbook

## Startup and health

1. Confirm the Render service and `/health` endpoint respond.
2. Open the frontend and wait for the NVIDIA runtime badge to become online.
3. Check `/api/v1/bootstrap` for provider, workflow, persistence, execution,
   and pending-approval status.
4. If the API is waking from free-tier sleep, wait or retry. Do not generate
   artificial traffic to keep it alive.

## Provider and credit safety

- Keep Nebius as the preferred provider and record the account, credit amount,
  expiry, current model ID, and smoke-test timestamp outside the repository.
- Reserve at least 40% of available credit for the public demo and evaluation.
- Disable automatic paid usage and keep `NOAH_ENABLE_EXTERNAL_EFFECTS=false`
  until the test account and approval payloads are reviewed.
- Stop model calls when the reserved budget is exhausted. A missing or unknown
  rate blocks the call; it does not switch to a non-NVIDIA provider.
- OpenCode2API remains synthetic-only and must never receive customer data.

## Google reconnection

1. Start `POST /api/v1/connections/google/start` and open the returned URL.
2. Complete the Google consent flow with the configured test user.
3. The callback exchanges the one-use state and PKCE verifier on the server,
   encrypts tokens with AES-GCM, and returns only connection metadata.
4. Run `POST /api/v1/connections/google/sync` and inspect mail/calendar counts.
5. If the connection is `reauth_required`, reconnect before approving an
   external action. A failed or uncertain receipt requires reconciliation;
   never retry blindly.

## Persistence and recovery

- The local/default store is an in-memory reproducibility mode. Restarting it
  resets synthetic state when `NOAH_DATABASE_URL` is empty.
- A durable deployment sets `NOAH_DATABASE_URL` to a PostgreSQL database on the
  server only. The API creates `noah_tenant_state` and `noah_oauth_state` on
  first use; review the checked-in `services/api/storage_schema.sql` before
  applying it manually.
- The tenant snapshot contains encrypted OAuth envelopes, never plaintext
  tokens. The database URL and all credentials stay in Render environment
  variables and are never sent to the frontend.
- Review `/api/v1/audit` after a restart or provider failure. Every completed
  effect must have an effect key and receipt before it is shown as succeeded.
- Review PostgreSQL and Render activity at least every five days during
  development, and daily during the evaluation window.
