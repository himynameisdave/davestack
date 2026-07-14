import { Resend } from 'resend';
import { env, features, isTestMode } from '../env';

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

// In-memory capture used by the test harness. The test-only /api/test/mailbox
// endpoint (added with the test suite) reads this back so e2e specs can extract
// verification / magic-link tokens. Never populated outside TEST_MODE.
export const testMailbox: OutboundEmail[] = [];

const DEFAULT_FROM = 'davestack <onboarding@resend.dev>';

/**
 * Transport selection:
 * - TEST_MODE       → capture into testMailbox (asserted by e2e), never sent
 * - Resend + prod   → real send via Resend
 * - otherwise (dev) → pretty-print to the console so links are clickable locally
 *
 * This is the seam the email phase builds on: it swaps the plain-text bodies
 * below for branded templates but keeps these sender signatures stable.
 */
export async function sendEmail(message: Readonly<OutboundEmail>): Promise<void> {
  if (isTestMode) {
    testMailbox.push(message);
    return;
  }

  if (features.resend && env.NODE_ENV === 'production') {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL ?? DEFAULT_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
    return;
  }

  const indentedText = message.text.replaceAll('\n', '\n   ');
  console.log(
    `\n📧 [email] to=${message.to}\n   subject: ${message.subject}\n   ${indentedText}\n`,
  );
}

function basicHtml(heading: string, body: string, url: string, cta: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.6">
<h1 style="font-size:20px">${heading}</h1>
<p>${body}</p>
<p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0c0a09;color:#fff;border-radius:8px;text-decoration:none">${cta}</a></p>
<p style="font-size:12px;color:#888">If you didn't request this, you can ignore this email.</p>
</body></html>`;
}

export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Verify your email',
    html: basicHtml(
      'Verify your email',
      'Confirm your address to finish signing up.',
      url,
      'Verify email',
    ),
    text: `Verify your email: ${url}`,
  });
}

export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Your sign-in link',
    html: basicHtml(
      'Sign in',
      'Click below to sign in. This link expires shortly.',
      url,
      'Sign in',
    ),
    text: `Sign in: ${url}`,
  });
}

export async function sendResetPasswordEmail(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Reset your password',
    html: basicHtml(
      'Reset your password',
      'Click below to choose a new password.',
      url,
      'Reset password',
    ),
    text: `Reset your password: ${url}`,
  });
}
