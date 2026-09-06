import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardList,
  Database,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { OnboardingExtractionResponse, OnboardingMutationResponse, OnboardingProvenance } from '../lib/api';
import {
  emptyOnboardingDraft,
  inventoryFromLines,
  withMissingFields,
  type OnboardingBusinessField,
  type OnboardingDraft,
} from '../lib/onboarding';

type OnboardingStep = 'welcome' | 'describe' | 'extracting' | 'review' | 'complete' | 'skipped';
export type OnboardingDecision = 'completed' | 'skipped';

interface OnboardingWizardProps {
  businessName: string;
  onExit: (decision: OnboardingDecision, draft?: OnboardingDraft, business?: OnboardingMutationResponse['business']) => void;
  onExtract: (text: string) => Promise<OnboardingExtractionResponse>;
  onComplete: (draft: OnboardingDraft, idempotencyKey: string) => Promise<OnboardingMutationResponse>;
  onSkip: (idempotencyKey: string) => Promise<OnboardingMutationResponse>;
}

const stepLabels = ['Bienvenida', 'Descripción', 'Revisión', 'Listo'];

function stepIndex(step: OnboardingStep): number {
  if (step === 'welcome') return 0;
  if (step === 'describe' || step === 'extracting') return 1;
  if (step === 'review') return 2;
  return 3;
}

function fieldValue(draft: OnboardingDraft, field: OnboardingBusinessField): string {
  return draft.business[field] || '';
}

function inventoryNames(draft: OnboardingDraft): string {
  return draft.inventory.map((item) => item.name).join('\n');
}

function readableExtractionError(value: unknown): string {
  const message = value instanceof Error ? value.message : '';
  if (message.includes('NEBIUS_NOT_CONFIGURED')) return 'Nebius todavía no está configurado para este entorno. Podés completar el JSON manualmente o reintentar cuando la clave esté disponible.';
  if (message.includes('NEBIUS_NON_NVIDIA_MODEL')) return 'La configuración de Nebius no apunta a un modelo NVIDIA Nemotron. Corregí la variable del backend antes de reintentar.';
  if (message.includes('PROMPT_INJECTION_BLOCKED')) return 'La descripción contiene una instrucción que intenta cambiar las reglas de Noah. Quitala y reintentá.';
  if (message.includes('ONBOARDING_INVALID_MODEL_OUTPUT')) return 'Nebius respondió, pero el resultado no cumple el JSON onboarding.v1. Podés reintentar o completarlo manualmente.';
  if (message.includes('ONBOARDING_PROVIDER_ERROR')) return 'Nebius no pudo generar el borrador. El texto sigue en este formulario; podés reintentar.';
  return 'No pudimos generar el borrador desde Nebius. El texto sigue en este formulario; podés reintentar o completarlo manualmente.';
}

function readableMutationError(value: unknown): string {
  const message = value instanceof Error ? value.message : '';
  if (message.includes('ONBOARDING_REQUIRED_FIELDS')) return 'Completá nombre de empresa y actividad antes de confirmar.';
  if (message.includes('ONBOARDING_ALREADY_FINALIZED')) return 'Este onboarding ya fue aplicado. Recargá el playground para ver el estado persistido.';
  if (message.includes('ONBOARDING_DATA_EXISTS')) return 'El playground ya tiene datos. El skip no pisa datos existentes.';
  if (message.includes('ONBOARDING_IDEMPOTENCY_KEY_REQUIRED')) return 'No se pudo asegurar el reintento idempotente. Volvé a intentar.';
  if (message.includes('API_5')) return 'El backend no pudo guardar el cambio. Verificá la conexión e intentá de nuevo.';
  return 'No se pudo guardar la configuración. Tus datos siguen en esta pantalla; revisá y reintentá.';
}

