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
import {
  createShellDraft,
  inventoryFromLines,
  withMissingFields,
  type OnboardingBusinessField,
  type OnboardingDraft,
} from '../lib/onboarding';

type OnboardingStep = 'welcome' | 'describe' | 'extracting' | 'review' | 'complete' | 'skipped';
export type OnboardingDecision = 'completed' | 'skipped';

interface OnboardingWizardProps {
  businessName: string;
  onExit: (decision: OnboardingDecision) => void;
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

export default function OnboardingWizard({ businessName, onExit }: OnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [narrative, setNarrative] = useState('');
  const [inventoryText, setInventoryText] = useState('');
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step !== 'extracting') return undefined;
    const timer = window.setTimeout(() => {
      setDraft(createShellDraft(narrative, inventoryText));
      setStep('review');
    }, 850);
    return () => window.clearTimeout(timer);
  }, [inventoryText, narrative, step]);

  function beginDescription() {
    setSkipConfirm(false);
    setStep('describe');
  }

  function submitDescription(event: FormEvent) {
    event.preventDefault();
    if (narrative.trim().length < 12) {
      setError('Contá un poco más sobre tu empresa para armar el borrador.');
      return;
    }
    setError('');
    setStep('extracting');
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

  function confirmPreview() {
    setStep('complete');
  }

  function confirmSkip() {
    setSkipConfirm(false);
    setStep('skipped');
  }

  function renderSkipConfirmation(): ReactNode {
    if (!skipConfirm) return null;
    return (
      <div className="onboarding-skip-card" role="alertdialog" aria-labelledby="skip-title">
        <strong id="skip-title">Antes de saltear</strong>
        <p>Si salteás el onboarding, no se usarán tus datos. Se cargarán datos ficticios de Atlas Services para que puedas explorar la aplicación. No son datos reales y no se ejecutará ninguna acción externa.</p>
        <small>Este shell de fase 2 todavía no siembra datos; la aplicación idempotente del fixture queda para la fase 4.</small>
        <div className="onboarding-actions compact">
          <button className="outline-button" type="button" onClick={() => setSkipConfirm(false)}>Volver</button>
          <button className="primary-button" type="button" onClick={confirmSkip}>Entiendo, saltear</button>
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
          <div><span><ShieldCheck size={15} /></span><div><strong>Sin efectos externos</strong><small>Esta fase no llama al modelo ni guarda cambios.</small></div></div>
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
        <div className="onboarding-local-note"><ShieldCheck size={14} /><span>Shell local de fase 2 · no se envía texto a Nebius, NVIDIA ni OpenCode2API.</span></div>
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
        <p>Estamos mostrando la transición del wizard. En esta fase el borrador se genera localmente para probar el flujo visual; todavía no hay llamada a un proveedor.</p>
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
        <div className="onboarding-provenance"><ShieldCheck size={14} /><span>Procedencia: shell local de fase 2 · sin ProviderResult todavía · sin escritura.</span></div>
        <div className="onboarding-actions"><button className="outline-button" type="button" onClick={() => setStep('describe')}><ArrowLeft size={15} /> Editar descripción</button><button className="primary-button" type="button" onClick={confirmPreview}>Confirmar vista previa <Check size={15} /></button></div>
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
        <p>{skipped ? 'En la versión final, este camino cargará únicamente el fixture ficticio Atlas Services y no ejecutará acciones externas.' : 'El shape está listo para pasar a la etapa de confirmación real. En esta fase el shell no persiste business ni inventario.'}</p>
        <div className="onboarding-exit-note"><ShieldCheck size={15} /><span>Fase 2: salir solo cambia la vista local. La escritura idempotente y el skip real llegan en la fase 4.</span></div>
        <button className="primary-button" type="button" onClick={() => onExit(decision)}>{skipped ? 'Explorar playground vacío' : 'Entrar al playground'} <Sparkles size={15} /></button>
      </div>
    );
  }

  const currentIndex = stepIndex(step);
  const visibleStep = step === 'complete' || step === 'skipped' ? 'complete' : step;

  return (
    <section className="onboarding-page" aria-labelledby="onboarding-title">
      <div className="onboarding-heading">
        <div><span className="eyebrow">Playground · first setup</span><h1 id="onboarding-title">Onboarding.</h1><p>Un recorrido corto para darle contexto a Noah sin perder el control de tus datos.</p></div>
        <div className="onboarding-meta"><span><span className="live-dot" /> Playground vacío</span><small>Fase 2 · shell local</small></div>
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
