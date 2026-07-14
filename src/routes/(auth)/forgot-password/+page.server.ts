import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { field } from '$lib/server/form';
import { forgotPasswordSchema } from '$lib/schemas/auth';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = field(data, 'email');
    const parsed = forgotPasswordSchema.safeParse({ email });

    if (!parsed.success) {
      return fail(400, { email, error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    try {
      await auth.api.requestPasswordReset({
        body: { email: parsed.data.email, redirectTo: '/reset-password' },
        headers: request.headers,
      });
    } catch (err) {
      // Swallow APIErrors so we never reveal whether an email is registered
      // (user-enumeration guard). Real bugs still surface.
      if (!(err instanceof APIError)) {
        throw err;
      }
    }

    return { success: true, email: parsed.data.email };
  },
};
