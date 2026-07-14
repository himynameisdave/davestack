import type { LayoutServerLoad } from './$types';

// Expose the current user to every page/layout (client-reachable via `data.user`).
// Server-only guards still read `locals.user` directly — this is for rendering.
export const load: LayoutServerLoad = ({ locals }) => {
  return { user: locals.user ?? null };
};
