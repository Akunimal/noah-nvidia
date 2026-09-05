-- Noah Nvidia baseline. Apply only to a new Supabase project.
create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.business_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  currency char(3) not null default 'USD',
  working_hours jsonb not null default '{}'::jsonb,
  authority_policy jsonb not null default '{"default":"supervised","external_effects":"ask"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_minor bigint not null check (price_minor >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  company text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','gmail','google-calendar','nebius','nvidia-nim')),
  account_label text,
  scopes text[] not null default '{}',
  status text not null default 'disconnected',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, provider),
  unique (tenant_id, id)
);

create table if not exists public.connection_secrets (
  connection_id uuid primary key references public.connections(id) on delete cascade,
  tenant_id uuid not null references auth.users(id) on delete cascade,
  ciphertext text not null,
  key_version text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, connection_id) references public.connections(tenant_id, id) on delete cascade
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Operations desk',
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('owner','noah','system','tool')),
  content text not null,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, conversation_id) references public.conversations(tenant_id, id) on delete cascade
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  goal text not null,
  status text not null check (status in ('queued','planning','awaiting_approval','ready','executing','succeeded','needs_input','waiting_for_session','partially_succeeded','failed','needs_reconciliation','cancelled')),
  policy_version text not null default 'supervised-v1',
  provider text,
  model text,
  provider_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, conversation_id) references public.conversations(tenant_id, id) on delete set null
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.runs(id) on delete cascade,
  tool text not null,
  arguments jsonb not null,
  arguments_hash text not null,
  authority text not null check (authority in ('allow','ask','deny')),
  status text not null check (status in ('proposed','awaiting_approval','approved','rejected','executing','succeeded','failed','needs_reconciliation')),
  created_at timestamptz not null default now(),
  unique (tenant_id, arguments_hash),
  foreign key (tenant_id, run_id) references public.runs(tenant_id, id) on delete cascade
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  action_id uuid not null references public.actions(id) on delete cascade,
  arguments_hash text not null,
  approved_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (action_id, arguments_hash),
  foreign key (tenant_id, action_id) references public.actions(tenant_id, id) on delete cascade
);

create table if not exists public.external_effects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  action_id uuid not null references public.actions(id) on delete cascade,
  idempotency_key text not null,
  provider text not null,
  external_id text,
  status text not null check (status in ('pending','succeeded','failed','uncertain')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key),
  foreign key (tenant_id, action_id) references public.actions(tenant_id, id) on delete cascade
);

create table if not exists public.mail_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  thread_id text,
  sender text,
  subject text,
  body_sanitized text,
  labels text[] not null default '{}',
  received_at timestamptz,
  synced_at timestamptz not null default now(),
  unique (tenant_id, provider_id)
);

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  calendar_id text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  etag text,
  local_action_id uuid,
  unique (tenant_id, provider_id),
  foreign key (tenant_id, local_action_id) references public.actions(tenant_id, id)
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id),
  version integer not null default 1,
  status text not null check (status in ('draft','approved','sent','accepted','rejected','expired')),
  currency char(3) not null default 'USD',
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0 and discount_minor <= subtotal_minor),
  total_minor bigint not null default 0 check (total_minor >= 0),
  valid_until date,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, contact_id) references public.contacts(tenant_id, id)
);

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  service_id uuid references public.services(id),
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  line_total_minor bigint not null check (line_total_minor >= 0),
  foreign key (tenant_id, quote_id) references public.quotes(tenant_id, id) on delete cascade,
  foreign key (tenant_id, service_id) references public.services(tenant_id, id)
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  description text not null,
  category text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'USD',
  occurred_on date not null,
  source_document_id uuid,
  status text not null check (status in ('proposed','confirmed','reversed')),
  created_at timestamptz not null default now()
);

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id),
  quote_id uuid references public.quotes(id),
  amount_due_minor bigint not null check (amount_due_minor >= 0),
  amount_paid_minor bigint not null default 0 check (amount_paid_minor >= 0),
  due_on date,
  status text not null check (status in ('open','partially_paid','paid','written_off')),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, contact_id) references public.contacts(tenant_id, id),
  foreign key (tenant_id, quote_id) references public.quotes(tenant_id, id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  status text not null check (status in ('open','in_progress','done','cancelled')),
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  content_type text not null,
  sha256 text not null,
  status text not null check (status in ('uploaded','extracting','indexed','review','failed')),
  page_count integer check (page_count is null or page_count between 1 and 10),
  storage_path text,
  created_at timestamptz not null default now(),
  unique (tenant_id, sha256),
  unique (tenant_id, id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ledger_entries_source_document_fk'
  ) then
    alter table public.ledger_entries
      add constraint ledger_entries_source_document_fk
      foreign key (tenant_id, source_document_id) references public.documents(tenant_id, id);
  end if;
end $$;

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page integer,
  content text not null,
  embedding vector(2048),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, document_id) references public.documents(tenant_id, id) on delete cascade
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  actor text not null,
  event_type text not null,
  subject_type text,
  subject_id uuid,
  result text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  provider text not null,
  estimated_units integer not null check (estimated_units > 0),
  consumed_units integer not null default 0 check (consumed_units >= 0),
  status text not null check (status in ('reserved','consumed','released','blocked')),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, run_id) references public.runs(tenant_id, id) on delete set null
);

