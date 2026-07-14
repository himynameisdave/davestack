import { z } from 'zod';

// Single source of truth for environment configuration. Validated once at boot
// (imported by hooks.server.ts) so the app fails fast with a clear message rather
// than crashing deep in a request. Reads process.env directly (not $env/*) so the
// same module works inside SvelteKit AND in standalone bun scripts (prisma/seed.ts).
//
// Local-dev defaults let a fresh clone boot with zero config. Production hardens:
// booting with the dev secret or the local DB URL is a hard failure.

const DEV_AUTH_SECRET = 'dev-secret-change-me-before-deploying';
const LOCAL_DATABASE_URL =
  'postgresql://davestack:davestack@localhost:5432/davestack?schema=public';
const LOCAL_AUTH_URL = 'http://localhost:5173';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Required (defaulted for local dev)
  DATABASE_URL: z.string().min(1).default(LOCAL_DATABASE_URL),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1).default(DEV_AUTH_SECRET),
  BETTER_AUTH_URL: z.url().default(LOCAL_AUTH_URL),

  // Passkeys — RP ID defaults to the BETTER_AUTH_URL hostname; override only for
  // multi-subdomain setups (see README "Passkeys across environments").
  PASSKEY_RP_ID: z.string().min(1).optional(),

  // Optional integrations. Absence is a supported state — the app degrades, it
  // does not crash. `features` below turns presence into booleans for call sites.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  PUBLIC_UMAMI_WEBSITE_ID: z.string().min(1).optional(),
  PUBLIC_UMAMI_SRC: z.string().min(1).optional(),

  // Test harness flag (Playwright/Vitest). Enables the in-memory mailbox etc.
  TEST_MODE: z.string().optional(),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return parsed.data;
}

export const env = loadEnv();

// Production hardening. Kept OUT of loadEnv() so it doesn't fire during
// `vite build` (SvelteKit's analyse step imports server modules with
// NODE_ENV=production and no real secrets — the app must build without them).
// Called once at runtime boot from hooks.server.ts, guarded by `!building`.
export function assertProductionReady(): void {
  if (env.NODE_ENV !== 'production') return;
  if (env.BETTER_AUTH_SECRET === DEV_AUTH_SECRET) {
    throw new Error(
      'BETTER_AUTH_SECRET is still the dev placeholder. Set a real secret in production (openssl rand -base64 32).',
    );
  }
  if (env.DATABASE_URL === LOCAL_DATABASE_URL) {
    throw new Error('DATABASE_URL still points at the local Docker database in production.');
  }
}

// Presence flags for optional integrations. Import these instead of re-checking
// env vars at call sites, so "is Google configured?" lives in exactly one place.
export const features = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  resend: Boolean(env.RESEND_API_KEY),
  umami: Boolean(env.PUBLIC_UMAMI_WEBSITE_ID),
} as const;

export const isTestMode = env.TEST_MODE === '1' || env.TEST_MODE === 'true';
