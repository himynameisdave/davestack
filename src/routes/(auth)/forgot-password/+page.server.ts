import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

import { forgotPasswordSchema } from '#lib/schemas/auth.js';
import { auth } from '#lib/server/auth/index.js';
import { formError, parseForm } from '#lib/server/form.js';

import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const { values, parsed } = await parseForm(request, forgotPasswordSchema);

    if (!parsed.success) {
      return fail(400, { email: values.email, error: formError(parsed.error) });
    }

    try {
      await auth.api.requestPasswordReset({
        body: { email: parsed.data.email, redirectTo: '/reset-password' },
        headers: request.headers,
      });
    } catch (error) {
      // Swallow APIErrors so we never reveal whether an email is registered
      // (user-enumeration guard). Real bugs still surface.
      if (!(error instanceof APIError)) {
        throw error;
      }
    }

    return { success: true, email: parsed.data.email };
  },
};
