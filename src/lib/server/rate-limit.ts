import { RetryAfterRateLimiter } from 'sveltekit-rate-limiter/server';
import type { RequestEvent } from '@sveltejs/kit';
import { isTestMode } from './env';

export type TierName = 'auth' | 'form' | 'general';

/**
 * Maps a request to a rate-limit tier by pathname + method. Returns null for
 * ordinary page loads (GET), which are not rate limited. Extend with your own
 * tiers (e.g. 'search', 'write') as the app grows.
 */
export function resolveLimiterKey(pathname: string, method: string): TierName | null {
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/')) return 'general';
  if (method === 'POST') return 'form';
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
  // Never throttle the test suite — e2e drives auth endpoints deterministically
  // and would otherwise trip the limiter and go flaky.
  if (isTestMode) return { limited: false };

  const tierName = resolveLimiterKey(event.url.pathname, event.request.method);
  if (!tierName) return { limited: false };

  const status = await limiters[tierName].check(event);
  if (status.limited) return { limited: true, retryAfter: status.retryAfter };
  return { limited: false };
}
