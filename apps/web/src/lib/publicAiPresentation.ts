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
    if (availability === 'provider_exhausted') {
      return {
        kicker: 'REVIEWER API STATUS',
        title: 'This API key has no available credit or quota',
        message: publicMessage,
        byok: true,
      };
    }
    const provider = providerLabel(reviewerProvider);
    return {
      kicker: 'PRIVATE BYOK SESSION',
      title: 'Private NVIDIA Nemotron route ready',
      message: `This tab sends onboarding requests through ${provider} for real NVIDIA Nemotron inference. Noah does not cap calls; provider quotas and billing apply. The shared public runtime has separate availability.`,
      byok: true,
    };
  }

  const titles: Record<PublicAiAvailability, string> = {
    available: 'NVIDIA/Nemotron public active',
    provider_exhausted: 'Provider credit exhausted',
    internal_limit: 'Legacy application call cap',
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
