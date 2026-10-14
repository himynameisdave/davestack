import { svelteKitHandler } from 'better-auth/svelte-kit';

import { logger } from '#lib/log.js';
import { auth } from '#lib/server/auth/index.js';
import { assertProductionReady } from '#lib/server/env.js';
import { checkRateLimit } from '#lib/server/rate-limit.js';
import { building } from '$app/env';

import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';

// Fail fast at runtime boot if production is misconfigured. Guarded by `!building`
// so it never fires during `vite build` (which has no real secrets).
if (!building) {
  assertProductionReady();
}

// Baseline security headers applied to every response. Relocated here from the
// per-host config the reference apps kept in netlify.toml (Railway has no
// equivalent). Tune the Permissions-Policy as the app grows.
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

  // Populate locals for server load functions / guards. Reads the session from
  // the request cookies via Better Auth.
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

// Every error lands here. `error(...)` bodies (kind 'app') are already safe and
// deliberate, so pass them through unlogged. Everything else is logged with a
// correlation id. Framework errors (404, 405, …) keep their safe status + message;
// unknown errors get a generic message (plus the id, so a user can quote it to
// support) rather than leaking internals.
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
