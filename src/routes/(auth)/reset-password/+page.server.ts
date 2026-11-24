import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

import { resetPasswordSchema } from '#lib/schemas/auth.js';
import { auth } from '#lib/server/auth/index.js';
import { formError, parseForm } from '#lib/server/form.js';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) =>
  // Better Auth appends ?token=... to the reset link. `error=INVALID_TOKEN`
  // arrives when the link is bad/expired.
  ({
    token: url.searchParams.get('token') ?? '',
    linkError: url.searchParams.get('error'),
  });

export const actions: Actions = {
  default: async ({ request }) => {
    const { parsed } = await parseForm(request, resetPasswordSchema);

    if (!parsed.success) {
      return fail(400, { error: formError(parsed.error) });
    }

    try {
      await auth.api.resetPassword({
        body: { newPassword: parsed.data.password, token: parsed.data.token },
        headers: request.headers,
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { error: error.message || 'This reset link is invalid or has expired.' });
      }
      throw error;
    }

    return redirect(303, '/login?reset=success');
  },
};
