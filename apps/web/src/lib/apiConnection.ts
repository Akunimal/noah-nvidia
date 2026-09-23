export const API_CONNECTION_EVENT = 'noah:api-connection';

export type ApiTransportFailure = 'API_UNREACHABLE' | 'API_TIMEOUT';

export function reportApiConnection(online: boolean): void {
  if (typeof window === 'undefined') return;
  const event = document.createEvent('Event');
  event.initEvent(API_CONNECTION_EVENT, false, false);
  Object.defineProperty(event, 'detail', { value: { online } });
  window.dispatchEvent(event);
}

export function getApiTransportFailure(value: unknown): ApiTransportFailure | null {
  const message = value instanceof Error ? value.message : typeof value === 'string' ? value : '';
  if (message.startsWith('API_TIMEOUT')) return 'API_TIMEOUT';
  if (message.startsWith('API_UNREACHABLE')) return 'API_UNREACHABLE';
  return null;
}

export function apiTransportFailureMessage(failure: ApiTransportFailure): string {
  if (failure === 'API_TIMEOUT') {
    return 'The Noah API did not respond in time. Your text remains on this screen, but the request may have reached the provider. Check for a result before retrying to avoid a duplicate call.';
  }
  return 'The browser could not reach the Noah API. Your text remains on this screen. An in-flight request may have reached the provider, so check for a result before retrying.';
}
