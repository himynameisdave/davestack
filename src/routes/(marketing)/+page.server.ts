import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The app takes priority: a signed-in user hitting `/` goes straight into the
// app rather than seeing the marketing landing. Logged-out visitors get the
// public landing.
export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) {
    redirect(303, '/home');
  }
};
