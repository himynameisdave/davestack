import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

import { signupSchema } from '#lib/schemas/auth.js';
import { auth } from '#lib/server/auth/index.js';
import { formError, parseForm } from '#lib/server/form.js';

import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const { values, parsed } = await parseForm(request, signupSchema);
    const { name, email } = values;

    if (!parsed.success) {
      return fail(400, { name, email, error: formError(parsed.error) });
    }

    try {
      // requireEmailVerification is on, so this creates the (unverified) user and
      // sends a verification email — it does NOT sign them in yet.
      await auth.api.signUpEmail({
        body: {
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
        },
        headers: request.headers,
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { name, email, error: error.message || 'Could not create your account' });
      }
      throw error;
    }

    return { success: true, email: parsed.data.email };
  },
};
