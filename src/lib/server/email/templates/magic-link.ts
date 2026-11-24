import { buildActionEmail, type EmailTemplate } from './layout';

export function magicLinkTemplate(url: string): EmailTemplate {
  return buildActionEmail({
    subject: 'Your sign-in link',
    heading: 'Sign in',
    intro: 'Click the button below to sign in. This link expires shortly and can only be used once.',
    cta: 'Sign in',
    url,
    note: "If you didn't request this link, you can safely ignore this email.",
  });
}
