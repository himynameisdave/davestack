import { toSvelteKitHandler } from 'better-auth/svelte-kit';

import { auth } from '$lib/server/auth';

// Catch-all that hands every /api/auth/* request to Better Auth.
const handler = toSvelteKitHandler(auth);

export const GET = handler;
export const POST = handler;
