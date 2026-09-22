import type { ReviewerProviderName } from './api';

export type PublicAiAvailability =
  | 'available'
  | 'provider_exhausted'
  | 'internal_limit'
  | 'closed'
  | 'synthetic'
  | 'temporary_unavailable';

export interface PublicAiPresentation {
  kicker: string;
  title: string;
  message: string;
  byok: boolean;
}

function providerLabel(provider: ReviewerProviderName): string {
  return provider === 'nebius' ? 'Nebius Token Factory' : 'NVIDIA NIM';
}

export function getPublicAiPresentation(
  availability: PublicAiAvailability,
  publicMessage: string,
  reviewerProvider: ReviewerProviderName | null,
): PublicAiPresentation {
  if (reviewerProvider) {
    const provider = providerLabel(reviewerProvider);
    return {
      kicker: 'PRIVATE BYOK SESSION',
      title: 'Private NVIDIA Nemotron route ready',
      message: `This tab is configured to send onboarding requests through ${provider} for real NVIDIA Nemotron inference. The shared public runtime has separate availability and limits.`,
      byok: true,
    };
  }

  const titles: Record<PublicAiAvailability, string> = {
    available: 'NVIDIA/Nemotron public active',
    provider_exhausted: 'Provider credit exhausted',
    internal_limit: 'Public safety limit reached',
    closed: 'Public window closed',
    synthetic: 'Scheduled synthetic demo',
    temporary_unavailable: 'NVIDIA/Nemotron temporarily unavailable',
  };

  return {
    kicker: 'PUBLIC RUNTIME',
    title: titles[availability],
    message: publicMessage,
    byok: false,
  };
}
