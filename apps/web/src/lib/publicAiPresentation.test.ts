import { describe, expect, it } from 'vitest';
import { getPublicAiPresentation } from './publicAiPresentation';

describe('public AI runtime presentation', () => {
  it('shows the active private provider instead of the shared synthetic status when BYOK is configured', () => {
    const presentation = getPublicAiPresentation(
      'synthetic',
      'The public demo is still in synthetic mode.',
      'nebius',
    );

    expect(presentation.kicker).toBe('PRIVATE BYOK SESSION');
    expect(presentation.title).toBe('Private NVIDIA Nemotron route ready');
    expect(presentation.message).toContain('Nebius Token Factory');
    expect(presentation.message).toContain('real NVIDIA Nemotron inference');
    expect(presentation.message).toContain('Temporary Noah safety limits');
    expect(presentation.message).toContain('Provider quotas and billing also apply');
    expect(presentation.message).not.toContain('synthetic');
    expect(presentation.byok).toBe(true);
  });

  it('shows the provider exhaustion message when the reviewer key is rejected', () => {
    const message = 'This key has exhausted its provider quota. Add another key.';
    const presentation = getPublicAiPresentation('provider_exhausted', message, 'nvidia-nim');

    expect(presentation.title).toBe('This API key has no available credit or quota');
    expect(presentation.message).toBe(message);
    expect(presentation.byok).toBe(true);
  });

  it('labels a pre-opening BYOK cap as temporary rather than as a legacy API mismatch', () => {
    const message = 'This temporary key reached Noah’s pre-opening safety limit.';
    const presentation = getPublicAiPresentation('internal_limit', message, 'nebius');

    expect(presentation.title).toBe('Temporary safety limit reached');
    expect(presentation.message).toBe(message);
    expect(presentation.byok).toBe(true);
  });

  it('keeps the public synthetic status for visitors without a reviewer key', () => {
    const message = 'The public demo is still in synthetic mode.';
    const presentation = getPublicAiPresentation('synthetic', message, null);

    expect(presentation.kicker).toBe('PUBLIC RUNTIME');
    expect(presentation.title).toBe('Scheduled synthetic demo');
    expect(presentation.message).toBe(message);
    expect(presentation.byok).toBe(false);
  });

  it('names NVIDIA NIM when that is the configured reviewer route', () => {
    const presentation = getPublicAiPresentation('synthetic', 'Public status', 'nvidia-nim');

    expect(presentation.message).toContain('NVIDIA NIM');
    expect(presentation.message).not.toContain('Nebius Token Factory');
  });

  it('does not describe the temporary limit as legacy', () => {
    const presentation = getPublicAiPresentation('internal_limit', 'A temporary cap has been reached.', null);

    expect(presentation.title).toBe('Temporary safety limit reached');
  });
});
