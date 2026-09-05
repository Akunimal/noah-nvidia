-- Noah Nvidia durable state schema for PostgreSQL.
-- The API applies this idempotently on first use when NOAH_DATABASE_URL is set.

CREATE TABLE IF NOT EXISTS noah_tenant_state (
    tenant_id text PRIMARY KEY,
    state jsonb NOT NULL,
    version bigint NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT noah_tenant_state_tenant_match
        CHECK (state->>'tenant_id' = tenant_id)
);

CREATE TABLE IF NOT EXISTS noah_oauth_state (
    state text PRIMARY KEY,
    tenant_id text NOT NULL,
    code_verifier text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS noah_oauth_state_expires_at_idx
    ON noah_oauth_state (expires_at);
