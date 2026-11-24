import { buildActionEmail, type EmailTemplate } from './layout';

export function resetPasswordTemplate(url: string): EmailTemplate {
  return buildActionEmail({
    subject: 'Reset your password',
    heading: 'Reset your password',
    intro: 'Click the button below to choose a new password. This link expires shortly.',
    cta: 'Reset password',
    url,
    note: "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
  });
}
