import { svelteKitHandler } from 'better-auth/svelte-kit';

import { logger } from '#lib/log.js';
import { auth } from '#lib/server/auth/index.js';
import { assertProductionReady } from '#lib/server/env.js';
import { checkRateLimit } from '#lib/server/rate-limit.js';
import { building } from '$app/env';

import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';

// Build-time imports run without production secrets.
if (!building) {
  assertProductionReady();
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'off',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const handle: Handle = async ({ event, resolve }) => {
  const { limited, retryAfter } = await checkRateLimit(event);
  if (limited) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } },
    );
  }

  const session = await auth.api.getSession({ headers: event.request.headers });
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  const response = await svelteKitHandler({ event, resolve, auth, building });
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
};

// Unexpected errors get a correlation ID for support and a generic client message.
export const handleError: HandleServerError = ({ kind, error, event }) => {
  if (kind === 'app') {
    return error;
  }
  const errorId = crypto.randomUUID();
  logger.error(`[error ${errorId}] ${event.request.method} ${event.url.pathname} (${kind})`, error);
  return kind === 'unknown'
    ? { message: 'Something went wrong on our end. Please try again.', errorId }
    : { errorId };
};
