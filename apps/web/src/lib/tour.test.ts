import { afterEach, describe, expect, it } from 'vitest';
import {
  canStartGuidedTour,
  guidedTourStorageKey,
  hasSeenGuidedTour,
  markGuidedTourSeen,
} from './tour';

function installStorage(): void {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('guided tour eligibility and persistence', () => {
  it('only becomes eligible after an explicit onboarding decision', () => {
    expect(canStartGuidedTour('playground', 'not_started')).toBe(false);
    expect(canStartGuidedTour('playground', 'completed')).toBe(true);
    expect(canStartGuidedTour('playground', 'skipped')).toBe(true);
    expect(canStartGuidedTour('demo', 'completed')).toBe(false);
  });

  it('persists a seen marker per tenant only after onboarding is finalized', () => {
    installStorage();
    const tenantId = 'tenant-tour-test';
    expect(guidedTourStorageKey(tenantId)).toContain('noah-guided-tour:v1:');
    expect(markGuidedTourSeen(tenantId, 'playground', 'not_started')).toBe(false);
    expect(hasSeenGuidedTour(tenantId)).toBe(false);
    expect(markGuidedTourSeen(tenantId, 'playground', 'completed')).toBe(true);
    expect(hasSeenGuidedTour(tenantId)).toBe(true);
  });
});
