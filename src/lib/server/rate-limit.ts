import { RetryAfterRateLimiter } from 'sveltekit-rate-limiter/server';

import { isTestMode } from './env';

import type { RequestEvent } from '@sveltejs/kit';

export type TierName = 'auth' | 'form' | 'general';

export function resolveLimiterKey(pathname: string, method: string): TierName | null {
  if (pathname.startsWith('/api/auth/')) {
    return 'auth';
  }
  if (pathname.startsWith('/api/')) {
    return 'general';
  }
  if (method === 'POST') {
    return 'form';
  }
  return null;
}

export const limiters: Record<TierName, RetryAfterRateLimiter> = {
  auth: new RetryAfterRateLimiter({ IP: [20, '15m'] }),
  form: new RetryAfterRateLimiter({ IPUA: [10, 'm'] }),
  general: new RetryAfterRateLimiter({ IP: [60, 'm'] }),
};

export async function checkRateLimit(
  event: RequestEvent,
): Promise<{ limited: boolean; retryAfter?: number }> {
  // Browser specs share one client IP and would exhaust the auth tier together.
  if (isTestMode) {
    return { limited: false };
  }

  const tierName = resolveLimiterKey(event.url.pathname, event.request.method);
  if (!tierName) {
    return { limited: false };
  }

  const status = await limiters[tierName].check(event);
  if (status.limited) {
    return { limited: true, retryAfter: status.retryAfter };
  }
  return { limited: false };
}
