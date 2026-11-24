import { sendResetPasswordEmail, sendVerificationEmail } from '../email';

import type { BetterAuthOptions } from 'better-auth';

export const emailAndPassword = {
  enabled: true,
  requireEmailVerification: true,
  sendResetPassword: async ({ user, url }) => {
    await sendResetPasswordEmail(user.email, url);
  },
} satisfies BetterAuthOptions['emailAndPassword'];

export const emailVerification = {
  sendOnSignUp: true,
  // Keep verification and login as distinct steps.
  autoSignInAfterVerification: false,
  sendVerificationEmail: async ({ user, url }) => {
    await sendVerificationEmail(user.email, url);
  },
} satisfies BetterAuthOptions['emailVerification'];
