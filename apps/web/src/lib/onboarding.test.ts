import { describe, expect, it } from 'vitest';
import { createShellDraft, inventoryFromLines, missingFieldsFor, withMissingFields } from './onboarding';

describe('onboarding phase 2 shell draft', () => {
  it('keeps the natural-language text reviewable without inventing context', () => {
    const draft = createShellDraft('Somos Taller Norte y nos dedicamos a mantenimiento industrial.');

    expect(draft.schema_version).toBe('onboarding.v1');
    expect(draft.business.name).toBe('Taller Norte');
    expect(draft.business.category).toBe('mantenimiento industrial');
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
    const draft = createShellDraft('Nuestra empresa presta soporte técnico.');
    const completed = withMissingFields({
      ...draft,
      business: {
        ...draft.business,
        name: 'Soporte Norte',
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
