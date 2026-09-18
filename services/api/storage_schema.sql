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

CREATE TABLE IF NOT EXISTS noah_public_usage_total (
    source text NOT NULL,
    bucket_key text NOT NULL,
    consumed bigint NOT NULL DEFAULT 0,
    provider_exhausted boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source, bucket_key),
    CONSTRAINT noah_public_usage_total_nonnegative
        CHECK (consumed >= 0)
);

CREATE TABLE IF NOT EXISTS noah_public_usage_daily (
    source text NOT NULL,
    bucket_key text NOT NULL,
    usage_date date NOT NULL,
    consumed bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source, bucket_key, usage_date),
    CONSTRAINT noah_public_usage_daily_nonnegative
        CHECK (consumed >= 0)
);

CREATE TABLE IF NOT EXISTS noah_public_usage_reservations (
    reservation_id text PRIMARY KEY,
    source text NOT NULL,
    bucket_key text NOT NULL,
    usage_date date NOT NULL,
    status text NOT NULL DEFAULT 'reserved',
    created_at timestamptz NOT NULL DEFAULT now(),
    settled_at timestamptz,
    consumed boolean NOT NULL DEFAULT false,
    CONSTRAINT noah_public_usage_reservation_status
        CHECK (status IN ('reserved', 'consumed', 'released', 'expired'))
);

CREATE INDEX IF NOT EXISTS noah_public_usage_reservations_active_idx
    ON noah_public_usage_reservations (source, bucket_key, created_at);
