import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { resetPasswordSchema } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
  // Better Auth appends ?token=... to the reset link. `error=INVALID_TOKEN`
  // arrives when the link is bad/expired.
  return {
    token: url.searchParams.get('token') ?? '',
    linkError: url.searchParams.get('error'),
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const parsed = resetPasswordSchema.safeParse({
      token: data.get('token'),
      password: data.get('password'),
    });

    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    try {
      await auth.api.resetPassword({
        body: { newPassword: parsed.data.password, token: parsed.data.token },
        headers: request.headers,
      });
    } catch (err) {
      if (err instanceof APIError) {
        return fail(400, { error: err.message || 'This reset link is invalid or has expired.' });
      }
      throw err;
    }

    return redirect(303, '/login?reset=success');
  },
};
