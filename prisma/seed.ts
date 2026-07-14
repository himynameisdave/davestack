import { hashPassword } from 'better-auth/crypto';
import { prisma } from '../src/lib/server/db';

// Seed: one admin + one regular user, both with a working email+password login.
// Idempotent (delete-by-email then recreate) so it is safe to re-run.
//
// We hash with Better Auth's own `hashPassword` (the default emailAndPassword
// hasher) and write the credential Account directly, rather than calling
// auth.api.signUpEmail — that pulls the SvelteKit-only `$app/server` module,
// which does not resolve in a standalone `bun` script.

const SEED_PASSWORD = 'password123';

const SEED_USERS = [
  { email: 'admin@example.com', name: 'Admin User', isAdmin: true },
  { email: 'user@example.com', name: 'Regular User', isAdmin: false },
] as const;

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const u of SEED_USERS) {
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
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
