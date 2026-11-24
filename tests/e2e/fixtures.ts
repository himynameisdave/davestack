import { type APIRequestContext, type Page, expect } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';

import { PrismaClient } from '../../src/generated/prisma/client';

// Workers inherit DATABASE_URL from `bun run test:e2e` or the CI job env.
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — run e2e via `bun run test:e2e`.');
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = 'password123';

export type CreatedUser = {
  id: string;
  email: string;
  password: string;
  isAdmin: boolean;
};

export async function createUser(
  options: Readonly<{
    email?: string;
    password?: string;
    isAdmin?: boolean;
    emailVerified?: boolean;
  }> = {},
): Promise<CreatedUser> {
  const id = crypto.randomUUID();
  const email = options.email ?? `user-${crypto.randomUUID().slice(0, 8)}@example.test`;
  const password = options.password ?? DEFAULT_PASSWORD;
  const isAdmin = options.isAdmin ?? false;
  const emailVerified = options.emailVerified ?? true;

  await prisma.user.create({
    data: { id, email, name: email.split('@')[0] ?? 'User', emailVerified, isAdmin },
  });
  await prisma.account.create({
    data: {
      id: `${id}-credential`,
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: await hashPassword(password),
    },
  });

  return { id, email, password, isAdmin };
}

// page.request shares the browser's cookie jar, so the real login authenticates later navigations.
export async function loginAs(
  page: Page,
  credentials: Readonly<{ email: string; password: string }>,
): Promise<void> {
  const response = await page.request.post('/api/auth/sign-in/email', {
    data: { email: credentials.email, password: credentials.password },
  });
  expect(
    response.ok(),
    `sign-in failed for ${credentials.email}: ${response.status()} ${await response.text()}`,
  ).toBe(true);
}

// Resident credentials support usernameless sign-in. Keep the same page so the credential survives navigation.
export async function withVirtualAuthenticator(
  page: Page,
): Promise<{ authenticatorId: string; cleanup: () => Promise<void> }> {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  const cleanup = async () => {
    try {
      await client.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
      await client.detach();
    } catch {
      // Page/context already closed — nothing left to detach.
    }
  };

  return { authenticatorId, cleanup };
}

export type CapturedEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function getLatestEmail(request: APIRequestContext, to: string): Promise<CapturedEmail> {
  // oxlint-disable eslint/no-await-in-loop -- polling: each probe must complete before the next
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await request.get(`/api/test/mailbox?to=${encodeURIComponent(to)}`);
    if (response.ok()) {
      const emails = (await response.json()) as CapturedEmail[];
      if (emails.length > 0 && emails[0]) {
        return emails[0];
      }
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
  // oxlint-enable eslint/no-await-in-loop
  throw new Error(`No email captured for ${to} after polling the test mailbox.`);
}

/** Pull the first absolute URL out of an email's plain-text body. */
export function extractLink(email: Readonly<CapturedEmail>): string {
  const match = /https?:\/\/[^\s"<>]+/u.exec(email.text);
  if (!match) {
    throw new Error(`No link found in email "${email.subject}".`);
  }
  return match[0];
}

export async function clearMailbox(request: APIRequestContext): Promise<void> {
  await request.delete('/api/test/mailbox');
}
