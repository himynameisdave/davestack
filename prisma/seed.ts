import { prisma } from '../src/lib/server/db';

// Seed: one admin + one regular user. Idempotent (upsert by email) so it is safe
// to re-run. `bun run db:seed` invokes this via prisma.config.ts.
//
// NOTE: password credentials are NOT created here. A working password login needs
// Better Auth's scrypt hasher, so the auth phase replaces this body with
// `auth.api.signUpEmail(...)` calls that create the User + credential Account
// together. Until then these users exist but can only sign in via magic link /
// passkey once auth is wired.

const SEED_USERS = [
  { email: 'admin@example.com', name: 'Admin User', isAdmin: true },
  { email: 'user@example.com', name: 'Regular User', isAdmin: false },
] as const;

async function main() {
  for (const u of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, isAdmin: u.isAdmin, emailVerified: true },
      create: {
        id: crypto.randomUUID(),
        email: u.email,
        name: u.name,
        isAdmin: u.isAdmin,
        emailVerified: true,
      },
    });
    console.log(`Seeded ${user.isAdmin ? 'admin' : 'user'}: ${user.email}`);
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
