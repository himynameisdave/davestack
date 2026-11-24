import { prisma } from '#lib/server/db.js';
import { env } from '#lib/server/env.js';

import type { PageServerLoad } from './$types';

const MODEL_CARDS = [
  { key: 'users', label: 'Users', count: async () => prisma.user.count() },
  { key: 'sessions', label: 'Sessions', count: async () => prisma.session.count() },
  { key: 'accounts', label: 'Accounts', count: async () => prisma.account.count() },
  { key: 'passkeys', label: 'Passkeys', count: async () => prisma.passkey.count() },
  { key: 'verifications', label: 'Verifications', count: async () => prisma.verification.count() },
] as const;

// Magic-link-only users have neither a provider account nor a passkey to label.
const CREDENTIAL_PROVIDER = 'credential';

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function deriveMethods(providerIds: readonly string[], passkeyCount: number): string[] {
  const methods = providerIds.map((id) => (id === CREDENTIAL_PROVIDER ? 'Password' : titleCase(id)));
  if (passkeyCount > 0) {
    methods.push('Passkey');
  }
  return methods;
}

// The full connection URL contains credentials, so only display its host.
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
    Promise.all(MODEL_CARDS.map(async (card) => card.count())),
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
      gitSha: env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown',
      dbHost: dbHostFromUrl(env.DATABASE_URL),
      version: __APP_VERSION__,
    },
  };
};
