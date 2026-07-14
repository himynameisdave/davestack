import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import dotenv from 'dotenv';

// Playwright global setup. Runs once, before the webServer starts:
//   1. sync the schema to the test DB (:5433) and (re)generate the client
//   2. wipe every table
//   3. seed a deterministic admin + regular user, each with a working
//      email+password login (Better Auth's own hasher + a credential Account)
//
// Everything targets the DB in .env.test — never the dev DB on :5432. Individual
// specs create their own throwaway users via createUser() (see fixtures.ts); the
// two seeded users are a stable baseline for anyone driving the suite by hand.

dotenv.config({ path: '.env.test' });

const SEED_PASSWORD = 'password123';

const SEED_USERS = [
  { id: 'e2e-seed-admin', email: 'admin@example.test', name: 'Seed Admin', isAdmin: true },
  { id: 'e2e-seed-user', email: 'user@example.test', name: 'Seed User', isAdmin: false },
] as const;

export default async function globalSetup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set — is .env.test loaded?');

  // `svelte-kit sync` writes .svelte-kit/tsconfig.json, which Prisma 7's
  // prisma-client generator reads. Doing it here keeps a *fresh clone*'s first
  // `bun run test:e2e` working (global setup runs before the webServer build).
  const run = (command: string) =>
    execSync(command, { stdio: 'pipe', env: { ...process.env, DATABASE_URL: databaseUrl } });
  run('bunx svelte-kit sync');
  run('bunx prisma db push --accept-data-loss');

  // Import the client only after `db push` has generated it (fresh-clone safe).
  const { PrismaClient } = await import('../../src/generated/prisma/client');
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // Wipe everything. Deleting users cascades to Session/Account/Passkey (the
    // schema's onDelete: Cascade); Verification has no FK, so clear it directly.
    await prisma.verification.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await hashPassword(SEED_PASSWORD);

    for (const seed of SEED_USERS) {
      await prisma.user.create({
        data: {
          id: seed.id,
          email: seed.email,
          name: seed.name,
          emailVerified: true,
          isAdmin: seed.isAdmin,
        },
      });
      await prisma.account.create({
        data: {
          id: `${seed.id}-credential`,
          accountId: seed.id,
          providerId: 'credential',
          userId: seed.id,
          password: passwordHash,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}
