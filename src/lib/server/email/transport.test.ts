import { beforeEach, describe, expect, it } from 'vitest';

import { isTestMode } from '../env';
import { sendEmail, sendMagicLinkEmail, sendResetPasswordEmail, sendVerificationEmail, testMailbox } from './index';

beforeEach(() => {
  testMailbox.length = 0;
});

function byRecipient(to: string) {
  return testMailbox.find((message) => message.to === to);
}

describe('capture transport (TEST_MODE)', () => {
  it('runs under TEST_MODE so the mailbox is live', () => {
    expect(isTestMode).toBe(true);
  });

  it('captures a raw message into the in-memory mailbox instead of sending', async () => {
    await sendEmail({
      to: 'someone@example.test',
      subject: 'Hello',
      html: '<p>hi</p>',
      text: 'hi',
    });
    expect(testMailbox).toHaveLength(1);
    expect(testMailbox[0]).toMatchObject({ to: 'someone@example.test', subject: 'Hello' });
  });

  it('captures verification / magic-link / reset senders with their template subjects', async () => {
    const url = 'http://localhost:4173/api/auth/verify-email?token=abc&callbackURL=/';
    await sendVerificationEmail('v@example.test', url);
    await sendMagicLinkEmail('m@example.test', url);
    await sendResetPasswordEmail('r@example.test', url);

    expect(testMailbox).toHaveLength(3);
    expect(byRecipient('v@example.test')?.subject).toBe('Verify your email');
    expect(byRecipient('m@example.test')?.subject).toBe('Your sign-in link');
    expect(byRecipient('r@example.test')?.subject).toBe('Reset your password');

    expect(byRecipient('v@example.test')?.text).toContain(url);
  });
});
