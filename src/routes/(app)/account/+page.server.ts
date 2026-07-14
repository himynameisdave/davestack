import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { renamePasskeySchema } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

const profileSchema = z.object({ name: z.string().min(1, 'Name is required').max(100) });
const revokeSchema = z.object({ id: z.string().min(1) });

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');

  const passkeys = await prisma.passkey.findMany({
    where: { userId: locals.user.id },
    select: { id: true, name: true, deviceType: true, backedUp: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return { passkeys };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');

    const data = await request.formData();
    const parsed = profileSchema.safeParse({ name: data.get('name') });
    if (!parsed.success) {
      return fail(400, { action: 'updateProfile', error: parsed.error.issues[0]?.message });
    }

    await prisma.user.update({ where: { id: locals.user.id }, data: { name: parsed.data.name } });
    return { action: 'updateProfile', success: true };
  },

  // Rename is the one mutation Better Auth's client doesn't expose, so it goes
  // straight to Prisma — scoped to the session user's id so nobody can rename
  // someone else's passkey.
  renamePasskey: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');

    const data = await request.formData();
    const parsed = renamePasskeySchema.safeParse({ id: data.get('id'), name: data.get('name') });
    if (!parsed.success) {
      return fail(400, { action: 'renamePasskey', error: parsed.error.issues[0]?.message });
    }

    const result = await prisma.passkey.updateMany({
      where: { id: parsed.data.id, userId: locals.user.id },
      data: { name: parsed.data.name },
    });
    if (result.count === 0) {
      return fail(404, { action: 'renamePasskey', error: 'Passkey not found' });
    }
    return { action: 'renamePasskey', success: true };
  },

  revokePasskey: async ({ request, locals }) => {
    if (!locals.user) redirect(303, '/login');

    const data = await request.formData();
    const parsed = revokeSchema.safeParse({ id: data.get('id') });
    if (!parsed.success) {
      return fail(400, { action: 'revokePasskey', error: 'Invalid passkey' });
    }

    await prisma.passkey.deleteMany({ where: { id: parsed.data.id, userId: locals.user.id } });
    return { action: 'revokePasskey', success: true };
  },
};
