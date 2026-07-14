import type { BetterAuthOptions } from 'better-auth';
import { sendResetPasswordEmail, sendVerificationEmail } from '../email';

// Email + password with mandatory email verification. To remove this method,
// delete this file and drop `emailAndPassword` + `emailVerification` from the
// betterAuth() call in ./index.ts.
export const emailAndPassword = {
  enabled: true,
  requireEmailVerification: true,
  sendResetPassword: async ({ user, url }) => {
    await sendResetPasswordEmail(user.email, url);
  },
} satisfies BetterAuthOptions['emailAndPassword'];

export const emailVerification = {
  sendOnSignUp: true,
  // Keep verification and login as distinct steps (matches the signup → verify →
  // login e2e flow). Flip to true for a smoother "verified and signed in" UX.
  autoSignInAfterVerification: false,
  sendVerificationEmail: async ({ user, url }) => {
    await sendVerificationEmail(user.email, url);
  },
} satisfies BetterAuthOptions['emailVerification'];
