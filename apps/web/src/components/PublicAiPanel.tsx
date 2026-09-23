import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, ShieldCheck, Sparkles, X } from 'lucide-react';
import {
  configureReviewerProvider,
  clearReviewerProvider,
  reviewerProviderConfigured,
  reviewerProviderName,
  type PublicAiStatus,
  type ReviewerProviderName,
} from '../lib/api';
import { getPublicAiPresentation } from '../lib/publicAiPresentation';

interface PublicAiPanelProps {
  status: PublicAiStatus | null;
  onConfigured: () => void;
  onCleared: () => void;
}

const NVIDIA_NIM_DEFAULT_MODEL = 'nvidia/nemotron-3-nano-30b-a3b-reasoning';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'date not configured';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(parsed);
}

function providerLabel(provider: ReviewerProviderName | null): string {
  return provider === 'nebius' ? 'Nebius Token Factory' : 'NVIDIA NIM';
}

export default function PublicAiPanel({ status, onConfigured, onCleared }: PublicAiPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [provider, setProvider] = useState<ReviewerProviderName>('nvidia-nim');
  const [model, setModel] = useState(NVIDIA_NIM_DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!reviewerProviderConfigured()) return;
    const configuredProvider = reviewerProviderName();
    if (configuredProvider) setProvider(configuredProvider);
    setSaved(true);
  }, []);

  if (!status) return null;
  const statusSnapshot = status;

  const configured = reviewerProviderConfigured();
  const availability = status.availability_state || (
    status.credit_state === 'provider_exhausted' ? 'provider_exhausted'
      : status.credit_state === 'exhausted' ? 'internal_limit'
        : status.credit_state === 'unavailable' ? 'temporary_unavailable'
        : status.credit_state
  );
  const presentation = getPublicAiPresentation(
    availability,
    status.message ?? 'Public runtime status is not available.',
    configured ? reviewerProviderName() || provider : null,
  );
  const usage = status.usage;
  const usageCapsActive = usage?.limit != null || usage?.daily_limit != null;
  const usageLimitSummary = usageCapsActive
    ? `${configured ? 'This key' : 'Shared route'}: ${usage?.remaining_calls ?? '—'} of ${usage?.limit ?? '—'} total and ${usage?.remaining_daily_calls ?? '—'} of ${usage?.daily_limit ?? '—'} today remain. Noah lifts these temporary caps automatically at the public opening (${formatDate(status.opens_at)}).`
    : null;

  function changeProvider(nextProvider: ReviewerProviderName) {
    setProvider(nextProvider);
    setModel(nextProvider === 'nvidia-nim' ? NVIDIA_NIM_DEFAULT_MODEL : statusSnapshot.model || 'nvidia/nemotron-3-super-120b-a12b');
    setError('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedKey = apiKey.trim();
    const trimmedModel = model.trim();
    if (!trimmedKey) {
      setError('Enter a temporary key to continue.');
      return;
    }
    if (!trimmedModel || !trimmedModel.toLowerCase().includes('nemotron')) {
      setError('The model must belong to the NVIDIA Nemotron family.');
      return;
    }
    configureReviewerProvider({ provider, apiKey: trimmedKey, model: trimmedModel });
    setApiKey('');
    setSaved(true);
    setError('');
    setExpanded(false);
    onConfigured();
  }

  function removeReviewerKey() {
    clearReviewerProvider();
    setSaved(false);
    setApiKey('');
    setExpanded(false);
    onCleared();
  }

  function replaceReviewerKey() {
    clearReviewerProvider();
    setSaved(false);
    setApiKey('');
    setExpanded(true);
    setError('');
    onCleared();
  }

  return (
    <section className={'public-ai-panel ' + (configured ? 'byok' : status.credit_state)} aria-labelledby="public-ai-title">
      <div className="public-ai-panel-main">
        <div className="public-ai-icon"><Sparkles size={18} /></div>
        <div className="public-ai-copy">
          <div className="public-ai-kicker"><span className="live-dot" /> {presentation.kicker}</div>
          <h2 id="public-ai-title">{presentation.title}</h2>
          <p>{presentation.message}</p>
          {status.mode === 'scheduled' && status.credit_state === 'synthetic' && <small>{configured ? 'Shared public runtime opens:' : 'Opens:'} {formatDate(status.opens_at)}</small>}
          {usageLimitSummary && <small>{usageLimitSummary}</small>}
          {!usageCapsActive && availability === 'available' && <small>No Noah call-count cap; availability depends on the provider's credit, quotas, and billing.</small>}
          {!configured && availability === 'provider_exhausted' && <small>Nebius reported that its available credit or quota is exhausted. Add your own NVIDIA Nemotron API key to continue.</small>}
        </div>
        <div className="public-ai-actions">
          {configured ? (
            <button className="outline-button" type="button" onClick={availability === 'provider_exhausted' || availability === 'internal_limit' ? replaceReviewerKey : removeReviewerKey}>
              <X size={14} /> {availability === 'provider_exhausted' || availability === 'internal_limit' ? 'Replace API key' : 'Remove BYOK'}
            </button>
          ) : (
            <button className="outline-button" type="button" onClick={() => { setExpanded((current) => !current); setError(''); }}><KeyRound size={14} /> {expanded ? 'Close BYOK' : 'Use temporary key'}</button>
          )}
        </div>
      </div>
      {saved && <div className="public-ai-byok-note"><ShieldCheck size={14} /><span>BYOK active: {providerLabel(reviewerProviderName() || provider)}. {usageCapsActive ? 'A temporary Noah safety cap applies until the scheduled public opening.' : 'Noah call-count caps have lifted; the provider’s own quotas and billing apply.'} The key stays in this tab's memory and is never persisted by Noah.</span></div>}
      {expanded && !configured && (
        <form className="public-ai-form" onSubmit={handleSubmit}>
          <div className="public-ai-form-heading"><div><strong>Use your own NVIDIA API key</strong><span>{usageCapsActive ? 'Temporary per-key safety limits apply until the scheduled opening; provider quotas and billing also apply.' : 'No Noah call-count cap. Your provider’s quotas and billing apply.'}</span></div><ShieldCheck size={16} /></div>
          <div className="public-ai-form-grid">
            <label><span>Allowlisted route</span><select value={provider} onChange={(event) => changeProvider(event.target.value as ReviewerProviderName)}><option value="nvidia-nim">NVIDIA NIM</option><option value="nebius">Nebius Token Factory</option></select></label>
            <label><span>Nemotron model</span><input value={model} onChange={(event) => setModel(event.target.value)} autoComplete="off" /></label>
            <label className="public-ai-key-field"><span>Temporary API key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Never stored or displayed" autoComplete="off" /></label>
          </div>
          {error && <p className="onboarding-error" role="alert">{error}</p>}
          <div className="public-ai-form-footer"><small>The browser never sends a base URL. The server selects the fixed destination, validates Nemotron, and never persists the key.</small><button className="primary-button" type="submit">Enable in memory <KeyRound size={14} /></button></div>
        </form>
      )}
    </section>
  );
}
