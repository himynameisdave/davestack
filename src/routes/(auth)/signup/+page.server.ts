import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { field } from '$lib/server/form';
import { signupSchema } from '$lib/schemas/auth';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const name = field(data, 'name');
    const email = field(data, 'email');
    const parsed = signupSchema.safeParse({ name, email, password: field(data, 'password') });

    if (!parsed.success) {
      return fail(400, { name, email, error: parsed.error.issues[0]?.message ?? 'Invalid input' });
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
    } catch (err) {
      if (err instanceof APIError) {
        return fail(400, { name, email, error: err.message || 'Could not create your account' });
      }
      throw err;
    }

    return { success: true, email: parsed.data.email };
  },
};
