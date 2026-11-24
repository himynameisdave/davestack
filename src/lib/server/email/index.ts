import { Resend } from 'resend';

import { logger } from '#lib/log.js';

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

// The Playwright mailbox endpoint reads this buffer to retrieve auth links.
export const testMailbox: OutboundEmail[] = [];

const DEFAULT_FROM = 'davestack <onboarding@resend.dev>';

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

  // Print the link so local verification and password reset work without an email provider.
  const indentedText = message.text.replaceAll('\n', '\n   ');
  logger.info(`\n📧 [email] to=${message.to}\n   subject: ${message.subject}\n   ${indentedText}\n`);
}

export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  await sendEmail({ to, ...verifyEmailTemplate(url) });
}

export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
  await sendEmail({ to, ...magicLinkTemplate(url) });
}

export async function sendResetPasswordEmail(to: string, url: string): Promise<void> {
  await sendEmail({ to, ...resetPasswordTemplate(url) });
}
