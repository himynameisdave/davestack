import { Resend } from 'resend';
import { env, features, isTestMode } from '../env';
import { magicLinkTemplate } from './templates/magic-link';
import { resetPasswordTemplate } from './templates/reset-password';
import { verifyEmailTemplate } from './templates/verify-email';

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

// Senders keep these exact signatures — the auth email hooks depend on them.
// Each builds its message from a branded template (which escapes interpolated
// values) and defers to sendEmail() for transport selection.
export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  await sendEmail({ to, ...verifyEmailTemplate(url) });
}

export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
  await sendEmail({ to, ...magicLinkTemplate(url) });
}

export async function sendResetPasswordEmail(to: string, url: string): Promise<void> {
  await sendEmail({ to, ...resetPasswordTemplate(url) });
}
