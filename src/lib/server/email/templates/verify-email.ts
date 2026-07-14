import { buildActionEmail, type EmailTemplate } from './layout';

// Sign-up email verification. `url` is the Better-Auth-generated confirmation
// link handed to us by the `sendVerificationEmail` hook.
export function verifyEmailTemplate(url: string): EmailTemplate {
  return buildActionEmail({
    subject: 'Verify your email',
    heading: 'Verify your email',
    intro: 'Confirm your email address to finish setting up your account.',
    cta: 'Verify email',
    url,
    note: "If you didn't create an account, you can safely ignore this email.",
  });
}
