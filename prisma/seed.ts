import { hashPassword } from 'better-auth/crypto';

import { prisma } from '../src/lib/server/db';

// Direct writes keep seeding independent of Better Auth's SvelteKit-only imports.

const SEED_PASSWORD = 'password123';

const SEED_USERS = [
  { email: 'admin@example.com', name: 'Admin User', isAdmin: true },
  { email: 'user@example.com', name: 'Regular User', isAdmin: false },
] as const;

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  await Promise.all(
    SEED_USERS.map(async (u) => {
      // Better Auth owns user ids, so delete-and-recreate by email instead of
      // upserting. Cascades clean up the old credential account.
      await prisma.user.deleteMany({ where: { email: u.email } });

      const userId = crypto.randomUUID();
      await prisma.user.create({
        data: { id: userId, email: u.email, name: u.name, emailVerified: true, isAdmin: u.isAdmin },
      });
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: 'credential',
          userId,
          password: passwordHash,
        },
      });

      console.log(`Seeded ${u.isAdmin ? 'admin' : 'user'}: ${u.email} / ${SEED_PASSWORD}`);
    }),
  );
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
