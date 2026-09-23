import { describe, expect, it } from 'vitest';
import { apiTransportFailureMessage, getApiTransportFailure } from './apiConnection';

describe('API transport failures', () => {
  it('recognizes a connection failure and explains that the request may still have reached the provider', () => {
    const failure = getApiTransportFailure(new Error('API_UNREACHABLE'));

    expect(failure).toBe('API_UNREACHABLE');
    expect(apiTransportFailureMessage(failure!)).toContain('check for a result before retrying');
  });

  it('recognizes a client-side timeout', () => {
    expect(getApiTransportFailure(new Error('API_TIMEOUT'))).toBe('API_TIMEOUT');
  });

  it('does not confuse a provider quota response with an API connection failure', () => {
    expect(getApiTransportFailure(new Error('API_503:PUBLIC_NVIDIA_PROVIDER_EXHAUSTED'))).toBeNull();
  });
});