function makeIdempotencyKey(prefix: string): string {
  const browserCrypto = globalThis.crypto;
  const random = browserCrypto && typeof browserCrypto.randomUUID === 'function'
    ? browserCrypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export default function OnboardingWizard({ businessName, onExit, onExtract, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [narrative, setNarrative] = useState('');
  const [inventoryText, setInventoryText] = useState('');
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [providerResult, setProviderResult] = useState<OnboardingProvenance | null>(null);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [error, setError] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutationResult, setMutationResult] = useState<OnboardingMutationResponse | null>(null);
  const [completionKey] = useState(() => makeIdempotencyKey('onboarding-complete'));
  const [skipKey] = useState(() => makeIdempotencyKey('onboarding-skip'));

  useEffect(() => {
    if (step !== 'extracting') return undefined;
    let cancelled = false;
    void onExtract(narrative.trim()).then((response) => {
      if (cancelled) return;
      setDraft(response.draft);
      setInventoryText(inventoryNames(response.draft));
      setProviderResult(response.provenance);
      setExtractionError('');
      setStep('review');
    }).catch((reason: unknown) => {
      if (cancelled) return;
      setProviderResult(null);
      setExtractionError(readableExtractionError(reason));
      setStep('describe');
    });
    return () => { cancelled = true; };
  }, [narrative, onExtract, step]);

  function beginDescription() {
    setSkipConfirm(false);
    setError('');
    setExtractionError('');
    setMutationError('');
    setMutationResult(null);
    setStep('describe');
  }

  function submitDescription(event: FormEvent) {
    event.preventDefault();
    if (narrative.trim().length < 12) {
      setError('Contá un poco más sobre tu empresa para armar el borrador.');
      return;
    }
    setError('');
    setExtractionError('');
    setMutationError('');
    setDraft(null);
    setProviderResult(null);
    setMutationResult(null);
    setStep('extracting');
  }

  function retryExtraction() {
    setError('');
    setExtractionError('');
    setMutationError('');
    setDraft(null);
    setProviderResult(null);
    setMutationResult(null);
    setStep('extracting');
  }

  function startManualReview() {
    setError('');
    setExtractionError('');
    setMutationError('');
    setDraft(emptyOnboardingDraft());
    setInventoryText('');
    setProviderResult(null);
    setMutationResult(null);
    setStep('review');
  }

  function updateBusiness(field: OnboardingBusinessField, value: string) {
    setDraft((current) => {
      if (!current) return current;
      const trimmed = value.trim();
      const nextValue = trimmed ? field === 'currency' ? trimmed.toUpperCase() : trimmed : null;
      return withMissingFields({
        ...current,
        business: { ...current.business, [field]: nextValue },
      });
    });
  }

  function updateInventory(value: string) {
    setInventoryText(value);
    setDraft((current) => current ? withMissingFields({ ...current, inventory: inventoryFromLines(value) }) : current);
  }

  async function confirmPreview() {
    if (!draft || isSubmitting) return;
    setMutationError('');
    setIsSubmitting(true);
    try {
      const response = await onComplete(draft, completionKey);
      setMutationResult(response);
      setStep('complete');
    } catch (reason: unknown) {
      setMutationError(readableMutationError(reason));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmSkip() {
    if (isSubmitting) return;
    setMutationError('');
    setIsSubmitting(true);
    try {
      const response = await onSkip(skipKey);
      setMutationResult(response);
      setSkipConfirm(false);
      setStep('skipped');
    } catch (reason: unknown) {
      setMutationError(readableMutationError(reason));
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderSkipConfirmation(): ReactNode {
    if (!skipConfirm) return null;
    return (
      <div className="onboarding-skip-card" role="alertdialog" aria-labelledby="skip-title">
        <strong id="skip-title">Antes de saltear</strong>
        <p>Si salteás el onboarding, no se usarán tus datos. Se cargarán datos ficticios de Atlas Services para que puedas explorar la aplicación. No son datos reales y no se ejecutará ninguna acción externa.</p>
        <small>La decisión queda guardada una sola vez en el tenant de prueba y no ejecuta acciones externas.</small>
        {mutationError && <p className="onboarding-error" role="alert">{mutationError}</p>}
        <div className="onboarding-actions compact">
          <button className="outline-button" type="button" onClick={() => setSkipConfirm(false)}>Volver</button>
          <button className="primary-button" type="button" onClick={() => { void confirmSkip(); }} disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Entiendo, saltear'}</button>
        </div>
      </div>
    );
  }

  function renderWelcome(): ReactNode {
    return (
      <div className="onboarding-welcome">
        <div className="onboarding-orb"><Sparkles size={25} /></div>
        <span className="label-kicker">PLAYGROUND SETUP</span>
        <h2>Contale a Noah qué hace tu empresa.</h2>
        <p>Una descripción breve alcanza. Después vas a revisar el JSON antes de que cualquier dato se aplique al workspace <strong>{businessName}</strong>.</p>
        <div className="onboarding-benefits">
          <div><span><ClipboardList size={15} /></span><div><strong>Lenguaje natural</strong><small>Escribí como lo explicarías a una persona.</small></div></div>
          <div><span><Database size={15} /></span><div><strong>JSON revisable</strong><small>Nombre, actividad e inventario opcional.</small></div></div>
          <div><span><ShieldCheck size={15} /></span><div><strong>Control humano</strong><small>Nebius solo arma un borrador; no guarda cambios.</small></div></div>
        </div>
        <div className="onboarding-actions">
          <button className="primary-button" type="button" onClick={beginDescription}>Comenzar configuración <Sparkles size={15} /></button>
          <button className="outline-button" type="button" onClick={() => setSkipConfirm(true)}>Saltar y explorar</button>
        </div>
        {renderSkipConfirmation()}
      </div>
    );
  }

  function renderDescribe(): ReactNode {
    return (
      <form className="onboarding-form" onSubmit={submitDescription}>
        <div className="onboarding-card-heading">
          <div><span className="label-kicker">PASO 1 · CONTEXTO</span><h2>Describí tu negocio en tus palabras.</h2><p>No hace falta un formato especial. Podés mencionar el nombre, a qué se dedican y, si querés, algunos productos o servicios.</p></div>
          <Sparkles size={22} />
        </div>
        <label className="onboarding-field wide"><span>Descripción libre</span><textarea autoFocus value={narrative} onChange={(event) => setNarrative(event.target.value)} placeholder="Ej.: Somos Taller Norte y nos dedicamos al mantenimiento de equipos industriales. Atendemos fábricas de la zona y tenemos filtros y bombas en stock." maxLength={1000} /></label>
        <div className="onboarding-example"><Sparkles size={14} /><span>Ejemplo útil: “Somos…, nos dedicamos a…, trabajamos con…”</span><button className="text-button" type="button" onClick={() => setNarrative('Somos Taller Norte y nos dedicamos al mantenimiento de equipos industriales. Atendemos fábricas de la zona.')}>Usar ejemplo</button></div>
        {error && <p className="onboarding-error" role="alert">{error}</p>}
        {extractionError && <div className="onboarding-error-panel" role="alert"><p className="onboarding-error">{extractionError}</p><div className="onboarding-error-actions"><button className="outline-button" type="button" onClick={retryExtraction}>Reintentar extracción</button><button className="text-button" type="button" onClick={startManualReview}>Completar manualmente</button></div></div>}
        <div className="onboarding-local-note"><ShieldCheck size={14} /><span>El texto se envía únicamente a Nebius/NVIDIA. OpenCode2API queda fuera del onboarding privado y todavía no se escribe ningún cambio.</span></div>
        <div className="onboarding-actions"><button className="outline-button" type="button" onClick={() => setStep('welcome')}><ArrowLeft size={15} /> Atrás</button><button className="primary-button" type="submit" disabled={narrative.trim().length < 12}>Armar borrador <Sparkles size={15} /></button></div>
      </form>
    );
  }

  function renderExtracting(): ReactNode {
    return (
      <div className="onboarding-loading" aria-live="polite">
        <div className="onboarding-loading-icon"><Loader2 size={25} /></div>
        <span className="label-kicker">PASO 2 · PREPARACIÓN</span>
        <h2>Armando un borrador revisable.</h2>
        <p>Nebius está convirtiendo tu descripción en JSON onboarding.v1. La extracción no guarda business, inventario ni el texto original.</p>
        <div className="onboarding-loading-track"><span /><span /><span /></div>
      </div>
    );
  }

  function renderReview(): ReactNode {
    if (!draft) return null;
    return (
      <div className="onboarding-review">
        <div className="onboarding-card-heading"><div><span className="label-kicker">PASO 3 · REVISIÓN HUMANA</span><h2>Revisá lo que entendió Noah.</h2><p>Corregí cualquier campo antes de confirmar. Los campos faltantes no se completan por intuición.</p></div><ClipboardList size={22} /></div>
        <div className="onboarding-review-grid">
          <div className="onboarding-fields">
            <label className="onboarding-field"><span>Nombre de empresa</span><input value={fieldValue(draft, 'name')} onChange={(event) => updateBusiness('name', event.target.value)} placeholder="Ej.: Taller Norte" /></label>
            <label className="onboarding-field wide"><span>Actividad</span><textarea value={fieldValue(draft, 'description')} onChange={(event) => updateBusiness('description', event.target.value)} /></label>
            <label className="onboarding-field"><span>Categoría</span><input value={fieldValue(draft, 'category')} onChange={(event) => updateBusiness('category', event.target.value)} placeholder="Opcional" /></label>
            <label className="onboarding-field"><span>Zona horaria</span><input value={fieldValue(draft, 'timezone')} onChange={(event) => updateBusiness('timezone', event.target.value)} placeholder="Ej.: America/Argentina/Buenos_Aires" /></label>
            <label className="onboarding-field"><span>Moneda</span><input value={fieldValue(draft, 'currency')} onChange={(event) => updateBusiness('currency', event.target.value)} placeholder="Ej.: ARS" maxLength={3} /></label>
            <label className="onboarding-field"><span>Locale</span><input value={fieldValue(draft, 'locale')} onChange={(event) => updateBusiness('locale', event.target.value)} placeholder="Ej.: es-AR" /></label>
            <label className="onboarding-field wide"><span>Inventario opcional · una línea por producto</span><textarea value={inventoryText} onChange={(event) => updateInventory(event.target.value)} placeholder="Filtro industrial&#10;Bomba hidráulica" /></label>
          </div>
          <div className="onboarding-json-panel">
            <div className="onboarding-json-heading"><span>JSON estructurado</span><small>onboarding.v1</small></div>
            <pre>{JSON.stringify(draft, null, 2)}</pre>
          </div>
        </div>
        <div className="onboarding-missing"><strong>Campos que faltan</strong>{draft.missing_fields.length ? draft.missing_fields.map((field) => <span key={field}>{field}</span>) : <span className="complete">Completo para revisar</span>}</div>
        <div className="onboarding-provenance"><ShieldCheck size={14} /><span>{providerResult ? `Procedencia: ${providerResult.provider} · ${providerResult.model} · borrador sin escritura.` : 'Procedencia: edición manual · sin llamada de proveedor · sin escritura.'}</span></div>
        {mutationError && <p className="onboarding-error" role="alert">{mutationError}</p>}
        <div className="onboarding-actions"><button className="outline-button" type="button" onClick={() => setStep('describe')} disabled={isSubmitting}><ArrowLeft size={15} /> Editar descripción</button><button className="primary-button" type="button" onClick={() => { void confirmPreview(); }} disabled={isSubmitting || Boolean(draft.missing_fields.includes('business.name') || draft.missing_fields.includes('business.description'))}>{isSubmitting ? 'Guardando…' : 'Confirmar configuración'} <Check size={15} /></button></div>
      </div>
    );
  }

  function renderExit(decision: OnboardingDecision): ReactNode {
    const skipped = decision === 'skipped';
    return (
      <div className="onboarding-success">
        <div className={'onboarding-success-icon ' + (skipped ? 'skipped' : '')}>{skipped ? <ShieldCheck size={26} /> : <CheckCircle2 size={29} />}</div>
        <span className="label-kicker">PASO 4 · SALIDA</span>
        <h2>{skipped ? 'Skip entendido.' : 'La vista previa está lista.'}</h2>
        <p>{skipped ? 'Se cargaron datos ficticios de Atlas Services para explorar. No son datos reales y ninguna acción externa fue ejecutada.' : 'La configuración quedó guardada en tu tenant de prueba. Podés seguir completando datos desde el workspace.'}</p>
        <div className="onboarding-exit-note"><ShieldCheck size={15} /><span>Fase 4: decisión persistida en Neon, tenant-safe y auditable. El tour guiado queda para la fase 6.</span></div>
        <button className="primary-button" type="button" onClick={() => onExit(decision, decision === 'completed' ? draft || undefined : undefined, mutationResult?.business)}>{skipped ? 'Explorar playground' : 'Entrar al playground'} <Sparkles size={15} /></button>
      </div>
    );
  }

  const currentIndex = stepIndex(step);
  const visibleStep = step === 'complete' || step === 'skipped' ? 'complete' : step;

  return (
    <section className="onboarding-page" aria-labelledby="onboarding-title">
      <div className="onboarding-heading">
        <div><span className="eyebrow">Playground · first setup</span><h1 id="onboarding-title">Onboarding.</h1><p>Un recorrido corto para darle contexto a Noah sin perder el control de tus datos.</p></div>
        <div className="onboarding-meta"><span><span className="live-dot" /> Playground</span><small>Fase 4 · Neon + Nebius</small></div>
      </div>
      <div className="onboarding-stepper" aria-label="Onboarding progress">
        {stepLabels.map((label, index) => <div className={'onboarding-step ' + (index === currentIndex ? 'active ' : '') + (index < currentIndex ? 'done' : '')} key={label}><span>{index < currentIndex ? <Check size={13} /> : index + 1}</span><strong>{label}</strong></div>)}
      </div>
      <div className={'onboarding-card ' + visibleStep}>
        {step === 'welcome' && renderWelcome()}
        {step === 'describe' && renderDescribe()}
        {step === 'extracting' && renderExtracting()}
        {step === 'review' && renderReview()}
        {step === 'complete' && renderExit('completed')}
        {step === 'skipped' && renderExit('skipped')}
      </div>
    </section>
  );
}
