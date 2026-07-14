import { type APIRequestContext, type Page, expect } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { PrismaClient } from '../../src/generated/prisma/client';

// Reusable e2e helpers. These are the building blocks every spec composes, and
// the /new-route + davestack-e2e docs (Phase 10) point here — so keep the
// signatures stable and the behaviour boring.
//
//   createUser(opts?)              → make a throwaway user (User + credential Account)
//   loginAs(page, creds)           → sign the browser in via the real auth API
//   withVirtualAuthenticator(page) → attach a CDP WebAuthn virtual authenticator
//   getLatestEmail(request, to)    → poll the test mailbox for the newest email
//   extractLink(email)             → pull the action URL out of an email's text
//   clearMailbox(request)          → empty the test mailbox

// Fixtures talk to the same test DB the app does. Falls back to the .env.test
// value so it works even if a worker didn't inherit the loaded env.
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://davestack:davestack@localhost:5433/davestack_test?schema=public';

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = 'password123';

export type CreatedUser = {
  id: string;
  email: string;
  password: string;
  isAdmin: boolean;
};

/**
 * Insert a fresh user + credential Account directly (bypasses signup). Defaults
 * to a unique email and a verified account so it can log in immediately with a
 * password. Every call gets a distinct email, so serial/parallel specs never
 * collide.
 */
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

/**
 * Log the browser in by POSTing to the real email sign-in endpoint. We use the
 * API (not a forged cookie) because `page.request` shares the browser context's
 * cookie jar: the Set-Cookie from the response lands in the context, so every
 * subsequent `page.goto` is authenticated. It exercises the true auth path and
 * needs no HMAC cookie-signing helper to stay in sync with Better Auth.
 */
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

/**
 * Attach a CDP WebAuthn virtual authenticator to the page. This is the correct
 * way to test passkeys end-to-end — it makes navigator.credentials create/get
 * ceremonies succeed without mocking. Chromium only (CDP feature).
 *
 * `hasResidentKey` + `hasUserVerification` + `isUserVerified` +
 * `automaticPresenceSimulation` make it a discoverable credential that "just
 * works", enabling passwordless (usernameless) sign-in.
 *
 * Call `cleanup()` in afterEach (or ignore it — the authenticator dies with the
 * page). Credentials persist across navigations within the same page, which is
 * what lets a spec register a passkey and then sign in with it.
 */
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

/**
 * Poll GET /api/test/mailbox?to=<to> until an email shows up, returning the
 * newest one. Email sending is awaited inside the auth actions, but we poll
 * anyway so timing is never a source of flake.
 */
export async function getLatestEmail(
  request: APIRequestContext,
  to: string,
): Promise<CapturedEmail> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await request.get(`/api/test/mailbox?to=${encodeURIComponent(to)}`);
    if (response.ok()) {
      const emails = (await response.json()) as CapturedEmail[];
      if (emails.length > 0 && emails[0]) return emails[0];
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
  throw new Error(`No email captured for ${to} after polling the test mailbox.`);
}

/** Pull the first absolute URL out of an email's plain-text body. */
export function extractLink(email: Readonly<CapturedEmail>): string {
  const match = email.text.match(/https?:\/\/[^\s"<>]+/u);
  if (!match) throw new Error(`No link found in email "${email.subject}".`);
  return match[0];
}

/** Empty the test mailbox (reset between flows that assert email counts). */
export async function clearMailbox(request: APIRequestContext): Promise<void> {
  await request.delete('/api/test/mailbox');
}
