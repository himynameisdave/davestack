import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Server-side guard for the whole authed area. Client code never decides access —
// this runs before any (app) page renders. Unauthenticated users bounce to login
// with a `next` param so they land back where they were headed.
export const load: LayoutServerLoad = ({ locals, url }) => {
  if (!locals.user) {
    redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return { user: locals.user };
};
