import { describe, expect, it } from 'vitest';
import { emptyOnboardingDraft, inventoryFromLines, missingFieldsFor, withMissingFields } from './onboarding';

describe('onboarding draft review helpers', () => {
  it('starts a manual draft with every unknown field explicit', () => {
    const draft = emptyOnboardingDraft();

    expect(draft.schema_version).toBe('onboarding.v1');
    expect(draft.business.name).toBeNull();
    expect(draft.business.description).toBeNull();
    expect(draft.business.timezone).toBeNull();
    expect(draft.business.currency).toBeNull();
    expect(draft.missing_fields).toContain('business.timezone');
    expect(draft.missing_fields).toContain('inventory');
  });

  it('turns only explicitly supplied inventory lines into review items', () => {
    expect(inventoryFromLines('Filtro\nBomba\n\n')).toEqual([
      { name: 'Filtro', sku: null, quantity: null, unit: null },
      { name: 'Bomba', sku: null, quantity: null, unit: null },
    ]);
  });

  it('recomputes missing fields after a human edit', () => {
    const draft = emptyOnboardingDraft();
    const completed = withMissingFields({
      ...draft,
      business: {
        ...draft.business,
        name: 'Soporte Norte',
        description: 'Soporte técnico.',
        category: null,
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        locale: 'es-AR',
      },
      inventory: [{ name: 'Router', sku: null, quantity: 2, unit: 'unidades' }],
    });

    expect(missingFieldsFor(completed)).toEqual(['business.category']);
    expect(completed.missing_fields).toEqual(['business.category']);
  });
});
