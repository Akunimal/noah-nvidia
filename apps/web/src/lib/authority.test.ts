import { describe, expect, it } from 'vitest';
import { authorityFor, canExecute } from './authority';

describe('Noah authority policy', () => {
  it('allows reads and drafts without approval', () => {
    expect(authorityFor('mail.read')).toBe('allow');
    expect(canExecute('mail.draft', false)).toBe(true);
  });

  it('requires approval for external effects', () => {
    expect(authorityFor('mail.send')).toBe('ask');
    expect(canExecute('mail.send', false)).toBe(false);
    expect(canExecute('mail.send', true)).toBe(true);
  });

  it('denies destructive or money-moving tools even after approval', () => {
    expect(authorityFor('money.move')).toBe('deny');
    expect(canExecute('money.move', true)).toBe(false);
    expect(canExecute('unknown.tool', false)).toBe(false);
  });
});
