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

interface PublicAiPanelProps {
  status: PublicAiStatus | null;
  onConfigured: () => void;
  onCleared: () => void;
}

const NVIDIA_NIM_DEFAULT_MODEL = 'nvidia/nemotron-3-nano-30b-a3b-reasoning';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'fecha no configurada';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
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
  const statusTitle = status.credit_state === 'available'
    ? 'NVIDIA/Nemotron público activo'
    : status.credit_state === 'exhausted'
      ? 'Crédito promocional agotado'
      : status.credit_state === 'closed'
        ? 'Ventana pública cerrada'
        : status.credit_state === 'synthetic'
          ? 'Demo sintética programada'
          : 'NVIDIA/Nemotron no disponible';

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
      setError('Ingresá una clave temporal para continuar.');
      return;
    }
    if (!trimmedModel || !trimmedModel.toLowerCase().includes('nemotron')) {
      setError('El modelo debe pertenecer a la familia NVIDIA Nemotron.');
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

  return (
    <section className={'public-ai-panel ' + status.credit_state} aria-labelledby="public-ai-title">
      <div className="public-ai-panel-main">
        <div className="public-ai-icon"><Sparkles size={18} /></div>
        <div className="public-ai-copy">
          <div className="public-ai-kicker"><span className="live-dot" /> PUBLIC RUNTIME</div>
          <h2 id="public-ai-title">{statusTitle}</h2>
          <p>{status.message}</p>
          {status.mode === 'scheduled' && status.credit_state === 'synthetic' && <small>Se abre: {formatDate(status.opens_at)}</small>}
          {status.credit_state === 'available' && <small>Quedan {status.remaining_calls ?? 0} llamadas server-side en esta instancia.</small>}
          {status.credit_state === 'exhausted' && <small>El límite se protege en memoria y se conserva la demo sin costo.</small>}
        </div>
        <div className="public-ai-actions">
          {configured ? (
            <button className="outline-button" type="button" onClick={removeReviewerKey}><X size={14} /> Quitar BYOK</button>
          ) : (
            <button className="outline-button" type="button" onClick={() => { setExpanded((current) => !current); setError(''); }}><KeyRound size={14} /> {expanded ? 'Cerrar BYOK' : 'Usar clave temporal'}</button>
          )}
        </div>
      </div>
      {saved && <div className="public-ai-byok-note"><ShieldCheck size={14} /><span>BYOK activo: {providerLabel(reviewerProviderName() || provider)}. La clave vive solo en la memoria de esta pestaña y se envía únicamente al endpoint de modelo.</span></div>}
      {expanded && !configured && (
        <form className="public-ai-form" onSubmit={handleSubmit}>
          <div className="public-ai-form-heading"><div><strong>Fallback para reviewer</strong><span>Usá una clave propia si el crédito promocional no está disponible.</span></div><ShieldCheck size={16} /></div>
          <div className="public-ai-form-grid">
            <label><span>Ruta allowlisted</span><select value={provider} onChange={(event) => changeProvider(event.target.value as ReviewerProviderName)}><option value="nvidia-nim">NVIDIA NIM</option><option value="nebius">Nebius Token Factory</option></select></label>
            <label><span>Modelo Nemotron</span><input value={model} onChange={(event) => setModel(event.target.value)} autoComplete="off" /></label>
            <label className="public-ai-key-field"><span>API key temporal</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="No se guarda ni se muestra" autoComplete="off" /></label>
          </div>
          {error && <p className="onboarding-error" role="alert">{error}</p>}
          <div className="public-ai-form-footer"><small>El navegador no envía base URL. El servidor elige el destino fijo, valida Nemotron y no persiste la clave.</small><button className="primary-button" type="submit">Activar en memoria <KeyRound size={14} /></button></div>
        </form>
      )}
    </section>
  );
}
