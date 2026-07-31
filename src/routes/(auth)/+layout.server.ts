import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Already signed in? The auth pages have nothing to offer you — go to the app.
export const load: LayoutServerLoad = ({ locals }) => {
  if (locals.user) {
    redirect(303, '/home');
  }
};
