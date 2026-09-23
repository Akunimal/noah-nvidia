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
    if (availability === 'internal_limit') {
      return {
        kicker: 'PRIVATE BYOK SESSION',
        title: 'Temporary safety limit reached',
        message: publicMessage,
        byok: true,
      };
    }
    const provider = providerLabel(reviewerProvider);
    return {
      kicker: 'PRIVATE BYOK SESSION',
      title: 'Private NVIDIA Nemotron route ready',
      message: `This tab sends onboarding requests through ${provider} for real NVIDIA Nemotron inference. Temporary Noah safety limits apply before the public opening and lift automatically at opening. Provider quotas and billing also apply. The shared public runtime has separate availability.`,
      byok: true,
    };
  }

  const titles: Record<PublicAiAvailability, string> = {
    available: 'NVIDIA/Nemotron public active',
    provider_exhausted: 'Provider credit exhausted',
    internal_limit: 'Temporary safety limit reached',
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
