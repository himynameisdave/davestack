import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

import { safeNext } from '#lib/safe-next.js';
import { loginSchema } from '#lib/schemas/auth.js';
import { auth } from '#lib/server/auth/index.js';
import { features } from '#lib/server/env.js';
import { formError, parseForm } from '#lib/server/form.js';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
  googleEnabled: features.google,
  postSignInRedirect: safeNext(url.searchParams.get('next'), '/home'),
});

export const actions: Actions = {
  default: async ({ request, url }) => {
    const { values, parsed } = await parseForm(request, loginSchema);
    const { email } = values;

    if (!parsed.success) {
      return fail(400, { email, error: formError(parsed.error) });
    }

    try {
      await auth.api.signInEmail({
        body: { email: parsed.data.email, password: parsed.data.password },
        headers: request.headers,
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { email, error: error.message || 'Invalid email or password' });
      }
      throw error;
    }

    return redirect(303, safeNext(url.searchParams.get('next'), '/home'));
  },
};