create table if not exists public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  receivable_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0),
  paid_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (tenant_id, receivable_id) references public.receivables(tenant_id, id) on delete cascade
);

alter table public.business_profiles enable row level security;
alter table public.services enable row level security;
alter table public.contacts enable row level security;
alter table public.connections enable row level security;
alter table public.connection_secrets enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.runs enable row level security;
alter table public.actions enable row level security;
alter table public.approvals enable row level security;
alter table public.external_effects enable row level security;
alter table public.mail_items enable row level security;
alter table public.calendar_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.receivables enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.audit_events enable row level security;
alter table public.usage_reservations enable row level security;
alter table public.receivable_payments enable row level security;

create policy business_owner on public.business_profiles for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'services','contacts','connections','connection_secrets','conversations',
    'messages','runs','actions','approvals','external_effects','mail_items',
    'calendar_items','quotes','quote_lines','ledger_entries','receivables',
    'tasks','documents','document_chunks','audit_events','usage_reservations','receivable_payments'
  ]
  loop
    execute format(
      'create policy tenant_owner on public.%I for all using (tenant_id = auth.uid()) with check (tenant_id = auth.uid())',
      table_name
    );
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
revoke all on all tables in schema public from anon;
-- The browser must never read or write secrets, receipts, approvals, or usage.
revoke all on public.connection_secrets from anon, authenticated;
revoke all on public.external_effects from anon, authenticated;
revoke all on public.approvals from anon, authenticated;
revoke all on public.usage_reservations from anon, authenticated;
revoke all on public.receivable_payments from anon, authenticated;
-- Execution state is owned by the server-side executor. The browser may read
-- its own projections through API routes, but cannot forge a run or receipt.
revoke insert, update, delete on public.runs from authenticated;
revoke insert, update, delete on public.actions from authenticated;
revoke insert, update, delete on public.external_effects from authenticated;
revoke insert, update, delete on public.approvals from authenticated;
revoke insert, update, delete on public.usage_reservations from authenticated;
revoke insert, update, delete on public.quotes from authenticated;
revoke insert, update, delete on public.quote_lines from authenticated;
revoke insert, update, delete on public.ledger_entries from authenticated;
revoke insert, update, delete on public.receivables from authenticated;
revoke insert, update, delete on public.receivable_payments from authenticated;

-- Documents live in a private bucket. The API uses the service role to write
-- and returns only tenant-scoped metadata; an authenticated owner can read a
-- path whose first folder is their own user id.
insert into storage.buckets (id, name, public)
values ('noah-documents', 'noah-documents', false)
on conflict (id) do update set public = false;

alter table storage.objects enable row level security;
drop policy if exists noah_documents_owner_read on storage.objects;
create policy noah_documents_owner_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'noah-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create index if not exists services_tenant_active_idx on public.services (tenant_id, active);
create index if not exists contacts_tenant_email_idx on public.contacts (tenant_id, email);
create index if not exists runs_tenant_status_idx on public.runs (tenant_id, status, updated_at);
create index if not exists actions_tenant_status_idx on public.actions (tenant_id, status, created_at);
create index if not exists mail_items_tenant_received_idx on public.mail_items (tenant_id, received_at desc);
create index if not exists calendar_items_tenant_window_idx on public.calendar_items (tenant_id, starts_at, ends_at);
create index if not exists document_chunks_tenant_doc_idx on public.document_chunks (tenant_id, document_id, page);
create index if not exists audit_events_tenant_created_idx on public.audit_events (tenant_id, created_at desc);
create index if not exists receivable_payments_tenant_created_idx on public.receivable_payments (tenant_id, created_at desc);
