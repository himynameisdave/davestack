import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { features } from '$lib/server/env';
import { field } from '$lib/server/form';
import { loginSchema } from '$lib/schemas/auth';
import { safeNext } from '$lib/safe-next';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
  googleEnabled: features.google,
  postSignInRedirect: safeNext(url.searchParams.get('next'), '/home'),
});

export const actions: Actions = {
  default: async ({ request, url }) => {
    const data = await request.formData();
    const email = field(data, 'email');
    const parsed = loginSchema.safeParse({ email, password: field(data, 'password') });

    if (!parsed.success) {
      return fail(400, { email, error: parsed.error.issues[0]?.message ?? 'Invalid input' });
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
