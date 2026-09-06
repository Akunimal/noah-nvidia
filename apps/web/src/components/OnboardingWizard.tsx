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
import type { OnboardingExtractionResponse, OnboardingMutationResponse, OnboardingProvenance, PublicAiStatus } from '../lib/api';
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
  publicDemo?: boolean;
  publicAi?: PublicAiStatus | null;
  onExit: (decision: OnboardingDecision, draft?: OnboardingDraft, business?: OnboardingMutationResponse['business']) => void;
  onExtract: (text: string) => Promise<OnboardingExtractionResponse>;
  onComplete: (draft: OnboardingDraft, idempotencyKey: string) => Promise<OnboardingMutationResponse>;
  onSkip: (idempotencyKey: string) => Promise<OnboardingMutationResponse>;
}

const stepLabels = ['Welcome', 'Describe', 'Review', 'Ready'];

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
  if (message.includes('PUBLIC_NVIDIA_NOT_OPEN')) return 'The public demo is still in synthetic mode. You can activate a temporary reviewer key or complete the JSON manually.';
  if (message.includes('PUBLIC_NVIDIA_WINDOW_CLOSED')) return 'The public NVIDIA/Nemotron window has closed. You can use a temporary key or complete the JSON manually.';
  if (message.includes('PUBLIC_NVIDIA_NOT_CONFIGURED')) return 'The public instance has no server-side Nebius key available. You can use a temporary key or complete the JSON manually.';
  if (message.includes('PUBLIC_NVIDIA_CREDIT_LIMIT_NOT_CONFIGURED')) return 'The public instance has no credit limit configured. You can use a temporary key or complete the JSON manually.';
  if (message.includes('PUBLIC_NVIDIA_CREDIT_EXHAUSTED')) return 'The public instance\'s promotional credit is exhausted. You can use a temporary key or complete the JSON manually.';
  if (message.includes('PUBLIC_NVIDIA_BYOK')) return 'The temporary key could not generate the draft. Check the route and Nemotron model, or complete the JSON manually.';
  if (message.includes('PUBLIC_DEMO_MODEL_INPUT_DISABLED')) return 'The public demo does not send visitor text to a model. You can complete the JSON manually; authenticated onboarding uses Nebius/NVIDIA.';
  if (message.includes('NEBIUS_NOT_CONFIGURED')) return 'Nebius is not configured for this environment. You can complete the JSON manually or retry when the key is available.';
  if (message.includes('NEBIUS_NON_NVIDIA_MODEL')) return 'The Nebius configuration does not point to an NVIDIA Nemotron model. Fix the backend variable before retrying.';
  if (message.includes('PROMPT_INJECTION_BLOCKED')) return 'The description contains an instruction attempting to change Noah\'s rules. Remove it and try again.';
  if (message.includes('ONBOARDING_INVALID_MODEL_OUTPUT')) return 'Nebius responded, but the result does not match onboarding.v1 JSON. You can retry or complete it manually.';
  if (message.includes('ONBOARDING_PROVIDER_ERROR')) return 'Nebius could not generate the draft. The text is still in this form; you can retry.';
  return 'We could not generate the draft from Nebius. The text is still in this form; you can retry or complete it manually.';
}

function readableMutationError(value: unknown): string {
  const message = value instanceof Error ? value.message : '';
  if (message.includes('ONBOARDING_REQUIRED_FIELDS')) return 'Please complete the business name and activity before confirming.';
  if (message.includes('ONBOARDING_ALREADY_FINALIZED')) return 'This onboarding has already been applied. Reload the playground to view the persisted state.';
  if (message.includes('ONBOARDING_DATA_EXISTS')) return 'This playground already has data. Skip will not overwrite existing data.';
  if (message.includes('ONBOARDING_IDEMPOTENCY_KEY_REQUIRED')) return 'The idempotent retry could not be secured. Please try again.';
  if (message.includes('API_5')) return 'The backend could not save the change. Check the connection and try again.';
  return 'The configuration could not be saved. Your data remains on this screen; review it and try again.';
}

