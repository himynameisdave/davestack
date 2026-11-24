import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

// A 404 conceals the admin area from visitors without access.
export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.user?.isAdmin) {
    error(404, 'Not found');
  }
  return { user: locals.user };
};
