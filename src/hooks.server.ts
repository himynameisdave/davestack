import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/rate-limit';
import { assertProductionReady } from '$lib/server/env';

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
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter ?? 60) },
    });
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

// Log the real error server-side with a correlation id; hand the client a
// generic message (plus the id, so a user can quote it to support) rather than
// leaking internals.
export const handleError: HandleServerError = ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();
  console.error(
    `[error ${errorId}] ${event.request.method} ${event.url.pathname} → ${status}`,
    error,
  );
  return {
    message: status < 500 ? message : 'Something went wrong on our end. Please try again.',
    errorId,
  };
};
