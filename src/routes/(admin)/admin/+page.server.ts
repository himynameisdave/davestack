import { env } from '$lib/server/env';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// ─── Model count cards — THE EXTENSION POINT ──────────────────────────────
// To add a model card, append one entry here: a stable `key`, a display `label`,
// and a `count` thunk returning a Promise<number>. The dashboard renders one stat
// card per entry automatically — nothing else to touch. Keep these to cheap
// aggregate COUNT()s and app-agnostic so the template stays generic.
const MODEL_CARDS = [
  { key: 'users', label: 'Users', count: () => prisma.user.count() },
  { key: 'sessions', label: 'Sessions', count: () => prisma.session.count() },
  { key: 'accounts', label: 'Accounts', count: () => prisma.account.count() },
  { key: 'passkeys', label: 'Passkeys', count: () => prisma.passkey.count() },
  { key: 'verifications', label: 'Verifications', count: () => prisma.verification.count() },
] as const;

// Better Auth records the sign-in method as data, not a dedicated column:
//   - email + password → an Account row with providerId 'credential'
//   - OAuth (Google, …) → an Account row keyed by the provider id
//   - passkey           → at least one Passkey row
// We derive the method chips from those rows. NOTE: a magic-link-only user leaves
// NEITHER an Account NOR a Passkey behind, so they correctly show no chip — magic
// link isn't separately detectable from stored data.
const CREDENTIAL_PROVIDER = 'credential';

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function deriveMethods(providerIds: readonly string[], passkeyCount: number): string[] {
  const methods = providerIds.map((id) =>
    id === CREDENTIAL_PROVIDER ? 'Password' : titleCase(id),
  );
  if (passkeyCount > 0) methods.push('Passkey');
  return methods;
}

// DB host ONLY (host:port) — never expose the full DATABASE_URL, user, or password.
function dbHostFromUrl(url: string): string {
  try {
    return new URL(url).host || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const load: PageServerLoad = async () => {
  const now = new Date();

  const [counts, recentUsers, sessionTotal, sessionActive, recentSessions] = await Promise.all([
    Promise.all(MODEL_CARDS.map((card) => card.count())),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        isAdmin: true,
        createdAt: true,
        // Fetch method-defining rows alongside the user — one round trip, no N+1.
        accounts: { select: { providerId: true } },
        _count: { select: { passkeys: true } },
      },
    }),
    prisma.session.count(),
    prisma.session.count({ where: { expiresAt: { gt: now } } }),
    prisma.session.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const modelCards = MODEL_CARDS.map((card, index) => ({
    key: card.key,
    label: card.label,
    count: counts[index] ?? 0,
  }));

  const recentSignups = recentUsers.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    methods: deriveMethods(
      user.accounts.map((account) => account.providerId),
      user._count.passkeys,
    ),
  }));

  return {
    modelCards,
    recentSignups,
    sessions: {
      total: sessionTotal,
      active: sessionActive,
      recent: recentSessions.map((session) => ({
        id: session.id,
        email: session.user.email,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        active: session.expiresAt > now,
      })),
    },
    meta: {
      nodeEnv: env.NODE_ENV,
      // Railway injects the deployed commit SHA; locally it's simply absent.
      gitSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown',
      dbHost: dbHostFromUrl(env.DATABASE_URL),
      version: __APP_VERSION__,
    },
  };
};
