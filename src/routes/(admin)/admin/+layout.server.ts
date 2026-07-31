import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Guard for the whole admin area. A non-admin (or logged-out) visitor gets a
// 404 — deliberately NOT a 403 — so the route's existence is never revealed to
// someone who shouldn't see it. Access is decided server-side only; no client
// code ever gates this.
export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.user?.isAdmin) {
    error(404, 'Not found');
  }
  return { user: locals.user };
};
