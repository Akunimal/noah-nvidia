export interface ApiAction {
  id: string;
  title: string;
  detail: string;
  type: string;
  tone?: 'amber' | 'violet' | 'blue';
  amount?: string | null;
  arguments_hash?: string;
  status?: string;
  run_id?: string | null;
}

export interface ApiMail {
  id: string;
  from?: string;
  subject?: string;
  body?: string;
  received_at?: string;
  label?: string;
}

export interface ApiCalendarItem {
  id: string;
  title?: string;
  starts_at?: string;
  ends_at?: string;
  status?: string;
}

export interface ApiLedgerEntry {
  id: string;
  description: string;
  kind: 'income' | 'expense';
  category: string;
  amount_minor: number;
  currency: string;
  status: string;
  occurred_on?: string;
}

export interface ApiDocument {
  id: string;
  filename: string;
  content_type: string;
  status: string;
  page_count?: number;
  created_at?: string;
}

export interface ApiQuote {
  id: string;
  status: string;
  total_minor: number;
  currency: string;
  valid_until?: string;
}

export interface ApiReceivable {
  id: string;
  amount_due_minor: number;
  amount_paid_minor: number;
  status: string;
  currency?: string;
  due_on?: string;
}

export interface ApiConnection {
  provider: string;
  status: string;
  scopes?: string[];
  account_label?: string;
  expires_at?: string;
}

export interface WorkspaceInfo {
  mode: 'demo' | 'playground';
  data_source: string;
  fixture_id: string | null;
  synthetic: boolean;
}

export interface MessageResponse {
  assistant_message?: string;
  message?: string;
  provider?: string;
  model?: string;
  action?: ApiAction;
  run?: { id: string; status: string };
}

export interface BootstrapPayload {
  tenant_id: string;
  workspace: WorkspaceInfo;
  business: {
    name: string;
    timezone: string;
    currency: string;
    locale: string;
  };
  connections?: ApiConnection[];
  providers: {
    primary?: { name?: string; model?: string; configured?: boolean };
    free_sandbox?: { name?: string; configured?: boolean };
    embeddings?: { model?: string; dimensions?: number; configured?: boolean };
  };
  workflow?: { installed?: boolean; registration?: string };
  persistence?: { mode?: string; configured?: boolean };
  pending_approvals?: number;
  execution?: { external_effects_enabled?: boolean };
  usage?: { consumed?: number; reserved?: number; limit?: number; credit_label?: string };
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const authHeaders = { Authorization: `Bearer ${import.meta.env.VITE_NOAH_AUTH_TOKEN || 'demo-owner'}` };

interface ApiRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const response = await fetch(apiBase + path, {
    ...init,
    headers: { ...authHeaders, ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`API_${response.status}`);
  return response.json() as Promise<T>;
}

export function getBootstrap(): Promise<BootstrapPayload> {
  return request<BootstrapPayload>('/api/v1/bootstrap');
}

export function getPendingActions(): Promise<ApiAction[]> {
  return request<ApiAction[]>('/api/v1/actions?status=awaiting_approval');
}

export function getMail(): Promise<ApiMail[]> {
  return request<ApiMail[]>('/api/v1/mail');
}

export function getCalendar(): Promise<ApiCalendarItem[]> {
  return request<ApiCalendarItem[]>('/api/v1/calendar');
}

export function getLedger(): Promise<ApiLedgerEntry[]> {
  return request<ApiLedgerEntry[]>('/api/v1/ledger');
}

export function getDocuments(): Promise<ApiDocument[]> {
  return request<ApiDocument[]>('/api/v1/documents');
}

export function uploadDocument(filename: string, contentType: string, contentBase64: string): Promise<{ document: ApiDocument }> {
  return request<{ document: ApiDocument }>('/api/v1/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, content_type: contentType, content_base64: contentBase64 }),
  });
}

export function getQuotes(): Promise<ApiQuote[]> {
  return request<ApiQuote[]>('/api/v1/quotes');
}

export function getReceivables(): Promise<ApiReceivable[]> {
  return request<ApiReceivable[]>('/api/v1/receivables');
}

export async function getLedgerCsv(): Promise<string> {
  const response = await fetch(apiBase + '/api/v1/ledger/export.csv', {
    headers: authHeaders,
  });
  if (!response.ok) throw new Error(`API_${response.status}`);
  return response.text();
}

export function advanceRun(runId: string): Promise<{ status: string; effects?: Array<{ status: string; result?: Record<string, unknown> }> }> {
  return request<{ status: string; effects?: Array<{ status: string; result?: Record<string, unknown> }> }>(`/api/v1/runs/${runId}/advance`, { method: 'POST' });
}

export function sendMessage(message: string, idempotencyKey: string): Promise<MessageResponse> {
  return request<MessageResponse>('/api/v1/conversations/demo/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ message }),
  });
}

export function decideAction(actionId: string, decision: 'approve' | 'reject', expectedHash?: string): Promise<{ action: ApiAction; idempotent: boolean; execution: string }> {
  return request<{ action: ApiAction; idempotent: boolean; execution: string }>(`/api/v1/actions/${actionId}/${decision}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Owner decision from Noah Nvidia console', expected_hash: expectedHash }),
  });
}
