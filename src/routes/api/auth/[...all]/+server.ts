import { auth } from '$lib/server/auth';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';

// Catch-all that hands every /api/auth/* request to Better Auth.
const handler = toSvelteKitHandler(auth);

export const GET = handler;
export const POST = handler;