function makeIdempotencyKey(prefix: string): string {
  const browserCrypto = globalThis.crypto;
  const random = browserCrypto && typeof browserCrypto.randomUUID === 'function'
    ? browserCrypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export default function OnboardingWizard({ businessName, onExit, onExtract, onComplete, onSkip, publicDemo = false, publicAi = null }: OnboardingWizardProps) {
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
      setError('Tell us a little more about your business so we can build the draft.');
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
        <strong id="skip-title">Before you skip</strong>
        <p>If you skip onboarding, your data will not be used. Fictional Atlas Services data will be loaded so you can explore the application. It is not real data, and no external action will run.</p>
        <small>This decision is saved once in the test tenant and does not run external actions.</small>
        {mutationError && <p className="onboarding-error" role="alert">{mutationError}</p>}
        <div className="onboarding-actions compact">
          <button className="outline-button" type="button" onClick={() => setSkipConfirm(false)}>Back</button>
          <button className="primary-button" type="button" onClick={() => { void confirmSkip(); }} disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'I understand, skip'}</button>
        </div>
      </div>
    );
  }

  function renderWelcome(): ReactNode {
    return (
      <div className="onboarding-welcome">
        <div className="onboarding-orb"><Sparkles size={25} /></div>
        <span className="label-kicker">PLAYGROUND SETUP</span>
        <h2>Tell Noah what your business does.</h2>
        <p>A short description is enough. You will review the JSON before any data is applied to the <strong>{businessName}</strong> workspace.</p>
        <div className="onboarding-benefits">
          <div><span><ClipboardList size={15} /></span><div><strong>Natural language</strong><small>Write it as you would explain it to a person.</small></div></div>
          <div><span><Database size={15} /></span><div><strong>Reviewable JSON</strong><small>Name, activity, and optional inventory.</small></div></div>
          <div><span><ShieldCheck size={15} /></span><div><strong>Human control</strong><small>Nebius only builds a draft; it does not save changes.</small></div></div>
        </div>
        <div className="onboarding-actions">
          <button className="primary-button" type="button" onClick={beginDescription}>Start setup <Sparkles size={15} /></button>
          <button className="outline-button" type="button" onClick={() => setSkipConfirm(true)}>Skip and explore</button>
        </div>
        {renderSkipConfirmation()}
      </div>
    );
  }

  function renderDescribe(): ReactNode {
    return (
      <form className="onboarding-form" onSubmit={submitDescription}>
        <div className="onboarding-card-heading">
          <div><span className="label-kicker">STEP 1 · CONTEXT</span><h2>Describe your business in your own words.</h2><p>No special format is needed. You can mention the name, what you do, and optionally a few products or services.</p></div>
          <Sparkles size={22} />
        </div>
        <label className="onboarding-field wide"><span>Free-form description</span><textarea autoFocus value={narrative} onChange={(event) => setNarrative(event.target.value)} placeholder="Example: We are North Workshop and maintain industrial equipment. We serve local factories and keep filters and pumps in stock." maxLength={1000} /></label>
        <div className="onboarding-example"><Sparkles size={14} /><span>Helpful example: “We are…, we specialize in…, we work with…”</span><button className="text-button" type="button" onClick={() => setNarrative('We are North Workshop and maintain industrial equipment. We serve local factories and keep filters and pumps in stock.')}>Use example</button></div>
        {error && <p className="onboarding-error" role="alert">{error}</p>}
        {extractionError && <div className="onboarding-error-panel" role="alert"><p className="onboarding-error">{extractionError}</p><div className="onboarding-error-actions"><button className="outline-button" type="button" onClick={retryExtraction}>Retry extraction</button><button className="text-button" type="button" onClick={startManualReview}>Complete manually</button></div></div>}
        <div className="onboarding-local-note"><ShieldCheck size={14} /><span>{publicDemo ? publicAi?.enabled ? 'Public demo: your text is sent to Nebius/NVIDIA to build a draft; no change is written until you confirm.' : 'Public demo: your text is not sent to a model while the NVIDIA route is closed or out of credit. You can use a temporary key or complete the draft manually.' : 'Your text is sent only to Nebius/NVIDIA. OpenCode2API is excluded from private onboarding, and no changes are written yet.'}</span></div>
        <div className="onboarding-actions"><button className="outline-button" type="button" onClick={() => setStep('welcome')}><ArrowLeft size={15} /> Back</button><button className="primary-button" type="submit" disabled={narrative.trim().length < 12}>Build draft <Sparkles size={15} /></button></div>
      </form>
    );
  }

  function renderExtracting(): ReactNode {
    return (
      <div className="onboarding-loading" aria-live="polite">
        <div className="onboarding-loading-icon"><Loader2 size={25} /></div>
        <span className="label-kicker">STEP 2 · PREPARATION</span>
        <h2>Building a reviewable draft.</h2>
        <p>{publicDemo ? 'The NVIDIA route is converting your description into onboarding.v1 JSON. Extraction does not save business data, inventory, or the original text.' : 'Nebius is converting your description into onboarding.v1 JSON. Extraction does not save business data, inventory, or the original text.'}</p>
        <div className="onboarding-loading-track"><span /><span /><span /></div>
      </div>
    );
  }

  function renderReview(): ReactNode {
    if (!draft) return null;
    return (
      <div className="onboarding-review">
        <div className="onboarding-card-heading"><div><span className="label-kicker">STEP 3 · HUMAN REVIEW</span><h2>Review what Noah understood.</h2><p>Correct any field before confirming. Missing fields are never filled by guesswork.</p></div><ClipboardList size={22} /></div>
        <div className="onboarding-review-grid">
          <div className="onboarding-fields">
            <label className="onboarding-field"><span>Business name</span><input value={fieldValue(draft, 'name')} onChange={(event) => updateBusiness('name', event.target.value)} placeholder="e.g. North Workshop" /></label>
            <label className="onboarding-field wide"><span>Activity</span><textarea value={fieldValue(draft, 'description')} onChange={(event) => updateBusiness('description', event.target.value)} /></label>
            <label className="onboarding-field"><span>Category</span><input value={fieldValue(draft, 'category')} onChange={(event) => updateBusiness('category', event.target.value)} placeholder="Optional" /></label>
            <label className="onboarding-field"><span>Timezone</span><input value={fieldValue(draft, 'timezone')} onChange={(event) => updateBusiness('timezone', event.target.value)} placeholder="e.g. America/Argentina/Buenos_Aires" /></label>
            <label className="onboarding-field"><span>Currency</span><input value={fieldValue(draft, 'currency')} onChange={(event) => updateBusiness('currency', event.target.value)} placeholder="e.g. ARS" maxLength={3} /></label>
            <label className="onboarding-field"><span>Locale</span><input value={fieldValue(draft, 'locale')} onChange={(event) => updateBusiness('locale', event.target.value)} placeholder="e.g. en-US" /></label>
            <label className="onboarding-field wide"><span>Optional inventory · one product per line</span><textarea value={inventoryText} onChange={(event) => updateInventory(event.target.value)} placeholder="Industrial filter&#10;Hydraulic pump" /></label>
          </div>
          <div className="onboarding-json-panel">
            <div className="onboarding-json-heading"><span>JSON estructurado</span><small>onboarding.v1</small></div>
            <pre>{JSON.stringify(draft, null, 2)}</pre>
          </div>
        </div>
        <div className="onboarding-missing"><strong>Missing fields</strong>{draft.missing_fields.length ? draft.missing_fields.map((field) => <span key={field}>{field}</span>) : <span className="complete">Ready for review</span>}</div>
        <div className="onboarding-provenance"><ShieldCheck size={14} /><span>{providerResult ? `Source: ${providerResult.provider} · ${providerResult.model} · reviewable draft, no write.` : 'Source: manual editing · no provider call · no write.'}</span></div>
        {mutationError && <p className="onboarding-error" role="alert">{mutationError}</p>}
        <div className="onboarding-actions"><button className="outline-button" type="button" onClick={() => setStep('describe')} disabled={isSubmitting}><ArrowLeft size={15} /> Edit description</button><button className="primary-button" type="button" onClick={() => { void confirmPreview(); }} disabled={isSubmitting || Boolean(draft.missing_fields.includes('business.name') || draft.missing_fields.includes('business.description'))}>{isSubmitting ? 'Saving…' : 'Confirm setup'} <Check size={15} /></button></div>
      </div>
    );
  }

  function renderExit(decision: OnboardingDecision): ReactNode {
    const skipped = decision === 'skipped';
    return (
      <div className="onboarding-success">
        <div className={'onboarding-success-icon ' + (skipped ? 'skipped' : '')}>{skipped ? <ShieldCheck size={26} /> : <CheckCircle2 size={29} />}</div>
        <span className="label-kicker">STEP 4 · EXIT</span>
        <h2>{skipped ? 'Skip understood.' : 'Preview is ready.'}</h2>
        <p>{skipped ? 'Fictional Atlas Services data was loaded for exploration. It is not real data, and no external action was executed.' : 'Your configuration was saved in your test tenant. You can keep adding data from the workspace.'}</p>
        <div className="onboarding-exit-note"><ShieldCheck size={15} /><span>{publicDemo ? 'Public demo: temporary synthetic playground decision; visitor data is not stored in Neon and no external effects are executed.' : 'Phase 4: decision persisted in Neon, tenant-safe, and auditable. The guided tour is planned for phase 6.'}</span></div>
        <button className="primary-button" type="button" onClick={() => onExit(decision, decision === 'completed' ? draft || undefined : undefined, mutationResult?.business)}>{skipped ? 'Explore playground' : 'Enter playground'} <Sparkles size={15} /></button>
      </div>
    );
  }

  const currentIndex = stepIndex(step);
  const visibleStep = step === 'complete' || step === 'skipped' ? 'complete' : step;

  return (
    <section className="onboarding-page" aria-labelledby="onboarding-title">
      <div className="onboarding-heading">
        <div><span className="eyebrow">Playground · first setup</span><h1 id="onboarding-title">Onboarding.</h1><p>A short tour to give Noah context without losing control of your data.</p></div>
        <div className="onboarding-meta"><span><span className="live-dot" /> Playground</span><small>{publicDemo ? 'Phase 4 · NVIDIA route' : 'Phase 4 · Neon + Nebius'}</small></div>
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
