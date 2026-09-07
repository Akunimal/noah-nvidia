import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, X } from 'lucide-react';

export type TourSection = 'overview' | 'assistant' | 'approvals' | 'knowledge' | 'settings';

interface TourStep {
  id: string;
  section: TourSection;
  target: string;
  eyebrow: string;
  title: string;
  description: string;
}

interface GuidedTourProps {
  onNavigate: (section: TourSection) => void;
  onClose: () => void;
}

const steps: TourStep[] = [
  {
    id: 'overview',
    section: 'overview',
    target: 'tour-overview',
    eyebrow: '01 · CONTROL CENTER',
    title: 'Start with the work Noah prepared.',
    description: 'The overview gives you the current context, pending decisions and the next useful action without hiding the evidence.',
  },
  {
    id: 'assistant',
    section: 'assistant',
    target: 'tour-assistant',
    eyebrow: '02 · NATURAL LANGUAGE',
    title: 'Describe the outcome you want.',
    description: 'Ask Noah in plain language. It turns the request into a reviewable plan and keeps external effects behind your approval.',
  },
  {
    id: 'approvals',
    section: 'approvals',
    target: 'tour-approvals',
    eyebrow: '03 · HUMAN CONTROL',
    title: 'Nothing leaves without your decision.',
    description: 'The approval queue shows the exact proposed effect, its arguments and the decision boundary before anything external can run.',
  },
  {
    id: 'knowledge',
    section: 'knowledge',
    target: 'tour-knowledge',
    eyebrow: '04 · GROUNDED CONTEXT',
    title: 'Keep answers tied to source material.',
    description: 'Documents can ground an answer and carry citations. Instructions inside a file never change Noah’s authority policy.',
  },
  {
    id: 'settings',
    section: 'settings',
    target: 'tour-settings',
    eyebrow: '05 · BOUNDARIES',
    title: 'Inspect the provider and persistence boundary.',
    description: 'Settings makes the active NVIDIA route, Neon persistence and external-effects policy visible at a glance.',
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function isReducedMotion(): boolean {
  return typeof globalThis.matchMedia === 'function'
    && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function GuidedTour({ onNavigate, onClose }: GuidedTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    onNavigate(step.section);
    let disposed = false;
    let retries = 0;
    let retryTimer: number | undefined;
    const targetSelector = `[data-tour="${step.target}"]`;

    const updateTarget = () => {
      if (disposed) return;
      const target = document.querySelector<HTMLElement>(targetSelector);
      if (!target) {
        if (retries < 10) {
          retries += 1;
          retryTimer = window.setTimeout(updateTarget, 50);
        }
        return;
      }
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'center', behavior: isReducedMotion() ? 'auto' : 'smooth' });
      }
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };

    const handleViewportChange = () => {
      const target = document.querySelector<HTMLElement>(targetSelector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };

    updateTarget();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [onNavigate, step]);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [stepIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight' && !isLast) {
        event.preventDefault();
        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      } else if (event.key === 'ArrowLeft' && !isFirst) {
        event.preventDefault();
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFirst, isLast, onClose]);

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function advance() {
    if (isLast) {
      onClose();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <div className="guided-tour-layer">
      {targetRect && <div
        className="guided-tour-spotlight"
        aria-hidden="true"
        style={{
          top: `${Math.max(8, targetRect.top - 8)}px`,
          left: `${Math.max(8, targetRect.left - 8)}px`,
          width: `${targetRect.width + 16}px`,
          height: `${targetRect.height + 16}px`,
        }}
      />}
      <div
        ref={dialogRef}
        className="guided-tour-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        aria-describedby="guided-tour-description"
        onKeyDown={trapFocus}
      >
        <div className="guided-tour-topline">
          <span className="label-kicker">Guided tour · {stepIndex + 1} of {steps.length}</span>
          <button className="guided-tour-close" type="button" onClick={onClose} aria-label="Close guided tour"><X size={16} /></button>
        </div>
        <span className="guided-tour-eyebrow">{step.eyebrow}</span>
        <h2 id="guided-tour-title">{step.title}</h2>
        <p id="guided-tour-description">{step.description}</p>
        <div className="guided-tour-note"><ShieldCheck size={14} /><span>Safe by design · no external action runs during this tour.</span></div>
        <div className="guided-tour-footer">
          <button className="outline-button" type="button" onClick={onClose}>Close tour</button>
          <div className="guided-tour-actions">
            {!isFirst && <button className="outline-button" type="button" onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}><ArrowLeft size={14} /> Back</button>}
            <button className="primary-button" type="button" onClick={advance}>{isLast ? 'Finish tour' : 'Next'} {isLast ? <Check size={14} /> : <ArrowRight size={14} />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
