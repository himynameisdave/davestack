import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { prisma } from '../db';
import { env } from '../env';
import { emailAndPassword, emailVerification } from './email-password';
import { magicLinkPlugin } from './magic-link';
import { socialProviders } from './google';
import { passkeyPlugin } from './passkey';

// Better Auth assembly. Each login method lives in its own file in this folder so
// removing one is a small, obvious diff: delete the file and drop its reference
// here (see each file's header + the README "Removing an auth method" section).

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24 * 3; // 3 days

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  user: {
    additionalFields: {
      isAdmin: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  emailAndPassword,
  emailVerification,
  socialProviders,
  plugins: [passkeyPlugin, magicLinkPlugin, sveltekitCookies(getRequestEvent)],
  trustedOrigins: [env.BETTER_AUTH_URL],
});
