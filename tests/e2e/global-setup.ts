import { execSync } from 'node:child_process';

import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import dotenv from 'dotenv';

// The test DB is always fresh (a throwaway container locally, the service container in CI),
// so a plain `db push` is enough. Never add `--force-reset`: Prisma blocks it for AI agents.

dotenv.config({ path: '.env.test' });

const SEED_PASSWORD = 'password123';

const SEED_USERS = [
  { id: 'e2e-seed-admin', email: 'admin@example.test', name: 'Seed Admin', isAdmin: true },
  { id: 'e2e-seed-user', email: 'user@example.test', name: 'Seed User', isAdmin: false },
] as const;

export default async function globalSetup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — run e2e via `bun run test:e2e`.');
  }

  // Prisma generation reads the SvelteKit-generated tsconfig, including on fresh clones.
  const run = (command: string) =>
    // oxlint-disable-next-line bun/prefer-bun-shell -- Playwright loads global setup under Node, where the Bun global does not exist
    execSync(command, { stdio: 'pipe', env: { ...process.env, DATABASE_URL: databaseUrl } });
  run('bunx svelte-kit sync');
  run('bunx prisma db push');

  // Load the client after db push has generated it.
  const { PrismaClient } = await import('../../src/generated/prisma/client');
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // User deletion cascades, but Verification has no foreign key.
    await prisma.verification.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await hashPassword(SEED_PASSWORD);

    await Promise.all(
      SEED_USERS.map(async (seed) => {
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
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
