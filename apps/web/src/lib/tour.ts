import type { OnboardingStatus } from './api';

export type GuidedTourWorkspaceMode = 'demo' | 'playground' | 'unknown';

export const GUIDED_TOUR_VERSION = 'v1';

export function canStartGuidedTour(
  mode: GuidedTourWorkspaceMode,
  onboardingStatus: OnboardingStatus,
): boolean {
  return mode === 'playground' && (onboardingStatus === 'completed' || onboardingStatus === 'skipped');
}

export function guidedTourStorageKey(tenantId: string): string {
  const normalized = tenantId.trim();
  return normalized ? `noah-guided-tour:${GUIDED_TOUR_VERSION}:${encodeURIComponent(normalized)}` : '';
}

export function hasSeenGuidedTour(tenantId: string): boolean {
  const key = guidedTourStorageKey(tenantId);
  if (!key) return false;
  try {
    return globalThis.localStorage?.getItem(key) === 'seen';
  } catch {
    return false;
  }
}

export function markGuidedTourSeen(
  tenantId: string,
  mode: GuidedTourWorkspaceMode,
  onboardingStatus: OnboardingStatus,
): boolean {
  if (!canStartGuidedTour(mode, onboardingStatus)) return false;
  const key = guidedTourStorageKey(tenantId);
  if (!key) return false;
  try {
    globalThis.localStorage?.setItem(key, 'seen');
    return hasSeenGuidedTour(tenantId);
  } catch {
    return false;
  }
}
