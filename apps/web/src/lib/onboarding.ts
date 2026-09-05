export type OnboardingBusinessField =
  | 'name'
  | 'description'
  | 'category'
  | 'timezone'
  | 'currency'
  | 'locale';

export interface OnboardingBusiness {
  name: string | null;
  description: string | null;
  category: string | null;
  timezone: string | null;
  currency: string | null;
  locale: string | null;
}

export interface OnboardingInventoryItem {
  name: string;
  sku: string | null;
  quantity: number | null;
  unit: string | null;
}

export interface OnboardingDraft {
  schema_version: 'onboarding.v1';
  business: OnboardingBusiness;
  inventory: OnboardingInventoryItem[];
  missing_fields: string[];
}

const businessFieldPaths: Array<[OnboardingBusinessField, string]> = [
  ['name', 'business.name'],
  ['description', 'business.description'],
  ['category', 'business.category'],
  ['timezone', 'business.timezone'],
  ['currency', 'business.currency'],
  ['locale', 'business.locale'],
];

function capture(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  const value = match?.[1]?.trim().replace(/[,.!?;]+$/, '');
  return value || null;
}

export function inventoryFromLines(value: string): OnboardingInventoryItem[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((name) => ({ name: name.slice(0, 160), sku: null, quantity: null, unit: null }));
}

export function missingFieldsFor(draft: Pick<OnboardingDraft, 'business' | 'inventory'>): string[] {
  const missing = businessFieldPaths
    .filter(([field]) => !draft.business[field]?.trim())
    .map(([, path]) => path);
  if (draft.inventory.length === 0) missing.push('inventory');
  return missing;
}

export function createShellDraft(narrative: string, inventoryText = ''): OnboardingDraft {
  const description = narrative.replace(/\s+/g, ' ').trim() || null;
  const business: OnboardingBusiness = {
    name: capture(
      description || '',
      /(?:mi empresa se llama|la empresa se llama|nombre(?: de la empresa)? es|somos)\s+(.+?)(?=\s+(?:y|que|nos dedicamos|hacemos)\b|[,.!?;]|$)/i,
    ),
    description,
    category: capture(
      description || '',
      /(?:nos dedicamos a|nos dedicamos al|hacemos|rubro es|actividad(?: principal)? es)\s+(.+?)(?=[.!?;]|$)/i,
    ),
    timezone: null,
    currency: null,
    locale: null,
  };
  const inventory = inventoryFromLines(inventoryText);
  const draft: OnboardingDraft = {
    schema_version: 'onboarding.v1',
    business,
    inventory,
    missing_fields: [],
  };
  draft.missing_fields = missingFieldsFor(draft);
  return draft;
}

export function withMissingFields(draft: OnboardingDraft): OnboardingDraft {
  return { ...draft, missing_fields: missingFieldsFor(draft) };
}
